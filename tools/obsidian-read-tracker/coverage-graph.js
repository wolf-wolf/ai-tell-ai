// coverage-graph.js — 知识覆盖图（安装时由 install.sh 合并进 main.js，勿单独 require）

const { ItemView, TFile } = require("obsidian");

const VIEW_TYPE_COVERAGE = "ai-read-tracker-coverage-graph";

const STATE_COLORS = {
  unread: "#8b949e",
  skimmed: "#a895b8",
  progress: "#d4a72c",
  read: "#58a6ff",
  deep: "#8957e5",
  complete: "#3fb950",
};

const STATE_LABELS = {
  unread: "未读",
  skimmed: "略读",
  progress: "在读",
  read: "已读",
  deep: "精读",
  complete: "已读完",
};

const CLUSTER_DEFS = {
  model: { label: "模型层", hue: 210, cx: 0, cy: 0 },
  methodology: { label: "方法论", hue: 280, cx: 0, cy: 0 },
  algorithms: { label: "算法", hue: 160, cx: 0, cy: 0 },
  "agent/core": { label: "Agent·核心", hue: 32, cx: 0, cy: 0 },
  "agent/pattern": { label: "Agent·模式", hue: 36, cx: 0, cy: 0 },
  "agent/context": { label: "Agent·上下文", hue: 40, cx: 0, cy: 0 },
  "agent/skill": { label: "Agent·技能", hue: 44, cx: 0, cy: 0 },
  "agent/tool": { label: "Agent·工具", hue: 48, cx: 0, cy: 0 },
  "agent/retrieval": { label: "Agent·检索", hue: 52, cx: 0, cy: 0 },
  agent: { label: "Agent", hue: 35, cx: 0, cy: 0 },
  latest: { label: "前沿", hue: 0, cx: 0, cy: 0 },
  data: { label: "数据", hue: 190, cx: 0, cy: 0 },
  other: { label: "其他", hue: 0, cx: 0, cy: 0 },
};

const STABILITY_CORE = new Set(["permanent", "long"]);

const MACRO_LAYOUT = {
  foundation: ["model", "methodology", "algorithms"],
  agent: [
    "agent/core",
    "agent/pattern",
    "agent/context",
    "agent/tool",
    "agent/retrieval",
    "agent/skill",
    "agent",
  ],
};

function clusterBubbleRadius(count) {
  const cell = 36;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const halfW = ((cols - 1) * cell) / 2 + 20;
  const halfH = ((rows - 1) * cell) / 2 + 20;
  return Math.max(42, Math.hypot(halfW, halfH) + 22);
}

function countNodesByCluster(nodes) {
  const counts = new Map();
  for (const node of nodes) {
    counts.set(node.clusterId, (counts.get(node.clusterId) || 0) + 1);
  }
  return counts;
}

function clusterSortKey(id) {
  const fi = MACRO_LAYOUT.foundation.indexOf(id);
  if (fi >= 0) return `0-${String(fi).padStart(2, "0")}`;
  const ai = MACRO_LAYOUT.agent.indexOf(id);
  if (ai >= 0) return `1-${String(ai).padStart(2, "0")}`;
  return `2-${id}`;
}

function clusterIdFromPath(path) {
  if (!path.startsWith("docs/")) return "other";
  const parts = path.slice(5).split("/");
  const top = parts[0];
  if (top === "agent" && parts.length >= 2) {
    const sub = `agent/${parts[1]}`;
    if (CLUSTER_DEFS[sub]) return sub;
    return "agent";
  }
  if (CLUSTER_DEFS[top]) return top;
  return "other";
}

function clusterFill(hue, alpha = 0.07) {
  return `hsla(${hue}, 55%, 55%, ${alpha})`;
}

function clusterStroke(hue, alpha = 0.22) {
  return `hsla(${hue}, 50%, 48%, ${alpha})`;
}

function nodeRadius(progress, stateId, inMap) {
  let r = stateId === "unread" ? 5.5 : 5.5 + Math.min(7, (progress || 0) / 18);
  if (inMap) r += 1.4;
  return r;
}

function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function expandHull(hull, pad) {
  if (hull.length < 3) {
    if (hull.length === 1) {
      const p = hull[0];
      return [
        { x: p.x - pad, y: p.y - pad },
        { x: p.x + pad, y: p.y - pad },
        { x: p.x + pad, y: p.y + pad },
        { x: p.x - pad, y: p.y + pad },
      ];
    }
    return hull;
  }
  let cx = 0;
  let cy = 0;
  for (const p of hull) {
    cx += p.x;
    cy += p.y;
  }
  cx /= hull.length;
  cy /= hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: p.x + (dx / len) * pad, y: p.y + (dy / len) * pad };
  });
}

class CoverageGraphView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.graph = null;
    this.mapIndex = null;
    this.transform = { x: 0, y: 0, scale: 1 };
    this.rafId = null;
    this.simRunning = false;
    this.hoverId = null;
    this.drag = null;
    this.canvas = null;
    this.ctx = null;
    this.tooltipEl = null;
    this.size = { w: 0, h: 0 };
    this.dpr = 1;
    this._boundResize = () => this.resizeCanvas({ refit: true });
    this._resizeObserver = null;
    this._layoutReady = false;
  }

  getViewType() {
    return VIEW_TYPE_COVERAGE;
  }

  getDisplayText() {
    return "知识覆盖图";
  }

  getIcon() {
    return "git-graph";
  }

  async onOpen() {
    this.containerEl.addClass("ai-coverage-graph");
    this.containerEl.style.height = "100%";
    await this.render();
    window.addEventListener("resize", this._boundResize);
  }

  async onClose() {
    window.removeEventListener("resize", this._boundResize);
    this.disconnectCanvasObserver();
    this.stopSimulation();
  }

  disconnectCanvasObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  observeCanvasWrap(wrap) {
    this.disconnectCanvasObserver();
    if (typeof ResizeObserver === "undefined") return;
    this._resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas({ refit: !this._layoutReady });
    });
    this._resizeObserver.observe(wrap);
  }

  async loadMapIndex() {
    const byPath = new Map();
    const missing = [];
    const file = this.plugin.app.vault.getAbstractFileByPath("map.md");
    if (!(file instanceof TFile)) {
      return { byPath, missing, indexedTotal: 0 };
    }
    const text = await this.plugin.app.vault.read(file);
    let section = "";
    const rowRe =
      /\|\s*\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]\s*\|\s*(permanent|long|mid|short)\s*\|/;

    for (const line of text.split("\n")) {
      if (line.startsWith("## ")) {
        section = line.replace(/^##\s+/, "").trim();
        continue;
      }
      const m = line.match(rowRe);
      if (!m) continue;
      const slug = m[1].trim();
      const stability = m[2];
      const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(
        slug,
        "map.md"
      );
      if (dest instanceof TFile && dest.path.startsWith("docs/")) {
        byPath.set(dest.path, { slug, stability, section });
      } else {
        missing.push({ slug, stability, section });
      }
    }
    return {
      byPath,
      missing,
      indexedTotal: byPath.size + missing.length,
    };
  }

  layoutClusterCenters(clusterIds, viewportMin = 720, clusterCounts = new Map()) {
    const ids = [...clusterIds].sort((a, b) => clusterSortKey(a).localeCompare(clusterSortKey(b)));
    const vmin = Math.max(640, viewportMin);
    const gap = 34;
    const maxRowWidth = vmin * 0.94;
    const innerRowGap = 22;

    for (const id of ids) {
      const def = CLUSTER_DEFS[id] || CLUSTER_DEFS.other;
      const count = clusterCounts.get(id) || 1;
      def.count = count;
      def.bubbleR = clusterBubbleRadius(count);
    }

    const foundation = ids.filter((id) => MACRO_LAYOUT.foundation.includes(id));
    const agent = ids.filter((id) => id.startsWith("agent"));
    const rest = ids.filter((id) => !foundation.includes(id) && !agent.includes(id));

    const buildRows = (list) => {
      if (!list.length) return [];
      const rows = [];
      let current = [];
      let currentW = -gap;
      for (const id of list) {
        const def = CLUSTER_DEFS[id] || CLUSTER_DEFS.other;
        const w = def.bubbleR * 2 + gap;
        if (current.length && currentW + w > maxRowWidth) {
          rows.push(current);
          current = [];
          currentW = -gap;
        }
        current.push(id);
        currentW += w;
      }
      if (current.length) rows.push(current);
      return rows;
    };

    const blockHeight = (list) => {
      const rows = buildRows(list);
      if (!rows.length) return 0;
      let h = 0;
      rows.forEach((row, i) => {
        const rowH = Math.max(...row.map((id) => (CLUSTER_DEFS[id]?.bubbleR || 48) * 2));
        h += rowH + (i > 0 ? innerRowGap : 0);
      });
      return h;
    };

    const placeBlock = (list, centerY) => {
      const rows = buildRows(list);
      if (!rows.length) return;
      const totalH = blockHeight(list);
      let y = centerY - totalH / 2;
      for (const row of rows) {
        const rowH = Math.max(...row.map((id) => (CLUSTER_DEFS[id]?.bubbleR || 48) * 2));
        const rowW = row.reduce((sum, id) => {
          const def = CLUSTER_DEFS[id] || CLUSTER_DEFS.other;
          return sum + def.bubbleR * 2 + gap;
        }, -gap);
        let x = -rowW / 2;
        const cy = y + rowH / 2;
        for (const id of row) {
          const def = CLUSTER_DEFS[id] || CLUSTER_DEFS.other;
          def.cx = x + def.bubbleR;
          def.cy = cy;
          x += def.bubbleR * 2 + gap;
        }
        y += rowH + innerRowGap;
      }
    };

    const sectionGap = 40;
    const foundH = blockHeight(foundation);
    const agentH = blockHeight(agent);
    const restH = blockHeight(rest);
    const totalH = foundH + agentH + restH + sectionGap * 2;
    let y = -totalH / 2;

    placeBlock(foundation, y + foundH / 2);
    y += foundH + sectionGap;
    placeBlock(agent, y + agentH / 2);
    y += agentH + sectionGap;
    placeBlock(rest, y + restH / 2);
  }

  seedNodePositions(nodes) {
    const byCluster = new Map();
    for (const node of nodes) {
      if (!byCluster.has(node.clusterId)) byCluster.set(node.clusterId, []);
      byCluster.get(node.clusterId).push(node);
    }
    for (const [cid, list] of byCluster) {
      const def = CLUSTER_DEFS[cid] || CLUSTER_DEFS.other;
      const n = list.length;
      const cell = Math.max(36, Math.min(48, (def.bubbleR * 1.35) / Math.sqrt(n)));
      const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.2)));
      const rows = Math.ceil(n / cols);
      const w = (cols - 1) * cell;
      const h = (rows - 1) * cell;
      list.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        node.x = def.cx + (col * cell - w / 2);
        node.y = def.cy + (row * cell - h / 2);
        node.vx = 0;
        node.vy = 0;
      });
    }
  }

  async buildGraphData() {
    const plugin = this.plugin;
    this.mapIndex = await this.loadMapIndex();
    const files = plugin.getScopedMarkdownFiles();
    const pathToIndex = new Map();
    const nodes = [];
    const clusterSet = new Set();

    for (const file of files) {
      const path = file.path;
      pathToIndex.set(path, nodes.length);
      const entry = plugin.data.files?.[path];
      let row;
      if (entry && plugin.hasBeenTouched(entry)) {
        row = plugin.enrichRow(path, entry);
      } else {
        row = {
          path,
          state: { id: "unread", label: "未读" },
          progressScore: 0,
        };
      }
      const clusterId = clusterIdFromPath(path);
      clusterSet.add(clusterId);
      const mapMeta = this.mapIndex.byPath.get(path);
      nodes.push({
        id: path,
        label: file.basename.replace(/\.md$/i, ""),
        stateId: row.state.id,
        progress: row.progressScore || 0,
        clusterId,
        inMap: !!mapMeta,
        mapStability: mapMeta?.stability || null,
        mapSection: mapMeta?.section || null,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        pinned: false,
      });
    }

    const clusterCounts = countNodesByCluster(nodes);
    this.layoutClusterCenters(
      clusterSet,
      Math.min(this.size.w || 960, this.size.h || 720) || 720,
      clusterCounts
    );
    this.seedNodePositions(nodes);

    const edges = [];
    const edgeSet = new Set();
    for (const file of files) {
      const cache = plugin.app.metadataCache.getFileCache(file);
      if (!cache?.links?.length) continue;
      const srcIdx = pathToIndex.get(file.path);
      if (srcIdx === undefined) continue;
      const srcCluster = nodes[srcIdx].clusterId;
      for (const link of cache.links) {
        const dest = plugin.app.metadataCache.getFirstLinkpathDest(
          link.link,
          file.path
        );
        if (!dest || !(dest instanceof TFile) || dest.extension !== "md") continue;
        if (!pathToIndex.has(dest.path)) continue;
        const tgtIdx = pathToIndex.get(dest.path);
        if (srcIdx === tgtIdx) continue;
        const key =
          srcIdx < tgtIdx ? `${srcIdx}-${tgtIdx}` : `${tgtIdx}-${srcIdx}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({
          source: srcIdx,
          target: tgtIdx,
          sameCluster: srcCluster === nodes[tgtIdx].clusterId,
        });
      }
    }

    return { nodes, edges, clusters: clusterSet };
  }

  computeStats(nodes) {
    const counts = {
      unread: 0,
      skimmed: 0,
      progress: 0,
      read: 0,
      deep: 0,
      complete: 0,
    };
    for (const n of nodes) counts[n.stateId] = (counts[n.stateId] || 0) + 1;
    const total = nodes.length;
    const touched = total - counts.unread;
    const done = counts.read + counts.deep + counts.complete;

    const inMapNodes = nodes.filter((n) => n.inMap);
    const mapInGraph = inMapNodes.length;
    const indexedTotal = this.mapIndex?.indexedTotal || mapInGraph;
    const mapVaultPct = indexedTotal
      ? Math.round((this.mapIndex.byPath.size / indexedTotal) * 100)
      : 0;
    const mapLearnPct = mapInGraph
      ? Math.round(
          (inMapNodes.filter((n) =>
            ["read", "deep", "complete"].includes(n.stateId)
          ).length /
            mapInGraph) *
            100
        )
      : 0;

    const coreNodes = nodes.filter(
      (n) => n.inMap && n.mapStability && STABILITY_CORE.has(n.mapStability)
    );
    const coreRead = coreNodes.filter((n) =>
      ["read", "deep", "complete"].includes(n.stateId)
    ).length;
    const coreTotal = coreNodes.length;

    return {
      total,
      touched,
      done,
      counts,
      touchedPct: total ? Math.round((touched / total) * 100) : 0,
      donePct: total ? Math.round((done / total) * 100) : 0,
      mapInGraph,
      indexedTotal,
      mapVaultPct,
      mapLearnPct,
      coreRead,
      coreTotal,
      mapMissing: this.mapIndex?.missing?.length || 0,
    };
  }

  runSimulationSteps(steps = 120) {
    if (!this.graph) return;
    const { nodes, edges } = this.graph;
    if (!nodes.length) return;

    const byCluster = new Map();
    for (const node of nodes) {
      if (!byCluster.has(node.clusterId)) byCluster.set(node.clusterId, []);
      byCluster.get(node.clusterId).push(node);
    }

    const kRepulse = 5200;
    const kSpring = 0.05;
    const restLen = 42;
    const kAnchor = 0.085;
    const damping = 0.82;
    const minDist = 30;

    for (let s = 0; s < steps; s++) {
      const cool = 1 - s / steps;
      for (const node of nodes) {
        node.fx = 0;
        node.fy = 0;
      }

      for (const list of byCluster.values()) {
        const m = list.length;
        for (let i = 0; i < m; i++) {
          for (let j = i + 1; j < m; j++) {
            const a = list[i];
            const b = list[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < 0.01) {
              dx = (Math.random() - 0.5) * 0.2;
              dy = (Math.random() - 0.5) * 0.2;
              distSq = dx * dx + dy * dy;
            }
            const dist = Math.sqrt(distSq);
            const force = (kRepulse * cool) / Math.max(distSq, minDist * minDist * 0.3);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.fx -= fx;
            a.fy -= fy;
            b.fx += fx;
            b.fy += fy;
          }
        }
      }

      for (const e of edges) {
        if (!e.sameCluster) continue;
        const a = nodes[e.source];
        const b = nodes[e.target];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (dist - restLen) * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.fx += fx;
        a.fy += fy;
        b.fx -= fx;
        b.fy -= fy;
      }

      for (const node of nodes) {
        const def = CLUSTER_DEFS[node.clusterId] || CLUSTER_DEFS.other;
        node.fx += (def.cx - node.x) * kAnchor;
        node.fy += (def.cy - node.y) * kAnchor;
        if (node.pinned) continue;
        node.vx = (node.vx + node.fx) * damping;
        node.vy = (node.vy + node.fy) * damping;
        const speed = Math.hypot(node.vx, node.vy);
        if (speed > 8) {
          node.vx = (node.vx / speed) * 8;
          node.vy = (node.vy / speed) * 8;
        }
        node.x += node.vx;
        node.y += node.vy;
      }
    }
  }

  computeGraphBounds(padWorld = 72) {
    if (!this.graph?.nodes.length) return null;
    const { nodes, clusters } = this.graph;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (x, y, pad = 0) => {
      minX = Math.min(minX, x - pad);
      minY = Math.min(minY, y - pad);
      maxX = Math.max(maxX, x + pad);
      maxY = Math.max(maxY, y + pad);
    };
    for (const node of nodes) {
      const r = nodeRadius(node.progress, node.stateId, node.inMap) + 16;
      grow(node.x, node.y, r);
    }
    if (clusters) {
      for (const cid of clusters) {
        const def = CLUSTER_DEFS[cid] || CLUSTER_DEFS.other;
        grow(def.cx, def.cy, (def.bubbleR || 70) + 24);
      }
    }
    return {
      minX: minX - padWorld,
      minY: minY - padWorld,
      maxX: maxX + padWorld,
      maxY: maxY + padWorld,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: maxX - minX + padWorld * 2,
      h: maxY - minY + padWorld * 2,
    };
  }

  fitToView() {
    if (!this.graph?.nodes.length || !this.size.w || !this.size.h) return;
    const bounds = this.computeGraphBounds(48);
    if (!bounds || bounds.w < 1 || bounds.h < 1) return;
    const margin = 18;
    const availW = Math.max(80, this.size.w - margin * 2);
    const availH = Math.max(80, this.size.h - margin * 2);
    const scale = Math.min(availW / bounds.w, availH / bounds.h) * 0.98;
    this.transform.scale = Math.max(0.06, Math.min(12, scale));
    this.transform.x = this.size.w / 2 - bounds.cx * this.transform.scale;
    this.transform.y = this.size.h / 2 - bounds.cy * this.transform.scale;
  }

  shouldDrawNodeLabel(node, transform) {
    if (node.id === this.hoverId || node.pinned) return true;
    if (transform.scale < 0.95) return false;
    if (transform.scale >= 1.35) return true;
    return node.inMap || !["unread", "skimmed"].includes(node.stateId);
  }

  drawClusterLabelsScreen() {
    if (!this.ctx || !this.graph) return;
    const { ctx, transform, graph } = this;
    const byCluster = new Map();
    for (const node of graph.nodes) {
      if (!byCluster.has(node.clusterId)) byCluster.set(node.clusterId, []);
      byCluster.get(node.clusterId).push(node);
    }

    const muted =
      getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "#888";
    const font =
      getComputedStyle(document.body).getPropertyValue("--font-interface").trim() ||
      "sans-serif";

    for (const [cid, list] of byCluster) {
      if (!list.length) continue;
      const def = CLUSTER_DEFS[cid] || CLUSTER_DEFS.other;
      const bubbleR = def.bubbleR || clusterBubbleRadius(list.length);
      const screenR = bubbleR * transform.scale;
      if (screenR < 22) continue;

      const anchor = this.worldToScreen(def.cx, def.cy - bubbleR);
      const inMapCount = list.filter((n) => n.inMap).length;
      const readCount = list.filter((n) =>
        ["read", "deep", "complete"].includes(n.stateId)
      ).length;
      const showSub = screenR >= 40;
      const titleSize = Math.round(Math.min(13, Math.max(10, screenR * 0.17)));
      const subSize = Math.max(9, titleSize - 2);

      ctx.save();
      ctx.font = `600 ${titleSize}px ${font}`;
      const tw = ctx.measureText(def.label).width;
      let sw = 0;
      const sub = `${readCount}/${list.length} 已读 · ${inMapCount} 在地图`;
      if (showSub) {
        ctx.font = `${subSize}px ${font}`;
        sw = ctx.measureText(sub).width;
      }
      const pw = Math.max(tw, sw) + 14;
      const ph = showSub ? titleSize + subSize + 8 : titleSize + 8;
      const x = anchor.x;
      const top = anchor.y + 8;
      const left = x - pw / 2;

      ctx.fillStyle = `hsla(${def.hue}, 48%, 52%, 0.11)`;
      ctx.strokeStyle = `hsla(${def.hue}, 42%, 46%, 0.32)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, top, pw, ph, 5);
      else ctx.rect(left, top, pw, ph);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = `600 ${titleSize}px ${font}`;
      ctx.fillStyle = clusterStroke(def.hue, 0.92);
      ctx.fillText(def.label, x, top + 4);
      if (showSub) {
        ctx.font = `${subSize}px ${font}`;
        ctx.fillStyle = muted;
        ctx.fillText(sub, x, top + 4 + titleSize + 2);
      }
      ctx.restore();
    }
  }

  worldToScreen(x, y) {
    return {
      x: x * this.transform.scale + this.transform.x,
      y: y * this.transform.scale + this.transform.y,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.transform.x) / this.transform.scale,
      y: (sy - this.transform.y) / this.transform.scale,
    };
  }

  pickNode(sx, sy) {
    if (!this.graph) return null;
    let best = null;
    let bestD = Infinity;
    for (const node of this.graph.nodes) {
      const p = this.worldToScreen(node.x, node.y);
      const r =
        nodeRadius(node.progress, node.stateId, node.inMap) *
          this.transform.scale +
        5;
      const dx = sx - p.x;
      const dy = sy - p.y;
      const d = dx * dx + dy * dy;
      if (d < r * r && d < bestD) {
        bestD = d;
        best = node;
      }
    }
    return best;
  }

  drawClusterRegions(ctx, transform) {
    const { nodes } = this.graph;
    const byCluster = new Map();
    for (const node of nodes) {
      if (!byCluster.has(node.clusterId)) byCluster.set(node.clusterId, []);
      byCluster.get(node.clusterId).push(node);
    }

    for (const [cid, list] of byCluster) {
      if (list.length === 0) continue;
      const def = CLUSTER_DEFS[cid] || CLUSTER_DEFS.other;
      const cx = def.cx;
      const cy = def.cy;
      const bubbleR = def.bubbleR || clusterBubbleRadius(list.length);

      ctx.beginPath();
      ctx.arc(cx, cy, bubbleR, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, bubbleR * 0.1, cx, cy, bubbleR);
      grad.addColorStop(0, clusterFill(def.hue, 0.12));
      grad.addColorStop(0.72, clusterFill(def.hue, 0.05));
      grad.addColorStop(1, clusterFill(def.hue, 0.02));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = clusterStroke(def.hue, 0.34);
      ctx.lineWidth = 1.4 / transform.scale;
      ctx.stroke();
    }
  }

  updateTooltip(node, sx, sy) {
    if (!this.tooltipEl) return;
    if (!node) {
      this.tooltipEl.removeClass("is-visible");
      return;
    }
    const def = CLUSTER_DEFS[node.clusterId] || CLUSTER_DEFS.other;
    const lines = [
      node.label,
      `域：${def.label}`,
      `你的进度：${STATE_LABELS[node.stateId]} · ${node.progress}%`,
    ];
    if (node.inMap) {
      lines.push(
        `知识地图：已收录${node.mapStability ? ` · ${node.mapStability}` : ""}${node.mapSection ? ` · ${node.mapSection}` : ""}`
      );
    } else {
      lines.push("知识地图：未纳入 map.md 索引");
    }
    this.tooltipEl.empty();
    for (const line of lines) {
      this.tooltipEl.createDiv({ text: line });
    }
    this.tooltipEl.addClass("is-visible");
    const wrap = this.canvas.parentElement.getBoundingClientRect();
    let left = sx + 12;
    let top = sy + 12;
    if (left + 220 > wrap.width) left = sx - 200;
    if (top + 80 > wrap.height) top = sy - 72;
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  draw() {
    if (!this.ctx || !this.graph) return;
    const { ctx, size, dpr, graph, transform } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const edgeColor =
      getComputedStyle(document.body).getPropertyValue("--graph-line").trim() ||
      getComputedStyle(document.body).getPropertyValue("--text-faint").trim() ||
      "#666";

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    this.drawClusterRegions(ctx, transform);

    const showCrossEdges = transform.scale >= 0.85;
    const edgeAlphaScale = Math.min(1, Math.max(0.35, transform.scale));

    for (const e of graph.edges) {
      if (!e.sameCluster && !showCrossEdges) continue;
      const a = graph.nodes[e.source];
      const b = graph.nodes[e.target];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = edgeColor || "rgba(127,127,127,0.35)";
      ctx.lineWidth = (e.sameCluster ? 0.9 : 0.55) / transform.scale;
      ctx.globalAlpha = (e.sameCluster ? 0.5 : 0.16) * edgeAlphaScale;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const node of graph.nodes) {
      const r = nodeRadius(node.progress, node.stateId, node.inMap);
      const color = STATE_COLORS[node.stateId] || STATE_COLORS.unread;
      const isHover = node.id === this.hoverId;

      if (node.inMap) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3 / transform.scale, 0, Math.PI * 2);
        ctx.strokeStyle = isHover ? "#ffffff" : "rgba(210, 153, 34, 0.75)";
        ctx.lineWidth = (isHover ? 2.4 : 1.6) / transform.scale;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 2.5 / transform.scale, 0, Math.PI * 2);
        ctx.setLineDash([3 / transform.scale, 3 / transform.scale]);
        ctx.strokeStyle = "rgba(140,140,140,0.35)";
        ctx.lineWidth = 1 / transform.scale;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();

      if (isHover || node.pinned) {
        ctx.strokeStyle = isHover ? "#ffffff" : color;
        ctx.lineWidth = (isHover ? 2.2 : 1.5) / transform.scale;
        ctx.stroke();
      }

      if (this.shouldDrawNodeLabel(node, transform)) {
        ctx.fillStyle =
          getComputedStyle(document.body).getPropertyValue("--text-normal").trim() ||
          "#ccc";
        if (isHover) {
          ctx.font = `600 ${Math.max(10, 11 / transform.scale)}px var(--font-interface, sans-serif)`;
        } else {
          ctx.font = `${Math.max(9, 10 / transform.scale)}px var(--font-interface, sans-serif)`;
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const ly = node.y + r + 4 / transform.scale;
        if (isHover) {
          const lw = ctx.measureText(node.label).width + 8 / transform.scale;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(node.x - lw / 2, ly - 2 / transform.scale, lw, 14 / transform.scale);
          ctx.fillStyle =
            getComputedStyle(document.body).getPropertyValue("--text-normal").trim() ||
            "#eee";
        }
        ctx.fillText(node.label, node.x, ly);
      }
    }

    ctx.restore();
    this.drawClusterLabelsScreen();
  }

  startSimulationLoop() {
    if (this.simRunning) return;
    this.simRunning = true;
    let frames = 0;
    const tick = () => {
      if (!this.simRunning || !this.graph) return;
      this.runSimulationSteps(6);
      this.draw();
      frames += 1;
      if (frames < 28) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.simRunning = false;
        this.rafId = null;
        this.fitToView();
        this.draw();
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopSimulation() {
    this.simRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resetLayout(pinnedOnly = false) {
    if (!this.graph) return;
    for (const node of this.graph.nodes) {
      if (pinnedOnly && node.pinned) continue;
      node.pinned = false;
    }
    const clusterCounts = countNodesByCluster(this.graph.nodes);
    this.layoutClusterCenters(
      this.graph.clusters,
      Math.min(this.size.w || 960, this.size.h || 720) || 720,
      clusterCounts
    );
    this.seedNodePositions(this.graph.nodes);
    this.runSimulationSteps(160);
    this.fitToView();
    this.draw();
    this.startSimulationLoop();
  }

  resizeCanvas({ refit = false } = {}) {
    const wrap = this.canvas?.parentElement;
    if (!wrap || !this.canvas) return false;
    const rect = wrap.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w < 8 || h < 8) return false;

    const changed =
      Math.abs(w - this.size.w) > 1 || Math.abs(h - this.size.h) > 1;
    this.size.w = w;
    this.size.h = h;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.size.w * this.dpr);
    this.canvas.height = Math.floor(this.size.h * this.dpr);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    if (refit || !this._layoutReady) {
      this.fitToView();
      if (this.size.w > 120 && this.size.h > 120) {
        this._layoutReady = true;
      }
    }
    this.draw();
    return changed;
  }

  ensureLayout() {
    if (!this.graph?.nodes.length) return;
    if (this.resizeCanvas({ refit: true })) return;
    if (!this._layoutReady) {
      requestAnimationFrame(() => {
        if (this.resizeCanvas({ refit: true }) && !this.simRunning) {
          this.startSimulationLoop();
        }
      });
    }
  }

  bindCanvasEvents(canvas) {
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const before = this.screenToWorld(sx, sy);
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.transform.scale = Math.min(
          4,
          Math.max(0.12, this.transform.scale * factor)
        );
        const after = this.screenToWorld(sx, sy);
        this.transform.x += (after.x - before.x) * this.transform.scale;
        this.transform.y += (after.y - before.y) * this.transform.scale;
        this.draw();
      },
      { passive: false }
    );

    canvas.addEventListener("mousedown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = this.pickNode(sx, sy);
      this.drag = {
        sx,
        sy,
        moved: false,
        node,
        panX: this.transform.x,
        panY: this.transform.y,
      };
    });

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.drag) {
        const dx = sx - this.drag.sx;
        const dy = sy - this.drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
        if (this.drag.node) {
          const w = this.screenToWorld(sx, sy);
          this.drag.node.x = w.x;
          this.drag.node.y = w.y;
          this.drag.node.pinned = true;
          this.drag.node.vx = 0;
          this.drag.node.vy = 0;
        } else {
          this.transform.x = this.drag.panX + dx;
          this.transform.y = this.drag.panY + dy;
        }
        this.draw();
        return;
      }

      const hit = this.pickNode(sx, sy);
      const next = hit?.id || null;
      if (next !== this.hoverId) {
        this.hoverId = next;
        canvas.style.cursor = hit ? "pointer" : "grab";
        this.updateTooltip(hit, sx, sy);
        this.draw();
      } else if (hit) {
        this.updateTooltip(hit, sx, sy);
      }
    });

    const endDrag = (e) => {
      if (!this.drag) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (!this.drag.moved && this.drag.node) {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.drag.node.id);
        if (file instanceof TFile) {
          void this.plugin.app.workspace.getLeaf(false).openFile(file);
        }
      } else if (!this.drag.moved) {
        const hit = this.pickNode(sx, sy);
        if (hit) {
          const file = this.plugin.app.vault.getAbstractFileByPath(hit.id);
          if (file instanceof TFile) {
            void this.plugin.app.workspace.getLeaf(false).openFile(file);
          }
        }
      }
      this.drag = null;
    };

    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", () => {
      this.drag = null;
      if (this.hoverId) {
        this.hoverId = null;
        this.updateTooltip(null);
        this.draw();
      }
    });
  }

  renderLegend(container) {
    const row = container.createDiv({ cls: "acg-legend-row" });
    const read = row.createDiv({ cls: "acg-legend" });
    read.createSpan({ cls: "acg-legend-title", text: "你的阅读" });
    for (const id of ["complete", "deep", "read", "progress", "skimmed", "unread"]) {
      const item = read.createDiv({ cls: "acg-legend-item" });
      item.createSpan({
        cls: "acg-legend-dot",
        attr: { style: `background:${STATE_COLORS[id]}` },
      });
      item.createSpan({ text: STATE_LABELS[id] });
    }
    const mapLeg = row.createDiv({ cls: "acg-legend acg-legend-map" });
    mapLeg.createSpan({ cls: "acg-legend-title", text: "知识地图（map.md）" });
    const a = mapLeg.createDiv({ cls: "acg-legend-item" });
    a.createSpan({ cls: "acg-legend-ring" });
    a.createSpan({ text: "已纳入业内索引" });
    const b = mapLeg.createDiv({ cls: "acg-legend-item" });
    b.createSpan({ cls: "acg-legend-ring acg-legend-ring-dashed" });
    b.createSpan({ text: "库内未入地图" });
  }

  async render() {
    const { containerEl } = this;
    containerEl.empty();
    this.stopSimulation();
    this.disconnectCanvasObserver();
    this._layoutReady = false;
    this.transform = { x: 0, y: 0, scale: 1 };

    this.graph = await this.buildGraphData();
    const stats = this.computeStats(this.graph.nodes);
    const scope =
      (this.plugin.data.settings.trackScopePrefix || "").trim() || "全库";

    const header = containerEl.createDiv({ cls: "acg-header" });
    const topBar = header.createDiv({ cls: "acg-topbar" });
    const titleRow = topBar.createDiv({ cls: "acg-title-row" });
    titleRow.createEl("h2", { cls: "acg-title", text: "知识覆盖图" });
    titleRow.createSpan({ cls: "acg-scope", text: scope });

    const actions = topBar.createDiv({ cls: "acg-actions" });
    actions
      .createEl("button", { cls: "acg-btn", text: "适应窗口" })
      .addEventListener("click", () => {
        this.fitToView();
        this.draw();
      });
    actions
      .createEl("button", { cls: "acg-btn", text: "重新布局" })
      .addEventListener("click", () => this.resetLayout());
    actions
      .createEl("button", { cls: "acg-btn acg-btn-accent", text: "刷新" })
      .addEventListener("click", () => void this.render());
    const legendBtn = actions.createEl("button", {
      cls: "acg-btn acg-btn-legend",
      text: "图例",
    });
    legendBtn.addEventListener("click", () => {
      const panel = header.querySelector(".acg-legend-panel");
      if (panel) panel.toggleClass("is-open", !panel.hasClass("is-open"));
    });

    const statsRow = header.createDiv({ cls: "acg-stats acg-stats-grid" });
    const addStat = (value, label, tip, variant = "") => {
      const card = statsRow.createDiv({
        cls: `acg-stat${variant ? ` ${variant}` : ""}`,
      });
      if (tip) card.setAttribute("title", tip);
      card.createDiv({ cls: "acg-stat-value", text: String(value) });
      card.createDiv({ cls: "acg-stat-label", text: label });
    };
    addStat(`${stats.mapVaultPct}%`, "地图入库", "map.md 索引节点中，库内已有文件的比例");
    addStat(
      `${stats.mapInGraph}/${stats.indexedTotal || stats.mapInGraph}`,
      "地图节点",
      "当前图内纳入 map.md 的节点 / 地图索引总数"
    );
    addStat(
      `${stats.mapLearnPct}%`,
      "地图已读",
      "纳入地图的节点中，你已读+精读+已读完的比例",
      "acg-stat-warn"
    );
    addStat(
      stats.coreTotal ? `${stats.coreRead}/${stats.coreTotal}` : "—",
      "核心已读",
      "permanent + long 核心节点中已读透数量"
    );
    addStat(
      `${stats.touchedPct}%`,
      "你已触达",
      "统计范围内打开或有效阅读过的比例",
      "acg-stat-accent"
    );

    const legendPanel = header.createDiv({ cls: "acg-legend-panel" });
    this.renderLegend(legendPanel);

    const body = containerEl.createDiv({ cls: "acg-body" });
    const canvasWrap = body.createDiv({ cls: "acg-canvas-wrap" });
    const floatHint = canvasWrap.createDiv({
      cls: "acg-float-hint",
      text: "滚轮缩放 · 拖拽平移 · 点击节点打开",
    });
    floatHint.setAttribute("aria-hidden", "true");
    this.canvas = canvasWrap.createEl("canvas", { cls: "acg-canvas" });
    this.ctx = this.canvas.getContext("2d");
    this.tooltipEl = canvasWrap.createDiv({ cls: "acg-tooltip" });
    this.bindCanvasEvents(this.canvas);
    this.observeCanvasWrap(canvasWrap);

    if (!this.graph.nodes.length) {
      canvasWrap.createDiv({
        cls: "acg-empty",
        text: "范围内没有 Markdown 笔记。请检查设置中的统计范围前缀。",
      });
      return;
    }

    this.runSimulationSteps(160);
    requestAnimationFrame(() => {
      this.resizeCanvas({ refit: true });
      this.draw();
      this.startSimulationLoop();
      requestAnimationFrame(() => this.ensureLayout());
    });
  }
}

module.exports = {
  CoverageGraphView,
  VIEW_TYPE_COVERAGE,
  STATE_COLORS,
};
