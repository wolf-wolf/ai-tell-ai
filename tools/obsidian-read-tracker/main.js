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
  idleSec: 20,
  wordsPerMinute: 200,
  trackScopePrefix: "docs/",
  unreadListLimit: 200,
  heatmapMetric: "active",
  topNotesMetric: "activeSec",
  readCoverageMin: 0.85,
  showCompleteMarker: true,
  readTimeRatioMin: 0.5,
  deepTimeRatioMin: 0.75,
  deepMinActiveSec: 120,
  skimActiveSecMax: 20,
  skimCoverageMax: 0.12,
  rescanCoverageMax: 0.5,
  progressWeightCoverage: 0.35,
  progressWeightTime: 0.3,
  progressWeightQuestions: 0.25,
  progressWeightRevisit: 0.1,
  questionsPerTenMin: 1,
};

const CURSOR_CHAT_PLUGIN_ID = "ai-cursor-chat";

const ACTIVE_HEAT_LEVEL_HINTS = ["0", "1–4m", "5–14m", "15–29m", "30m+"];

const READ_STATES = {
  unread: { label: "未读", cls: "art-badge-unread" },
  skimmed: { label: "略读", cls: "art-badge-skimmed" },
  progress: { label: "在读", cls: "art-badge-progress" },
  read: { label: "已读", cls: "art-badge-read" },
  deep: { label: "精读", cls: "art-badge-deep" },
  complete: { label: "已读完", cls: "art-badge-complete" },
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

function formatActiveHeatmapCount(sec) {
  const m = Math.round((sec || 0) / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h+ 有效阅读`;
  if (m > 0) return `${m} 分钟有效阅读`;
  return "无记录";
}

function activeSecHeatLevel(sec) {
  const m = Math.floor((sec || 0) / 60);
  if (m <= 0) return 0;
  if (m < 5) return 1;
  if (m < 15) return 2;
  if (m < 30) return 3;
  return 4;
}

function getReadingThresholds(settings) {
  return {
    skimActiveSec: settings.skimActiveSecMax ?? 20,
    skimCoverage: settings.skimCoverageMax ?? 0.12,
    readCoverage: settings.readCoverageMin ?? 0.85,
    readTimeRatio: settings.readTimeRatioMin ?? 0.5,
    deepTimeRatio: settings.deepTimeRatioMin ?? 0.75,
    deepMinSec: settings.deepMinActiveSec ?? 120,
    progressCoverage: 0.15,
    progressActiveSec: 30,
    deepScrollsPerMin: 12,
  };
}

function isNeedsRescan(row, settings) {
  if (row.markedComplete || row.state.id === "complete") return false;
  if (row.state.id === "deep" || row.state.id === "read") return false;
  if (row.state.id === "skimmed") return true;
  if (row.maxScrollRatio < (settings.rescanCoverageMax ?? 0.5)) return true;
  return row.state.id === "progress";
}

function targetQuestionCount(estReadSec, settings) {
  const perTen = settings.questionsPerTenMin ?? 1;
  return Math.max(1, Math.round((Math.max(30, estReadSec) / 600) * perTen));
}

function questionEngagement(entry, estReadSec, settings) {
  const count = entry.questionCount || 0;
  if (count <= 0) return 0;
  const target = targetQuestionCount(estReadSec, settings);
  return Math.min(1, Math.sqrt(count) / Math.sqrt(target));
}

function computeProgressScore(entry, estReadSec, settings) {
  const s = settings || {};
  const coverage = Math.min(1, Math.max(0, entry.maxScrollRatio || 0));
  const time = Math.min(
    1,
    (entry.activeSec || 0) / Math.max(30, estReadSec || 60)
  );
  const questions = questionEngagement(entry, estReadSec, s);
  const revisit = Math.min(1, (entry.views || 0) / 3);

  const wCov = s.progressWeightCoverage ?? 0.35;
  const wTime = s.progressWeightTime ?? 0.3;
  const wQ = s.progressWeightQuestions ?? 0.25;
  const wRev = s.progressWeightRevisit ?? 0.1;
  const sumW = wCov + wTime + wQ + wRev || 1;
  const raw =
    (wCov * coverage + wTime * time + wQ * questions + wRev * revisit) / sumW;
  let score = Math.round(Math.min(100, Math.max(0, raw * 100)));
  if (entry.markedComplete) return 100;
  return Math.min(score, 99);
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

/** 悬浮「已读完」胶囊用短时刻 */
function formatFabDoneTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function formatDuration(totalSec) {
  const sec = Math.max(0, Math.round(totalSec || 0));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s > 0 ? `${m}m${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h${rm}m` : `${h}h`;
}

function formatCoverage(ratio) {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
}

function scrollRatioFromMetrics(top, scrollHeight, clientHeight) {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll <= 0) return scrollHeight > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, top / maxScroll));
}

/** 阅读模式滚动在 .markdown-reading-view，而非 .markdown-preview-view */
function getMarkdownScrollContainer(view) {
  if (!view?.containerEl) return null;
  if (view.getMode() === "preview") {
    return (
      view.containerEl.querySelector(".markdown-reading-view") ||
      view.containerEl.querySelector(".markdown-preview-view") ||
      view.currentMode?.containerEl ||
      null
    );
  }
  return (
    view.containerEl.querySelector(".cm-scroller") ||
    view.containerEl.querySelector(".markdown-source-view") ||
    view.currentMode?.containerEl ||
    null
  );
}

function scrollMetricsFromElement(el) {
  if (!el) return { scrollHeight: 0, clientHeight: 0 };
  return { scrollHeight: el.scrollHeight || 0, clientHeight: el.clientHeight || 0 };
}

function computeReadingState(entry, estReadSec, thresholds) {
  const t = thresholds || getReadingThresholds({});
  const views = entry.views || 0;
  const activeSec = entry.activeSec || 0;
  const ratio = entry.maxScrollRatio || 0;
  const est = Math.max(30, estReadSec || 60);

  if (views === 0 && !activeSec && !entry.lastOpened) {
    return { id: "unread", ...READ_STATES.unread };
  }
  if (
    views > 0 &&
    activeSec < t.skimActiveSec &&
    ratio < t.skimCoverage
  ) {
    return { id: "skimmed", ...READ_STATES.skimmed };
  }

  const depthDone = ratio >= t.readCoverage;
  const timeHalf = activeSec >= est * t.readTimeRatio;
  const timeMost = activeSec >= est * t.deepTimeRatio;
  const scrollsPerMin =
    (entry.scrollEventCount || 0) / Math.max(1, activeSec / 60);
  const likelyDeep =
    scrollsPerMin <= t.deepScrollsPerMin || activeSec >= est;

  if (depthDone && (timeHalf || activeSec >= 90)) {
    if (likelyDeep && (timeMost || activeSec >= t.deepMinSec)) {
      return { id: "deep", ...READ_STATES.deep };
    }
    return { id: "read", ...READ_STATES.read };
  }
  if (
    ratio >= t.progressCoverage ||
    activeSec >= t.progressActiveSec ||
    views >= 2
  ) {
    return { id: "progress", ...READ_STATES.progress };
  }
  return { id: "skimmed", ...READ_STATES.skimmed };
}

class ReadTrackerDashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.sortBy = "lastOpened";
    this.sortDir = -1;
    this.listMode = "touched";
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
        text: cell.metaText || formatHeatmapCount(cell.count),
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

    if (this.listMode === "unread" || this.listMode === "rescan") {
      this.listMode = "backlog";
    }

    const summary = this.plugin.computeSummary();
    const distribution = this.plugin.computeDistribution();
    const rows =
      this.listMode === "backlog"
        ? this.plugin.getBacklogRows(this.sortBy, this.sortDir)
        : this.plugin.getSortedRows(this.sortBy, this.sortDir);

    const header = containerEl.createDiv({ cls: "art-dashboard-header" });
    this.renderSummary(header, summary, distribution);

    const insights = containerEl.createDiv({
      cls: `art-dashboard-insights${this.collapsed.insights ? " is-collapsed" : ""}`,
    });
    this.renderCollapsibleHead(
      insights,
      "insights",
      "阅读概览",
      "热力 · 雷达 · 状态分布 · 进度分布"
    );
    const insightsBody = insights.createDiv({ cls: "art-insights-body" });
    const insightsGrid = insightsBody.createDiv({ cls: "art-insights-grid" });
    this.renderHeatmap(insightsGrid);
    this.renderRadarNotes(insightsGrid);
    const chartsGrid = insightsBody.createDiv({ cls: "art-charts-grid" });
    this.renderStateDistribution(chartsGrid, distribution);
    this.renderProgressBuckets(chartsGrid, distribution);

    const tableSection = containerEl.createDiv({
      cls: `art-table-section${this.collapsed.table ? " is-collapsed" : ""}`,
    });
    const tableHint =
      this.listMode === "backlog"
        ? `${rows.length} 篇待跟进（未读 ${summary.neverOpened} · 待深读 ${summary.needsRescan}）`
        : `${rows.length} 篇已触达`;
    this.renderCollapsibleHead(tableSection, "table", "阅读清单", tableHint);

    const tableBody = tableSection.createDiv({ cls: "art-table-body" });

    const toolbar = tableBody.createDiv({ cls: "art-toolbar" });

    const modeGroup = toolbar.createDiv({ cls: "art-segment-group art-segment-mode" });
    const mkModeBtn = (label, mode) => {
      const btn = modeGroup.createEl("button", {
        cls: "art-btn art-btn-segment",
        text: label,
      });
      if (this.listMode === mode) btn.addClass("is-active");
      btn.onclick = () => {
        this.listMode = mode;
        if (mode === "backlog") {
          this.sortBy = "progressScore";
          this.sortDir = 1;
        }
        this.render();
      };
    };
    mkModeBtn("已触达", "touched");
    mkModeBtn("待跟进", "backlog");

    toolbar.createDiv({ cls: "art-toolbar-divider" });

    const sortGroup = toolbar.createDiv({
      cls: "art-segment-group art-segment-scroll art-segment-sort",
    });
    const mkSortBtn = (label, key) => {
      const active = this.sortBy === key;
      const btn = sortGroup.createEl("button", {
        cls: "art-btn art-btn-segment",
        text: active ? `${label}${this.sortDir < 0 ? " ↓" : " ↑"}` : label,
      });
      if (active) btn.addClass("is-active");
      btn.onclick = () => {
        if (this.sortBy === key) this.sortDir *= -1;
        else {
          this.sortBy = key;
          this.sortDir = key === "path" ? 1 : -1;
        }
        this.render();
      };
    };
    if (this.listMode === "backlog") {
      mkSortBtn("进度", "progressScore");
      mkSortBtn("路径", "path");
      mkSortBtn("预估", "estReadSec");
      mkSortBtn("覆盖", "maxScrollRatio");
    } else {
      mkSortBtn("进度", "progressScore");
      mkSortBtn("最近", "lastOpened");
      mkSortBtn("时长", "activeSec");
      mkSortBtn("覆盖", "maxScrollRatio");
      mkSortBtn("提问", "questionCount");
      mkSortBtn("次数", "views");
      mkSortBtn("路径", "path");
    }

    const actions = toolbar.createDiv({ cls: "art-toolbar-actions" });
    actions
      .createEl("button", { cls: "art-btn art-btn-ghost", text: "覆盖图" })
      .onclick = () => void this.plugin.activateCoverageGraph();
    actions.createEl("button", { cls: "art-btn art-btn-ghost", text: "刷新" }).onclick =
      () => this.render();
    actions
      .createEl("button", { cls: "art-btn art-btn-accent", text: "导出" })
      .onclick = async () => {
        await this.plugin.writeDashboardNote();
        new Notice("已更新总览笔记");
        this.render();
      };

    if (rows.length === 0) {
      tableBody.createDiv({
        cls: "art-empty",
        text:
          this.listMode === "backlog"
            ? "没有待跟进笔记——范围内都已读透。"
            : "还没有已触达的笔记。打开几篇 .md 后会出现。",
      });
      return;
    }

    const tableWrap = tableBody.createDiv({ cls: "art-table-wrap" });
    const table = tableWrap.createEl("table", {
      cls: `art-table${this.listMode === "backlog" ? " art-table-backlog" : ""}`,
    });
    const thead = table.createEl("thead");
    const headRow = thead.createEl("tr");

    if (this.listMode === "backlog") {
      const headers = [
        ["笔记", "笔记路径"],
        ["类型", "未读或待深读"],
        ["进度", "加权阅读进度"],
        ["覆盖", "滚动深度（未读为 —）"],
        ["预估/时长", "未读为预估；待深读为有效时长"],
      ];
      headers.forEach(([label, tip]) => {
        const th = headRow.createEl("th", { text: label });
        th.setAttribute("title", tip);
      });
    } else {
      const headers = [
        ["笔记", "笔记"],
        ["进度", "加权阅读进度 0–100（覆盖+时长+提问+回访）"],
        ["状态", "阅读深度：未读/略读/在读/已读/精读/已读完（手动标记）"],
        ["提问", "针对本篇的 Chat 提问次数"],
        ["时长", "有效阅读时长（无滚动 idle 后停表）"],
        ["覆盖", "历史最大滚动深度"],
        ["最近", "最近打开时间"],
      ];
      headers.forEach(([label, tip]) => {
        const th = headRow.createEl("th", { text: label });
        th.setAttribute("title", tip);
      });
    }

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

      if (this.listMode === "backlog") {
        const typeTd = tr.createEl("td", { cls: "art-state" });
        typeTd.createSpan({
          cls: `art-badge ${row.backlogType === "never" ? "art-badge-unread" : "art-badge-skimmed"}`,
          text: row.backlogLabel,
        });
        tr.createEl("td", {
          cls: "art-progress",
          text: row.backlogType === "never" ? "—" : `${row.progressScore}%`,
        });
        tr.createEl("td", {
          cls: "art-coverage",
          text:
            row.backlogType === "never"
              ? "—"
              : formatCoverage(row.maxScrollRatio),
        });
        tr.createEl("td", {
          cls: "art-duration",
          text:
            row.backlogType === "never"
              ? formatDuration(row.estReadSec)
              : formatDuration(row.activeSec),
        });
        continue;
      }

      tr.createEl("td", {
        cls: "art-progress",
        text: `${row.progressScore}%`,
      });

      const stateTd = tr.createEl("td", { cls: "art-state" });
      const badge = stateTd.createSpan({
        cls: `art-badge ${row.state.cls}`,
        text: row.state.label,
      });
      badge.setAttribute("title", row.state.id);

      tr.createEl("td", { cls: "art-num", text: String(row.questionCount || 0) });
      tr.createEl("td", {
        cls: "art-duration",
        text: formatDuration(row.activeSec),
      });
      tr.createEl("td", {
        cls: "art-coverage",
        text: formatCoverage(row.maxScrollRatio),
      });
      tr.createEl("td", {
        cls: "art-time",
        text: formatTime(row.lastOpened),
      });
    }
  }

  renderBarChart(containerEl, title, items, footText) {
    const wrap = containerEl.createDiv({ cls: "art-chart-wrap" });
    wrap.createDiv({ cls: "art-chart-title", text: title });
    const bars = wrap.createDiv({ cls: "art-chart-bars" });
    const max = Math.max(...items.map((i) => i.count), 1);
    const total = items.reduce((s, i) => s + i.count, 0);

    for (const item of items) {
      const row = bars.createDiv({ cls: "art-chart-row" });
      row.createSpan({ cls: "art-chart-label", text: item.label });
      const track = row.createDiv({ cls: "art-chart-track" });
      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
      const fill = track.createDiv({
        cls: `art-chart-fill${item.mod ? ` ${item.mod}` : ""}`,
      });
      fill.style.width = `${Math.max(2, (item.count / max) * 100)}%`;
      row.createSpan({
        cls: "art-chart-meta",
        text: item.count > 0 ? `${item.count} · ${pct}%` : "0",
      });
    }

    if (footText) {
      wrap.createDiv({ cls: "art-chart-foot", text: footText });
    }
  }

  renderStateDistribution(containerEl, distribution) {
    const s = distribution.byState;
    this.renderBarChart(
      containerEl,
      "阅读状态分布",
      [
        { label: "未读", count: s.unread, mod: "art-fill-muted" },
        { label: "略读", count: s.skimmed, mod: "art-fill-skimmed" },
        { label: "在读", count: s.progress, mod: "art-fill-progress" },
        { label: "已读", count: s.read, mod: "art-fill-read" },
        { label: "精读", count: s.deep, mod: "art-fill-deep" },
        { label: "已读完", count: s.complete, mod: "art-fill-complete" },
      ],
      `范围内 ${distribution.vaultMd} 篇 · 读完 ${s.read + s.deep + s.complete} 篇（${distribution.completionRate}%）`
    );
  }

  renderProgressBuckets(containerEl, distribution) {
    const items = distribution.bucketLabels.map((label, i) => ({
      label,
      count: distribution.buckets[i],
      mod: `art-fill-bucket-${i}`,
    }));
    const q = distribution.totalQuestions;
    const foot =
      q > 0
        ? `已触达笔记进度分段 · ${distribution.questionNotes} 篇有提问 · 合计 ${q} 问`
        : "已触达笔记的加权进度分段（未读不计入）";
    this.renderBarChart(containerEl, "进度分布", items, foot);
  }

  renderSummary(containerEl, summary, distribution) {
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

    addStat(summary.trackedFiles, "已触达", "", "至少打开或累计有效阅读过的笔记");
    addStat(
      summary.totalActiveMin,
      "有效分钟",
      "art-stat-accent",
      "全库有效阅读时长合计"
    );
    addStat(
      summary.avgProgress > 0 ? `${summary.avgProgress}%` : "—",
      "均进度",
      "art-stat-accent",
      "已触达笔记的加权阅读进度均值"
    );
    addStat(
      `${distribution.completionRate}%`,
      "完成率",
      "",
      `已读 + 精读 + 已读完 / 范围内总数（${distribution.byState.read + distribution.byState.deep + distribution.byState.complete}/${distribution.vaultMd}）`
    );
    addStat(summary.deepRead, "精读", "", "滚动覆盖 ≥85% 且有效时长达预期");
    addStat(
      summary.backlogTotal,
      "待跟进",
      summary.backlogTotal > 0 ? "art-stat-warn" : "art-stat-muted",
      `未读 ${summary.neverOpened} · 待深读 ${summary.needsRescan}`
    );

    if (this.plugin.activePath) {
      const cur = wrap.createDiv({ cls: "art-stat-current" });
      cur.createSpan({ cls: "art-stat-current-tag", text: "当前" });
      const name = cur.createSpan({
        cls: "art-stat-current-name",
        text: basename(this.plugin.activePath),
      });
      name.setAttribute("title", this.plugin.activePath);
      const curRow = this.plugin.enrichRow(
        this.plugin.activePath,
        this.plugin.data.files[this.plugin.activePath] ||
          this.plugin.getFileEntry(this.plugin.activePath)
      );
      cur.createSpan({
        cls: "art-stat-current-meta",
        text: ` · ${curRow.progressScore}% · ${curRow.state.label} · ${formatDuration(curRow.activeSec)} · ${curRow.questionCount || 0}问`,
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
    const selectorMap = {
      insights: ".art-dashboard-insights",
      unread: ".art-unread-section",
      rescan: ".art-rescan-section",
      table: ".art-table-section",
    };
    const selector = selectorMap[key];
    const panel = selector ? this.containerEl.querySelector(selector) : null;
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
    const isActive = model.metric === "active";
    const legendHints = isActive ? ACTIVE_HEAT_LEVEL_HINTS : HEAT_LEVEL_HINTS;

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
      item.createSpan({ text: legendHints[l] });
    }
    const footDesc = foot.createDiv({ cls: "art-card-foot-desc" });
    this.paintHeatmapCells(grid, model.inRangeCells, tooltip, gridWrap);
    const peakLabel = isActive
      ? model.max >= 3600
        ? `${Math.floor(model.max / 3600)}h+`
        : `${Math.round(model.max / 60)}m`
      : model.max >= 100
        ? "100+"
        : String(model.max);
    footDesc.setText(
      isActive
        ? `有效阅读 · 最近 ${model.numWeeks} 周 · ${model.totalInRange} 天有记录 · 峰值 ${peakLabel}/日 · 设置可切回「打开次数」`
        : `打开次数 · 最近 ${model.numWeeks} 周 · 峰值 ${peakLabel} 次/日`
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
    const footDesc = `Top ${limit} · 按有效阅读时长 · 点击轴标签打开笔记`;

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
        text: `${formatDuration(row.metricValue)} 有效 · ${formatCoverage(row.maxScrollRatio)} · ${row.views} 次打开`,
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
    const maxMetric = rows[0].metricValue || 1;
    const size = 240;
    const pad = 42;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = (size - pad * 2) / 2;

    const svg = svgCreate(container, "svg", {
      viewBox: `0 0 ${size} ${size}`,
      class: "art-radar-svg",
      role: "img",
      "aria-label": "有效阅读时长雷达图",
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
      const ratio = Math.max(0.1, row.metricValue / maxMetric);
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
    this._engagementHandler = null;
    this._lastEngagement = 0;
    this._lastScrollTop = null;
    this._restoreToken = 0;
    this._programmaticScroll = false;

    this.debouncedPersist = debounce(() => void this.flushData(), 350);
    this.debouncedScrollSave = debounce(() => {
      if (this.activePath) this.saveScrollForPath(this.activePath);
    }, 400);
    this.debouncedSyncActive = debounce(() => this.syncActiveFile(), 50);
    this.debouncedSyncFloatingMarker = debounce(() => {
      this.syncFloatingMarker();
    }, 120);

    this.registerView(VIEW_TYPE, (leaf) => new ReadTrackerDashboardView(leaf, this));
    this.registerView(VIEW_TYPE_COVERAGE, (leaf) => new CoverageGraphView(leaf, this));

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
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.debouncedSyncFloatingMarker();
      })
    );

    this.registerInterval(
      window.setInterval(() => {
        if (this.activePath) this.saveScrollForPath(this.activePath);
      }, 2000)
    );

    this.registerInterval(
      window.setInterval(() => this.tickActiveReading(), 1000)
    );

    this.registerDomEvent(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.activePath) {
        this.saveScrollForPath(this.activePath);
      }
    });

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("ai-read-tracker-status");
    this.statusEl.onclick = () => void this.activateDashboard();

    this.addRibbonIcon("book-open", "阅读统计总览", () => {
      void this.activateDashboard();
    });

    this.addRibbonIcon("git-graph", "知识覆盖图", () => {
      void this.activateCoverageGraph();
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
      id: "open-coverage-graph",
      name: "Read Tracker: 打开知识覆盖图",
      callback: () => void this.activateCoverageGraph(),
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

    this.addCommand({
      id: "mark-complete",
      name: "Read Tracker: 标记当前笔记已读完",
      callback: () => {
        const file = this.getActiveMarkdownFile();
        if (!file) {
          new Notice("当前没有打开的 Markdown 笔记");
          return;
        }
        void this.markFileComplete(file.path);
      },
    });

    this.addCommand({
      id: "debug-complete-marker",
      name: "Read Tracker: 诊断已读完标记",
      callback: () => this.debugCompleteMarker(),
    });

    this.addCommand({
      id: "unmark-complete",
      name: "Read Tracker: 撤销当前笔记已读完",
      callback: () => {
        const file = this.getActiveMarkdownFile();
        if (!file) {
          new Notice("当前没有打开的 Markdown 笔记");
          return;
        }
        void this.unmarkFileComplete(file.path);
      },
    });

    this.addSettingTab(new AiReadTrackerSettingTab(this.app, this));

    this.syncQuestionsFromChat();
    this.syncActiveFile();
    this.refreshDashboardViews();
  }

  onunload() {
    if (this.activePath) this.saveScrollForPath(this.activePath);
    void this.flushData();
    this.detachScrollListeners();
    this.removeAllFloatingMarkers();
    this.removeInlineCompleteMarkers();
    if (this.restoreTimer) clearTimeout(this.restoreTimer);
  }

  async loadPluginData() {
    const loaded = (await this.loadData()) || {};
    this.data = {
      settings: { ...DEFAULT_SETTINGS, ...(loaded.settings || {}) },
      files: loaded.files || {},
      daily: loaded.daily || {},
      dailyActive: loaded.dailyActive || {},
    };
  }

  getReadingThresholds() {
    return getReadingThresholds(this.data.settings || {});
  }

  buildHeatmapModel() {
    const metric = this.data.settings.heatmapMetric || "active";
    const dailySource =
      metric === "opens" ? this.data.daily || {} : this.data.dailyActive || {};
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
      const count = dailySource[key] || 0;
      allCells.push({
        date: key,
        count,
        inRange: cur.getTime() >= rangeStart.getTime(),
        ts: cur.getTime(),
        metaText:
          metric === "active"
            ? formatActiveHeatmapCount(count)
            : formatHeatmapCount(count),
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
      if (!c.inRange) {
        c.level = 0;
        continue;
      }
      c.level =
        metric === "active"
          ? activeSecHeatLevel(c.count)
          : heatLevel(c.count);
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
      metric,
    };
  }

  getTopMetricValue(row, metric) {
    if (metric === "views") return row.views || 0;
    if (metric === "maxScrollRatio") return Math.round((row.maxScrollRatio || 0) * 100);
    return row.activeSec || 0;
  }

  getTopNotes(limitOverride) {
    const limit =
      limitOverride ??
      Math.min(50, Math.max(5, this.data.settings.topNotesLimit || RADAR_TOP_N));
    const metric = this.data.settings.topNotesMetric || "activeSec";
    const rows = [];
    for (const [path, entry] of Object.entries(this.data.files || {})) {
      if (!this.matchesScope(path) || !this.hasBeenTouched(entry)) continue;
      const row = this.enrichRow(path, entry);
      rows.push({
        path,
        label: basename(path),
        ...row,
        metricValue: this.getTopMetricValue(row, metric),
      });
    }
    rows.sort(
      (a, b) =>
        b.metricValue - a.metricValue ||
        b.activeSec - a.activeSec ||
        b.lastOpened - a.lastOpened
    );
    const sliced = rows.slice(0, limit);
    const maxMetric = sliced.length ? sliced[0].metricValue : 1;
    for (const row of sliced) {
      row.pct = Math.max(4, Math.round((row.metricValue / maxMetric) * 100));
    }
    return { rows: sliced, limit, metric };
  }

  recordDailyOpen(ts) {
    if (!this.data.daily) this.data.daily = {};
    const key = toDateKey(ts);
    this.data.daily[key] = (this.data.daily[key] || 0) + 1;
    this.pruneDailySeries(this.data.daily);
  }

  recordDailyActive(sec) {
    if (!sec || sec <= 0) return;
    if (!this.data.dailyActive) this.data.dailyActive = {};
    const key = toDateKey(Date.now());
    this.data.dailyActive[key] = (this.data.dailyActive[key] || 0) + sec;
    this.pruneDailySeries(this.data.dailyActive);
  }

  pruneDaily() {
    this.pruneDailySeries(this.data.daily || {});
    this.pruneDailySeries(this.data.dailyActive || {});
  }

  pruneDailySeries(series) {
    const keep = this.data.settings.dailyRetentionDays || 400;
    const cutoff = Date.now() - keep * 86400000;
    for (const key of Object.keys(series)) {
      const t = new Date(`${key}T12:00:00`).getTime();
      if (Number.isNaN(t) || t < cutoff) delete series[key];
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
    this.syncQuestionsFromChat();
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof ReadTrackerDashboardView) leaf.view.render();
    });
    this.app.workspace.getLeavesOfType(VIEW_TYPE_COVERAGE).forEach((leaf) => {
      if (leaf.view instanceof CoverageGraphView) leaf.view.render();
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

  isPathOpenInWorkspace(path) {
    if (!path) return false;
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    return leaves.some((leaf) => leaf.view?.file?.path === path);
  }

  syncActiveFile() {
    const file = this.getActiveMarkdownFile();
    if (!file || file.extension !== "md") {
      if (this.activePath && !this.isPathOpenInWorkspace(this.activePath)) {
        this.saveScrollForPath(this.activePath);
        this.activePath = null;
      }
      this.removeAllFloatingMarkers();
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
      this.syncFloatingMarker();
      return;
    }

    const prev = this.activePath;
    if (prev) this.saveScrollForPath(prev);

    this.activePath = path;
    this.recordOpen(path, file);
    this.scheduleRestore(path);
    this.attachScrollListeners();
    this.updateStatusBar();
    this.syncFloatingMarker();
  }

  computeSummary() {
    const files = this.data.files || {};
    let totalViews = 0;
    let totalActiveSec = 0;
    let trackedFiles = 0;
    let openedToday = 0;
    let deepRead = 0;
    let inProgress = 0;
    let needsRescan = 0;
    let progressSum = 0;
    const today = startOfToday();
    const settings = this.data.settings || {};

    for (const [path, entry] of Object.entries(files)) {
      if (!this.matchesScope(path)) continue;
      if (!this.hasBeenTouched(entry)) continue;
      trackedFiles += 1;
      totalViews += entry.views || 0;
      totalActiveSec += entry.activeSec || 0;
      if ((entry.lastOpened || 0) >= today) openedToday += 1;
      const row = this.enrichRow(path, entry);
      if (row.state.id === "deep") deepRead += 1;
      else if (row.state.id === "progress") inProgress += 1;
      if (isNeedsRescan(row, settings)) needsRescan += 1;
      progressSum += row.progressScore || 0;
    }

    const scopedFiles = this.getScopedMarkdownFiles();
    const vaultMd = scopedFiles.length;
    let neverOpened = 0;
    for (const file of scopedFiles) {
      const entry = files[file.path];
      if (!entry || !this.hasBeenTouched(entry)) neverOpened += 1;
    }

    let currentViews = 0;
    if (this.activePath && files[this.activePath]) {
      currentViews = files[this.activePath].views || 0;
    }

    return {
      trackedFiles,
      totalViews,
      totalActiveSec,
      totalActiveMin: Math.round(totalActiveSec / 60),
      openedToday,
      neverOpened,
      deepRead,
      inProgress,
      needsRescan,
      backlogTotal: neverOpened + needsRescan,
      avgProgress:
        trackedFiles > 0 ? Math.round(progressSum / trackedFiles) : 0,
      vaultMd,
      currentViews,
    };
  }

  computeDistribution() {
    const files = this.data.files || {};
    const settings = this.data.settings || {};
    const scoped = this.getScopedMarkdownFiles();
    const byState = {
      unread: 0,
      skimmed: 0,
      progress: 0,
      read: 0,
      deep: 0,
      complete: 0,
    };
    const buckets = [0, 0, 0, 0, 0];
    let questionNotes = 0;
    let totalQuestions = 0;
    let needsRescan = 0;

    for (const file of scoped) {
      const entry = files[file.path];
      if (!entry || !this.hasBeenTouched(entry)) {
        byState.unread += 1;
        continue;
      }
      const row = this.enrichRow(file.path, entry);
      const sid = row.state.id;
      if (sid in byState && sid !== "unread") byState[sid] += 1;
      else byState.skimmed += 1;

      const score = row.progressScore || 0;
      const bi =
        score >= 81 ? 4 : score >= 61 ? 3 : score >= 41 ? 2 : score >= 21 ? 1 : 0;
      buckets[bi] += 1;

      if (row.questionCount > 0) {
        questionNotes += 1;
        totalQuestions += row.questionCount;
      }
      if (isNeedsRescan(row, settings)) needsRescan += 1;
    }

    const vaultMd = scoped.length;
    const done = byState.read + byState.deep + byState.complete;
    return {
      byState,
      buckets,
      bucketLabels: ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"],
      questionNotes,
      totalQuestions,
      needsRescan,
      backlogTotal: byState.unread + needsRescan,
      completionRate: vaultMd > 0 ? Math.round((done / vaultMd) * 100) : 0,
      vaultMd,
    };
  }

  getBacklogRows(sortBy, sortDir) {
    const unread = this.getUnreadRows().map((r) => ({
      path: r.path,
      estReadSec: r.estReadSec,
      backlogType: "never",
      backlogLabel: "未读",
      progressScore: 0,
      activeSec: 0,
      maxScrollRatio: 0,
      questionCount: 0,
      views: 0,
      lastOpened: 0,
      state: { id: "unread", ...READ_STATES.unread },
    }));
    const rescan = this.getRescanRows(sortBy, sortDir).map((r) => ({
      ...r,
      backlogType: "rescan",
      backlogLabel: "待深读",
    }));
    const merged = [...rescan, ...unread];
    const dir = sortDir ?? 1;
    const key = sortBy || "progressScore";

    merged.sort((a, b) => {
      if (a.backlogType !== b.backlogType) {
        return a.backlogType === "rescan" ? -1 : 1;
      }
      let cmp = 0;
      if (key === "path") cmp = a.path.localeCompare(b.path);
      else if (key === "estReadSec") cmp = a.estReadSec - b.estReadSec;
      else if (key === "maxScrollRatio") {
        cmp = a.maxScrollRatio - b.maxScrollRatio;
      } else cmp = a.progressScore - b.progressScore;
      return cmp * dir;
    });
    return merged;
  }

  syncQuestionsFromChat() {
    const chat = this.app.plugins.plugins[CURSOR_CHAT_PLUGIN_ID];
    const fileQA = chat?.fileQA;
    if (!fileQA) return;
    let changed = false;
    for (const [path, qa] of Object.entries(fileQA)) {
      if (!this.matchesScope(path)) continue;
      const entry = this.getFileEntry(path);
      const count = qa.questionCount || 0;
      if (count > (entry.questionCount || 0)) {
        entry.questionCount = count;
        const last = qa.items?.[qa.items.length - 1];
        if (last?.ts) entry.lastQuestionAt = last.ts;
        changed = true;
      }
    }
    if (changed) this.schedulePersist();
  }

  recordQuestionForPath(path, meta) {
    if (!path) return;
    const entry = this.getFileEntry(path);
    const count = meta?.questionCount ?? (entry.questionCount || 0) + 1;
    entry.questionCount = Math.max(entry.questionCount || 0, count);
    if (meta?.lastQuestionAt) entry.lastQuestionAt = meta.lastQuestionAt;
    this.schedulePersist();
    this.refreshDashboardViews();
  }

  matchesScope(path) {
    const prefix = (this.data.settings.trackScopePrefix || "").trim();
    if (!prefix) return true;
    return path.startsWith(prefix);
  }

  getScopedMarkdownFiles() {
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => this.matchesScope(f.path));
  }

  hasBeenTouched(entry) {
    if (!entry) return false;
    return (
      (entry.views || 0) > 0 ||
      (entry.activeSec || 0) > 0 ||
      (entry.lastOpened || 0) > 0
    );
  }

  estimateReadSec(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const words = cache?.wordCount || 0;
    const wpm = this.data.settings.wordsPerMinute || 200;
    return Math.max(30, Math.round((words / wpm) * 60));
  }

  ensureEstReadSec(path, file) {
    const entry = this.getFileEntry(path);
    if (!entry.estReadSec) {
      entry.estReadSec = file ? this.estimateReadSec(file) : 60;
    }
    return entry.estReadSec;
  }

  enrichRow(path, entry) {
    const file = this.app.vault.getAbstractFileByPath(path);
    const estReadSec =
      entry.estReadSec ||
      (file instanceof TFile ? this.estimateReadSec(file) : 60);
    const state = entry.markedComplete
      ? { id: "complete", ...READ_STATES.complete }
      : computeReadingState(entry, estReadSec, this.getReadingThresholds());
    const progressScore = computeProgressScore(
      entry,
      estReadSec,
      this.data.settings || {}
    );
    return {
      path,
      views: entry.views || 0,
      lastOpened: entry.lastOpened || 0,
      scrollTop: entry.scrollTop || 0,
      scrollMode: entry.scrollMode || "source",
      activeSec: entry.activeSec || 0,
      maxScrollRatio: entry.maxScrollRatio || 0,
      scrollEventCount: entry.scrollEventCount || 0,
      questionCount: entry.questionCount || 0,
      lastQuestionAt: entry.lastQuestionAt || 0,
      estReadSec,
      progressScore,
      markedComplete: !!entry.markedComplete,
      markedCompleteAt: entry.markedCompleteAt || 0,
      state,
    };
  }

  getUnreadRows() {
    const files = this.data.files || {};
    const limit = this.data.settings.unreadListLimit || 200;
    const rows = [];
    for (const file of this.getScopedMarkdownFiles()) {
      const entry = files[file.path];
      if (entry && this.hasBeenTouched(entry)) continue;
      rows.push({
        path: file.path,
        estReadSec: this.estimateReadSec(file),
      });
    }
    rows.sort((a, b) => a.path.localeCompare(b.path));
    return rows.slice(0, limit);
  }

  getRescanRows(sortBy, sortDir) {
    const settings = this.data.settings || {};
    const rows = this.getSortedRows(sortBy || "maxScrollRatio", sortDir ?? 1).filter(
      (row) => isNeedsRescan(row, settings)
    );
    return rows;
  }

  getSortedRows(sortBy, sortDir) {
    const rows = [];
    for (const [path, entry] of Object.entries(this.data.files || {})) {
      if (!this.matchesScope(path) || !this.hasBeenTouched(entry)) continue;
      rows.push(this.enrichRow(path, entry));
    }

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "path") cmp = a.path.localeCompare(b.path);
      else if (sortBy === "views") cmp = a.views - b.views;
      else if (sortBy === "activeSec") cmp = a.activeSec - b.activeSec;
      else if (sortBy === "maxScrollRatio") cmp = a.maxScrollRatio - b.maxScrollRatio;
      else if (sortBy === "estReadSec") cmp = a.estReadSec - b.estReadSec;
      else if (sortBy === "progressScore") cmp = a.progressScore - b.progressScore;
      else if (sortBy === "questionCount") cmp = a.questionCount - b.questionCount;
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

  async activateCoverageGraph() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_COVERAGE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_COVERAGE, active: true });
    } else {
      await leaf.setViewState({ type: VIEW_TYPE_COVERAGE, active: true });
    }
    workspace.revealLeaf(leaf);
    if (leaf.view instanceof CoverageGraphView) leaf.view.render();
  }

  async writeDashboardNote() {
    const path = this.data.settings.dashboardNotePath;
    const summary = this.computeSummary();
    const rows = this.getSortedRows("lastOpened", -1);
    const scope = (this.data.settings.trackScopePrefix || "").trim() || "全库";
    const heatMetric = this.data.settings.heatmapMetric || "active";
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
      `统计范围：\`${scope}\``,
      "",
      "| 指标 | 数值 |",
      "| --- | --- |",
      `| 已触达笔记 | ${summary.trackedFiles} |`,
      `| 有效阅读合计 | ${formatDuration(summary.totalActiveSec)} |`,
      `| 精读（深度已读） | ${summary.deepRead} |`,
      `| 待跟进 | ${summary.backlogTotal} |`,
      `| 　└ 未读 | ${summary.neverOpened} |`,
      `| 　└ 待深读 | ${summary.needsRescan} |`,
      `| 在读进行中 | ${summary.inProgress} |`,
      `| 范围内 .md 总数 | ${summary.vaultMd} |`,
      `| 加权均进度 | ${summary.avgProgress}% |`,
      `| 合计打开次数 | ${summary.totalViews} |`,
      `| 今日打开过的笔记 | ${summary.openedToday} |`,
      "",
      "## 阅读热力（最近 30 天）",
      "",
      heatMetric === "active"
        ? "_按有效阅读秒数累计；升级后新阅读才会着色。_"
        : "_按打开次数累计。_",
      "",
      heatMetric === "active"
        ? "| 日期 | 有效阅读 |"
        : "| 日期 | 打开次数 |",
      "| --- | ---: |",
    ];

    const dailySeries =
      heatMetric === "active"
        ? this.data.dailyActive || {}
        : this.data.daily || {};
    const dayKeys = Object.keys(dailySeries).sort().reverse().slice(0, 30);
    if (dayKeys.length === 0) {
      lines.push("| _暂无按日数据_ | — |");
    } else {
      for (const key of dayKeys) {
        const val = dailySeries[key];
        lines.push(
          `| ${key} | ${heatMetric === "active" ? formatDuration(val) : val} |`
        );
      }
    }

    const top = this.getTopNotes();
    lines.push(
      "",
      `## 精读时长 Top ${top.limit}`,
      "",
      "| 笔记 | 有效时长 | 覆盖 | 打开 |",
      "| --- | ---: | ---: | ---: |"
    );
    if (top.rows.length === 0) {
      lines.push("| _暂无_ | — | — | — |");
    } else {
      for (const row of top.rows) {
        const link = `[[${row.path}|${row.label || basename(row.path)}]]`;
        lines.push(
          `| ${link} | ${formatDuration(row.activeSec)} | ${formatCoverage(row.maxScrollRatio)} | ${row.views} |`
        );
      }
    }

    const backlogRows = this.getBacklogRows("progressScore", 1);
    lines.push(
      "",
      `## 待跟进（${backlogRows.length} 篇）`,
      "",
      "_未读 + 待深读合并清单；待深读排在前面。_",
      "",
      "| 笔记 | 类型 | 进度 | 时长/预估 | 覆盖 |",
      "| --- | --- | ---: | ---: | ---: |"
    );
    if (backlogRows.length === 0) {
      lines.push("| _暂无_ | — | — | — | — |");
    } else {
      for (const row of backlogRows.slice(0, 120)) {
        const link = `[[${row.path}|${basename(row.path)}]]`;
        lines.push(
          `| ${link} | ${row.backlogLabel} | ${row.backlogType === "never" ? "—" : `${row.progressScore}%`} | ${formatDuration(row.backlogType === "never" ? row.estReadSec : row.activeSec)} | ${row.backlogType === "never" ? "—" : formatCoverage(row.maxScrollRatio)} |`
        );
      }
    }

    const dist = this.computeDistribution();
    lines.push(
      "",
      "## 阅读状态分布",
      "",
      "| 状态 | 篇数 |",
      "| --- | ---: |",
      `| 未读 | ${dist.byState.unread} |`,
      `| 略读 | ${dist.byState.skimmed} |`,
      `| 在读 | ${dist.byState.progress} |`,
      `| 已读 | ${dist.byState.read} |`,
      `| 精读 | ${dist.byState.deep} |`,
      `| 已读完 | ${dist.byState.complete} |`,
      "",
      "## 进度分布（已触达）",
      "",
      "| 区间 | 篇数 |",
      "| --- | ---: |"
    );
    dist.bucketLabels.forEach((label, i) => {
      lines.push(`| ${label} | ${dist.buckets[i]} |`);
    });

    lines.push(
      "",
      "## 已触达（按阅读进度）",
      "",
      "_进度 = 35% 覆盖 + 30% 有效时长 + 25% 提问深度 + 10% 回访（可在设置调整）_",
      "",
      "| 笔记 | 进度 | 状态 | 提问 | 有效时长 | 覆盖 | 最近打开 |",
      "| --- | ---: | --- | ---: | ---: | ---: | --- |"
    );

    const byProgress = this.getSortedRows("progressScore", -1);
    for (const row of byProgress) {
      const link = `[[${row.path}|${basename(row.path)}]]`;
      lines.push(
        `| ${link} | ${row.progressScore}% | ${row.state.label} | ${row.questionCount || 0} | ${formatDuration(row.activeSec)} | ${formatCoverage(row.maxScrollRatio)} | ${formatTime(row.lastOpened)} |`
      );
    }

    if (byProgress.length === 0) {
      lines.push("| _暂无数据_ | — | — | — | — | — | — |");
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
        activeSec: 0,
        maxScrollRatio: 0,
        scrollEventCount: 0,
        estReadSec: 0,
        lastEngagement: 0,
        questionCount: 0,
        lastQuestionAt: 0,
        markedComplete: false,
        markedCompleteAt: 0,
      };
    } else {
      const e = this.data.files[path];
      if (e.activeSec == null) e.activeSec = 0;
      if (e.maxScrollRatio == null) e.maxScrollRatio = 0;
      if (e.scrollEventCount == null) e.scrollEventCount = 0;
      if (e.estReadSec == null) e.estReadSec = 0;
      if (e.lastEngagement == null) e.lastEngagement = 0;
      if (e.questionCount == null) e.questionCount = 0;
      if (e.lastQuestionAt == null) e.lastQuestionAt = 0;
      if (e.markedComplete == null) e.markedComplete = false;
      if (e.markedCompleteAt == null) e.markedCompleteAt = 0;
    }
    return this.data.files[path];
  }

  async markFileComplete(path) {
    if (!path || !this.matchesScope(path)) return;
    const entry = this.getFileEntry(path);
    entry.markedComplete = true;
    entry.markedCompleteAt = Date.now();
    await this.flushData();
    this.refreshCompleteMarkerForPath(path);
    new Notice("已标记读完");
  }

  async unmarkFileComplete(path) {
    if (!path) return;
    const entry = this.data.files[path];
    if (!entry?.markedComplete) {
      new Notice("该笔记尚未标记已读完");
      return;
    }
    entry.markedComplete = false;
    entry.markedCompleteAt = 0;
    await this.flushData();
    this.refreshCompleteMarkerForPath(path);
    new Notice("已撤销读完标记");
  }

  refreshCompleteMarkerForPath(path) {
    this.refreshDashboardViews();
    this.removeInlineCompleteMarkers();
    this.syncFloatingMarker();
  }

  refreshAllCompleteMarkers() {
    this.refreshDashboardViews();
    this.removeInlineCompleteMarkers();
    this.syncFloatingMarker();
  }

  getFloatingMarkerAnchor(view) {
    if (!view?.containerEl) return null;
    const anchor =
      view.containerEl.querySelector(".view-content") || view.containerEl;
    if (anchor && getComputedStyle(anchor).position === "static") {
      anchor.style.position = "relative";
    }
    return anchor;
  }

  isReadingLikeView(view) {
    if (!(view instanceof MarkdownView)) return false;
    if (typeof view.getMode === "function" && view.getMode() === "source") {
      return false;
    }
    return !!this.getMarkdownPreviewRoot(view);
  }

  debugCompleteMarker() {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice("当前没有打开的 Markdown 笔记");
      return;
    }
    const path = file.path;
    const view = this.getMarkdownView();
    const mode = typeof view?.getMode === "function" ? view.getMode() : "?";
    const anchor = view ? this.getFloatingMarkerAnchor(view) : null;
    const floatEl = anchor?.querySelector(".art-read-fab");
    const inlineCount = view?.containerEl?.querySelectorAll(
      ".art-read-complete-footer"
    ).length;
    this.syncFloatingMarker();
    new Notice(
      [
        `路径 ${path}`,
        `模式 ${mode} · 范围 ${this.matchesScope(path) ? "✓" : "✗"}`,
        `标记开关 ${this.data.settings.showCompleteMarker !== false ? "开" : "关"}`,
        `悬浮栏 ${floatEl || anchor?.querySelector(".art-read-fab") ? "✓" : "✗"}`,
        `文中残留 ${inlineCount || 0} 处`,
      ].join("\n"),
      8000
    );
  }

  removeInlineCompleteMarkers() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      view?.containerEl
        ?.querySelectorAll(".art-read-complete-footer")
        .forEach((el) => el.remove());
    }
  }

  removeAllFloatingMarkers() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      view?.containerEl
        ?.querySelectorAll(".art-read-fab, .art-read-complete-float")
        .forEach((el) => el.remove());
    }
  }

  scrollActiveViewToTop() {
    const view = this.getMarkdownView();
    if (!view) return;

    try {
      if (view.currentMode?.applyScroll) {
        this._programmaticScroll = true;
        view.currentMode.applyScroll(0);
        requestAnimationFrame(() => {
          this._programmaticScroll = false;
        });
      } else {
        const el = getMarkdownScrollContainer(view);
        if (el?.scrollTo) {
          el.scrollTo({ top: 0, behavior: "smooth" });
        } else if (el) {
          el.scrollTop = 0;
        }
      }
    } catch (_) {
      const el = getMarkdownScrollContainer(view);
      if (el) el.scrollTop = 0;
    }

    if (this.activePath) {
      this.recordEngagement(this.activePath, true);
    }
  }

  createFabIconButton(parent, icon, title) {
    const btn = parent.createEl("button", {
      cls: "art-read-fab-btn",
      attr: { type: "button", "aria-label": title },
    });
    btn.setAttribute("title", title);
    setIcon(btn.createSpan({ cls: "art-read-fab-icon" }), icon);
    return btn;
  }

  syncFloatingMarker() {
    this.removeInlineCompleteMarkers();
    this.removeAllFloatingMarkers();

    const view = this.getMarkdownView();
    if (!view?.file || !this.isReadingLikeView(view)) return;

    const path = view.file.path;
    if (!path.endsWith(".md") || !this.matchesScope(path)) return;

    const anchor = this.getFloatingMarkerAnchor(view);
    if (!anchor) return;

    const floatEl = anchor.createDiv({ cls: "art-read-fab" });
    this.renderReadingFab(floatEl, path);
  }

  renderReadingFab(container, path) {
    const topBtn = this.createFabIconButton(container, "arrow-up", "返回顶部");
    topBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.scrollActiveViewToTop();
    };

    if (this.data.settings.showCompleteMarker === false) return;

    const entry = this.data.files[path];
    const marked = entry?.markedComplete;

    if (marked) {
      const done = container.createDiv({ cls: "art-read-fab-done" });
      const main = done.createDiv({ cls: "art-read-fab-done-main" });
      const iconWrap = main.createSpan({ cls: "art-read-fab-done-icon" });
      setIcon(iconWrap, "check-circle-2");
      main.createSpan({ cls: "art-read-fab-done-text", text: "已读完" });
      const at = entry.markedCompleteAt;
      const timeLabel = formatFabDoneTime(at);
      if (timeLabel) {
        main.createSpan({ cls: "art-read-fab-done-sep", text: "·" });
        main.createSpan({
          cls: "art-read-fab-done-time",
          text: timeLabel,
          attr: { title: formatTime(at) },
        });
      }
      const undo = done.createEl("button", {
        cls: "art-read-fab-undo",
        text: "撤销",
        attr: { type: "button", title: "撤销读完标记" },
      });
      undo.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        void this.unmarkFileComplete(path);
      };
      return;
    }

    const markBtn = container.createEl("button", {
      cls: "art-read-fab-mark",
      attr: { type: "button" },
    });
    markBtn.setAttribute("title", "读完后点此标记，进度记为 100%");
    const markIcon = markBtn.createSpan({ cls: "art-read-fab-mark-icon" });
    setIcon(markIcon, "circle-check");
    markBtn.createSpan({ cls: "art-read-fab-mark-text", text: "标记已读完" });
    markBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.markFileComplete(path);
    };
  }

  getMarkdownPreviewRoot(view) {
    if (!view?.containerEl) return null;
    const el = view.containerEl;
    return (
      el.querySelector(".markdown-reading-view") ||
      el.querySelector(".markdown-preview-view") ||
      el.querySelector(".markdown-rendered") ||
      null
    );
  }

  recordEngagement(path, fromScroll = false) {
    if (!path || path !== this.activePath) return;
    const now = Date.now();
    this._lastEngagement = now;
    const entry = this.getFileEntry(path);
    entry.lastEngagement = now;
    if (fromScroll) {
      entry.scrollEventCount = (entry.scrollEventCount || 0) + 1;
    }
  }

  tickActiveReading() {
    const path = this.activePath;
    if (!path) return;
    if (document.visibilityState === "hidden") return;

    const view = this.getMarkdownView();
    if (!view?.file || view.file.path !== path) return;

    const idleMs = (this.data.settings.idleSec ?? 20) * 1000;
    const now = Date.now();
    const last = this._lastEngagement || this.data.files[path]?.lastEngagement || 0;
    if (!last || now - last > idleMs) return;

    const entry = this.getFileEntry(path);
    entry.activeSec = (entry.activeSec || 0) + 1;
    this.recordDailyActive(1);
    if (entry.activeSec % 15 === 0) this.schedulePersist();
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
      const mode = view.getMode();
      const el = getMarkdownScrollContainer(view);
      if (view.currentMode?.getScroll) {
        const top = view.currentMode.getScroll();
        const { scrollHeight, clientHeight } = scrollMetricsFromElement(el);
        return {
          mode,
          top,
          left: 0,
          scrollHeight,
          clientHeight,
          ratio: scrollRatioFromMetrics(top, scrollHeight, clientHeight),
        };
      }
      if (mode === "source" && view.editor?.getScrollInfo) {
        const info = view.editor.getScrollInfo();
        return {
          mode: "source",
          top: info.top,
          left: info.left,
          scrollHeight: info.height,
          clientHeight: info.clientHeight,
          ratio: scrollRatioFromMetrics(info.top, info.height, info.clientHeight),
        };
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  applyScrollToView(view, entry) {
    if (!view || entry.scrollTop == null) return false;
    const savedMode = entry.scrollMode || "source";
    if (view.getMode() !== savedMode) return false;
    try {
      if (view.currentMode?.applyScroll) {
        this._programmaticScroll = true;
        view.currentMode.applyScroll(entry.scrollTop);
        requestAnimationFrame(() => {
          this._programmaticScroll = false;
        });
        return true;
      }
      if (savedMode === "source" && view.editor?.scrollTo) {
        this._programmaticScroll = true;
        view.editor.scrollTo(entry.scrollLeft ?? 0, entry.scrollTop ?? 0);
        requestAnimationFrame(() => {
          this._programmaticScroll = false;
        });
        return true;
      }
    } catch (_) {
      this._programmaticScroll = false;
      return false;
    }
    return false;
  }

  cancelScheduledRestore() {
    this._restoreToken += 1;
    if (this.restoreTimer) {
      clearTimeout(this.restoreTimer);
      this.restoreTimer = null;
    }
  }

  saveScrollForPath(path) {
    const view = this.getMarkdownView();
    if (!view?.file || view.file.path !== path) return;

    const state = this.readScrollFromView(view);
    if (!state) return;

    const entry = this.getFileEntry(path);
    const prevTop = entry.scrollTop ?? 0;
    entry.scrollTop = state.top;
    entry.scrollLeft = state.left;
    entry.scrollMode = state.mode;
    if (state.ratio != null) {
      entry.maxScrollRatio = Math.max(entry.maxScrollRatio || 0, state.ratio);
    }
    if (Math.abs(state.top - prevTop) > 8) {
      this.recordEngagement(path, true);
    }
    this.schedulePersist();
  }

  recordOpen(path, file) {
    const now = Date.now();
    const debounceMs = (this.data.settings.openDebounceSec ?? 2) * 1000;
    const entry = this.getFileEntry(path);

    if (file instanceof TFile) {
      this.ensureEstReadSec(path, file);
    }

    if (now - (entry.lastOpenCountedAt || 0) >= debounceMs) {
      entry.views = (entry.views || 0) + 1;
      entry.lastOpenCountedAt = now;
      this.recordDailyOpen(now);
    }
    entry.lastOpened = now;
    this.recordEngagement(path, false);
    this._lastScrollTop = entry.scrollTop ?? 0;
    this.schedulePersist();
  }

  scheduleRestore(path) {
    this.cancelScheduledRestore();

    const entry = this.data.files[path];
    if (!entry || entry.scrollTop == null || entry.scrollTop <= 0) return;

    const delay = this.data.settings.restoreDelayMs || 80;
    const max = this.data.settings.restoreRetries || 8;
    let tries = 0;
    const token = this._restoreToken;

    const attempt = () => {
      if (token !== this._restoreToken) return;

      const view = this.getMarkdownView();
      if (!view?.file || view.file.path !== path) return;

      const current = this.readScrollFromView(view);
      const target = entry.scrollTop ?? 0;
      if (current && Math.abs(current.top - target) < 16) return;

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
    if (this._scrollEl && this._engagementHandler) {
      this._scrollEl.removeEventListener("wheel", this._engagementHandler);
    }
    if (this._scrollEl && this._cancelRestoreHandler) {
      this._scrollEl.removeEventListener("pointerdown", this._cancelRestoreHandler);
    }
    this._scrollEl = null;
    this._scrollHandler = null;
    this._engagementHandler = null;
    this._cancelRestoreHandler = null;
  }

  attachScrollListeners() {
    const view = this.getMarkdownView();
    if (!view) return;

    const el = getMarkdownScrollContainer(view);
    if (el && el === this._scrollEl) return;

    this.detachScrollListeners();

    const onUserInteract = () => {
      if (!this._programmaticScroll) this.cancelScheduledRestore();
    };
    const handler = () => {
      if (!this._programmaticScroll) this.cancelScheduledRestore();
      this.debouncedScrollSave();
    };
    const engage = () => {
      onUserInteract();
      this.recordEngagement(this.activePath, true);
    };

    if (el) {
      el.addEventListener("scroll", handler, { passive: true });
      el.addEventListener("wheel", engage, { passive: true });
      el.addEventListener("pointerdown", onUserInteract, { passive: true });
      this._scrollEl = el;
      this._scrollHandler = handler;
      this._engagementHandler = engage;
      this._cancelRestoreHandler = onUserInteract;
    }
  }

  updateStatusBar() {
    if (!this.statusEl) return;
    const summary = this.computeSummary();
    const cur = this.activePath ? basename(this.activePath) : "—";
    let meta = "";
    if (this.activePath) {
      const entry = this.data.files[this.activePath];
      if (entry) {
        const row = this.enrichRow(this.activePath, entry);
        meta = ` · ${row.state.label} · ${formatDuration(row.activeSec)} · ${formatCoverage(row.maxScrollRatio)}`;
      }
    }
    this.statusEl.setText(
      `阅读 均${summary.avgProgress}% · 触达${summary.trackedFiles}/待跟进${summary.backlogTotal} · ${cur}${meta}`
    );
  }

  showCurrentStats() {
    const path = this.activePath;
    if (!path) {
      new Notice("当前没有打开的 Markdown 笔记");
      return;
    }
    const entry = this.data.files[path] || this.getFileEntry(path);
    const row = this.enrichRow(path, entry);
    const s = this.computeSummary();
    const doneLine = row.markedComplete
      ? `\n已读完 ${formatTime(row.markedCompleteAt)}`
      : "\n未标记已读完（进度最高 99%）";
    new Notice(
      `进度 ${row.progressScore}% · ${row.state.label}\n有效 ${formatDuration(row.activeSec)} · 覆盖 ${formatCoverage(row.maxScrollRatio)} · 提问 ${row.questionCount || 0}\n打开 ${row.views} 次${doneLine}\n全库 触达 ${s.trackedFiles} / 待读 ${s.neverOpened} / 均进度 ${s.avgProgress}%`
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
      .setName("有效阅读 idle（秒）")
      .setDesc("窗口可见时，超过此时间无滚动/滚轮交互则停止累计有效时长。")
      .addSlider((slider) =>
        slider
          .setLimits(5, 120, 5)
          .setValue(s.idleSec ?? 20)
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.idleSec = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("预估阅读速度（字/分钟）")
      .setDesc("用于待读清单与「已读/精读」阈值。")
      .addSlider((slider) =>
        slider
          .setLimits(100, 400, 25)
          .setValue(s.wordsPerMinute ?? 200)
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.wordsPerMinute = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("统计范围前缀")
      .setDesc("只统计该路径前缀下的 .md；留空表示全库。默认 docs/")
      .addText((text) =>
        text.setValue(s.trackScopePrefix ?? "docs/").onChange(async (value) => {
          s.trackScopePrefix = value;
          await this.plugin.saveSettings();
          this.plugin.refreshDashboardViews();
        })
      );

    new Setting(containerEl)
      .setName("热力图指标")
      .setDesc("默认按「有效阅读」分钟着色；可切回「打开次数」。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("active", "有效阅读（分钟）")
          .addOption("opens", "打开次数")
          .setValue(s.heatmapMetric ?? "active")
          .onChange(async (value) => {
            s.heatmapMetric = value;
            await this.plugin.saveSettings();
            this.plugin.refreshDashboardViews();
          })
      );

    new Setting(containerEl)
      .setName("雷达 / Top 排序")
      .setDesc("阅读概览右侧雷达图按何指标取 Top。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("activeSec", "有效阅读时长")
          .addOption("views", "打开次数")
          .addOption("maxScrollRatio", "滚动覆盖 %")
          .setValue(s.topNotesMetric ?? "activeSec")
          .onChange(async (value) => {
            s.topNotesMetric = value;
            await this.plugin.saveSettings();
            this.plugin.refreshDashboardViews();
          })
      );

    new Setting(containerEl)
      .setName("已读：覆盖阈值")
      .setDesc("滚动深度达到此比例才可能判为「已读/精读」。默认 85%。")
      .addSlider((slider) =>
        slider
          .setLimits(50, 100, 5)
          .setValue(Math.round((s.readCoverageMin ?? 0.85) * 100))
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.readCoverageMin = value / 100;
            await this.plugin.saveSettings();
            this.plugin.refreshDashboardViews();
          })
      );

    new Setting(containerEl)
      .setName("阅读视图：已读完悬浮按钮")
      .setDesc("阅读/预览模式右下角悬浮栏：返回顶部 + 标记已读完；仅手动标记后进度才为 100%。")
      .addToggle((toggle) =>
        toggle.setValue(s.showCompleteMarker !== false).onChange(async (value) => {
          s.showCompleteMarker = value;
          await this.plugin.saveSettings();
          this.plugin.refreshAllCompleteMarkers();
        })
      );

    new Setting(containerEl)
      .setName("进度权重：覆盖 / 时长 / 提问 / 回访")
      .setDesc("四项之和不必为 1，会归一化。默认 35% / 30% / 25% / 10%。")
      .addText((text) =>
        text
          .setPlaceholder("0.35,0.3,0.25,0.1")
          .setValue(
            [
              s.progressWeightCoverage ?? 0.35,
              s.progressWeightTime ?? 0.3,
              s.progressWeightQuestions ?? 0.25,
              s.progressWeightRevisit ?? 0.1,
            ].join(",")
          )
          .onChange(async (value) => {
            const parts = value.split(",").map((x) => parseFloat(x.trim()));
            if (parts.length === 4 && parts.every((n) => !Number.isNaN(n) && n >= 0)) {
              s.progressWeightCoverage = parts[0];
              s.progressWeightTime = parts[1];
              s.progressWeightQuestions = parts[2];
              s.progressWeightRevisit = parts[3];
              await this.plugin.saveSettings();
              this.plugin.refreshDashboardViews();
            }
          })
      );

    new Setting(containerEl)
      .setName("提问深度：每 10 分钟预期问题数")
      .setDesc("长文默认约每 10 分钟 1 问算「问透」；用于进度公式中的提问项。")
      .addSlider((slider) =>
        slider
          .setLimits(0, 3, 1)
          .setValue(s.questionsPerTenMin ?? 1)
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.questionsPerTenMin = value;
            await this.plugin.saveSettings();
            this.plugin.refreshDashboardViews();
          })
      );

    new Setting(containerEl)
      .setName("待深读：覆盖上限")
      .setDesc("已触达且滚动深度低于此值会进入「待深读」。默认 50%。")
      .addSlider((slider) =>
        slider
          .setLimits(10, 80, 5)
          .setValue(Math.round((s.rescanCoverageMax ?? 0.5) * 100))
          .setDynamicTooltip()
          .onChange(async (value) => {
            s.rescanCoverageMax = value / 100;
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
