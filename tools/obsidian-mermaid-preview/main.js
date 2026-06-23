const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  loadMermaid,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  fontSize: 12,
  theme: "auto",
  fitWidth: true,
  fitViewInline: true,
  inlineMaxHeight: 480,
  compactLayout: true,
  nodeSpacing: 22,
  rankSpacing: 22,
  flowchartPadding: 6,
  padding: 12,
  enableLightbox: true,
  enhanceBuiltin: true,
  lineThickness: 1.4,
  nodeBorderWidth: 1.25,
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

function resolveClusterFillColor() {
  const dark = isDarkMode();
  return readCssVar(
    "--background-modifier-form-field",
    dark ? "#2a2a2a" : "#f3f5f7"
  );
}

function resolveClusterBorderColor() {
  return readCssVar(
    "--background-modifier-border",
    isDarkMode() ? "#3d444d" : "#d8dee4"
  );
}

function resolveTextColor() {
  const dark = isDarkMode();
  return readCssVar("--text-normal", dark ? "#dcddde" : "#2e3338");
}

/** Mermaid 布局阶段无法解析 CSS var()，须传入已计算字体栈 */
function resolveFontFamily() {
  const fromVar = readCssVar("--font-text", "");
  if (fromVar && !fromVar.startsWith("var(")) return fromVar;
  const computed = getComputedStyle(document.body).fontFamily;
  return computed || 'ui-sans-serif, system-ui, sans-serif';
}

function buildThemeVariables(settings) {
  const dark = isDarkMode();
  const text = resolveTextColor();
  const bg = readCssVar("--background-primary", dark ? "#1e1e1e" : "#ffffff");
  const border = resolveClusterBorderColor();
  const edge = resolveEdgeStrokeColor();
  const clusterFill = resolveClusterFillColor();
  return {
    darkMode: dark,
    fontSize: `${settings.fontSize}px`,
    fontFamily: resolveFontFamily(),
    primaryColor: resolveNodeFillColor(),
    primaryTextColor: text,
    primaryBorderColor: resolveNodeBorderColor(),
    lineColor: edge,
    defaultLinkColor: edge,
    arrowheadColor: edge,
    secondaryColor: clusterFill,
    tertiaryColor: resolveNodeFillColor(),
    background: bg,
    mainBkg: resolveNodeFillColor(),
    nodeBorder: resolveNodeBorderColor(),
    clusterBkg: clusterFill,
    clusterBorder: border,
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

function buildFlowchartConfig(settings) {
  const htmlLabels =
    settings.flowchartHtmlLabels !== undefined
      ? settings.flowchartHtmlLabels
      : true;
  const cfg = {
    curve: "basis",
    htmlLabels,
    useMaxWidth: settings.fitWidth !== false,
  };
  if (settings.compactLayout !== false) {
    cfg.padding = settings.flowchartPadding ?? 8;
    cfg.nodeSpacing = settings.nodeSpacing ?? 28;
    cfg.rankSpacing = settings.rankSpacing ?? 28;
  } else {
    cfg.padding = settings.flowchartPadding ?? 14;
    cfg.nodeSpacing = settings.nodeSpacing ?? 36;
    cfg.rankSpacing = settings.rankSpacing ?? 40;
  }
  return cfg;
}

function buildSequenceConfig(settings) {
  if (settings.compactLayout === false) {
    return { diagramMarginX: 24, diagramMarginY: 16 };
  }
  return { diagramMarginX: 16, diagramMarginY: 10, actorMargin: 40, boxMargin: 6 };
}

function trimPad(settings) {
  return settings.compactLayout !== false ? 14 : 18;
}

function nodeBorderWidth(settings) {
  const w = settings.nodeBorderWidth;
  return w > 0 ? w : 1.25;
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
    flowchart: buildFlowchartConfig(settings),
    sequence: buildSequenceConfig(settings),
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
    flowchart: buildFlowchartConfig(settings),
    sequence: buildSequenceConfig(settings),
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
    polishSvgDiagram(svg, settings);
    const hostRoot = innerEl.closest(".amm-host");
    if (hostRoot) {
      applyDiagramCssVars(hostRoot, settings);
      const stage = hostRoot.querySelector(".amm-stage");
      if (stage) {
        scheduleInlineFit(stage, svg, settings);
        setupInlineFitObserver(hostRoot, stage, svg, settings);
      }
    } else if (settings.fitWidth !== false) {
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
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

/** 解除 Mermaid 对标签 div 的宽度约束后再量，避免 scrollWidth 被 foreignObject 框死 */
function measureLabelContent(labelEl) {
  const style = labelEl.style;
  const prev = {
    width: style.width,
    maxWidth: style.maxWidth,
    minWidth: style.minWidth,
    overflow: style.overflow,
    display: style.display,
    whiteSpace: style.whiteSpace,
  };
  style.width = "auto";
  style.maxWidth = "none";
  style.minWidth = "0";
  style.overflow = "visible";
  // <br/> 标签在 nowrap 下会被量成单行极宽，导致 expandLabelShape 把节点撑爆
  const hasLineBreak =
    /<br\s*\/?>/i.test(labelEl.innerHTML || "") ||
    (labelEl.childElementCount > 1 && labelEl.querySelector("br, p"));
  style.whiteSpace = hasLineBreak ? "normal" : "nowrap";
  if (!style.display || style.display === "table-cell") {
    style.display = hasLineBreak ? "block" : "inline-block";
  }

  const rect = labelEl.getBoundingClientRect?.();
  const w = Math.ceil(
    Math.max(
      labelEl.scrollWidth || 0,
      labelEl.offsetWidth || 0,
      rect?.width || 0
    )
  );
  const h = Math.ceil(
    Math.max(
      labelEl.scrollHeight || 0,
      labelEl.offsetHeight || 0,
      rect?.height || 0
    )
  );

  style.width = prev.width;
  style.maxWidth = prev.maxWidth;
  style.minWidth = prev.minWidth;
  style.overflow = prev.overflow;
  style.display = prev.display;
  style.whiteSpace = prev.whiteSpace;

  return { width: w, height: h };
}

/** 按实际渲染尺寸对称扩展节点/边标签框，避免 foreignObject 文字被裁切 */
function expandLabelShape(shape, fo, labelEl, padX, padY) {
  const measured = measureLabelContent(labelEl);
  const contentW = measured.width;
  const contentH = measured.height;
  if (contentW < 1) return false;

  const foW = fo ? parseFloat(fo.getAttribute("width") || "0") : 0;
  const foH = fo ? parseFloat(fo.getAttribute("height") || "0") : 0;
  const shapeW = parseFloat(shape.getAttribute("width") || "0");
  const shapeH = parseFloat(shape.getAttribute("height") || "0");
  const baseW = Math.max(foW, shapeW);
  const baseH = Math.max(foH, shapeH);
  const needW = contentW + padX;
  const needH = contentH + padY;
  const extraW = Math.max(0, needW - baseW);
  const extraH = Math.max(0, needH - baseH);
  if (extraW < 1 && extraH < 1) return false;

  if (shape.tagName !== "rect") return false;

  const cx = parseFloat(shape.getAttribute("x") || "0") + shapeW / 2;
  const cy = parseFloat(shape.getAttribute("y") || "0") + shapeH / 2;
  const newW = shapeW + extraW;
  const newH = shapeH + extraH;
  shape.setAttribute("width", String(newW));
  shape.setAttribute("height", String(newH));
  shape.setAttribute("x", String(cx - newW / 2));
  shape.setAttribute("y", String(cy - newH / 2));

  if (fo) {
    const fcx = parseFloat(fo.getAttribute("x") || "0") + foW / 2;
    const fcy = parseFloat(fo.getAttribute("y") || "0") + foH / 2;
    const newFoW = foW + extraW;
    const newFoH = foH + extraH;
    fo.setAttribute("width", String(newFoW));
    fo.setAttribute("height", String(newFoH));
    fo.setAttribute("x", String(fcx - newFoW / 2));
    fo.setAttribute("y", String(fcy - newFoH / 2));
  }
  return true;
}

function fixLabelClipping(svg) {
  if (!svg) return false;
  let changed = false;
  svg.querySelectorAll("g.node").forEach((node) => {
    const fo = node.querySelector("foreignObject");
    const shape = node.querySelector("rect");
    const labelEl = fo?.querySelector("div, span");
    if (!shape || !labelEl) return;
    if (expandLabelShape(shape, fo, labelEl, 12, 8)) changed = true;
  });

  svg.querySelectorAll("g.edgeLabel").forEach((node) => {
    const fo = node.querySelector("foreignObject");
    const shape = node.querySelector("rect");
    const labelEl = fo?.querySelector("div, span");
    if (!shape || !labelEl) return;
    if (expandLabelShape(shape, fo, labelEl, 10, 6)) changed = true;
  });
  return changed;
}

/** 布局/字体就绪后重跑裁切修复（内联预览首次 polish 时 foreignObject 常尚未量准） */
function scheduleFixLabelClipping(svg, onDone) {
  const run = () => fixLabelClipping(svg);
  run();
  requestAnimationFrame(() => {
    const changed = run();
    requestAnimationFrame(() => {
      const changed2 = run();
      if (typeof onDone === "function" && (changed || changed2)) onDone();
    });
  });
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      const changed = run();
      if (typeof onDone === "function" && changed) onDone();
    });
  }
}

/** 统一修正节点、子图与标签，保证明暗主题下对比度一致 */
function fixSvgShapes(svg, settings) {
  const borderW = String(nodeBorderWidth(settings));
  const nodeFill = resolveNodeFillColor();
  const nodeBorder = resolveNodeBorderColor();
  const clusterFill = resolveClusterFillColor();
  const clusterBorder = resolveClusterBorderColor();
  const text = resolveTextColor();
  const labelBg = readCssVar(
    "--background-primary",
    isDarkMode() ? "#1e1e1e" : "#ffffff"
  );

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
      shape.setAttribute("fill", nodeFill);
      shape.setAttribute("stroke", nodeBorder);
      shape.setAttribute("stroke-width", borderW);
      shape.style.fill = nodeFill;
      shape.style.stroke = nodeBorder;
      shape.style.strokeWidth = `${borderW}px`;
    });
  });

  ["g.cluster rect", "g.subgraph rect", "g.subgraphs rect"].forEach((sel) => {
    svg.querySelectorAll(sel).forEach((shape) => {
      shape.setAttribute("fill", clusterFill);
      shape.setAttribute("stroke", clusterBorder);
      shape.setAttribute("stroke-width", "1.75");
      shape.style.fill = clusterFill;
      shape.style.stroke = clusterBorder;
      shape.style.strokeWidth = "1.75px";
    });
  });

  svg
    .querySelectorAll(
      "g.cluster text, g.subgraph text, .cluster-label text, .subgraph-label text"
    )
    .forEach((label) => {
      label.setAttribute("fill", text);
      label.style.fill = text;
    });

  svg.querySelectorAll("g.edgeLabel rect").forEach((shape) => {
    shape.setAttribute("fill", labelBg);
    shape.style.fill = labelBg;
  });

  svg.querySelectorAll("g.edgeLabel text, g.edgeLabel span").forEach((label) => {
    label.setAttribute("fill", text);
    label.style.fill = text;
    label.style.color = text;
  });

  svg.querySelectorAll("g.node text, g.nodeLabel text, .nodeLabel text").forEach(
    (label) => {
      label.setAttribute("fill", text);
      label.style.fill = text;
    }
  );

  svg.querySelectorAll("foreignObject div").forEach((label) => {
    label.style.color = text;
  });
}

function applyDiagramCssVars(rootEl, settings = DEFAULT_SETTINGS) {
  if (!rootEl) return;
  rootEl.style.setProperty("--amm-edge-color", resolveEdgeStrokeColor());
  rootEl.style.setProperty("--amm-node-fill", resolveNodeFillColor());
  rootEl.style.setProperty("--amm-node-border", resolveNodeBorderColor());
  rootEl.style.setProperty("--amm-cluster-fill", resolveClusterFillColor());
  rootEl.style.setProperty("--amm-cluster-border", resolveClusterBorderColor());
  rootEl.style.setProperty("--amm-text-color", resolveTextColor());
  rootEl.style.setProperty(
    "--amm-node-border-width",
    `${nodeBorderWidth(settings)}px`
  );
}

/** 裁掉 Mermaid SVG 多余留白，避免预览里图缩成一小块 */
function trimSvgViewport(svg, opts = {}) {
  const fillWidth = opts.fillWidth !== false;
  if (!svg) return;
  const pad = opts.pad ?? 14;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
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
  const parts = svg.querySelectorAll(
    "g.node, g.edgePaths, g.edgePath, g.edgeLabel, g.cluster, g.label, g.root, g.subgraph, marker"
  );
  if (parts.length) {
    parts.forEach(measure);
  }
  svg.querySelectorAll("text, foreignObject").forEach(measure);
  if (!isFinite(minX) || !isFinite(minY)) {
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
  fixSvgShapes(svg, settings);
  const trimOpts = {
    fillWidth: opts?.fillWidth !== false && settings.fitWidth !== false,
    pad: opts?.pad ?? trimPad(settings),
  };
  const retrim = () => scheduleTrimSvgViewport(svg, trimOpts);
  scheduleFixLabelClipping(svg, retrim);
  retrim();
}

/** 内联预览：按栏宽与最大高度等比缩放，避免 TD 决策树一屏装不下 */
function applyInlineFit(stage, svg, settings) {
  if (!stage || !svg || settings.fitViewInline === false) {
    stage?.classList.remove("amm-fit-view");
    stage?.style.removeProperty("--amm-fit-scale");
    return;
  }

  fixLabelClipping(svg);
  trimSvgViewport(svg, { fillWidth: false, pad: trimPad(settings) });

  const maxH = Math.max(120, settings.inlineMaxHeight || 480);
  stage.style.setProperty("--amm-max-h", `${maxH}px`);

  const containerW =
    stage.clientWidth ||
    stage.parentElement?.clientWidth ||
    svg.parentElement?.clientWidth ||
    640;

  const vb = svg.viewBox.baseVal;
  let cw = vb?.width ?? 0;
  let ch = vb?.height ?? 0;
  if (cw < 2 || ch < 2) {
    try {
      const b = svg.getBBox();
      cw = b.width;
      ch = b.height;
    } catch (_) {
      /* ignore */
    }
  }
  if (cw < 2 || ch < 2) return;

  const aspect = ch / cw;
  let displayW = containerW;
  let displayH = displayW * aspect;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = maxH / aspect;
  }

  svg.style.width = `${Math.round(displayW)}px`;
  svg.style.height = `${Math.round(displayH)}px`;
  svg.style.maxWidth = "100%";
  svg.style.maxHeight = `${maxH}px`;
  stage.classList.add("amm-fit-view");
}

function scheduleInlineFit(stage, svg, settings) {
  const run = () => applyInlineFit(stage, svg, settings);
  run();
  requestAnimationFrame(run);
  if (document.fonts?.ready) {
    document.fonts.ready.then(run);
  }
}

function teardownInlineFitObserver(host) {
  const obs = host?._ammInlineFitObserver;
  if (obs) {
    obs.disconnect();
    host._ammInlineFitObserver = null;
  }
}

function setupInlineFitObserver(host, stage, svg, settings) {
  teardownInlineFitObserver(host);
  if (!settings.fitViewInline || typeof ResizeObserver === "undefined") return;
  const obs = new ResizeObserver(() => applyInlineFit(stage, svg, settings));
  obs.observe(stage);
  if (stage.parentElement) obs.observe(stage.parentElement);
  host._ammInlineFitObserver = obs;
}

const LIGHTBOX_FONT_SCALE = 1.75;

/** 去掉内联预览留下的像素尺寸，避免灯箱从缩略图放大变糊 */
function resetSvgDisplayMetrics(svg) {
  if (!svg) return;
  svg.style.removeProperty("width");
  svg.style.removeProperty("height");
  svg.style.removeProperty("max-width");
  svg.style.removeProperty("max-height");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
}

function buildLightboxSettings(settings, renderScale = 1) {
  const base = settings || DEFAULT_SETTINGS;
  const fontSize = Math.round(
    (base.fontSize || 12) * LIGHTBOX_FONT_SCALE * renderScale
  );
  return {
    ...base,
    fontSize: Math.min(36, Math.max(12, fontSize)),
    fitWidth: false,
    fitViewInline: false,
    flowchartHtmlLabels: false,
    compactLayout: false,
    nodeSpacing: 40,
    rankSpacing: 48,
    flowchartPadding: 16,
  };
}

function stripMermaidInit(source) {
  return (source || "").replace(/^\s*%%\{init[\s\S]*?\}%%\s*/m, "").trim();
}

function openAmmLightbox(app, svgEl, settings, source) {
  void new AmmLightbox(app, svgEl, settings, source).open();
}

class AmmLightbox {
  constructor(app, svgEl, settings, source) {
    this.app = app;
    this.svgEl = svgEl;
    this.settings = settings || DEFAULT_SETTINGS;
    this.source = source || "";
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.panning = false;
    this.lastX = 0;
    this.lastY = 0;
    this.rootEl = null;
    this.fitBaseZoom = 1;
    this.contentWidth = 0;
    this.contentHeight = 0;
    this.renderScale = 1;
    this._rerenderTimer = null;
    this._rerendering = false;
  }

  async open() {
    this.close();

    const root = document.body.createDiv({ cls: "amm-lightbox" });
    if (isDarkMode()) root.addClass("amm-lightbox--dark");
    else root.addClass("amm-lightbox--light");
    this.rootEl = root;

    const header = root.createDiv({ cls: "amm-lightbox-header" });
    const addBtn = (label, fn) => {
      const b = header.createEl("button", { text: label });
      b.addEventListener("click", fn);
      return b;
    };
    addBtn("放大", () => this.setZoom(this.zoom * 1.2));
    addBtn("缩小", () => this.setZoom(this.zoom / 1.2));
    addBtn("适应窗口", () => this.fitToStage());
    addBtn("关闭", () => this.close());

    const stage = root.createDiv({ cls: "amm-lightbox-stage" });
    const viewport = stage.createDiv({ cls: "amm-lightbox-viewport" });
    const inner = viewport.createDiv({
      cls: "amm-lightbox-inner amm-diagram-surface",
    });
    this.innerEl = inner;
    this.viewportEl = viewport;
    this.stageEl = stage;

    applyDiagramCssVars(inner, this.settings);

    if (this.source) {
      const holder = domCreate(inner, "amm-graph");
      try {
        await runMermaidOnElement(
          holder,
          stripMermaidInit(this.source),
          buildLightboxSettings(this.settings, 1)
        );
        this.renderScale = 1;
      } catch (err) {
        const errEl = domCreate(inner, "amm-error");
        errEl.textContent = `灯箱渲染失败：${
          err instanceof Error ? err.message : String(err)
        }`;
        return;
      }
    } else if (this.svgEl) {
      const clone = this.svgEl.cloneNode(true);
      resetSvgDisplayMetrics(clone);
      inner.appendChild(clone);
      polishSvgDiagram(clone, this.settings, { fillWidth: false });
    } else {
      inner.createDiv({
        cls: "amm-error",
        text: "没有可显示的 SVG",
      });
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.fitToStage());
    });

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.setZoom(this.zoom * factor);
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
    window.addEventListener(
      "mousemove",
      (this._onMove = (e) => {
        if (!this.panning) return;
        this.panX += e.clientX - this.lastX;
        this.panY += e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.applyTransform();
      })
    );
    window.addEventListener(
      "mouseup",
      (this._onUp = () => {
        this.panning = false;
        stage.removeClass("is-panning");
      })
    );
    window.addEventListener(
      "keydown",
      (this._onKey = (e) => {
        if (e.key === "Escape") this.close();
      })
    );
  }

  setZoom(next) {
    const base = this.fitBaseZoom || 1;
    const min = Math.max(0.12, base * 0.35);
    const max = base * 10;
    this.zoom = Math.min(max, Math.max(min, next));
    this.applyTransform();
    this._pendingDisplayW = this.contentWidth * this.zoom;
    this.scheduleSharpRerender();
  }

  scheduleSharpRerender() {
    clearTimeout(this._rerenderTimer);
    this._rerenderTimer = setTimeout(() => void this.maybeSharpRerender(), 140);
  }

  /** 放大超过当前渲染精度时，按更高字号重绘 SVG 文本（避免 foreignObject 拉伸发糊） */
  async maybeSharpRerender() {
    if (!this.source || this._rerendering || !this.innerEl) return;

    const displayFactor = this.zoom / (this.fitBaseZoom || 1);
    if (displayFactor <= this.renderScale * 1.2) return;

    const holder = this.innerEl.querySelector(".amm-graph");
    if (!holder) return;

    const targetScale = displayFactor;
    const prevDisplayW = this._pendingDisplayW || this.contentWidth * this.zoom;
    const panX = this.panX;
    const panY = this.panY;

    this._rerendering = true;
    try {
      domEmpty(holder);
      await runMermaidOnElement(
        holder,
        stripMermaidInit(this.source),
        buildLightboxSettings(this.settings, targetScale)
      );
      const svg = holder.querySelector("svg");
      if (!svg) return;

      applyDiagramCssVars(this.innerEl, this.settings);
      const { width, height } = this.measureSvgContentSize(svg);
      if (width < 2 || height < 2) return;

      this.contentWidth = width;
      this.contentHeight = height;
      this.renderScale = targetScale;
      this.zoom = prevDisplayW / width;
      this.panX = panX;
      this.panY = panY;
      this.applyTransform();
    } catch (_) {
      /* 保留上一帧，避免放大时闪断 */
    } finally {
      this._rerendering = false;
    }
  }

  /** 用 SVG 矢量尺寸缩放；放大时配合 maybeSharpRerender 提高绘制分辨率 */
  applyTransform() {
    if (!this.innerEl) return;
    const svg = this.innerEl.querySelector("svg");
    if (!svg || this.contentWidth < 2 || this.contentHeight < 2) return;

    const w = this.contentWidth * this.zoom;
    const h = this.contentHeight * this.zoom;
    svg.setAttribute("width", String(Math.round(w)));
    svg.setAttribute("height", String(Math.round(h)));
    svg.style.width = `${w}px`;
    svg.style.height = `${h}px`;
    svg.style.maxWidth = "none";
    svg.style.maxHeight = "none";

    this.innerEl.style.transformOrigin = "center center";
    this.innerEl.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
  }

  measureSvgContentSize(svg) {
    resetSvgDisplayMetrics(svg);
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
    return { width, height };
  }

  fitToStage() {
    const svg = this.innerEl?.querySelector("svg");
    if (!svg || !this.stageEl) return;

    this.panX = 0;
    this.panY = 0;
    this.innerEl.style.transform = "none";

    const { width: cw, height: ch } = this.measureSvgContentSize(svg);
    this.contentWidth = cw;
    this.contentHeight = ch;
    const margin = 32;
    const stageW = Math.max(1, this.stageEl.clientWidth - margin);
    const stageH = Math.max(1, this.stageEl.clientHeight - margin);
    if (cw < 2 || ch < 2) return;

    this.fitBaseZoom = Math.min(stageW / cw, stageH / ch);
    this.zoom = this.fitBaseZoom;
    this.applyTransform();
  }

  close() {
    clearTimeout(this._rerenderTimer);
    this._rerenderTimer = null;
    this._rerendering = false;
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

  addBtn("⊡", "适应视口", () => {
    const stage = host.querySelector(".amm-stage");
    const svg = host.querySelector(".amm-mermaid-inner svg, .amm-graph svg, .mermaid svg");
    if (stage && svg) applyInlineFit(stage, svg, plugin.settings);
  });

  if (plugin.settings.enableLightbox) {
    addBtn("⛶", "全屏查看", () => {
      const svg = host.querySelector(".amm-mermaid-inner svg, .mermaid svg");
      if (!svg) {
        new Notice("尚未生成 SVG");
        return;
      }
      openAmmLightbox(
        plugin.app,
        svg,
        plugin.settings,
        decodeSource(host.dataset.ammSourceB64)
      );
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
  teardownInlineFitObserver(host);
  domEmpty(host);
  host.classList.add("amm-host", "amm-diagram-surface");
  if (plugin.settings.fitWidth) host.classList.add("amm-fit-width");
  if (plugin.settings.fitViewInline !== false) host.classList.add("amm-fit-view-host");
  host.style.setProperty("--amm-pad", `${plugin.settings.padding}px`);
  host.style.setProperty(
    "--amm-max-h",
    `${Math.max(120, plugin.settings.inlineMaxHeight || 480)}px`
  );
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
          openAmmLightbox(
            plugin.app,
            svg,
            plugin.settings,
            decodeSource(host.dataset.ammSourceB64)
          );
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
      .setName("紧凑布局")
      .setDesc("缩小节点间距与图表内边距，适合 flowchart 决策树")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.compactLayout !== false).onChange(async (v) => {
          this.plugin.settings.compactLayout = v;
          await this.plugin.saveSettings();
          this.plugin.scheduleRefresh();
        })
      );

    new Setting(containerEl)
      .setName("节点间距")
      .setDesc("紧凑布局下的 nodeSpacing / rankSpacing（像素）")
      .addSlider((s) =>
        s
          .setLimits(16, 60, 2)
          .setValue(this.plugin.settings.nodeSpacing ?? 28)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.nodeSpacing = v;
            this.plugin.settings.rankSpacing = v;
            await this.plugin.saveSettings();
            this.plugin.scheduleRefresh();
          })
      );

    new Setting(containerEl)
      .setName("内联适应视口")
      .setDesc("阅读模式下按栏宽与最大高度等比缩放，避免一屏装不下")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.fitViewInline !== false).onChange(async (v) => {
          this.plugin.settings.fitViewInline = v;
          await this.plugin.saveSettings();
          this.plugin.scheduleRefresh();
        })
      );

    new Setting(containerEl)
      .setName("内联最大高度")
      .setDesc("单张图在笔记中的高度上限（像素）")
      .addSlider((s) =>
        s
          .setLimits(200, 720, 20)
          .setValue(this.plugin.settings.inlineMaxHeight ?? 480)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.inlineMaxHeight = v;
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

    new Setting(containerEl)
      .setName("节点边框粗细")
      .setDesc("矩形节点描边宽度；过大时节点会显得臃肿")
      .addSlider((s) =>
        s
          .setLimits(0.5, 2.5, 0.25)
          .setValue(this.plugin.settings.nodeBorderWidth ?? 1.25)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.nodeBorderWidth = v;
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
      wrapper.className = "amm-host amm-host--wrapped amm-diagram-surface";
      if (this.settings.fitWidth) wrapper.classList.add("amm-fit-width");
      if (this.settings.fitViewInline !== false) wrapper.classList.add("amm-fit-view-host");
      wrapper.style.setProperty("--amm-pad", `${this.settings.padding}px`);
      wrapper.style.setProperty(
        "--amm-max-h",
        `${Math.max(120, this.settings.inlineMaxHeight || 480)}px`
      );
      if (source) wrapper.dataset.ammSourceB64 = encodeSource(source);

      const parent = block.parentElement;
      if (!parent) return;
      parent.insertBefore(wrapper, block);
      const stage = domCreate(wrapper, "amm-stage");
      stage.appendChild(block);
      block.dataset.ammWrapped = "1";

      attachToolbar(wrapper, this, source);

      polishSvgDiagram(svg, this.settings);
      applyDiagramCssVars(wrapper, this.settings);
      scheduleInlineFit(stage, svg, this.settings);
      setupInlineFitObserver(wrapper, stage, svg, this.settings);
      if (this.settings.enableLightbox) {
        svg.style.cursor = "zoom-in";
        svg.addEventListener("dblclick", (e) => {
          e.preventDefault();
          openAmmLightbox(
            this.app,
            svg,
            this.settings,
            decodeSource(wrapper.dataset.ammSourceB64)
          );
        });
      }
    });
  }
};
