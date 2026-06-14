const { Plugin, Notice } = require("obsidian");

let echartsLoadPromise = null;

function readCssVar(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

function pluginScriptUrl(app, manifest) {
  const adapter = app.vault.adapter;
  if (typeof adapter.getResourcePath === "function" && manifest.dir) {
    return adapter.getResourcePath(`${manifest.dir}/echarts.min.js`);
  }
  const base =
    typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
  return `${base}/.obsidian/plugins/${manifest.id}/echarts.min.js`;
}

function loadEcharts(app, manifest) {
  if (window.echarts) return Promise.resolve(window.echarts);
  if (echartsLoadPromise) return echartsLoadPromise;

  echartsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = pluginScriptUrl(app, manifest);
    script.async = true;
    script.onload = () => {
      if (window.echarts) resolve(window.echarts);
      else reject(new Error("echarts.min.js 已加载但未导出 window.echarts"));
    };
    script.onerror = () => {
      reject(
        new Error(
          "无法加载 echarts.min.js。请在仓库根目录运行：bash tools/obsidian-echarts/install.sh"
        )
      );
    };
    document.head.appendChild(script);
  });

  return echartsLoadPromise;
}

function parseBlock(source) {
  const raw = source.trim();
  let height = 360;
  let jsonText = raw;

  const firstLine = raw.split("\n")[0].trim();
  const heightMatch = firstLine.match(/^\/\/\s*@height\s+(\d+)\s*$/);
  if (heightMatch) {
    height = Math.max(180, Math.min(900, Number(heightMatch[1])));
    jsonText = raw.slice(raw.indexOf("\n") + 1).trim();
  }

  return { height, option: JSON.parse(jsonText) };
}

function themeOption(option) {
  const text = readCssVar("--text-normal", "#2e3338");
  const muted = readCssVar("--text-muted", "#888");
  const border = readCssVar("--background-modifier-border", "#d8dee4");

  const next = Object.assign({}, option);
  if (!next.backgroundColor) next.backgroundColor = "transparent";
  next.textStyle = Object.assign({ color: text }, next.textStyle || {});

  if (next.title && typeof next.title === "object") {
    next.title = Object.assign({ textStyle: { color: text } }, next.title);
  }
  if (next.xAxis) {
    const axes = Array.isArray(next.xAxis) ? next.xAxis : [next.xAxis];
    next.xAxis = axes.map((ax) =>
      Object.assign(
        {
          axisLine: { lineStyle: { color: border } },
          axisLabel: { color: muted },
          nameTextStyle: { color: muted },
          splitLine: { lineStyle: { color: border, opacity: 0.35 } },
        },
        ax
      )
    );
    if (!Array.isArray(option.xAxis)) next.xAxis = next.xAxis[0];
  }
  if (next.yAxis) {
    const axes = Array.isArray(next.yAxis) ? next.yAxis : [next.yAxis];
    next.yAxis = axes.map((ax) =>
      Object.assign(
        {
          axisLine: { lineStyle: { color: border } },
          axisLabel: { color: muted },
          nameTextStyle: { color: muted },
          splitLine: { lineStyle: { color: border, opacity: 0.35 } },
        },
        ax
      )
    );
    if (!Array.isArray(option.yAxis)) next.yAxis = next.yAxis[0];
  }
  return next;
}

async function renderEchartsBlock(source, el, app, manifest) {
  el.empty();
  const host = el.createDiv({ cls: "ai-echarts-host" });
  const wrap = host.createDiv({ cls: "ai-echarts-wrap" });

  let height = 360;
  let option;
  try {
    const parsed = parseBlock(source);
    height = parsed.height;
    option = parsed.option;
  } catch (err) {
    host.createDiv({
      cls: "ai-echarts-error",
      text: `ECharts JSON 解析失败：${err.message || err}`,
    });
    host.createEl("pre", { cls: "ai-echarts-source", text: source });
    return;
  }

  wrap.style.height = `${height}px`;

  try {
    const echarts = await loadEcharts(app, manifest);
    const chart = echarts.init(wrap, null, { renderer: "canvas" });
    chart.setOption(themeOption(option), { notMerge: true });

    const resize = () => chart.resize();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
    }
    host.dataset.aiEchartsReady = "1";
  } catch (err) {
    wrap.remove();
    host.createDiv({
      cls: "ai-echarts-error",
      text: String(err.message || err),
    });
  }
}

module.exports = class AiEchartsPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor(
      "echarts",
      async (source, el) => {
        await renderEchartsBlock(source, el, this.app, this.manifest);
      },
      -100
    );

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        document
          .querySelectorAll(".ai-echarts-host[data-ai-echarts-ready='1']")
          .forEach((host) => {
            host.removeAttribute("data-ai-echarts-ready");
          });
      })
    );

    this.addCommand({
      id: "reload-ai-echarts-plugin",
      name: "ECharts: 重新加载本插件",
      callback: () => {
        echartsLoadPromise = null;
        const id = this.manifest.id;
        void this.app.plugins
          .disablePlugin(id)
          .then(() => this.app.plugins.enablePlugin(id));
      },
    });
  }

  onunload() {
    echartsLoadPromise = null;
  }
};
