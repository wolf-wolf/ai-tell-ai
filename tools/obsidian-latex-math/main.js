const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  loadMathJax,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  enableBracketBlocks: true,
  enableParenInline: true,
  skipNativeMath: true,
};

/** LaTeX 命令或典型数学符号 */
const LATEX_HINT_RE =
  /\\(?:frac|text|sum|cap|cup|left|right|mathbf|mathrm|operatorname|cdot|leq|geq|infty|alpha|beta|sqrt|overline|underline|ldots|dots|begin|end|quad|qquad|displaystyle|limits|int|prod|log|ln|sin|cos|tan|vec|hat|bar|tilde|pm|mp|times|div|neq|approx|equiv|subset|supset|in|notin|forall|exists|partial|nabla|Delta|Gamma|Lambda|Omega|Phi|Psi|Sigma|Theta|Xi|Pi|mathbb|mathcal|mathit|boldsymbol|det|max|min|arg|mod|bmod|pmod|tag|label|ref|eqref|not|neg|wedge|vee|oplus|otimes|perp|mid|parallel|sim|simeq|cong|propto|mapsto|to|gets|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|uparrow|downarrow|updownarrow|nearrow|searrow|swarrow|nwarrow|hookrightarrow|hookleftarrow|leftharpoonup|rightharpoonup|leftharpoondown|rightharpoondown|rightleftharpoons|iff|because|therefore|QED|boxed|cancel|overbrace|underbrace|binom|choose|atop|above|below|stackrel|overset|underset|widetilde|widehat|overrightarrow|overleftarrow|overleftrightarrow|xrightarrow|xleftarrow|xleftrightarrow|ce|pu|html|cssId|class|style|href|data|aria|script|math|mtext|mspace|ms|mi|mn|mo|mfrac|msqrt|mroot|mstyle|merror|mpadded|mphantom|menclose|msub|msup|msubsup|munder|mover|munderover|mmultiscripts|mtable|mtr|mtd|mlabeledtr|maligngroup|malignmark|mrow|mfrac|semantics|annotation|annotation-xml)/;

const SKIP_ANCESTOR =
  "pre, code, .math, .aml-math-block, .aml-math-inline, .aml-math-error, .block-language-mermaid, .amm-host, .art-read-fab";

let mathJaxReady = null;

async function ensureMathJax() {
  if (mathJaxReady) return mathJaxReady;
  mathJaxReady = loadMathJax().then(() => {
    if (typeof MathJax === "undefined" || typeof MathJax.tex2chtml !== "function") {
      throw new Error("MathJax.tex2chtml 不可用");
    }
  });
  return mathJaxReady;
}

function looksLikeLatex(src) {
  const s = (src || "").trim();
  if (!s) return false;
  if (LATEX_HINT_RE.test(s)) return true;
  if (/\\[^a-zA-Z\s]/.test(s)) return true;
  if (/\\[a-zA-Z]{2,}/.test(s)) return true;
  if (/[_^{}]/.test(s) && /[=+\-*/|\\]/.test(s)) return true;
  if (/@[A-Za-z]/.test(s) && /\\/.test(s)) return true;
  return false;
}

function normalizeText(el) {
  return (el.textContent || "").replace(/\u00a0/g, " ").trim();
}

function isSkipped(el) {
  return !!el.closest(SKIP_ANCESTOR) || el.dataset?.amlProcessed === "1";
}

function markProcessed(el) {
  el.dataset.amlProcessed = "1";
}

function createErrorWrap(tex, err) {
  const wrap = document.createElement("div");
  wrap.className = "aml-math-error";
  wrap.dataset.amlProcessed = "1";
  const msg = document.createElement("div");
  msg.textContent = `LaTeX 渲染失败：${err instanceof Error ? err.message : String(err)}`;
  const code = document.createElement("code");
  code.textContent = tex;
  wrap.appendChild(msg);
  wrap.appendChild(code);
  return wrap;
}

async function renderToElement(tex, display) {
  await ensureMathJax();
  const node = MathJax.tex2chtml(tex, { display });
  node.setAttribute("data-aml-processed", "1");
  return node;
}

async function replaceWithMath(el, tex, display) {
  const wrap = document.createElement(display ? "div" : "span");
  wrap.className = display ? "aml-math-block" : "aml-math-inline";
  wrap.dataset.amlProcessed = "1";
  try {
    const node = await renderToElement(tex, display);
    wrap.appendChild(node);
    el.replaceWith(wrap);
  } catch (err) {
    el.replaceWith(createErrorWrap(tex, err));
  }
}

/** 从 [ ... ] 或 \( ... \) 提取 TeX */
function extractBracketBlock(text) {
  const t = text.trim();
  if (!t.startsWith("[") || !t.endsWith("]")) return null;
  const inner = t.slice(1, -1).trim();
  return looksLikeLatex(inner) ? inner : null;
}

function extractParenInline(text) {
  const t = text.trim();
  const m = t.match(/^\\\(([\s\S]+?)\\\)$/);
  if (m && looksLikeLatex(m[1])) return m[1].trim();
  if (t.startsWith("(") && t.endsWith(")") && t.length > 2) {
    const inner = t.slice(1, -1).trim();
    if (looksLikeLatex(inner) && !/\n/.test(inner)) return inner;
  }
  return null;
}

/** 多行块：连续 p/div 首行 [、末行 ] */
function collectMultilineBracket(nodes, startIdx) {
  const first = normalizeText(nodes[startIdx]);
  if (first !== "[") return null;

  let endIdx = startIdx + 1;
  const parts = [];

  for (let i = startIdx + 1; i < nodes.length; i++) {
    const t = normalizeText(nodes[i]);
    if (t === "]") {
      endIdx = i;
      break;
    }
    parts.push(t);
    endIdx = i;
    if (t === "]") break;
  }

  if (normalizeText(nodes[endIdx]) !== "]") return null;
  const inner = parts.join("\n").trim();
  if (!looksLikeLatex(inner)) return null;
  return { tex: inner, startIdx, endIdx };
}

async function processBlockCandidates(root, settings) {
  if (!settings.enableBracketBlocks) return;

  const candidates = Array.from(
    root.querySelectorAll("p, div.markdown-preview-section > div:not(.aml-math-block)")
  ).filter((el) => {
    if (isSkipped(el)) return false;
    if (el.querySelector("p, div, ul, ol, table, pre, mjx-container")) return false;
    return true;
  });

  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
    if (isSkipped(el)) continue;

    const text = normalizeText(el);

    const multiline = collectMultilineBracket(candidates, i);
    if (multiline) {
      markProcessed(el);
      const wrap = document.createElement("div");
      wrap.className = "aml-math-block";
      wrap.dataset.amlProcessed = "1";
      try {
        const node = await renderToElement(multiline.tex, true);
        wrap.appendChild(node);
      } catch (err) {
        candidates[i].replaceWith(createErrorWrap(multiline.tex, err));
        for (let j = multiline.startIdx + 1; j <= multiline.endIdx; j++) {
          candidates[j]?.remove();
        }
        i = multiline.endIdx;
        continue;
      }
      el.replaceWith(wrap);
      for (let j = multiline.startIdx + 1; j <= multiline.endIdx; j++) {
        candidates[j]?.remove();
      }
      i = multiline.endIdx;
      continue;
    }

    const blockTex = extractBracketBlock(text);
    if (blockTex) {
      await replaceWithMath(el, blockTex, true);
      continue;
    }

    if (settings.enableParenInline) {
      const inlineTex = extractParenInline(text);
      if (inlineTex) {
        await replaceWithMath(el, inlineTex, false);
      }
    }
  }
}

async function processRoot(root, settings) {
  if (!root || settings.skipNativeMath === false) {
    /* always skip .math when skipNativeMath true */
  }
  await processBlockCandidates(root, settings);
}

class LatexMathSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AI LaTeX Math" });

    containerEl.createEl("p", {
      text: "Obsidian 原生只认 $ 与 $$。\\[ \\] 会被 Markdown 转成 [ ] 纯文本；本插件在预览里补渲染。",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("渲染 [ ... ] 块级公式")
      .setDesc("识别含 \\frac、\\text 等的方括号块（\\[ \\] 被转义后的形态）")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enableBracketBlocks).onChange(async (v) => {
          this.plugin.settings.enableBracketBlocks = v;
          await this.plugin.saveSettings();
          this.plugin.scheduleRefresh();
        })
      );

    new Setting(containerEl)
      .setName("渲染 \\( ... \\) 行内公式")
      .setDesc("含 LaTeX 命令的括号行内式")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enableParenInline).onChange(async (v) => {
          this.plugin.settings.enableParenInline = v;
          await this.plugin.saveSettings();
          this.plugin.scheduleRefresh();
        })
      );
  }
}

/** 源码级：\\[ \\] → $$，\\( \\) → $ */
function convertSourceToObsidianMath(text) {
  let out = text;
  let blocks = 0;
  let inlines = 0;

  out = out.replace(/^\\\[(\s*)$/gm, () => {
    blocks += 1;
    return "$$";
  });
  out = out.replace(/^\\\](\s*)$/gm, "$$");

  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => {
    blocks += 1;
    return `$$\n${inner.trim()}\n$$`;
  });

  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => {
    inlines += 1;
    return `$${inner.trim()}$`;
  });

  return { text: out, blocks, inlines };
}

module.exports = class LatexMathPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.refreshTimer = null;

    this.registerMarkdownPostProcessor(async (el) => {
      try {
        await processRoot(el, this.settings);
      } catch (err) {
        console.error("[ai-latex-math]", err);
      }
    });

    this.addCommand({
      id: "reload-latex-math-plugin",
      name: "LaTeX Math: 重新加载本插件",
      callback: () => {
        const id = this.manifest.id;
        const plugins = this.app.plugins;
        void plugins.disablePlugin(id).then(() => plugins.enablePlugin(id));
      },
    });

    this.addCommand({
      id: "convert-note-to-obsidian-math",
      name: "LaTeX Math: 转换当前笔记为 Obsidian 公式",
      callback: () => this.convertActiveNote(),
    });

    this.addCommand({
      id: "refresh-latex-math",
      name: "LaTeX Math: 刷新当前页公式",
      callback: () => this.refreshVisible(),
    });

    this.addSettingTab(new LatexMathSettingTab(this.app, this));
  }

  onunload() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    mathJaxReady = null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => this.refreshVisible(), 300);
  }

  refreshVisible() {
    document.querySelectorAll("[data-aml-processed]").forEach((el) => {
      delete el.dataset.amlProcessed;
    });
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = leaf.view;
      const container = view?.containerEl?.querySelector(".markdown-preview-view, .markdown-rendered");
      if (container) {
        void processRoot(container, this.settings);
      }
    }
    new Notice("已刷新 LaTeX 公式");
  }

  async convertActiveNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("没有打开的文件");
      return;
    }
    const raw = await this.app.vault.read(file);
    const { text, blocks, inlines } = convertSourceToObsidianMath(raw);
    if (blocks === 0 && inlines === 0) {
      new Notice("未发现 \\[ \\] 或 \\( \\) 公式");
      return;
    }
    await this.app.vault.modify(file, text);
    new Notice(`已转换：${blocks} 处块级、${inlines} 处行内 → $ / $$`);
  }
};
