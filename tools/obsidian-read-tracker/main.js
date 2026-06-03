const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  MarkdownView,
  ItemView,
  WorkspaceLeaf,
  TFile,
  setIcon,
} = require("obsidian");

const VIEW_TYPE = "ai-read-tracker-dashboard";

const DEFAULT_SETTINGS = {
  openDebounceSec: 2,
  restoreDelayMs: 80,
  restoreRetries: 8,
  dashboardNotePath: "_meta/read-tracker-dashboard.md",
  heatmapWeeks: 26,
  dailyRetentionDays: 400,
  topNotesLimit: 10,
};

const RADAR_TOP_N = 10;
const SVG_NS = "http://www.w3.org/2000/svg";
const HEATMAP_CELL_PX = 11;
const HEATMAP_GAP_PX = 2;

function shortenLabel(name, maxLen = 9) {
  const base = name.replace(/\.md$/i, "");
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

function svgCreate(parent, tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  parent.appendChild(el);
  return el;
}

function toDateKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 绝对档位：20 步长，60+ 最深；展示上限 100+ */
const HEAT_LEVEL_HINTS = ["0", "1–19", "20–39", "40–59", "60–100+"];

function heatLevel(count) {
  if (!count || count <= 0) return 0;
  if (count < 20) return 1;
  if (count < 40) return 2;
  if (count < 60) return 3;
  return 4;
}

function formatHeatmapCount(count) {
  if (count >= 100) return "100+ 次打开";
  if (count > 0) return `${count} 次打开`;
  return "无记录";
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function basename(path) {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function formatHeatmapDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

class ReadTrackerDashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.sortBy = "lastOpened";
    this.sortDir = -1;
    this.collapsed = { insights: false, table: false };
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "阅读统计";
  }

  getIcon() {
    return "book-open";
  }

  async onOpen() {
    this.containerEl.addClass("ai-read-tracker-dashboard");
    this.render();
  }

  async onClose() {}

  paintHeatmapCells(grid, cells, tooltip, anchor) {
    grid.empty();
    for (const cell of cells) {
      const el = grid.createDiv({
        cls: `art-heatmap-cell art-l${cell.level}`,
      });
      this.bindHeatmapCellHover(el, cell, tooltip, anchor);
    }
  }

  bindHeatmapCellHover(el, cell, tooltip, anchor) {
    const show = (e) => {
      tooltip.empty();
      tooltip.createDiv({
        cls: "art-hover-tip-title",
        text: formatHeatmapDate(cell.date),
      });
      tooltip.createDiv({
        cls: "art-hover-tip-meta",
        text: formatHeatmapCount(cell.count),
      });
      tooltip.addClass("is-visible");
      el.addClass("is-hovered");
      this.positionHoverTooltip(tooltip, e, anchor);
    };
    const move = (e) => this.positionHoverTooltip(tooltip, e, anchor);
    const hide = () => {
      tooltip.removeClass("is-visible");
      el.removeClass("is-hovered");
    };

    el.addEventListener("mouseenter", show);
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", hide);
  }

  render() {
    const { containerEl } = this;
    containerEl.empty();

    const summary = this.plugin.computeSummary();
    const rows = this.plugin.getSortedRows(this.sortBy, this.sortDir);

    const header = containerEl.createDiv({ cls: "art-dashboard-header" });
    this.renderSummary(header, summary);

    const insights = containerEl.createDiv({
      cls: `art-dashboard-insights${this.collapsed.insights ? " is-collapsed" : ""}`,
    });
    this.renderCollapsibleHead(insights, "insights", "阅读概览", "热力图 · 阅读雷达");
    const insightsBody = insights.createDiv({ cls: "art-insights-body" });
    const insightsGrid = insightsBody.createDiv({ cls: "art-insights-grid" });
    this.renderHeatmap(insightsGrid);
    this.renderRadarNotes(insightsGrid);

    const tableSection = containerEl.createDiv({
      cls: `art-table-section${this.collapsed.table ? " is-collapsed" : ""}`,
    });
    this.renderCollapsibleHead(
      tableSection,
      "table",
      "全部笔记",
      `${rows.length} 篇有记录`
    );

    const tableBody = tableSection.createDiv({ cls: "art-table-body" });

    const toolbar = tableBody.createDiv({ cls: "art-toolbar" });
    const sortGroup = toolbar.createDiv({ cls: "art-sort-group" });
    const mkSortBtn = (label, key) => {
      const btn = sortGroup.createEl("button", {
        cls: "art-btn art-btn-segment",
        text: label,
      });
      if (this.sortBy === key) btn.addClass("is-active");
      btn.onclick = () => {
        if (this.sortBy === key) this.sortDir *= -1;
        else {
          this.sortBy = key;
          this.sortDir = key === "path" ? 1 : -1;
        }
        this.render();
      };
    };
    mkSortBtn("最近", "lastOpened");
    mkSortBtn("次数", "views");
    mkSortBtn("路径", "path");

    const actions = toolbar.createDiv({ cls: "art-toolbar-actions" });
    actions.createEl("button", { cls: "art-btn art-btn-ghost", text: "刷新" }).onclick =
      () => this.render();

    actions
      .createEl("button", { cls: "art-btn art-btn-accent", text: "导出总览" })
      .onclick = async () => {
        await this.plugin.writeDashboardNote();
        new Notice("已更新总览笔记");
        this.render();
      };

    if (rows.length === 0) {
      tableBody.createDiv({
        cls: "art-empty",
        text: "还没有笔记列表数据。打开几篇 .md 后，下方表格会出现。",
      });
      return;
    }

    const tableWrap = tableBody.createDiv({ cls: "art-table-wrap" });
    const table = tableWrap.createEl("table", { cls: "art-table" });
    const thead = table.createEl("thead");
    const headRow = thead.createEl("tr");
    const headers = [
      ["笔记", "笔记"],
      ["次数", "打开次数"],
      ["最近", "最近打开时间"],
      ["滚动", "滚动位置 (px)"],
    ];
    headers.forEach(([label, tip]) => {
      const th = headRow.createEl("th", { text: label });
      th.setAttribute("title", tip);
    });

    const tbody = table.createEl("tbody");
    for (const row of rows) {
      const tr = tbody.createEl("tr", { cls: "art-row" });
      const nameTd = tr.createEl("td", { cls: "art-note-cell" });
      const link = nameTd.createEl("a", {
        cls: "art-note-link",
        text: basename(row.path),
        href: "#",
      });
      link.setAttribute("title", row.path);

      const openNote = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = this.app.vault.getAbstractFileByPath(row.path);
        if (file instanceof TFile) {
          void this.app.workspace.getLeaf(false).openFile(file);
        }
      };
      link.onclick = openNote;
      tr.onclick = openNote;

      tr.createEl("td", { cls: "art-num", text: String(row.views || 0) });
      tr.createEl("td", {
        cls: "art-time",
        text: formatTime(row.lastOpened),
      });
      tr.createEl("td", {
        cls: "art-scroll",
        text: String(Math.round(row.scrollTop || 0)),
      });
    }
  }

  renderSummary(containerEl, summary) {
    const wrap = containerEl.createDiv({ cls: "art-stats" });

    const grid = wrap.createDiv({ cls: "art-stats-grid" });
    const addStat = (value, label, mod, tip) => {
      const card = grid.createDiv({
        cls: `art-stat-card${mod ? ` ${mod}` : ""}`,
      });
      if (tip) card.setAttribute("title", tip);
      card.createDiv({ cls: "art-stat-value", text: String(value) });
      card.createDiv({ cls: "art-stat-label", text: label });
    };

    addStat(summary.trackedFiles, "有记录", "", "至少打开过 1 次的笔记篇数");
    addStat(
      summary.totalViews,
      "累计打开",
      "art-stat-accent",
      "全库每篇「打开次数」相加（切换笔记且超过去重间隔才 +1）"
    );
    addStat(summary.openedToday, "今日打开", "");
    addStat(summary.neverOpened, "尚未打开", "art-stat-muted");

    if (this.plugin.activePath) {
      const cur = wrap.createDiv({ cls: "art-stat-current" });
      cur.createSpan({ cls: "art-stat-current-tag", text: "当前" });
      const name = cur.createSpan({
        cls: "art-stat-current-name",
        text: basename(this.plugin.activePath),
      });
      name.setAttribute("title", this.plugin.activePath);
      cur.createSpan({
        cls: "art-stat-current-meta",
        text: ` · ${summary.currentViews} 次 · 滚动 ${summary.currentScroll}px`,
      });
    }
  }

  renderCollapsibleHead(parent, key, title, hint) {
    const head = parent.createDiv({ cls: "art-panel-head" });
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");
    head.setAttribute(
      "aria-expanded",
      this.collapsed[key] ? "false" : "true"
    );

    const chevron = head.createSpan({ cls: "art-panel-chevron" });
    chevron.setAttribute("aria-hidden", "true");
    this.setPanelChevron(chevron, this.collapsed[key]);

    head.createSpan({ cls: "art-panel-title", text: title });
    if (hint) {
      head.createSpan({ cls: "art-panel-sep", text: "·" });
      const hintEl = head.createSpan({ cls: "art-panel-hint", text: hint });
      hintEl.setAttribute("title", hint);
    }

    const toggle = (e) => {
      e.preventDefault();
      this.togglePanel(key);
    };
    head.onclick = toggle;
    head.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        toggle(e);
      }
    };
  }

  setPanelChevron(el, collapsed) {
    setIcon(el, collapsed ? "chevron-right" : "chevron-down");
  }

  togglePanel(key) {
    this.collapsed[key] = !this.collapsed[key];
    const selector =
      key === "insights" ? ".art-dashboard-insights" : ".art-table-section";
    const panel = this.containerEl.querySelector(selector);
    if (!panel) {
      this.render();
      return;
    }

    panel.toggleClass("is-collapsed", this.collapsed[key]);

    const head = panel.querySelector(".art-panel-head");
    if (head) {
      head.setAttribute(
        "aria-expanded",
        this.collapsed[key] ? "false" : "true"
      );
      const chevron = head.querySelector(".art-panel-chevron");
      if (chevron) this.setPanelChevron(chevron, this.collapsed[key]);
    }
  }

  renderHeatmap(containerEl) {
    const model = this.plugin.buildHeatmapModel();
    const wrap = containerEl.createDiv({ cls: "art-heatmap-wrap" });

    const gridWrap = wrap.createDiv({
      cls: "art-heatmap-grid-wrap",
    });
    gridWrap.style.setProperty("--art-heatmap-cell", `${HEATMAP_CELL_PX}px`);
    gridWrap.style.setProperty("--art-heatmap-gap", `${HEATMAP_GAP_PX}px`);
    const tooltip = gridWrap.createDiv({ cls: "art-heatmap-tooltip" });
    const grid = gridWrap.createDiv({ cls: "art-heatmap" });

    const foot = wrap.createDiv({ cls: "art-card-foot" });
    const legend = foot.createDiv({ cls: "art-heatmap-legend" });
    for (let l = 0; l <= 4; l += 1) {
      const item = legend.createDiv({ cls: "art-heatmap-legend-item" });
      item.createDiv({ cls: `art-heatmap-cell art-l${l}` });
      item.createSpan({ text: HEAT_LEVEL_HINTS[l] });
    }
    const footDesc = foot.createDiv({ cls: "art-card-foot-desc" });
    this.paintHeatmapCells(grid, model.inRangeCells, tooltip, gridWrap);
    footDesc.setText(
      `最近 ${model.numWeeks} 周 · 共 ${model.totalInRange} 天 · 峰值 ${model.max >= 100 ? "100+" : model.max} 次/日 · 档位 1–19 / 20–39 / 40–59 / 60–100+ · 从左到右时间顺序，窄屏折行`
    );
  }

  renderRadarFoot(wrap, desc) {
    const foot = wrap.createDiv({ cls: "art-card-foot" });
    foot.createDiv({ cls: "art-card-foot-desc", text: desc });
  }

  renderRadarNotes(containerEl) {
    const limit = Math.min(
      10,
      Math.max(3, this.plugin.data.settings?.topNotesLimit ?? RADAR_TOP_N)
    );
    const items = this.plugin.getTopNotes(limit);
    const wrap = containerEl.createDiv({ cls: "art-radar-wrap" });
    const footDesc = `Top ${limit} · 点击轴标签打开笔记`;

    const rows = items.rows.slice(0, limit);
    if (rows.length === 0) {
      wrap.createDiv({
        cls: "art-radar-empty",
        text: "暂无数据。多打开几篇笔记后会出现雷达图。",
      });
      this.renderRadarFoot(wrap, footDesc);
      return;
    }

    if (rows.length < 3) {
      wrap.createDiv({
        cls: "art-radar-empty",
        text: `已有 ${rows.length} 篇，至少 3 篇有记录时显示雷达图。`,
      });
      this.renderRadarFoot(wrap, footDesc);
      return;
    }

    const chart = wrap.createDiv({ cls: "art-radar-chart" });
    this.drawRadarChart(chart, rows);
    this.renderRadarFoot(wrap, footDesc);
  }

  positionHoverTooltip(tooltip, event, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left + 10;
    const y = event.clientY - rect.top - 8;
    const maxX = rect.width - tooltip.offsetWidth - 6;
    const maxY = rect.height - tooltip.offsetHeight - 6;
    tooltip.style.left = `${Math.max(6, Math.min(x, maxX))}px`;
    tooltip.style.top = `${Math.max(6, Math.min(y, maxY))}px`;
  }

  bindRadarHover(targets, tooltip, container, row, onHighlight) {
    const show = (e) => {
      tooltip.empty();
      tooltip.createDiv({ cls: "art-hover-tip-title", text: row.label });
      tooltip.createDiv({
        cls: "art-hover-tip-meta",
        text: `${row.views} 次打开`,
      });
      if (row.path !== row.label) {
        tooltip.createDiv({ cls: "art-hover-tip-path", text: row.path });
      }
      tooltip.addClass("is-visible");
      onHighlight(true);
      this.positionHoverTooltip(tooltip, e, container);
    };
    const move = (e) => this.positionHoverTooltip(tooltip, e, container);
    const hide = () => {
      tooltip.removeClass("is-visible");
      onHighlight(false);
    };

    for (const el of targets) {
      el.addEventListener("mouseenter", show);
      el.addEventListener("mousemove", move);
      el.addEventListener("mouseleave", hide);
    }
  }

  drawRadarChart(container, rows) {
    const n = rows.length;
    const maxViews = rows[0].views || 1;
    const size = 240;
    const pad = 42;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = (size - pad * 2) / 2;

    const svg = svgCreate(container, "svg", {
      viewBox: `0 0 ${size} ${size}`,
      class: "art-radar-svg",
      role: "img",
      "aria-label": "阅读次数雷达图",
    });

    for (let level = 1; level <= 4; level += 1) {
      const lr = (maxR * level) / 4;
      const ring = [];
      for (let i = 0; i < n; i += 1) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        ring.push(`${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`);
      }
      svgCreate(svg, "polygon", {
        points: ring.join(" "),
        class: "art-radar-grid",
      });
    }

    for (let i = 0; i < n; i += 1) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      svgCreate(svg, "line", {
        x1: cx,
        y1: cy,
        x2: cx + maxR * Math.cos(angle),
        y2: cy + maxR * Math.sin(angle),
        class: "art-radar-axis",
      });
    }

    const points = rows.map((row, i) => {
      const ratio = Math.max(0.1, row.views / maxViews);
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const r = maxR * ratio;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        row,
        angle,
      };
    });

    svgCreate(svg, "polygon", {
      points: points.map((p) => `${p.x},${p.y}`).join(" "),
      class: "art-radar-fill",
    });

    const tooltip = container.createDiv({ cls: "art-radar-tooltip" });

    const openNote = (path) => {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        void this.app.workspace.getLeaf(false).openFile(file);
      }
    };

    points.forEach((p) => {
      const dot = svgCreate(svg, "circle", {
        cx: p.x,
        cy: p.y,
        r: 3.5,
        class: "art-radar-dot",
      });
      dot.dataset.path = p.row.path;

      const hit = svgCreate(svg, "circle", {
        cx: p.x,
        cy: p.y,
        r: 12,
        class: "art-radar-hit",
      });

      const labelR = maxR + 16;
      const lx = cx + labelR * Math.cos(p.angle);
      const ly = cy + labelR * Math.sin(p.angle);
      const cosA = Math.cos(p.angle);
      let anchor = "middle";
      if (cosA > 0.25) anchor = "start";
      else if (cosA < -0.25) anchor = "end";

      const label = svgCreate(svg, "text", {
        x: lx,
        y: ly,
        class: "art-radar-label",
        "text-anchor": anchor,
        "dominant-baseline": "middle",
      });
      label.textContent = shortenLabel(p.row.label);
      label.dataset.path = p.row.path;

      const setActive = (active) => {
        dot.classList.toggle("is-active", active);
        label.classList.toggle("is-active", active);
        dot.setAttribute("r", active ? "5" : "3.5");
      };

      const onOpen = (e) => {
        e.stopPropagation();
        openNote(p.row.path);
      };

      this.bindRadarHover([hit, dot, label], tooltip, container, p.row, setActive);
      hit.addEventListener("click", onOpen);
      dot.addEventListener("click", onOpen);
      label.addEventListener("click", onOpen);
    });
  }
}

module.exports = class AiReadTrackerPlugin extends Plugin {
  async onload() {
    await this.loadPluginData();

    this.activePath = null;
    this.restoreTimer = null;
    this._scrollEl = null;
    this._scrollHandler = null;

    this.debouncedPersist = debounce(() => void this.flushData(), 350);
    this.debouncedScrollSave = debounce(() => {
      if (this.activePath) this.saveScrollForPath(this.activePath);
    }, 400);
    this.debouncedSyncActive = debounce(() => this.syncActiveFile(), 50);

    this.registerView(VIEW_TYPE, (leaf) => new ReadTrackerDashboardView(leaf, this));

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file) this.handleFileActivated(file);
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.debouncedSyncActive();
      })
    );

    this.registerInterval(
      window.setInterval(() => {
        if (this.activePath) this.saveScrollForPath(this.activePath);
      }, 2000)
    );

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("ai-read-tracker-status");
    this.statusEl.onclick = () => void this.activateDashboard();

    this.addRibbonIcon("book-open", "阅读统计总览", () => {
      void this.activateDashboard();
    });

    this.addCommand({
      id: "reload-self",
      name: "Read Tracker: 重新加载本插件",
      callback: () => void this.reloadSelf(),
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Read Tracker: 打开全库阅读统计",
      callback: () => void this.activateDashboard(),
    });

    this.addCommand({
      id: "refresh-dashboard-note",
      name: "Read Tracker: 更新总览笔记（Markdown）",
      callback: () => void this.writeDashboardNote(),
    });

    this.addCommand({
      id: "show-stats",
      name: "Read Tracker: 显示当前笔记统计",
      callback: () => this.showCurrentStats(),
    });

    this.addCommand({
      id: "clear-stats",
      name: "Read Tracker: 清除当前笔记记录",
      callback: () => this.clearCurrentStats(),
    });

    this.addSettingTab(new AiReadTrackerSettingTab(this.app, this));

    this.syncActiveFile();
    this.refreshDashboardViews();
  }

  onunload() {
    if (this.activePath) this.saveScrollForPath(this.activePath);
    void this.flushData();
    this.detachScrollListeners();
    if (this.restoreTimer) clearTimeout(this.restoreTimer);
  }

  async loadPluginData() {
    const loaded = (await this.loadData()) || {};
    this.data = {
      settings: { ...DEFAULT_SETTINGS, ...(loaded.settings || {}) },
      files: loaded.files || {},
      daily: loaded.daily || {},
    };
  }

  buildHeatmapModel() {
    const daily = this.data.daily || {};
    const numWeeks = Math.min(
      52,
      Math.max(8, this.data.settings.heatmapWeeks || 26)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endMs = today.getTime();

    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (numWeeks * 7 - 1));

    const gridStart = new Date(rangeStart);
    const dow = gridStart.getDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    gridStart.setDate(gridStart.getDate() + toMonday);

    const allCells = [];
    const cur = new Date(gridStart);
    while (cur.getTime() <= endMs) {
      const key = toDateKey(cur.getTime());
      const count = daily[key] || 0;
      allCells.push({
        date: key,
        count,
        inRange: cur.getTime() >= rangeStart.getTime(),
        ts: cur.getTime(),
      });
      cur.setDate(cur.getDate() + 1);
    }

    let max = 1;
    let totalInRange = 0;
    for (const c of allCells) {
      if (!c.inRange) continue;
      if (c.count > 0) totalInRange += 1;
      if (c.count > max) max = c.count;
    }

    for (const c of allCells) {
      c.level = c.inRange ? heatLevel(c.count) : 0;
    }

    const weeks = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeks.push(allCells.slice(i, i + 7));
    }

    return {
      weeks,
      inRangeCells: allCells.filter((c) => c.inRange),
      numWeeks,
      max,
      totalInRange,
    };
  }

  getTopNotes(limitOverride) {
    const limit = limitOverride ?? Math.min(
      50,
      Math.max(5, this.data.settings.topNotesLimit || RADAR_TOP_N)
    );
    const rows = Object.entries(this.data.files || {})
      .map(([path, entry]) => ({
        path,
        label: basename(path),
        views: entry.views || 0,
        lastOpened: entry.lastOpened || 0,
      }))
      .filter((r) => r.views > 0)
      .sort((a, b) => b.views - a.views || b.lastOpened - a.lastOpened)
      .slice(0, limit);

    const maxViews = rows.length ? rows[0].views : 1;
    for (const row of rows) {
      row.pct = Math.max(4, Math.round((row.views / maxViews) * 100));
    }

    return { rows, limit };
  }

  recordDailyOpen(ts) {
    if (!this.data.daily) this.data.daily = {};
    const key = toDateKey(ts);
    this.data.daily[key] = (this.data.daily[key] || 0) + 1;
    this.pruneDaily();
  }

  pruneDaily() {
    const keep = this.data.settings.dailyRetentionDays || 400;
    const cutoff = Date.now() - keep * 86400000;
    const daily = this.data.daily || {};
    for (const key of Object.keys(daily)) {
      const t = new Date(key + "T12:00:00").getTime();
      if (Number.isNaN(t) || t < cutoff) delete daily[key];
    }
  }

  async flushData() {
    await this.saveData(this.data);
    this.refreshDashboardViews();
  }

  schedulePersist() {
    this.debouncedPersist();
  }

  refreshDashboardViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof ReadTrackerDashboardView) leaf.view.render();
    });
    this.updateStatusBar();
  }

  getActiveMarkdownFile() {
    const view = this.getMarkdownView();
    if (view?.file) return view.file;
    const leaf = this.app.workspace.activeLeaf;
    if (!leaf) return null;
    const { view: v } = leaf;
    if (v instanceof MarkdownView && v.file) return v.file;
    return null;
  }

  syncActiveFile() {
    const file = this.getActiveMarkdownFile();
    if (!file || file.extension !== "md") {
      if (this.activePath) {
        this.saveScrollForPath(this.activePath);
        this.activePath = null;
      }
      this.updateStatusBar();
      return;
    }
    this.handleFileActivated(file);
  }

  handleFileActivated(file) {
    if (!file || file.extension !== "md") return;

    const path = file.path;
    if (path === this.activePath) {
      this.attachScrollListeners();
      this.updateStatusBar();
      return;
    }

    const prev = this.activePath;
    if (prev) this.saveScrollForPath(prev);

    this.activePath = path;
    this.recordOpen(path);
    this.scheduleRestore(path);
    this.attachScrollListeners();
    this.updateStatusBar();
  }

  computeSummary() {
    const files = this.data.files || {};
    let totalViews = 0;
    let trackedFiles = 0;
    let openedToday = 0;
    const today = startOfToday();

    for (const entry of Object.values(files)) {
      trackedFiles += 1;
      totalViews += entry.views || 0;
      if ((entry.lastOpened || 0) >= today) openedToday += 1;
    }

    let vaultMd = 0;
    this.app.vault.getMarkdownFiles().forEach(() => {
      vaultMd += 1;
    });
    const neverOpened = Math.max(0, vaultMd - trackedFiles);

    let currentViews = 0;
    let currentScroll = 0;
    if (this.activePath && files[this.activePath]) {
      currentViews = files[this.activePath].views || 0;
      currentScroll = Math.round(files[this.activePath].scrollTop || 0);
    }

    return {
      trackedFiles,
      totalViews,
      openedToday,
      neverOpened,
      vaultMd,
      currentViews,
      currentScroll,
    };
  }

  getSortedRows(sortBy, sortDir) {
    const rows = Object.entries(this.data.files || {}).map(([path, entry]) => ({
      path,
      views: entry.views || 0,
      lastOpened: entry.lastOpened || 0,
      scrollTop: entry.scrollTop || 0,
      scrollMode: entry.scrollMode || "source",
    }));

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "path") cmp = a.path.localeCompare(b.path);
      else if (sortBy === "views") cmp = a.views - b.views;
      else cmp = a.lastOpened - b.lastOpened;
      return cmp * sortDir;
    });
    return rows;
  }

  reloadSelf() {
    const id = this.manifest.id;
    const plugins = this.app.plugins;
    if (!plugins?.disablePlugin || !plugins?.enablePlugin) {
      new Notice("请在本插件设置页：先关闭再打开 AI Read Tracker");
      return;
    }
    new Notice("正在重新加载…");
    window.setTimeout(async () => {
      try {
        await plugins.disablePlugin(id);
        await plugins.enablePlugin(id);
        new Notice("AI Read Tracker 已重新加载");
      } catch (e) {
        new Notice("重新加载失败：请在 设置→社区插件 里关闭再打开");
        console.error("ai-read-tracker reload", e);
      }
    }, 50);
  }

  async activateDashboard() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      const right = workspace.getRightLeaf(false);
      if (!right) {
        new Notice("无法打开侧边栏");
        return;
      }
      leaf = right;
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
    if (leaf.view instanceof ReadTrackerDashboardView) leaf.view.render();
  }

  async writeDashboardNote() {
    const path = this.data.settings.dashboardNotePath;
    const summary = this.computeSummary();
    const rows = this.getSortedRows("lastOpened", -1);
    const lines = [
      "---",
      "tags: [meta, read-tracker]",
      `updated: ${new Date().toISOString().slice(0, 10)}`,
      "---",
      "",
      "# 阅读统计总览",
      "",
      "> 由 **AI Read Tracker** 自动生成，勿手改表格；需要时运行命令「更新总览笔记」。",
      "",
      "## 全库摘要",
      "",
      "| 指标 | 数值 |",
      "| --- | --- |",
      `| 有记录的笔记 | ${summary.trackedFiles} |`,
      `| 合计打开次数 | ${summary.totalViews} |`,
      `| 今日打开过的笔记 | ${summary.openedToday} |`,
      `| Vault 内 .md 总数 | ${summary.vaultMd} |`,
      `| 尚无记录的 .md | ${summary.neverOpened} |`,
      "",
      "## 阅读热力（最近 30 天）",
      "",
      "| 日期 | 打开次数 |",
      "| --- | ---: |",
    ];

    const daily = this.data.daily || {};
    const dayKeys = Object.keys(daily).sort().reverse().slice(0, 30);
    if (dayKeys.length === 0) {
      lines.push("| _暂无按日数据，升级后新打开会累计_ | — |");
    } else {
      for (const key of dayKeys) {
        lines.push(`| ${key} | ${daily[key]} |`);
      }
    }

    const top = this.getTopNotes();
    lines.push(
      "",
      `## 热门笔记（Top ${top.limit}）`,
      "",
      "| 笔记 | 打开次数 |",
      "| --- | ---: |"
    );
    if (top.rows.length === 0) {
      lines.push("| _暂无_ | — |");
    } else {
      for (const row of top.rows) {
        const link = `[[${row.path}|${row.label}]]`;
        lines.push(`| ${link} | ${row.views} |`);
      }
    }

    lines.push(
      "",
      "## 全部笔记（按最近打开）",
      "",
      "| 笔记 | 次数 | 最近打开 | 滚动(px) |",
      "| --- | ---: | --- | ---: |"
    );

    for (const row of rows) {
      const link = `[[${row.path}|${basename(row.path)}]]`;
      lines.push(
        `| ${link} | ${row.views} | ${formatTime(row.lastOpened)} | ${Math.round(row.scrollTop)} |`
      );
    }

    if (rows.length === 0) {
      lines.push("| _暂无数据_ | — | — | — |");
    }

    lines.push("", `*生成时间：${new Date().toLocaleString()}*`);

    const content = lines.join("\n");
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      const parts = path.split("/");
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join("/");
        if (!this.app.vault.getAbstractFileByPath(dir)) {
          await this.app.vault.createFolder(dir);
        }
      }
      await this.app.vault.create(path, content);
    }
  }

  getFileEntry(path) {
    if (!this.data.files[path]) {
      this.data.files[path] = {
        views: 0,
        lastOpened: 0,
        lastOpenCountedAt: 0,
        scrollTop: 0,
        scrollLeft: 0,
        scrollMode: "source",
      };
    }
    return this.data.files[path];
  }

  getMarkdownView() {
    const leaf = this.app.workspace.activeLeaf || this.app.workspace.getMostRecentLeaf();
    if (!leaf) return null;
    const { view } = leaf;
    return view instanceof MarkdownView ? view : null;
  }

  readScrollFromView(view) {
    if (!view) return null;
    try {
      if (view.getMode() === "preview" && view.previewMode?.getScroll) {
        return { mode: "preview", top: view.previewMode.getScroll(), left: 0 };
      }
      if (view.editor?.getScrollInfo) {
        const info = view.editor.getScrollInfo();
        return { mode: "source", top: info.top, left: info.left };
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  applyScrollToView(view, entry) {
    if (!view || entry.scrollTop == null) return false;
    try {
      if (
        entry.scrollMode === "preview" &&
        view.getMode() === "preview" &&
        view.previewMode?.applyScroll
      ) {
        view.previewMode.applyScroll(entry.scrollTop);
        return true;
      }
      if (view.editor?.scrollTo) {
        view.editor.scrollTo(entry.scrollLeft ?? 0, entry.scrollTop ?? 0);
        return true;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  saveScrollForPath(path) {
    const view = this.getMarkdownView();
    if (!view?.file || view.file.path !== path) return;

    const state = this.readScrollFromView(view);
    if (!state) return;

    const entry = this.getFileEntry(path);
    entry.scrollTop = state.top;
    entry.scrollLeft = state.left;
    entry.scrollMode = state.mode;
    this.schedulePersist();
  }

  recordOpen(path) {
    const now = Date.now();
    const debounceMs = (this.data.settings.openDebounceSec ?? 2) * 1000;
    const entry = this.getFileEntry(path);

    if (now - (entry.lastOpenCountedAt || 0) >= debounceMs) {
      entry.views = (entry.views || 0) + 1;
      entry.lastOpenCountedAt = now;
      this.recordDailyOpen(now);
    }
    entry.lastOpened = now;
    this.schedulePersist();
  }

  scheduleRestore(path) {
    if (this.restoreTimer) clearTimeout(this.restoreTimer);

    const entry = this.data.files[path];
    if (!entry || entry.scrollTop == null) return;

    const delay = this.data.settings.restoreDelayMs || 80;
    const max = this.data.settings.restoreRetries || 8;
    let tries = 0;

    const attempt = () => {
      const view = this.getMarkdownView();
      if (!view?.file || view.file.path !== path) return;

      const ok = this.applyScrollToView(view, entry);
      if (!ok && tries < max) {
        tries += 1;
        this.restoreTimer = window.setTimeout(attempt, delay);
      }
    };

    this.restoreTimer = window.setTimeout(attempt, delay);
  }

  detachScrollListeners() {
    if (this._scrollEl && this._scrollHandler) {
      this._scrollEl.removeEventListener("scroll", this._scrollHandler);
    }
    this._scrollEl = null;
    this._scrollHandler = null;
  }

  attachScrollListeners() {
    this.detachScrollListeners();

    const view = this.getMarkdownView();
    if (!view) return;

    const handler = () => this.debouncedScrollSave();
    let el = null;

    if (view.getMode() === "preview") {
      el = view.containerEl.querySelector(".markdown-preview-view");
    } else {
      el =
        view.containerEl.querySelector(".cm-scroller") ||
        view.containerEl.querySelector(".markdown-source-view");
    }

    if (el) {
      el.addEventListener("scroll", handler, { passive: true });
      this._scrollEl = el;
      this._scrollHandler = handler;
    }
  }

  updateStatusBar() {
    if (!this.statusEl) return;
    const summary = this.computeSummary();
    const cur = this.activePath ? basename(this.activePath) : "—";
    const curViews = this.activePath
      ? (this.data.files[this.activePath]?.views || 0)
      : 0;
    this.statusEl.setText(
      `阅读 ${summary.trackedFiles}篇/${summary.totalViews}次 · 当前 ${cur} ×${curViews}（点我打开总览）`
    );
  }

  showCurrentStats() {
    const path = this.activePath;
    if (!path) {
      new Notice("当前没有打开的 Markdown 笔记");
      return;
    }
    const entry = this.data.files[path];
    if (!entry) {
      new Notice("暂无阅读记录");
      return;
    }
    const s = this.computeSummary();
    new Notice(
      `本篇 ${entry.views || 0} 次\n全库 ${s.trackedFiles} 篇 / ${s.totalViews} 次\n上次：${formatTime(entry.lastOpened)}\n滚动：${Math.round(entry.scrollTop || 0)}px`
    );
  }

  clearCurrentStats() {
    const path = this.activePath;
    if (!path) {
      new Notice("当前没有打开的 Markdown 笔记");
      return;
    }
    delete this.data.files[path];
    void this.flushData();
    new Notice("已清除当前笔记的阅读记录");
  }

  async saveSettings() {
    await this.saveData(this.data);
  }
};

class AiReadTrackerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.data.settings;

    containerEl.createEl("h2", { text: "AI Read Tracker" });

    new Setting(containerEl)
      .setName("打开次数去重（秒）")
      .setDesc("同一笔记在此时间内重复打开，不重复计次。切换不同笔记会分别累计。")
      .addSlider((slider) =>
        slider
          .setLimits(0, 120, 1)
          .setValue(s.openDebounceSec)
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.openDebounceSec = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("阅读雷达轴数")
      .setDesc("统计面板雷达图展示前几名（3–10）。")
      .addSlider((slider) =>
        slider
          .setLimits(3, 10, 1)
          .setValue(Math.min(10, Math.max(3, s.topNotesLimit ?? RADAR_TOP_N)))
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.topNotesLimit = value;
            await this.plugin.saveSettings();
            this.plugin.refreshDashboardViews();
          })
      );

    new Setting(containerEl)
      .setName("热力图周数")
      .setDesc("统计面板横向展示的周数（8–52）。")
      .addSlider((slider) =>
        slider
          .setLimits(8, 52, 2)
          .setValue(s.heatmapWeeks ?? 26)
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.heatmapWeeks = value;
            await this.plugin.saveSettings();
            this.plugin.refreshDashboardViews();
          })
      );

    new Setting(containerEl)
      .setName("总览笔记路径")
      .setDesc("命令「更新总览笔记」写入的 Markdown 路径。")
      .addText((text) =>
        text.setValue(s.dashboardNotePath).onChange(async (value) => {
          s.dashboardNotePath = value.trim() || DEFAULT_SETTINGS.dashboardNotePath;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("恢复滚动：首次延迟（毫秒）")
      .addText((text) =>
        text
          .setPlaceholder("80")
          .setValue(String(s.restoreDelayMs))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 0) {
              s.restoreDelayMs = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("恢复滚动：重试次数")
      .addText((text) =>
        text
          .setPlaceholder("8")
          .setValue(String(s.restoreRetries))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 0) {
              s.restoreRetries = n;
              await this.plugin.saveSettings();
            }
          })
      );

    containerEl.createEl("p", {
      text: "全库数据：左侧 ribbon 书本图标，或命令「打开全库阅读统计」。更新插件后请用命令「重新加载本插件」，不要用 Cmd+R。",
      cls: "setting-item-description",
    });
  }
}
