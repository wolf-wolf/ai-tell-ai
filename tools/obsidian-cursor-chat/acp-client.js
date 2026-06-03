const { spawn } = require("child_process");
const readline = require("readline");

/**
 * Cursor Agent CLI in ACP mode — JSON-RPC over newline-delimited stdout.
 * Ported from obsidian-cursor-plugin (MIT) with minimal surface for ai-cursor-chat.
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
      env: { ...process.env },
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
      clientInfo: { name: "ai-cursor-chat", version: "0.1.0" },
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

  notify(method, params) {
    if (!this.proc?.stdin) return;
    this.writeLine({ jsonrpc: "2.0", method, params });
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
        let errMsg = msg.error.message ?? "JSON-RPC error";
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
  const content = upd.content && typeof upd.content === "object" ? upd.content : {};

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
      "Tool";
    return {
      type: "tool",
      text: `[${title}] ${kind}`,
    };
  }

  if (kind === "session_info_update" || kind) {
    return { type: "skip" };
  }

  return { type: "skip" };
}

module.exports = {
  AcpClient,
  resolveAcpSessionIdFromUpdate,
  parseSessionUpdateForDisplay,
};
