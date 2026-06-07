const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  ItemView,
  WorkspaceLeaf,
  MarkdownView,
  Modal,
  Menu,
  MarkdownRenderer,
  setIcon,
} = require("obsidian");
const { execFileSync, spawn } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const os = require("os");

function augmentPathEnv() {
  const pathKey = process.platform === "win32" ? "Path" : "PATH";
  const extra = [
    path.join(os.homedir(), ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  const cur = process.env[pathKey] || "";
  const parts = cur.split(path.delimiter).filter(Boolean);
  for (const p of extra) {
    if (!parts.includes(p)) parts.unshift(p);
  }
  return { ...process.env, [pathKey]: parts.join(path.delimiter) };
}

/**
 * Cursor Agent CLI in ACP mode — JSON-RPC over newline-delimited stdout.
 */
class AcpClient {
  constructor(hooks) {
    this.hooks = hooks;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
    this.rl = null;
    this.sendQueue = Promise.resolve();
    this.diag = [];
    this.maxDiag = 24;
  }

  pushDiag(line) {
    this.diag.push(String(line).trim());
    if (this.diag.length > this.maxDiag) this.diag.shift();
  }

  getDiagnostics() {
    return this.diag.length ? "\n\n" + this.diag.join("\n") : "";
  }

  fail(msg) {
    return new Error(msg + this.getDiagnostics());
  }

  isRunning() {
    return this.proc !== null && this.proc.exitCode === null;
  }

  async spawn(opt) {
    await this.dispose();
    this.diag.length = 0;

    const args = ["--workspace", opt.workspaceRoot];
    if (opt.trustWorkspace) args.push("--trust");
    if (opt.mode === "ask") args.push("--mode", "ask");
    if (opt.mode === "plan") args.push("--mode", "plan");
    if (opt.model && opt.model.trim()) args.push("--model", opt.model.trim());
    args.push("acp");

    this.hooks.onConnectProgress?.("spawning");

    this.proc = spawn(opt.agentPath, args, {
      env: opt.env || augmentPathEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proc.stderr?.on("data", (chunk) => {
      const s = chunk.toString();
      for (const line of s.split("\n")) {
        if (!line.trim()) continue;
        this.pushDiag("[stderr] " + line);
        this.hooks.onStderrLine?.(line);
      }
    });

    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.rl.on("line", (line) => this.onLine(line));

    this.proc.on("error", (err) => {
      const wrapped = this.fail(`Failed to start agent: ${err.message}`);
      for (const [, w] of this.pending) w.reject(wrapped);
      this.pending.clear();
      this.hooks.onConnectProgress?.("error");
    });

    this.proc.on("close", (code, signal) => {
      const detail =
        code !== null && code !== 0
          ? ` (exit ${code}${signal ? ` ${signal}` : ""})`
          : "";
      for (const [, w] of this.pending) {
        w.reject(this.fail(`ACP process exited${detail}`));
      }
      this.pending.clear();
      this.hooks.onConnectProgress?.("error");
    });

    this.hooks.onConnectProgress?.("initializing");
    await this.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: "ai-cursor-chat", version: "0.1.1" },
    });

    this.hooks.onConnectProgress?.("authenticating");
    await this.request("authenticate", { methodId: "cursor_login" });
    this.hooks.onConnectProgress?.("ready");
  }

  enqueue(fn) {
    const run = this.sendQueue.then(fn, fn);
    this.sendQueue = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  writeLine(obj) {
    if (!this.proc?.stdin) throw new Error("ACP not connected");
    this.proc.stdin.write(JSON.stringify(obj) + "\n");
  }

  /** ACP 通知（无 id），须绕过 request 队列以便在 prompt 进行中取消 */
  notify(method, params) {
    if (!this.proc?.stdin) return;
    this.writeLine({ jsonrpc: "2.0", method, params });
  }

  request(method, params) {
    return this.enqueue(() => {
      if (!this.proc?.stdin) throw new Error("ACP not connected");
      const id = this.nextId++;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.writeLine({ jsonrpc: "2.0", id, method, params });
      });
    });
  }

  respond(id, result) {
    this.writeLine({ jsonrpc: "2.0", id, result });
  }

  async sessionNew(cwd) {
    const r = await this.request("session/new", { cwd, mcpServers: [] });
    if (!r?.sessionId) throw this.fail("session/new missing sessionId");
    return { sessionId: r.sessionId };
  }

  async sessionPrompt(sessionId, parts) {
    return this.request("session/prompt", { sessionId, prompt: parts });
  }

  sessionCancel(sessionId) {
    try {
      this.notify("session/cancel", { sessionId });
    } catch {
      /* ignore */
    }
  }

  onLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      this.pushDiag("[stdout] " + trimmed.slice(0, 400));
      return;
    }

    if (
      msg.id !== undefined &&
      msg.id !== null &&
      (msg.result !== undefined || msg.error !== undefined)
    ) {
      const id = msg.id;
      const w = this.pending.get(id);
      if (!w) return;
      this.pending.delete(id);
      if (msg.error) {
        const errMsg = msg.error.message ?? "JSON-RPC error";
        w.reject(this.fail(errMsg));
      } else w.resolve(msg.result);
      return;
    }

    if (msg.method === "session/update") {
      this.hooks.onSessionUpdate(msg.params);
      return;
    }

    if (msg.method === "session/request_permission" && msg.id !== undefined) {
      const id = msg.id;
      this.hooks.onPermissionRequest(msg.params, (result) =>
        this.respond(id, result)
      );
      return;
    }

    if (msg.method === "cursor/create_plan" && msg.id !== undefined) {
      this.respond(id, { outcome: { outcome: "rejected" } });
      return;
    }

    if (msg.method === "cursor/ask_question" && msg.id !== undefined) {
      this.respond(id, {
        outcome: { outcome: "answered", answers: [] },
      });
      return;
    }
  }

  async dispose() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.proc) {
      try {
        this.proc.stdin?.end();
      } catch (_) {}
      try {
        this.proc.kill();
      } catch (_) {}
      this.proc = null;
    }
    this.pending.clear();
  }
}

function resolveAcpSessionIdFromUpdate(params) {
  if (!params || typeof params !== "object") return undefined;
  if (typeof params.sessionId === "string") return params.sessionId;
  const u = params.update;
  if (u && typeof u === "object" && typeof u.sessionId === "string") {
    return u.sessionId;
  }
  return undefined;
}

function friendlyToolAction(title, kind) {
  const s = `${title || ""} ${kind || ""}`.toLowerCase();
  if (/read|cat|view/.test(s)) return "Read";
  if (/edit|write|patch|strreplace/.test(s)) return "Edit";
  if (/grep|search|glob|semantic|find/.test(s)) return "Search";
  if (/shell|bash|terminal|command|run/.test(s)) return "Shell";
  if (/list|ls|dir/.test(s)) return "List";
  return "Tool";
}

function toolStatusFromUpdate(kind, content) {
  const k = String(kind || "").toLowerCase();
  const raw = content?.status ?? content?.state ?? content?.phase ?? "";
  const s = String(raw).toLowerCase();
  if (/fail|error|cancel/i.test(k) || /fail|error|cancel/i.test(s)) {
    return "failed";
  }
  if (
    /complete|completed|finished|succeeded|success|done|ended/i.test(k) ||
    /complete|completed|finished|success|done/i.test(s)
  ) {
    if (!/start|begin|invok/i.test(k)) return "completed";
  }
  return "running";
}

function isGenericToolTitle(title) {
  const s = (title || "").trim();
  if (!s) return true;
  if (/^tool[_\s-]?call/i.test(s)) return true;
  if (/^read\s*file$/i.test(s)) return true;
  if (s === "Tool") return true;
  return false;
}

function formatToolLine(msg) {
  const action = msg.action || "Tool";
  const detail = (msg.detail || "").trim();
  const title = (msg.title || "").trim();
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  if (detail) {
    const d = clip(detail, 72);
    if (d === action || d.toLowerCase() === action.toLowerCase()) return action;
    return `${action} · ${d}`;
  }
  if (title && !isGenericToolTitle(title)) {
    const t = clip(title, 56);
    if (t.toLowerCase() === action.toLowerCase()) return action;
    return `${action} · ${t}`;
  }
  return action;
}

function basenameFromPath(p) {
  const s = String(p).replace(/\\/g, "/");
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(i + 1) : s;
}

function contextBlockInlineMeta(block) {
  const label = (block.label || "").trim();
  const chars = (block.text || "").length;
  let icon = "file-text";
  let name = "上下文";
  const pathMatch = label.match(/^(?:选区|笔记)\s*·\s*(.+)$/);
  if (label.startsWith("选区")) {
    icon = "highlighter";
    name = pathMatch ? basenameFromPath(pathMatch[1]) : "选区";
  } else if (label.startsWith("笔记")) {
    icon = "file-text";
    name = pathMatch ? basenameFromPath(pathMatch[1]) : "笔记";
  } else if (label) {
    name = label.length > 28 ? label.slice(0, 26) + "…" : label;
  }
  return { icon, name, chars, title: label };
}

function summarizeContextForDisplay(blocks) {
  return blocks.map((b) => {
    const { name, title } = contextBlockInlineMeta(b);
    return {
      label: name,
      kind: b.kind,
      title,
    };
  });
}

function toolIconFor(title, kind) {
  const s = `${title || ""} ${kind || ""}`.toLowerCase();
  if (/read|cat|view/.test(s)) return "eye";
  if (/edit|write|patch|strreplace/.test(s)) return "pencil";
  if (/grep|search|glob|semantic|find/.test(s)) return "search";
  if (/shell|bash|terminal|command|run/.test(s)) return "terminal";
  if (/list|ls|dir/.test(s)) return "folder";
  return "wrench";
}

function extractToolDetail(content, title) {
  if (content && typeof content === "object") {
    for (const k of [
      "path",
      "filePath",
      "file",
      "uri",
      "target",
      "query",
      "pattern",
      "command",
      "description",
      "input",
    ]) {
      const v = content[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    const args = content.arguments ?? content.args;
    if (typeof args === "string" && args.trim()) {
      const t = args.trim();
      return t.length > 200 ? t.slice(0, 200) + "…" : t;
    }
    if (args && typeof args === "object") {
      try {
        const s = JSON.stringify(args);
        return s.length > 200 ? s.slice(0, 200) + "…" : s;
      } catch (_) {}
    }
  }
  const t = (title || "").trim();
  if (t && (/[/\\.]/.test(t) || t.length > 24)) return t;
  return "";
}

function parseSessionUpdateForDisplay(params) {
  const unwrap = (p) => {
    if (!p || typeof p !== "object") return null;
    const u = p.update;
    if (u && typeof u === "object") return u;
    return p;
  };

  const pickText = (c, keys) => {
    for (const k of keys) {
      const v = c[k];
      if (typeof v === "string" && v.length) return v;
    }
    return undefined;
  };

  const upd = unwrap(params);
  if (!upd) return { type: "skip" };

  const kind = String(upd.sessionUpdate ?? "");
  const content =
    upd.content && typeof upd.content === "object" ? upd.content : {};

  if (kind === "agent_message_chunk") {
    const t = pickText(content, ["text", "delta", "message"]);
    if (t) return { type: "assistant", text: t };
    return { type: "skip" };
  }

  if (
    kind.includes("tool") ||
    content.toolCallId ||
    content.tool_call_id
  ) {
    const title =
      (typeof upd.title === "string" && upd.title) ||
      (typeof content.toolName === "string" && content.toolName) ||
      kind ||
      "Tool";
    const toolCallId = String(
      content.toolCallId || content.tool_call_id || title || kind || uid()
    );
    const detail = extractToolDetail(content, title);
    const action = friendlyToolAction(title, kind);
    const icon = toolIconFor(title, kind);
    const status = toolStatusFromUpdate(kind, content);
    const isTick = /update|progress|delta/i.test(kind);
    let type = "tool_tick";
    if (status === "completed" || status === "failed") {
      type = "tool_done";
    } else if (!isTick) {
      type = "tool_start";
    }
    return {
      type,
      toolCallId,
      title,
      action,
      detail,
      icon,
      status,
    };
  }

  return { type: "skip" };
}

function isCursorChatView(view) {
  return view && typeof view.getViewType === "function" && view.getViewType() === VIEW_TYPE;
}

const VIEW_TYPE = "ai-cursor-chat-view";
const PLUGIN_ID = "ai-cursor-chat";

const DEFAULT_SETTINGS = {
  agentPath: "",
  mode: "agent",
  model: "",
  trustWorkspace: true,
  maxContextChars: 32000,
  showToolCalls: false,
  captureModLHotkey: true,
};

const CLI_CACHE_TTL_MS = 120000;
let cliStatusCache = { path: "", ok: false, msg: "", at: 0 };

function defaultAgentPath() {
  return path.join(os.homedir(), ".local", "bin", "agent");
}

function resolveAgentPath(settings) {
  const p = (settings.agentPath || "").trim();
  return p || defaultAgentPath();
}

function getVaultOsPath(app) {
  const base = app.vault.adapter.getBasePath?.();
  return typeof base === "string" && base.length ? base : null;
}

/** 当前 Markdown 页（编辑 / 阅读 / 实时预览均适用，不要求有 editor） */
function getActiveMarkdownView(app) {
  const leaf = app.workspace.activeLeaf;
  const view = leaf?.view;
  if (!view || view.getViewType?.() !== "markdown") return null;
  const mode =
    typeof view.getMode === "function" ? view.getMode() : null;
  const root = getMarkdownViewRoot({ view });
  const isReading =
    !!root?.classList?.contains("markdown-reading-view") ||
    !!view.containerEl?.querySelector(".markdown-reading-view") ||
    mode === "preview";
  return {
    view,
    file: view.file ?? null,
    editor: view.editor ?? null,
    mode,
    isReading,
    rootEl: root,
  };
}

function getMarkdownViewRoot(mv) {
  if (!mv?.view) return null;
  const el = mv.view.containerEl;
  if (!el) return mv.view.contentEl ?? null;
  return (
    el.querySelector(".markdown-reading-view") ||
    el.querySelector(".markdown-preview-view") ||
    el.querySelector(".markdown-source-view") ||
    el
  );
}

/** @deprecated 使用 getActiveMarkdownView */
function getActiveMarkdownContext(app) {
  const mv = getActiveMarkdownView(app);
  if (!mv) return null;
  return { editor: mv.editor, file: mv.file };
}

function readDomSelectionInElement(rootEl) {
  if (!rootEl || typeof window === "undefined") return "";
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return "";
  const text = sel.toString().trim();
  if (!text) return "";
  const node = sel.anchorNode;
  if (!node || !rootEl.contains(node)) return "";
  return text;
}

/**
 * 读取当前笔记选区：编辑模式用 Editor API；阅读/预览模式用 DOM 选区。
 */
function readMarkdownSelection(app) {
  const mv = getActiveMarkdownView(app);
  if (!mv) return { text: "", file: null, mode: null, isReading: false };

  if (mv.editor) {
    const fromEditor = readEditorSelection(mv.editor);
    if (fromEditor) {
      return {
        text: fromEditor,
        file: mv.file,
        mode: mv.mode || "source",
        isReading: false,
      };
    }
  }

  const root = mv.rootEl || getMarkdownViewRoot(mv);
  const fromDom = readDomSelectionInElement(root);
  if (!fromDom && mv.isReading) {
    const loose = (window.getSelection()?.toString() || "").trim();
    if (loose) {
      return {
        text: loose,
        file: mv.file,
        mode: "preview",
        isReading: true,
      };
    }
  }
  if (fromDom) {
    return {
      text: fromDom,
      file: mv.file,
      mode: "preview",
      isReading: true,
    };
  }

  return { text: "", file: mv.file, mode: mv.mode, isReading: mv.isReading };
}

/** 读取选区文本（打开侧栏失焦后 getSelection 可能变空，需提前快照） */
function readEditorSelection(editor) {
  if (!editor) return "";
  let text = "";
  try {
    text = editor.getSelection?.() ?? "";
  } catch (_) {
    text = "";
  }
  if (text && String(text).trim()) return String(text);

  try {
    if (typeof editor.listSelections === "function") {
      const ranges = editor.listSelections();
      if (ranges?.length) {
        const parts = [];
        for (const r of ranges) {
          if (r?.from != null && r?.to != null) {
            parts.push(editor.getRange(r.from, r.to));
          }
        }
        text = parts.join("\n");
      }
    }
  } catch (_) {}
  return String(text || "").trim();
}

function isEventFromChatPanel(evt) {
  const t = evt?.target;
  return !!(t && typeof t.closest === "function" && t.closest(".acc-root"));
}

function checkAgentCli(agentPath, useCache = true) {
  if (
    useCache &&
    cliStatusCache.path === agentPath &&
    Date.now() - cliStatusCache.at < CLI_CACHE_TTL_MS
  ) {
    return { ok: cliStatusCache.ok, msg: cliStatusCache.msg };
  }
  if (!fs.existsSync(agentPath)) {
    const r = {
      ok: false,
      msg: `找不到可执行文件。请安装 Cursor Agent CLI 或在设置中填写路径。\n${agentPath}`,
    };
    cliStatusCache = { path: agentPath, ...r, at: Date.now() };
    return r;
  }
  try {
    execFileSync(agentPath, ["status"], {
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "pipe"],
      env: augmentPathEnv(),
    });
    cliStatusCache = { path: agentPath, ok: true, msg: "", at: Date.now() };
    return { ok: true };
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || String(e)).trim();
    const r = { ok: false, msg };
    cliStatusCache = { path: agentPath, ...r, at: Date.now() };
    return r;
  }
}

function yieldToUi() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** 限制 Mermaid 等宽图在气泡内缩放，避免侧栏横向滚动 */
function constrainWideMarkdownMedia(root) {
  if (!root || !root.isConnected) return;
  const maxW = root.clientWidth;
  if (maxW <= 0) return;

  const wraps = root.querySelectorAll(
    ".mermaid, .block-language-mermaid, [class*='block-language-mermaid']"
  );
  wraps.forEach((wrap) => {
    wrap.style.maxWidth = "100%";
    wrap.style.overflow = "hidden";
    wrap.style.boxSizing = "border-box";
  });

  root.querySelectorAll(".mermaid svg, .block-language-mermaid svg").forEach(
    (svg) => {
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      const rect = svg.getBoundingClientRect();
      const sw =
        rect.width ||
        parseFloat(svg.getAttribute("width")) ||
        svg.width?.baseVal?.value ||
        0;
      if (sw <= maxW || sw <= 0) return;
      const scale = maxW / sw;
      svg.style.transform = `scale(${scale})`;
      svg.style.transformOrigin = "top left";
      const sh =
        rect.height ||
        parseFloat(svg.getAttribute("height")) ||
        svg.height?.baseVal?.value ||
        0;
      const parent = svg.parentElement;
      if (parent && sh > 0) {
        parent.style.height = Math.ceil(sh * scale) + "px";
        parent.style.width = "100%";
      }
    }
  );
}

function scheduleConstrainWideMarkdownMedia(root) {
  constrainWideMarkdownMedia(root);
  requestAnimationFrame(() => constrainWideMarkdownMedia(root));
  window.setTimeout(() => constrainWideMarkdownMedia(root), 200);
  window.setTimeout(() => constrainWideMarkdownMedia(root), 700);
}

/** 将 Markdown 渲染进容器（兼容 Obsidian 1.12+ API） */
function renderMarkdownInto(app, markdown, el, sourcePath, component) {
  el.empty();
  el.addClass("markdown-rendered");
  el.addClass("acc-md-rendered");
  const src = sourcePath || "";
  let p;
  if (typeof MarkdownRenderer.renderMarkdown === "function") {
    p = MarkdownRenderer.renderMarkdown(markdown, el, src, component);
  } else {
    p = MarkdownRenderer.render(app, markdown, el, src, component);
  }
  return Promise.resolve(p).then(() => {
    scheduleConstrainWideMarkdownMedia(el);
    return el;
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function truncateQueuePreview(text, max = 96) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

class PermissionModal extends Modal {
  constructor(app, summary, onChoose) {
    super(app);
    this.summary = summary;
    this.onChoose = onChoose;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Agent 权限确认" });
    contentEl.createEl("pre", {
      cls: "acc-perm-pre",
      text: this.summary,
    });
    const row = contentEl.createDiv({ cls: "acc-perm-buttons" });
    const finish = (choice) => {
      this.onChoose(choice);
      this.close();
    };
    row.createEl("button", { text: "允许一次" }).onclick = () =>
      finish("allow-once");
    row.createEl("button", { text: "始终允许" }).onclick = () =>
      finish("allow-always");
    row.createEl("button", { text: "拒绝" }).onclick = () =>
      finish("reject-once");
  }

  onClose() {
    this.contentEl.empty();
  }
}

class CursorChatView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.messages = [];
    this.contextBlocks = [];
    this.acpSessionId = null;
    this.isSending = false;
    this._userCancelled = false;
    this.sendQueue = [];
    this._queueProcessing = false;
    this._imeComposing = false;
    this._compositionEndAt = 0;
    this._statusRowEl = null;
    this._renderRaf = null;
    this.connectLabel = "";
    this.streamingAssistant = false;
    this.pendingThinking = false;
    this.renderMdTimer = null;
    this.renderToolTimer = null;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Cursor Chat";
  }

  getIcon() {
    return "message-square";
  }

  async onOpen() {
    const root = this.containerEl;
    root.empty();
    root.addClass("acc-root");

    const header = root.createDiv({ cls: "acc-header" });
    header.createSpan({ cls: "acc-title", text: "Cursor Agent" });
    this.statusEl = header.createSpan({ cls: "acc-status" });

    const main = root.createDiv({ cls: "acc-main" });
    this.messagesEl = main.createDiv({ cls: "acc-messages" });

    const dock = root.createDiv({ cls: "acc-bottom-dock" });

    this.queueDockEl = dock.createDiv({ cls: "acc-queue-dock is-hidden" });

    const composer = dock.createDiv({ cls: "acc-composer" });
    this.composerBoxEl = composer.createDiv({ cls: "acc-composer-box" });
    const composerBox = this.composerBoxEl;

    const composerRow = composerBox.createDiv({ cls: "acc-composer-row" });
    const inlineWrap = composerRow.createDiv({ cls: "acc-composer-inline" });
    this.inputEl = inlineWrap.createDiv({
      cls: "acc-composer-editor",
      attr: {
        contenteditable: "true",
        role: "textbox",
        "aria-multiline": "true",
        "data-placeholder": "提问…",
        title: "Enter 发送 · Shift+Enter 换行 · ⌘L 加入选区 · 退格可删除上下文",
      },
    });
    this.resizeInput = () => {
      if (!this.inputEl) return;
      this.inputEl.style.height = "auto";
      this.inputEl.style.height =
        Math.min(this.inputEl.scrollHeight, 140) + "px";
    };
    this.inputEl.addEventListener("input", () => this.onComposerInput());
    this.inputEl.addEventListener("keydown", (e) => this.onComposerKeydown(e));
    this.inputEl.addEventListener("paste", (e) => this.onComposerPaste(e));
    this.bindComposerIme(this.inputEl);

    const actions = composerRow.createDiv({ cls: "acc-composer-actions" });
    this.cancelBtn = actions.createEl("button", {
      cls: "acc-icon-btn acc-stop-btn",
      attr: { "aria-label": "停止" },
    });
    setIcon(this.cancelBtn, "square");
    this.cancelBtn.addEventListener("mousedown", (e) => e.preventDefault());
    this.cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.cancelTurn();
    });

    this.sendBtn = actions.createEl("button", {
      cls: "acc-icon-btn acc-send-btn",
      attr: { "aria-label": "发送" },
    });
    setIcon(this.sendBtn, "arrow-up");
    this.sendBtn.addEventListener("click", () => void this.sendMessage());

    this.updateEditorEmptyState();
    this.renderMessages();
    this.setStatus(this.connectLabel || "就绪");
    this.plugin.setChatView(this);
    void this.plugin.prewarmAcp(this);
  }

  async onClose() {
    if (this.renderMdTimer) clearTimeout(this.renderMdTimer);
    if (this.renderToolTimer) clearTimeout(this.renderToolTimer);
    this.plugin.setChatView(null);
  }

  getMarkdownSourcePath() {
    return getActiveMarkdownView(this.app)?.file?.path ?? "";
  }

  renderMessageBody(bodyEl, role, content, msg) {
    bodyEl.empty();
    bodyEl.removeClass("markdown-rendered", "acc-md-rendered");

    if (role === "assistant" && content) {
      void renderMarkdownInto(
        this.app,
        content,
        bodyEl,
        this.getMarkdownSourcePath(),
        this
      );
      return;
    }

    if (role === "user") {
      this.renderUserMessage(bodyEl, content, msg);
      return;
    }

    if (role === "tool" && msg) {
      this.renderToolCard(bodyEl, msg);
      return;
    }

    if (role === "thinking" || role === "status") {
      bodyEl.addClass("acc-status-line");
      bodyEl.setText(content || "");
      return;
    }

    bodyEl.setText(content || "");
  }

  renderUserMessage(bodyEl, content, msg) {
    const summary = msg?.contextSummary;
    if (summary?.length) {
      const attachments = bodyEl.createDiv({ cls: "acc-user-attachments" });
      for (const item of summary) {
        const row = attachments.createSpan({ cls: "acc-user-inline-ctx" });
        const chip = row.createSpan({
          cls: "acc-user-inline-chip",
          attr: { title: item.title || item.label },
        });
        chip.setText(item.label);
      }
    }
    bodyEl.createDiv({ cls: "acc-user-text", text: content || "" });
  }

  renderToolCard(el, msg) {
    el.addClass("acc-tool-card");
    const running = msg.status === "running";
    const failed = msg.status === "failed";
    el.toggleClass("is-running", running);
    el.toggleClass("is-done", !running && !failed);
    el.toggleClass("is-failed", failed);

    const row = el.createDiv({ cls: "acc-tool-row" });
    const iconWrap = row.createDiv({ cls: "acc-tool-icon-wrap" });
    setIcon(iconWrap.createDiv({ cls: "acc-tool-icon" }), msg.icon || "wrench");

    const text = row.createDiv({ cls: "acc-tool-text" });
    const line = formatToolLine(msg);
    text.createDiv({
      cls: "acc-tool-line",
      text: line,
      attr: { title: line },
    });

    const statusEl = row.createDiv({ cls: "acc-tool-status" });
    if (running) {
      statusEl.createDiv({ cls: "acc-tool-spinner" });
    } else if (failed) {
      setIcon(statusEl.createDiv({ cls: "acc-tool-fail" }), "x");
    } else {
      setIcon(statusEl.createDiv({ cls: "acc-tool-check" }), "check");
    }
  }

  completeRunningTools(exceptId) {
    for (const m of this.messages) {
      if (
        m.role === "tool" &&
        m.status === "running" &&
        m.toolCallId !== exceptId
      ) {
        m.status = "completed";
      }
    }
  }

  scheduleAssistantMarkdownRender() {
    if (this.renderMdTimer) clearTimeout(this.renderMdTimer);
    this.renderMdTimer = setTimeout(() => {
      this.renderMdTimer = null;
      const last = this.messages[this.messages.length - 1];
      if (!last || last.role !== "assistant" || !this.lastAssistantBodyEl) return;
      void renderMarkdownInto(
        this.app,
        last.content,
        this.lastAssistantBodyEl,
        this.getMarkdownSourcePath(),
        this
      ).then(() => {
        if (this.lastAssistantBodyEl) {
          scheduleConstrainWideMarkdownMedia(this.lastAssistantBodyEl);
        }
        if (this.messagesEl) {
          this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
      });
    }, 60);
  }

  setStatus(text) {
    this.connectLabel = text;
    if (!this.statusEl) return;
    this.statusEl.setText(text);
    const busy =
      !!text &&
      text !== "就绪" &&
      !text.startsWith("错误") &&
      text !== "已停止";
    this.statusEl.toggleClass("is-busy", busy);
  }

  resetInputHeight() {
    if (!this.inputEl) return;
    this.inputEl.style.height = "auto";
    const h = Math.min(Math.max(this.inputEl.scrollHeight, 22), 140);
    this.inputEl.style.height = h + "px";
  }

  updateComposerChrome() {
    const running = this.isSending || this._queueProcessing;
    const queued = this.sendQueue.length;
    if (this.composerBoxEl) {
      this.composerBoxEl.toggleClass("is-busy", running);
      this.composerBoxEl.toggleClass("has-queue", queued > 0);
    }
    if (this.inputEl) {
      this.inputEl.contentEditable = "true";
      this.inputEl.removeClass("is-disabled");
      let placeholder = "提问…";
      if (running && queued > 0) {
        placeholder = `回复中 · 另有 ${queued} 条排队`;
      } else if (running) {
        placeholder = "回复中，可继续输入并排队…";
      } else if (queued > 0) {
        placeholder = `排队 ${queued} 条，可继续输入…`;
      }
      this.inputEl.setAttr("data-placeholder", placeholder);
    }
  }

  renderQueueDock() {
    if (!this.queueDockEl) return;
    this.queueDockEl.empty();
    const showQueue =
      this.sendQueue.length > 0 &&
      (this._queueProcessing || this.isSending);
    if (!showQueue) {
      this.queueDockEl.addClass("is-hidden");
      return;
    }
    this.queueDockEl.removeClass("is-hidden");
    const head = this.queueDockEl.createDiv({ cls: "acc-queue-head" });
    setIcon(head.createSpan({ cls: "acc-queue-head-icon" }), "list-ordered");
    head.createSpan({
      cls: "acc-queue-head-label",
      text: `${this.sendQueue.length} 条排队`,
    });
    const list = this.queueDockEl.createDiv({ cls: "acc-queue-list" });
    this.sendQueue.forEach((job, index) => {
      const item = list.createDiv({ cls: "acc-queue-item" });
      item.createSpan({ cls: "acc-queue-index", text: String(index + 1) });
      const body = item.createDiv({ cls: "acc-queue-body" });
      body.createDiv({
        cls: "acc-queue-text",
        text: truncateQueuePreview(job.userText),
        attr: { title: job.userText },
      });
      if (job.contextSummary?.length) {
        body.createDiv({
          cls: "acc-queue-meta",
          text: `${job.contextSummary.length} 个上下文`,
        });
      }
    });
  }

  /** @deprecated use updateComposerChrome */
  setComposerBusy(_busy) {
    this.updateComposerChrome();
  }

  extractComposerText() {
    if (!this.inputEl) return "";
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push((node.textContent || "").replace(/\u200B/g, ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node;
      if (
        el.classList?.contains("acc-inline-chip") ||
        el.classList?.contains("acc-inline-meta")
      ) {
        return;
      }
      if (el.tagName === "BR") {
        parts.push("\n");
        return;
      }
      for (const child of el.childNodes) walk(child);
    };
    for (const child of this.inputEl.childNodes) walk(child);
    return parts.join("").replace(/\u200B/g, "");
  }

  appendComposerTextNodes(text) {
    if (!text || !this.inputEl) return;
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (i > 0) this.inputEl.createEl("br");
      if (line) this.inputEl.appendText(line);
    });
  }

  buildChipNodes(block) {
    const { icon, name, title } = contextBlockInlineMeta(block);
    const chip = this.inputEl.createSpan({
      cls: "acc-inline-chip",
      attr: {
        contenteditable: "false",
        "data-context-id": block.id,
        title,
      },
    });
    setIcon(chip.createSpan({ cls: "acc-inline-chip-icon" }), icon);
    chip.createSpan({ cls: "acc-inline-chip-name", text: name });
    return { chip };
  }

  removeContextNodesById(id) {
    if (!this.inputEl || !id) return;
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
    this.inputEl
      .querySelectorAll(`[data-context-id="${esc}"]`)
      .forEach((n) => n.remove());
  }

  pruneOrphanContextNodes() {
    if (!this.inputEl) return;
    this.inputEl.querySelectorAll(".acc-inline-meta").forEach((meta) => {
      const id = meta.dataset?.contextId;
      if (!id) {
        meta.remove();
        return;
      }
      const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
      if (!this.inputEl.querySelector(`.acc-inline-chip[data-context-id="${esc}"]`)) {
        meta.remove();
      }
    });
  }

  syncContextBlocksFromDom() {
    if (!this.inputEl) return;
    const ids = new Set();
    this.inputEl
      .querySelectorAll(".acc-inline-chip[data-context-id]")
      .forEach((el) => {
        if (el.dataset.contextId) ids.add(el.dataset.contextId);
      });
    this.contextBlocks = this.contextBlocks.filter((b) => ids.has(b.id));
    if (this.composerBoxEl) {
      this.composerBoxEl.toggleClass("has-context", ids.size > 0);
    }
  }

  updateEditorEmptyState() {
    if (!this.inputEl) return;
    const noText = !this.extractComposerText().trim();
    const noCtx = !this.contextBlocks.length;
    this.inputEl.toggleClass("is-editor-empty", noText && noCtx);
  }

  focusComposerEnd() {
    if (!this.inputEl) return;
    this.inputEl.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(this.inputEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  syncComposerChips(opts = {}) {
    if (!this.inputEl) return;
    const { focusEnd = false } = opts;
    const text = this.extractComposerText();
    this.inputEl.empty();
    for (const block of this.contextBlocks) {
      this.buildChipNodes(block);
      this.inputEl.appendChild(document.createTextNode("\u200B"));
    }
    this.appendComposerTextNodes(text);
    this.updateEditorEmptyState();
    this.resizeInput();
    if (focusEnd) this.focusComposerEnd();
  }

  clearComposerEditor() {
    if (!this.inputEl) return;
    this.inputEl.empty();
    this.updateEditorEmptyState();
    this.resizeInput();
  }

  onComposerInput() {
    this.pruneOrphanContextNodes();
    this.syncContextBlocksFromDom();
    this.updateEditorEmptyState();
    this.resizeInput();
  }

  onComposerPaste(e) {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, text);
    } else {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }
    }
    this.onComposerInput();
  }

  findChipAdjacentToCaret(key) {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !sel.isCollapsed) return null;
    const { anchorNode, anchorOffset } = sel;
    const isBack = key === "Backspace";

    const prevChip = (node) => {
      let sib = node?.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE) {
          if (sib.classList?.contains("acc-inline-chip")) return sib;
          if (sib.classList?.contains("acc-inline-meta")) {
            sib = sib.previousSibling;
            continue;
          }
        }
        if (
          sib.nodeType === Node.TEXT_NODE &&
          (sib.textContent || "").replace(/\u200B/g, "") === ""
        ) {
          sib = sib.previousSibling;
          continue;
        }
        break;
      }
      return null;
    };

    const nextChip = (node) => {
      let sib = node?.nextSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE) {
          if (sib.classList?.contains("acc-inline-chip")) return sib;
          if (sib.classList?.contains("acc-inline-meta")) {
            sib = sib.nextSibling;
            continue;
          }
        }
        if (
          sib.nodeType === Node.TEXT_NODE &&
          (sib.textContent || "").replace(/\u200B/g, "") === ""
        ) {
          sib = sib.nextSibling;
          continue;
        }
        break;
      }
      return null;
    };

    if (anchorNode.nodeType === Node.TEXT_NODE) {
      const t = anchorNode.textContent || "";
      if (isBack) {
        if (anchorOffset === 0) return prevChip(anchorNode);
        if (anchorOffset === 1 && t[0] === "\u200B") return prevChip(anchorNode);
        if (anchorOffset > 0 && t.slice(0, anchorOffset).replace(/\u200B/g, "") === "") {
          return prevChip(anchorNode);
        }
      } else if (anchorOffset >= t.length) {
        return nextChip(anchorNode);
      }
    } else if (anchorNode === this.inputEl && isBack) {
      const child = this.inputEl.childNodes[anchorOffset - 1];
      if (child?.classList?.contains("acc-inline-chip")) return child;
      if (child?.classList?.contains("acc-inline-meta")) {
        const prev = child.previousSibling;
        if (prev?.classList?.contains("acc-inline-chip")) return prev;
      }
    }
    return null;
  }

  bindComposerIme(el) {
    el.addEventListener("compositionstart", () => {
      this._imeComposing = true;
    });
    el.addEventListener("compositionupdate", () => {
      this._imeComposing = true;
    });
    el.addEventListener("compositionend", () => {
      this._imeComposing = false;
      this._compositionEndAt = Date.now();
    });
  }

  /** 输入法组字或刚确认候选/英文时的 Enter，不当作发送 */
  isImeComposingEnter(e) {
    if (this._imeComposing) return true;
    if (e.isComposing) return true;
    const native = e.nativeEvent;
    if (native?.isComposing) return true;
    if (e.keyCode === 229) return true;
    if (Date.now() - this._compositionEndAt < 150) return true;
    return false;
  }

  onComposerKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (this.isImeComposingEnter(e)) return;
      e.preventDefault();
      void this.sendMessage();
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      const chip = this.findChipAdjacentToCaret(e.key);
      if (chip?.dataset?.contextId) {
        e.preventDefault();
        const id = chip.dataset.contextId;
        this.removeContextNodesById(id);
        this.contextBlocks = this.contextBlocks.filter((b) => b.id !== id);
        this.pruneOrphanContextNodes();
        this.updateEditorEmptyState();
        this.resizeInput();
      }
    }
  }

  clearContext() {
    this.contextBlocks = [];
    this.syncComposerChips();
  }

  removeContextBlock(id) {
    this.contextBlocks = this.contextBlocks.filter((b) => b.id !== id);
    this.removeContextNodesById(id);
    this.pruneOrphanContextNodes();
    this.syncContextBlocksFromDom();
    this.updateEditorEmptyState();
    this.resizeInput();
  }

  renderContextPreview(opts = {}) {
    this.syncComposerChips({ focusEnd: opts.focusEnd !== false });
  }

  markToolsCompleted() {
    for (const m of this.messages) {
      if (m.role === "tool" && m.status === "running") {
        m.status = "completed";
      }
    }
  }

  upsertToolMessage(ev) {
    const id = ev.toolCallId || ev.title || uid();
    if (ev.type === "tool_start") {
      this.completeRunningTools(id);
    }
    let msg = this.messages.find(
      (m) => m.role === "tool" && m.toolCallId === id
    );
    const nextStatus = ev.status || "running";
    if (!msg) {
      msg = {
        role: "tool",
        toolCallId: id,
        title: ev.title || "Tool",
        action: ev.action || "Tool",
        detail: ev.detail || "",
        icon: ev.icon || "wrench",
        status: nextStatus,
      };
      this.messages.push(msg);
    } else {
      if (ev.title) msg.title = ev.title;
      if (ev.action) msg.action = ev.action;
      if (ev.detail) msg.detail = ev.detail;
      if (ev.icon) msg.icon = ev.icon;
      if (nextStatus === "completed" || nextStatus === "failed") {
        msg.status = nextStatus;
      } else if (msg.status !== "completed" && msg.status !== "failed") {
        msg.status = "running";
      }
    }
    this.scheduleToolRender();
    if (this.isSending) {
      const hint = msg.detail || msg.title || msg.action;
      this.setStatus(hint ? `${hint}` : "运行中…");
    }
  }

  scheduleToolRender() {
    if (this.renderToolTimer) clearTimeout(this.renderToolTimer);
    this.renderToolTimer = setTimeout(() => {
      this.renderToolTimer = null;
      this.scheduleMessagesRender();
    }, 40);
  }

  scheduleMessagesRender() {
    if (!this.messagesEl) return;
    if (this._renderRaf != null) return;
    this._renderRaf = requestAnimationFrame(() => {
      this._renderRaf = null;
      this._statusRowEl = null;
      this.renderMessages();
    });
  }

  removeMessagesEmptyState() {
    this.messagesEl?.querySelector(".acc-empty")?.remove();
  }

  appendUserMessageToDom(msg) {
    if (!this.messagesEl) return;
    this.removeMessagesEmptyState();
    const row = this.messagesEl.createDiv({ cls: "acc-msg acc-msg-user" });
    const body = row.createDiv({ cls: "acc-msg-body" });
    this.renderMessageBody(body, "user", msg.content, msg);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  upsertStatusPlaceholder(text) {
    if (!this.messagesEl) return;
    this.removeMessagesEmptyState();
    const line = text || "Connecting…";
    if (this._statusRowEl?.isConnected) {
      const body = this._statusRowEl.querySelector(".acc-msg-body");
      if (body) body.setText(line);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      return;
    }
    const row = this.messagesEl.createDiv({ cls: "acc-msg acc-msg-status" });
    row.createDiv({ cls: "acc-msg-body acc-status-line", text: line });
    this._statusRowEl = row;
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  removeStatusPlaceholderDom() {
    this._statusRowEl?.remove();
    this._statusRowEl = null;
  }

  showThinkingPlaceholder(text) {
    this.clearThinkingPlaceholder();
    this.pendingThinking = true;
    const line = text || "Connecting…";
    this.messages.push({ role: "status", content: line });
    this.upsertStatusPlaceholder(line);
  }

  clearThinkingPlaceholder() {
    if (!this.pendingThinking) return;
    this.pendingThinking = false;
    this.messages = this.messages.filter(
      (m) => m.role !== "thinking" && m.role !== "status"
    );
    this.removeStatusPlaceholderDom();
  }

  renderMessages() {
    if (!this.messagesEl) return;
    const el = this.messagesEl;
    el.empty();
    this.lastAssistantBodyEl = null;

    const visible = this.messages.filter((m) => {
      if (m.role === "tool") return true;
      if (m.role !== "system") return true;
      if (this.plugin.settings.showToolCalls) return true;
      return !/\btool_call/i.test(m.content);
    });

    if (!visible.length) {
      el.createDiv({
        cls: "acc-empty",
        text: "发送问题开始对话；选中文字后 ⌘L 可加入上下文",
      });
      return;
    }

    for (const m of visible) {
      const row = el.createDiv({ cls: `acc-msg acc-msg-${m.role}` });
      const body = row.createDiv({ cls: "acc-msg-body" });
      this.renderMessageBody(body, m.role, m.content, m);
      if (m.role === "assistant") this.lastAssistantBodyEl = body;
    }
    el.scrollTop = el.scrollHeight;
  }

  appendAssistantChunk(text) {
    this.clearThinkingPlaceholder();
    this.markToolsCompleted();
    this.scheduleToolRender();
    const last = this.messages[this.messages.length - 1];
    if (last && last.role === "assistant" && this.streamingAssistant) {
      last.content += text;
      if (this.lastAssistantBodyEl) {
        this.scheduleAssistantMarkdownRender();
        return;
      }
    } else {
      this.messages.push({ role: "assistant", content: text });
      this.streamingAssistant = true;
    }
    if (this.isSending) this.setStatus("回复中…");
    this.scheduleMessagesRender();
  }

  appendErrorLine(text) {
    this.messages.push({ role: "error", content: text });
    this.scheduleMessagesRender();
  }

  handleToolEvent(ev) {
    if (this.plugin.settings.showToolCalls) {
      const line = [ev.action, ev.detail || ev.title].filter(Boolean).join(" · ");
      this.messages.push({ role: "system", content: line || "tool_call" });
      this.scheduleMessagesRender();
      return;
    }
    this.upsertToolMessage(ev);
  }

  buildPromptText(userText, blocks, vaultRoot) {
    const ctx = blocks ?? this.contextBlocks;
    const parts = ["# 工作环境\n\n"];
    if (vaultRoot) {
      parts.push(
        `- **当前仓库（Obsidian Vault 根目录）**：\`${vaultRoot}\`\n`
      );
      parts.push(
        "- 默认只在该目录及其子路径读写文件；勿擅自访问库外路径。\n"
      );
    } else {
      parts.push("- 未能解析 Vault 根目录，请仅在用户明示的路径下操作。\n");
    }
    if (ctx.length) {
      parts.push("\n# 用户附加上下文\n");
      for (const b of ctx) {
        parts.push(`## ${b.label}\n\n${b.text}\n`);
      }
    }
    parts.push("\n# 用户问题\n\n");
    parts.push(userText);
    return parts.join("");
  }

  acpOnPermissionRequest(params, respond) {
    let summary = "";
    try {
      summary =
        typeof params === "string"
          ? params
          : JSON.stringify(params, null, 2);
    } catch {
      summary = String(params);
    }
    const finish = (choice) => {
      respond({
        outcome: { outcome: "selected", optionId: choice },
      });
    };
    new PermissionModal(this.app, summary, finish).open();
  }

  acpOnSessionUpdate(params) {
    const sid = resolveAcpSessionIdFromUpdate(params);
    if (sid && this.acpSessionId && sid !== this.acpSessionId) return;

    const ev = parseSessionUpdateForDisplay(params);
    if (ev.type === "skip") return;
    if (ev.type === "assistant") {
      this.appendAssistantChunk(ev.text);
      return;
    }
    if (
      ev.type === "tool_start" ||
      ev.type === "tool_tick" ||
      ev.type === "tool_done"
    ) {
      this.handleToolEvent(ev);
    }
  }

  async sendMessage() {
    if (!this.inputEl) return;
    const userText = this.extractComposerText().trim();
    if (!userText) return;

    const agentPath = resolveAgentPath(this.plugin.settings);
    const cachedCli = checkAgentCli(agentPath, true);
    if (!cachedCli.ok && !fs.existsSync(agentPath)) {
      new Notice(
        "Cursor Agent CLI 不可用。请安装 agent 并执行 agent login。\n" +
          agentPath,
        12000
      );
      return;
    }

    const contextSnapshot = this.contextBlocks.slice();
    const contextSummary = summarizeContextForDisplay(contextSnapshot);
    const userMsg = {
      role: "user",
      content: userText,
      contextSummary: contextSummary.length ? contextSummary : undefined,
    };

    const job = {
      userText,
      contextSnapshot,
      contextSummary,
      userMsg,
      _uiPromoted: false,
    };
    this.sendQueue.push(job);
    this.contextBlocks = [];
    this.clearComposerEditor();
    this.renderQueueDock();

    const isFirstInLine = !this._queueProcessing && this.sendQueue.length === 1;
    if (isFirstInLine) {
      job._uiPromoted = true;
      this.promoteJobToChat(job.userMsg);
      this._userCancelled = false;
      this.isSending = true;
      this.streamingAssistant = false;
      this.showThinkingPlaceholder("正在准备…");
      this.setStatus("准备中…");
    } else if (this._queueProcessing) {
      this.setStatus(`已加入队列（${this.sendQueue.length} 条等待）`);
    }
    this.updateComposerChrome();

    if (this._queueProcessing) {
      return;
    }

    requestAnimationFrame(() => void this.processSendQueue());
  }

  promoteJobToChat(job) {
    this.messages.push(job.userMsg);
    this.appendUserMessageToDom(job.userMsg);
  }

  async processSendQueue() {
    if (this._queueProcessing) return;
    this._queueProcessing = true;
    this.updateComposerChrome();

    while (this.sendQueue.length > 0) {
      // cancelTurn 已清空取消时刻的排队项；此处只复位标志，保留取消后新入队的消息
      if (this._userCancelled) {
        this._userCancelled = false;
        this.renderQueueDock();
      }
      const job = this.sendQueue.shift();
      this.renderQueueDock();
      this.updateComposerChrome();
      const remaining = this.sendQueue.length;
      if (!job._uiPromoted) {
        this.promoteJobToChat(job.userMsg);
        this.showThinkingPlaceholder("正在准备…");
        this.setStatus("准备中…");
      }
      if (remaining > 0) {
        this.setStatus(`回复中 · 队列剩余 ${remaining}`);
      }
      await this.executeTurn(job);
    }

    this._userCancelled = false;
    this._queueProcessing = false;
    this.isSending = false;
    this.streamingAssistant = false;
    this.renderQueueDock();
    this.updateComposerChrome();
    this.markToolsCompleted();
    this.scheduleToolRender();
    this.setStatus("就绪");
  }

  async executeTurn(job) {
    const { userText, contextSnapshot } = job;
    this._userCancelled = false;
    this.isSending = true;
    this.streamingAssistant = false;
    this.updateComposerChrome();

    if (!this.pendingThinking) {
      this.showThinkingPlaceholder("正在准备…");
      this.setStatus("准备中…");
    }

    await yieldToUi();

    try {
      const agentPath = resolveAgentPath(this.plugin.settings);
      const cachedCli = checkAgentCli(agentPath, true);
      if (!cachedCli.ok) {
        const fresh = checkAgentCli(agentPath, false);
        if (!fresh.ok) {
          throw new Error(fresh.msg || "Cursor Agent CLI 不可用");
        }
      }

      this.showThinkingPlaceholder("连接 Agent…");
      this.setStatus("连接 Agent…");
      await this.plugin.ensureAcp(this);
      const acp = this.plugin.acp;
      if (!acp) throw new Error("ACP 未连接");

      const vaultRoot = getVaultOsPath(this.app);
      if (!vaultRoot) throw new Error("无法获取 Vault 路径");

      if (!this.acpSessionId) {
        this.showThinkingPlaceholder("创建会话…");
        this.setStatus("创建会话…");
        await this.plugin.ensureAcpSession(this);
      }

      const fullText = this.buildPromptText(
        userText,
        contextSnapshot,
        vaultRoot
      );
      this.clearThinkingPlaceholder();
      this.setStatus("分析中…");

      await acp.sessionPrompt(this.acpSessionId, [
        { type: "text", text: fullText },
      ]);
      this.streamingAssistant = false;
      this.markToolsCompleted();
      this.clearThinkingPlaceholder();
      if (!this._userCancelled) {
        const q = this.sendQueue.length;
        this.setStatus(q > 0 ? `就绪 · 下一条排队中（${q}）` : "就绪");
      }
    } catch (e) {
      if (!this._userCancelled) {
        const msg = e instanceof Error ? e.message : String(e);
        new Notice("Cursor Chat 错误: " + msg, 15000);
        this.appendErrorLine(msg);
        this.setStatus("错误");
        console.error("[ai-cursor-chat]", e);
      }
      this.clearThinkingPlaceholder();
    } finally {
      this.isSending = false;
      this.streamingAssistant = false;
      this.markToolsCompleted();
      this.scheduleToolRender();
      this.updateComposerChrome();
    }
  }

  async cancelTurn() {
    if (!this.isSending && !this._queueProcessing) return;

    this._userCancelled = true;
    this.sendQueue.length = 0;
    this.renderQueueDock();
    const acp = this.plugin.acp;
    if (acp?.isRunning() && this.acpSessionId) {
      acp.sessionCancel(this.acpSessionId);
    }

    this.isSending = false;
    this.streamingAssistant = false;
    this.clearThinkingPlaceholder();
    this.markToolsCompleted();
    this.scheduleToolRender();
    this.updateComposerChrome();
    this.setStatus("已停止");
    new Notice("已停止（队列已清空）", 2500);
  }
}

class CursorChatSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AI Cursor Chat" });

    new Setting(containerEl)
      .setName("Agent CLI 路径")
      .setDesc(
        "Cursor Agent 可执行文件，留空则使用 ~/.local/bin/agent。需已 agent login。"
      )
      .addText((t) =>
        t
          .setPlaceholder(defaultAgentPath())
          .setValue(this.plugin.settings.agentPath)
          .onChange(async (v) => {
            this.plugin.settings.agentPath = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("模式")
      .setDesc("agent：可改文件；ask：只问答；plan：规划模式（若 CLI 支持）")
      .addDropdown((d) =>
        d
          .addOptions({
            agent: "Agent",
            ask: "Ask",
            plan: "Plan",
          })
          .setValue(this.plugin.settings.mode)
          .onChange(async (v) => {
            this.plugin.settings.mode = v;
            await this.plugin.saveSettings();
            await this.plugin.disposeAcp();
          })
      );

    new Setting(containerEl)
      .setName("模型")
      .setDesc("留空使用 CLI 默认；可填 agent models 列表中的名称")
      .addText((t) =>
        t
          .setPlaceholder("默认")
          .setValue(this.plugin.settings.model)
          .onChange(async (v) => {
            this.plugin.settings.model = v;
            await this.plugin.saveSettings();
            await this.plugin.disposeAcp();
          })
      );

    new Setting(containerEl)
      .setName("信任工作区")
      .setDesc("向 agent 传递 --trust（推荐对当前 Vault 开启）")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.trustWorkspace)
          .onChange(async (v) => {
            this.plugin.settings.trustWorkspace = v;
            await this.plugin.saveSettings();
            await this.plugin.disposeAcp();
          })
      );

    new Setting(containerEl)
      .setName("⌘L 加入选区（优先拦截）")
      .setDesc(
        "编辑与阅读模式均可用：先拖选正文再按 ⌘L。侧栏打开不抢焦点。冲突时可关闭，改用 ⌘⇧E。"
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.captureModLHotkey !== false).onChange(async (v) => {
          this.plugin.settings.captureModLHotkey = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("显示工具调用日志")
      .setDesc("开启后在对话区显示原始 tool_call 日志；默认关闭，改用输入框上方的活动条")
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.showToolCalls).onChange(async (v) => {
          this.plugin.settings.showToolCalls = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("上下文长度上限")
      .setDesc("「加入当前笔记」时的最大字符数")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.maxContextChars))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            if (Number.isFinite(n) && n > 1000) {
              this.plugin.settings.maxContextChars = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("检测 CLI")
      .setDesc("运行 agent status")
      .addButton((b) =>
        b.setButtonText("检测").onClick(() => {
          const p = resolveAgentPath(this.plugin.settings);
          const r = checkAgentCli(p);
          if (r.ok) new Notice("Agent CLI 正常: " + p);
          else
            new Notice(
              "Agent CLI 失败: " + p + "\n" + (r.msg || ""),
              12000
            );
        })
      );

    containerEl.createEl("p", {
      cls: "acc-settings-note",
      text:
        "本插件与 AI Read Tracker 分离：阅读统计见 ai-read-tracker；此处仅负责 Obsidian 内 Cursor Agent 对话。",
    });
  }
}

module.exports = class CursorChatPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.acp = null;
    this.chatView = null;
    this.acpConnectQueue = Promise.resolve();
    /** 右键菜单打开前 DOM 选区常被清空，保留最近一次有效选区 */
    this.selectionSnapshot = { text: "", file: null, at: 0 };

    this.registerView(VIEW_TYPE, (leaf) => new CursorChatView(leaf, this));

    this.addRibbonIcon("message-square", "打开 Cursor Chat", () => {
      void this.activateChatView();
    });

    this.addCommand({
      id: "open-cursor-chat",
      name: "Cursor Chat: 打开侧栏",
      callback: () => void this.activateChatView(),
    });

    this.addCommand({
      id: "reload-cursor-chat",
      name: "Cursor Chat: 重新加载本插件",
      callback: async () => {
        await this.disposeAcp();
        // @ts-ignore
        await this.app.plugins.disablePlugin(PLUGIN_ID);
        // @ts-ignore
        await this.app.plugins.enablePlugin(PLUGIN_ID);
        new Notice("AI Cursor Chat 已重新加载");
      },
    });

    this.addCommand({
      id: "add-selection-to-chat-context",
      name: "Cursor Chat: 加入选区到上下文（Add to Chat）",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "e" }],
      checkCallback: (checking) => {
        const snap = this.getSelectionForAction();
        if (checking) return !!snap.text;
        void this.addSelectionFromEditor(null, snap.file, snap.text);
        return true;
      },
    });

    this.addCommand({
      id: "add-note-to-chat-context",
      name: "Cursor Chat: 加入当前笔记到上下文",
      checkCallback: (checking) => {
        const mv = getActiveMarkdownView(this.app);
        if (checking) return !!mv?.file;
        void this.addCurrentNoteFromEditor(null, mv?.file);
        return true;
      },
    });

    this.registerSelectionSnapshot();
    this.registerCaptureHotkeys();
    this.registerMarkdownContextMenus();

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        this.addChatItemsToMenu(menu, editor, view?.file);
      })
    );

    this.addSettingTab(new CursorChatSettingTab(this.app, this));
  }

  rememberSelection(snap) {
    if (!snap?.text) return;
    this.selectionSnapshot = {
      text: snap.text,
      file: snap.file ?? null,
      at: Date.now(),
      isReading: !!snap.isReading,
    };
  }

  getSelectionForAction() {
    const live = readMarkdownSelection(this.app);
    if (live.text) {
      this.rememberSelection(live);
      return live;
    }
    const cached = this.selectionSnapshot;
    if (cached?.text && Date.now() - cached.at < 60000) {
      return {
        text: cached.text,
        file: cached.file,
        mode: cached.isReading ? "preview" : null,
        isReading: !!cached.isReading,
      };
    }
    return live;
  }

  registerSelectionSnapshot() {
    const refresh = () => {
      const snap = readMarkdownSelection(this.app);
      if (snap.text) this.rememberSelection(snap);
    };
    this.registerDomEvent(document, "mouseup", refresh, { passive: true });
    this.registerDomEvent(document, "selectionchange", refresh, {
      passive: true,
    });
  }

  addChatItemsToMenu(menu, editor, fileHint) {
    const snap = this.getSelectionForAction();
    const sel =
      snap.text ||
      readEditorSelection(editor) ||
      this.selectionSnapshot?.text ||
      "";
    const file = fileHint ?? snap.file ?? getActiveMarkdownView(this.app)?.file;

    if (sel) {
      menu.addItem((item) => {
        item
          .setTitle("加入 Cursor Chat 上下文")
          .setIcon("message-square")
          .onClick(() =>
            void this.addSelectionFromEditor(editor, file, sel)
          );
      });
    }
    if (file) {
      menu.addItem((item) => {
        item
          .setTitle("将当前笔记加入 Cursor Chat")
          .setIcon("file-text")
          .onClick(() => void this.addCurrentNoteFromEditor(null, file));
      });
    }
  }

  /**
   * Obsidian 1.12 阅读模式：editor-menu 有时不触发，用 Menu.forEvent 注入右键菜单。
   */
  registerMarkdownContextMenus() {
    const onContextMenu = (evt) => {
      if (isEventFromChatPanel(evt)) return;
      const target = evt.target;
      if (!target || typeof target.closest !== "function") return;

      const inMarkdown =
        target.closest(".markdown-reading-view") ||
        target.closest(".markdown-preview-view") ||
        target.closest(".markdown-source-view");
      if (!inMarkdown) return;

      const mv = getActiveMarkdownView(this.app);
      if (!mv?.file) return;

      this.rememberSelection(readMarkdownSelection(this.app));

      let menu;
      let merged = false;
      try {
        if (typeof Menu.forEvent === "function") {
          menu = Menu.forEvent(evt);
          merged = true;
        }
      } catch (_) {}
      if (!menu) menu = new Menu();
      this.addChatItemsToMenu(menu, mv.editor, mv.file);
      if (!merged) {
        evt.preventDefault();
        menu.showAtMouseEvent(evt);
      }
    };

    this.registerDomEvent(document, "contextmenu", onContextMenu, {
      capture: true,
    });
  }

  /**
   * 有选区时优先拦截 ⌘L（Obsidian 内置/其他插件常会占用该快捷键）。
   * 无选区时不拦截，保留系统默认行为。
   */
  registerCaptureHotkeys() {
    this.registerDomEvent(
      document,
      "keydown",
      (evt) => {
        if (!this.settings.captureModLHotkey) return;
        if (isEventFromChatPanel(evt)) return;
        if (evt.key !== "l" && evt.key !== "L") return;
        if (!evt.metaKey && !evt.ctrlKey) return;
        if (evt.altKey) return;

        const mv = getActiveMarkdownView(this.app);
        if (!mv) return;

        if (evt.shiftKey) {
          if (!mv.file) return;
          evt.preventDefault();
          evt.stopPropagation();
          void this.addCurrentNoteFromEditor(null, mv.file);
          return;
        }

        const snap = this.getSelectionForAction();
        if (!snap.text) {
          new Notice(
            "请先在正文中拖选文字（阅读模式也支持），再按 ⌘L",
            4000
          );
          return;
        }

        evt.preventDefault();
        evt.stopPropagation();
        void this.addSelectionFromEditor(null, snap.file, snap.text);
      },
      { capture: true }
    );
  }

  onunload() {
    void this.disposeAcp();
  }

  setChatView(view) {
    this.chatView = view || null;
  }

  getActiveChatView() {
    if (this.chatView) return this.chatView;
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    const leaf = leaves[0];
    if (isCursorChatView(leaf?.view)) return leaf.view;
    return null;
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) || {}
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateChatView(focusChat = true) {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      const right = workspace.getRightLeaf(false);
      if (!right) {
        new Notice("无法创建侧栏");
        return null;
      }
      await right.setViewState({ type: VIEW_TYPE, active: true });
      leaf = right;
    }
    workspace.revealLeaf(leaf, focusChat);
    const view = leaf.view;
    if (isCursorChatView(view)) {
      this.setChatView(view);
      return view;
    }
    return null;
  }

  async ensureChatView(focusChat = false) {
    let view = this.getActiveChatView();
    if (view) {
      const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
      if (leaf) this.app.workspace.revealLeaf(leaf, focusChat);
      return view;
    }
    return this.activateChatView(focusChat);
  }

  async addSelectionFromEditor(editor, file, selectedText) {
    const snap = this.getSelectionForAction();
    const text = (selectedText ?? snap.text ?? "").trim();
    if (!text) {
      const hint = snap.isReading || snap.mode === "preview"
        ? "阅读模式下请先用鼠标拖选正文，再按 ⌘L / ⌘⇧E 或右键"
        : "请先在笔记里拖选一段文字，再按 ⌘L / ⌘⇧E";
      new Notice(hint, 7000);
      return;
    }
    const fileResolved = file ?? snap.file ?? null;
    const view = await this.ensureChatView(false);
    if (!view) {
      new Notice("无法打开 Cursor Chat 侧栏");
      return;
    }
    this.addSelectionContext(view, {
      file: fileResolved,
      selectedText: text,
      isReading: snap.isReading,
    });
  }

  async addCurrentNoteFromEditor(editor, file) {
    const view = await this.ensureChatView();
    if (!view) {
      new Notice("无法打开 Cursor Chat 侧栏");
      return;
    }
    const ctx =
      file != null
        ? {
            editor: editor || getActiveMarkdownContext(this.app)?.editor,
            file,
          }
        : getActiveMarkdownContext(this.app);
    await this.addCurrentNoteContext(view, ctx);
  }

  addSelectionContext(view, payload) {
    const text = (payload?.selectedText ?? "").trim();
    if (!text) {
      new Notice("当前没有选中文字");
      return;
    }
    const file = payload?.file ?? null;
    const label = file ? `选区 · ${file.path}` : "选区 · (未命名)";
    view.contextBlocks.push({
      id: uid(),
      kind: "selection",
      label,
      text,
    });
    view.renderContextPreview();
    const modeHint = payload?.isReading ? "，阅读模式" : "";
    new Notice(`已加入选区（${text.length} 字${modeHint}）`);
  }

  async addCurrentNoteContext(view, ctx) {
    const file =
      ctx?.file ?? getActiveMarkdownView(this.app)?.file;
    if (!file) {
      new Notice("请打开一篇 Markdown 笔记");
      return;
    }
    let text = await this.app.vault.read(file);
    const origLen = text.length;
    const max = this.settings.maxContextChars || 32000;
    let truncated = false;
    if (text.length > max) {
      text = text.slice(0, max);
      truncated = true;
    }
    const suffix = truncated
      ? `\n\n[已截断：原文共 ${origLen} 字符，仅发送前 ${max} 字符]`
      : "";
    view.contextBlocks.push({
      id: uid(),
      kind: "note",
      label: `笔记 · ${file.path}`,
      text: text + suffix,
    });
    view.renderContextPreview();
    new Notice(
      truncated
        ? `已加入笔记（已截断至 ${max} 字符）`
        : "已加入当前笔记"
    );
  }

  createAcpClient() {
    return new AcpClient({
      onSessionUpdate: (params) => {
        const v = this.chatView || this.getActiveChatView();
        v?.acpOnSessionUpdate(params);
      },
      onPermissionRequest: (params, respond) => {
        const v = this.chatView || this.getActiveChatView();
        if (v) v.acpOnPermissionRequest(params, respond);
        else {
          respond({
            outcome: { outcome: "selected", optionId: "reject-once" },
          });
        }
      },
      onConnectProgress: (phase) => {
        const labels = {
          spawning: "启动 Agent…",
          initializing: "初始化 ACP…",
          authenticating: "登录校验…",
          ready: "已连接",
          error: "连接失败",
        };
        const v = this.chatView || this.getActiveChatView();
        if (!v) return;
        const label = labels[phase] || phase;
        if (phase === "error") {
          v.setStatus(label);
          return;
        }
        if (v.isSending && phase !== "ready") {
          v.setStatus(label);
        } else if (phase === "ready" && !v.isSending) {
          v.setStatus("就绪");
        }
      },
      onStderrLine: (line) => console.warn("[ai-cursor-chat stderr]", line),
    });
  }

  async disposeAcp() {
    if (this.acp) {
      await this.acp.dispose();
      this.acp = null;
    }
    const v = this.getActiveChatView();
    if (v) {
      v.acpSessionId = null;
      v.setStatus("就绪");
    }
  }

  withAcpConnect(fn) {
    const run = this.acpConnectQueue.then(fn, fn);
    this.acpConnectQueue = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  async prewarmAcp(view) {
    try {
      await this.ensureAcp(view);
      await this.ensureAcpSession(view);
      if (view && !view.isSending) view.setStatus("就绪");
    } catch (_) {
      if (view && !view.isSending) view.setStatus("未连接 Agent");
    }
  }

  async ensureAcpSession(view) {
    if (!view || view.acpSessionId) return;
    const acp = this.acp;
    if (!acp?.isRunning()) return;
    const vaultRoot = getVaultOsPath(this.app);
    if (!vaultRoot) return;
    const { sessionId } = await acp.sessionNew(vaultRoot);
    view.acpSessionId = sessionId;
  }

  async ensureAcp(view) {
    if (view) this.setChatView(view);
    if (this.acp?.isRunning()) return;

    return this.withAcpConnect(async () => {
      if (this.acp?.isRunning()) return;

      const agentPath = resolveAgentPath(this.settings);
      const cli = checkAgentCli(agentPath);
      if (!cli.ok) {
        throw new Error(
          "请先安装 Cursor Agent CLI 并执行 agent login。\n" +
            agentPath +
            "\n" +
            (cli.msg || "")
        );
      }

      const vaultRoot = getVaultOsPath(this.app);
      if (!vaultRoot) {
        throw new Error(
          "无法获取 Vault 根目录。请用「打开文件夹」方式打开本仓库（非仅打开子文件夹）。"
        );
      }

      this.acp = this.createAcpClient();
      const mode = this.settings.mode || "agent";
      await this.acp.spawn({
        agentPath,
        workspaceRoot: vaultRoot,
        mode,
        model: this.settings.model || "",
        trustWorkspace: !!this.settings.trustWorkspace,
        env: augmentPathEnv(),
      });

      if (view) {
        try {
          await this.ensureAcpSession(view);
        } catch (_) {
          /* 首条消息发送时会重试 */
        }
      }
    });
  }
};
