const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  loadMermaid,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  fontSize: 15,
  theme: "auto",
  fitWidth: true,
  padding: 16,
  enableLightbox: true,
  enhanceBuiltin: true,
  lineThickness: 1.6,
};

let renderSeq = 0;
let cachedMermaid = null;
let mermaidLoadPromise = null;

function isDarkMode() {
  return document.body.classList.contains("theme-dark");
}

function resolveMermaidTheme(settings) {
  if (settings.theme && settings.theme !== "auto") return settings.theme;
  // base + themeVariables 才能稳定控制连线颜色（default/dark 会忽略部分变量）
  return "base";
}

function readCssVar(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

function resolveEdgeStrokeColor() {
  const dark = isDarkMode();
  return readCssVar("--text-muted", dark ? "#9aa3ad" : "#5c6370");
}

function resolveNodeFillColor() {
  const dark = isDarkMode();
  if (dark) {
    return readCssVar(
      "--background-modifier-hover",
      readCssVar("--background-modifier-form-field", "#363636")
    );
  }
  return readCssVar("--background-primary", "#ffffff");
}

function resolveNodeBorderColor() {
  const dark = isDarkMode();
  return readCssVar("--text-muted", dark ? "#9aa3ad" : "#5c6370");
}

function buildThemeVariables(settings) {
  const dark = isDarkMode();
  const text = readCssVar("--text-normal", dark ? "#dcddde" : "#2e3338");
  const bg = readCssVar("--background-primary", dark ? "#1e1e1e" : "#ffffff");
  const accent = readCssVar("--interactive-accent", dark ? "#7c6af2" : "#6e59a5");
  const border = readCssVar(
    "--background-modifier-border",
    dark ? "#3d444d" : "#d8dee4"
  );
  const edge = resolveEdgeStrokeColor();
  return {
    darkMode: dark,
    fontSize: `${settings.fontSize}px`,
    fontFamily: "var(--font-text)",
    primaryColor: resolveNodeFillColor(),
    primaryTextColor: text,
    primaryBorderColor: resolveNodeBorderColor(),
    lineColor: edge,
    defaultLinkColor: edge,
    arrowheadColor: edge,
    secondaryColor: dark ? "#21262d" : "#eaeef2",
    tertiaryColor: dark ? "#161b22" : "#f6f8fa",
    background: bg,
    mainBkg: resolveNodeFillColor(),
    nodeBorder: resolveNodeBorderColor(),
    clusterBkg: dark ? "#21262d" : "#f6f8fa",
    titleColor: text,
    edgeLabelBackground: bg,
    noteBkgColor: dark ? "#3d444d" : "#fff8c5",
    noteTextColor: text,
  };
}

/** Obsidian 不默认挂 window.mermaid，须通过官方 loadMermaid() 异步加载 */
async function getMermaidApi() {
  if (cachedMermaid) return cachedMermaid;
  if (!mermaidLoadPromise) {
    if (typeof loadMermaid !== "function") {
      throw new Error(
        "当前 Obsidian 版本过旧，缺少 loadMermaid API（请升级到 1.5+）"
      );
    }
    mermaidLoadPromise = loadMermaid()
      .then((m) => {
        if (!m) throw new Error("loadMermaid() 返回空");
        cachedMermaid = m;
        return m;
      })
      .catch((err) => {
        mermaidLoadPromise = null;
        throw err;
      });
  }
  return mermaidLoadPromise;
}

function encodeSource(source) {
  try {
    return btoa(unescape(encodeURIComponent(source)));
  } catch {
    return "";
  }
}

function decodeSource(b64) {
  if (!b64) return "";
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return "";
  }
}

function injectInitDirective(source, settings) {
  const trimmed = (source || "").trim();
  if (!trimmed) return trimmed;
  if (/%%\{init/i.test(trimmed)) return trimmed;
  const theme = resolveMermaidTheme(settings);
  const vars = buildThemeVariables(settings);
  const init = {
    theme,
    themeVariables: vars,
    flowchart: { curve: "basis", htmlLabels: true, useMaxWidth: false },
    sequence: { diagramMarginX: 24, diagramMarginY: 16 },
  };
  return `%%{init: ${JSON.stringify(init)}}%%\n${trimmed}`;
}

async function ensureMermaidReady(settings) {
  const mermaid = await getMermaidApi();
  const theme = resolveMermaidTheme(settings);
  const cfg = {
    startOnLoad: false,
    securityLevel: "loose",
    theme,
    themeVariables: buildThemeVariables(settings),
    flowchart: { curve: "basis", htmlLabels: true, useMaxWidth: false },
  };
  if (typeof mermaid.initialize === "function") {
    mermaid.initialize(cfg);
  }
  return mermaid;
}

function domEmpty(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function domCreate(parent, className, tag = "div") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  parent.appendChild(el);
  return el;
}

async function runMermaidOnElement(innerEl, source, settings) {
  const mermaid = await ensureMermaidReady(settings);
  const id = `amm-m-${++renderSeq}`;
  const definition = injectInitDirective(source, settings);

  domEmpty(innerEl);
  innerEl.classList.remove("amm-rendered");
  const holder = domCreate(innerEl, "amm-graph");

  if (typeof mermaid.render === "function") {
    const result = await mermaid.render(id, definition);
    holder.innerHTML = result.svg;
    if (typeof result.bindFunctions === "function") {
      result.bindFunctions(holder);
    }
  } else if (typeof mermaid.run === "function") {
    const graph = domCreate(holder, "mermaid");
    graph.id = id;
    graph.textContent = definition;
    await mermaid.run({ nodes: [graph], suppressErrors: false });
  } else if (typeof mermaid.init === "function") {
    const graph = domCreate(holder, "mermaid");
    graph.id = id;
    graph.textContent = definition;
    await mermaid.init(undefined, graph);
  } else {
    throw new Error("Mermaid API 不兼容（缺少 render/run/init）");
  }

  const svg = holder.querySelector("svg");
  if (svg) {
    svg.style.maxWidth = "100%";
    svg.style.height = "auto";
    polishSvgDiagram(svg, settings);
    const hostRoot = innerEl.closest(".amm-host");
    if (hostRoot) {
      applyDiagramCssVars(hostRoot);
    }
  }
  innerEl.classList.add("amm-rendered");
  return svg;
}

/** 修复 flowchart 连线 stroke 丢失（只剩箭头、看不见线） */
function fixSvgEdges(svg, settings) {
  const stroke = resolveEdgeStrokeColor();
  const width =
    settings.lineThickness > 0 ? String(settings.lineThickness) : "1.5";
  const linkSelectors = [
    "path.flowchart-link",
    "g.edgePaths path",
    "g.edgePath path",
    "path.edge-thickness-normal",
    "path.edge-thickness-thick",
  ];
  linkSelectors.forEach((sel) => {
    svg.querySelectorAll(sel).forEach((node) => {
      node.setAttribute("stroke", stroke);
      node.setAttribute("stroke-width", width);
      node.setAttribute("fill", "none");
      node.style.stroke = stroke;
      node.style.fill = "none";
    });
  });
  svg.querySelectorAll("marker path, marker polygon").forEach((node) => {
    node.setAttribute("fill", stroke);
    node.setAttribute("stroke", stroke);
  });
}

/** 保证节点框在浅色底（尤其灯箱）上仍可见 */
function fixSvgNodes(svg) {
  const fill = resolveNodeFillColor();
  const border = resolveNodeBorderColor();
  const nodeShapeSelectors = [
    "g.node rect",
    "g.node polygon",
    "g.node circle",
    "g.node path.label-container",
    "g.nodes rect",
    "g.nodes polygon",
  ];
  nodeShapeSelectors.forEach((sel) => {
    svg.querySelectorAll(sel).forEach((shape) => {
      if (shape.closest("g.edgePaths, g.edgePath, g.edgeLabel")) return;
      shape.setAttribute("fill", fill);
      shape.setAttribute("stroke", border);
      shape.setAttribute("stroke-width", "2");
      shape.style.fill = fill;
      shape.style.stroke = border;
      shape.style.strokeWidth = "2px";
    });
  });
  svg.querySelectorAll("g.cluster rect").forEach((shape) => {
    shape.setAttribute("stroke", border);
    shape.setAttribute("stroke-width", "1.75");
    shape.style.stroke = border;
    shape.style.strokeWidth = "1.75px";
  });
}

function applyDiagramCssVars(rootEl) {
  if (!rootEl) return;
  rootEl.style.setProperty("--amm-edge-color", resolveEdgeStrokeColor());
  rootEl.style.setProperty("--amm-node-fill", resolveNodeFillColor());
  rootEl.style.setProperty("--amm-node-border", resolveNodeBorderColor());
}

/** 裁掉 Mermaid SVG 多余留白，避免预览里图缩成一小块 */
function trimSvgViewport(svg, opts = {}) {
  const fillWidth = opts.fillWidth !== false;
  if (!svg) return;
  const pad = 12;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const parts = svg.querySelectorAll(
    "g.node, g.edgePaths, g.edgeLabel, g.cluster, g.label, g.root, g.subgraph"
  );
  const measure = (el) => {
    try {
      const b = el.getBBox();
      if (!b.width && !b.height) return;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } catch (_) {
      /* getBBox 在部分节点上可能失败 */
    }
  };
  if (parts.length) {
    parts.forEach(measure);
  } else {
    const g = svg.querySelector("g");
    if (g) measure(g);
  }
  if (!isFinite(minX) || !isFinite(minY)) return;
  const x = minX - pad;
  const y = minY - pad;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.removeAttribute("height");
  svg.removeAttribute("width");
  if (fillWidth) {
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.maxWidth = "100%";
  } else {
    svg.style.width = "auto";
    svg.style.height = "auto";
    svg.style.maxWidth = "none";
  }
}

function scheduleTrimSvgViewport(svg, opts) {
  trimSvgViewport(svg, opts);
  requestAnimationFrame(() => trimSvgViewport(svg, opts));
}

function polishSvgDiagram(svg, settings, opts) {
  fixSvgEdges(svg, settings);
  fixSvgNodes(svg);
  scheduleTrimSvgViewport(svg, opts);
}

class AmmLightbox {
  constructor(app, svgEl, settings, title) {
    this.app = app;
    this.svgEl = svgEl;
    this.settings = settings || DEFAULT_SETTINGS;
    this.title = title || "Mermaid";
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.panning = false;
    this.lastX = 0;
    this.lastY = 0;
    this.rootEl = null;
    this.fitBaseScale = 1;
  }

  open() {
    this.close();

    const root = document.body.createDiv({ cls: "amm-lightbox" });
    this.rootEl = root;

    const header = root.createDiv({ cls: "amm-lightbox-header" });
    const addBtn = (label, fn) => {
      const b = header.createEl("button", { text: label });
      b.addEventListener("click", fn);
      return b;
    };
    addBtn("放大", () => this.setScale(this.scale * 1.2));
    addBtn("缩小", () => this.setScale(this.scale / 1.2));
    addBtn("适应窗口", () => this.fitToStage());
    addBtn("关闭", () => this.close());

    const stage = root.createDiv({ cls: "amm-lightbox-stage" });
    const viewport = stage.createDiv({ cls: "amm-lightbox-viewport" });
    const inner = viewport.createDiv({ cls: "amm-lightbox-inner" });
    const clone = this.svgEl.cloneNode(true);
    inner.appendChild(clone);
    applyDiagramCssVars(inner);
    polishSvgDiagram(clone, this.settings, { fillWidth: false });
    this.innerEl = inner;
    this.viewportEl = viewport;
    this.stageEl = stage;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.fitToStage());
    });

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.setScale(this.scale * factor);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    this._onWheel = onWheel;

    stage.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.panning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      stage.addClass("is-panning");
    });
    window.addEventListener("mousemove", this._onMove = (e) => {
      if (!this.panning) return;
      this.panX += e.clientX - this.lastX;
      this.panY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.applyTransform();
    });
    window.addEventListener("mouseup", this._onUp = () => {
      this.panning = false;
      stage.removeClass("is-panning");
    });
    window.addEventListener("keydown", this._onKey = (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  setScale(next) {
    const base = this.fitBaseScale || 1;
    const min = Math.max(0.12, base * 0.35);
    const max = base * 10;
    this.scale = Math.min(max, Math.max(min, next));
    this.applyTransform();
  }

  applyTransform() {
    if (!this.innerEl) return;
    this.innerEl.style.transformOrigin = "center center";
    this.innerEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  measureSvgContentSize(svg) {
    trimSvgViewport(svg, { fillWidth: false });
    const vb = svg.viewBox.baseVal;
    let width = vb?.width ?? 0;
    let height = vb?.height ?? 0;
    if (width < 2 || height < 2) {
      try {
        const b = svg.getBBox();
        if (b.width > 1 && b.height > 1) {
          width = b.width;
          height = b.height;
        }
      } catch (_) {
        /* ignore */
      }
    }
    if (width < 2 || height < 2) {
      const r = svg.getBoundingClientRect();
      width = r.width;
      height = r.height;
    }
    if (width > 1 && height > 1) {
      svg.setAttribute("width", String(Math.round(width)));
      svg.setAttribute("height", String(Math.round(height)));
      svg.style.width = `${width}px`;
      svg.style.height = `${height}px`;
      svg.style.maxWidth = "none";
    }
    return { width, height };
  }

  fitToStage() {
    const svg = this.innerEl?.querySelector("svg");
    if (!svg || !this.stageEl) return;

    this.panX = 0;
    this.panY = 0;
    this.innerEl.style.transform = "none";

    const { width: cw, height: ch } = this.measureSvgContentSize(svg);
    const margin = 32;
    const stageW = Math.max(1, this.stageEl.clientWidth - margin);
    const stageH = Math.max(1, this.stageEl.clientHeight - margin);
    if (cw < 2 || ch < 2) return;

    this.fitBaseScale = Math.min(stageW / cw, stageH / ch);
    this.scale = this.fitBaseScale;
    this.applyTransform();
  }

  close() {
    if (this._onMove) window.removeEventListener("mousemove", this._onMove);
    if (this._onUp) window.removeEventListener("mouseup", this._onUp);
    if (this._onKey) window.removeEventListener("keydown", this._onKey);
    if (this._onWheel && this.stageEl) {
      this.stageEl.removeEventListener("wheel", this._onWheel);
    }
    this._onMove = null;
    this._onUp = null;
    this._onKey = null;
    this._onWheel = null;
    this.innerEl = null;
    this.stageEl = null;
    this.viewportEl = null;
    this.rootEl?.remove();
    this.rootEl = null;
  }
}

function attachToolbar(host, plugin, source) {
  if (host.querySelector(".amm-toolbar")) return;

  const toolbar = domCreate(host, "amm-toolbar");
  const addBtn = (label, title, onClick) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    toolbar.appendChild(b);
  };

  addBtn("↺", "重新渲染", () => {
    void plugin.rerenderHost(host);
  });

  if (plugin.settings.enableLightbox) {
    addBtn("⛶", "全屏查看", () => {
      const svg = host.querySelector(".amm-mermaid-inner svg, .mermaid svg");
      if (!svg) {
        new Notice("尚未生成 SVG");
        return;
      }
      new AmmLightbox(plugin.app, svg, plugin.settings).open();
    });
  }

  addBtn("📋", "复制源码", () => {
    const text = decodeSource(host.dataset.ammSourceB64) || source;
    void navigator.clipboard.writeText(text).then(
      () => new Notice("已复制 Mermaid 源码"),
      () => new Notice("复制失败")
    );
  });
}

async function buildMermaidHost(host, source, plugin) {
  domEmpty(host);
  host.classList.add("amm-host");
  if (plugin.settings.fitWidth) host.classList.add("amm-fit-width");
  host.style.setProperty("--amm-pad", `${plugin.settings.padding}px`);
  host.dataset.ammSourceB64 = encodeSource(source);

  attachToolbar(host, plugin, source);

  const stage = domCreate(host, "amm-stage");
  const inner = domCreate(stage, "amm-mermaid-inner");

  try {
    await runMermaidOnElement(inner, source, plugin.settings);
    if (plugin.settings.enableLightbox) {
      const svg = inner.querySelector("svg");
      if (svg) {
        svg.style.cursor = "zoom-in";
        svg.addEventListener("dblclick", (e) => {
          e.preventDefault();
          new AmmLightbox(plugin.app, svg, plugin.settings).open();
        });
      }
    }
  } catch (err) {
    domEmpty(inner);
    const errEl = domCreate(inner, "amm-error");
    errEl.textContent = `Mermaid 渲染失败：${err instanceof Error ? err.message : String(err)}`;
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = source;
    pre.appendChild(code);
    inner.appendChild(pre);
  }
}

class MermaidPreviewSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AI Mermaid Preview" });

    new Setting(containerEl)
      .setName("字号")
      .setDesc("图中文字基准大小（像素）")
      .addSlider((s) =>
        s
          .setLimits(12, 22, 1)
          .setValue(this.plugin.settings.fontSize)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.fontSize = v;
            await this.plugin.saveSettings();
            this.plugin.scheduleRefresh();
          })
      );

    new Setting(containerEl)
      .setName("Mermaid 主题")
      .setDesc("auto 跟随 Obsidian 明暗")
      .addDropdown((d) =>
        d
          .addOptions({
            auto: "自动（base + 主题变量）",
            base: "base",
            default: "default",
            dark: "dark",
            forest: "forest",
            neutral: "neutral",
          })
          .setValue(this.plugin.settings.theme)
          .onChange(async (v) => {
            this.plugin.settings.theme = v;
            await this.plugin.saveSettings();
            this.plugin.scheduleRefresh();
          })
      );

    new Setting(containerEl)
      .setName("自适应宽度")
      .setDesc("图表居中并限制在笔记栏宽度内")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.fitWidth).onChange(async (v) => {
          this.plugin.settings.fitWidth = v;
          await this.plugin.saveSettings();
          this.plugin.scheduleRefresh();
        })
      );

    new Setting(containerEl)
      .setName("内边距")
      .setDesc("图表卡片留白（像素）")
      .addSlider((s) =>
        s
          .setLimits(0, 32, 2)
          .setValue(this.plugin.settings.padding)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.padding = v;
            await this.plugin.saveSettings();
            this.plugin.scheduleRefresh();
          })
      );

    new Setting(containerEl)
      .setName("全屏 / 双击放大")
      .setDesc("工具栏全屏按钮；双击图表打开灯箱")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enableLightbox).onChange(async (v) => {
          this.plugin.settings.enableLightbox = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("增强内置渲染块")
      .setDesc("对 Obsidian 默认已渲染的 .mermaid 块再套一层样式（关闭则仅接管 ```mermaid 代码块）")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enhanceBuiltin).onChange(async (v) => {
          this.plugin.settings.enhanceBuiltin = v;
          await this.plugin.saveSettings();
          this.plugin.scheduleRefresh();
        })
      );

    new Setting(containerEl)
      .setName("线条粗细")
      .setDesc("略增细线可读性（0 表示不调整）")
      .addSlider((s) =>
        s
          .setLimits(0, 3, 0.1)
          .setValue(this.plugin.settings.lineThickness)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.lineThickness = v;
            await this.plugin.saveSettings();
            this.plugin.scheduleRefresh();
          })
      );
  }
}

module.exports = class MermaidPreviewPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.refreshTimer = null;

    this.registerMarkdownCodeBlockProcessor(
      "mermaid",
      async (source, el, _ctx) => {
        const host = el;
        await buildMermaidHost(host, source, this);
      },
      -100
    );

    this.registerMarkdownPostProcessor((el) => {
      if (!this.settings.enhanceBuiltin) return;
      this.enhanceBuiltinBlocks(el);
    });

    this.registerEvent(
      this.app.workspace.on("css-change", () => this.scheduleRefresh())
    );

    this.addCommand({
      id: "reload-mermaid-preview-plugin",
      name: "Mermaid Preview: 重新加载本插件",
      callback: () => {
        const id = this.manifest.id;
        const plugins = this.app.plugins;
        void plugins.disablePlugin(id).then(() => plugins.enablePlugin(id));
      },
    });

    this.addCommand({
      id: "refresh-all-mermaid-diagrams",
      name: "Mermaid Preview: 刷新当前页图表",
      callback: () => this.refreshVisible(),
    });

    this.addSettingTab(new MermaidPreviewSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.refreshVisible();
    });
  }

  onunload() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    cachedMermaid = null;
    mermaidLoadPromise = null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => this.refreshVisible(), 280);
  }

  collectHosts(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(".amm-host[data-amm-source-b64]"));
  }

  async rerenderHost(host) {
    const source = decodeSource(host.dataset.ammSourceB64);
    if (!source) return;
    await buildMermaidHost(host, source, this);
  }

  refreshVisible() {
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = leaf.view;
      const container = view?.containerEl;
      if (!container) continue;
      const hosts = this.collectHosts(container);
      for (const host of hosts) {
        void this.rerenderHost(host);
      }
    }
  }

  enhanceBuiltinBlocks(root) {
    root.querySelectorAll(".block-language-mermaid").forEach((block) => {
      if (block.closest(".amm-host")) return;
      if (block.dataset.ammWrapped === "1") return;

      const svg = block.querySelector("svg");
      if (!svg) return;

      const source =
        block.querySelector("pre code")?.textContent?.trim() ||
        block.querySelector(".mermaid")?.textContent?.trim() ||
        "";

      const wrapper = document.createElement("div");
      wrapper.className = "amm-host amm-host--wrapped";
      if (this.settings.fitWidth) wrapper.classList.add("amm-fit-width");
      wrapper.style.setProperty("--amm-pad", `${this.settings.padding}px`);
      if (source) wrapper.dataset.ammSourceB64 = encodeSource(source);

      const parent = block.parentElement;
      if (!parent) return;
      parent.insertBefore(wrapper, block);
      const stage = domCreate(wrapper, "amm-stage");
      stage.appendChild(block);
      block.dataset.ammWrapped = "1";

      attachToolbar(wrapper, this, source);

      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
      polishSvgDiagram(svg, this.settings);
      applyDiagramCssVars(wrapper);
      if (this.settings.enableLightbox) {
        svg.style.cursor = "zoom-in";
        svg.addEventListener("dblclick", (e) => {
          e.preventDefault();
          new AmmLightbox(this.app, svg, this.settings).open();
        });
      }
    });
  }
};
