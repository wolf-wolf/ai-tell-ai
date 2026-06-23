/* global ACMProgress, ACMScenes */
window.ACMApp = {};

const FLIP_EASE = "cubic-bezier(0.34, 1.15, 0.64, 1)";
const FLIP_MS = 560;

const state = {
  rawData: null,
  centerId: "agent",
  selectedId: "agent",
  searchQuery: "",
  trackerLoaded: false,
  animating: false,
};

const el = {
  scene: document.getElementById("scene"),
  detail: document.getElementById("detail"),
  breadcrumb: document.getElementById("breadcrumb"),
  search: document.getElementById("search"),
  btnExitFocus: document.getElementById("btn-exit-focus"),
  progressStat: document.getElementById("progress-stat"),
};

window.ACMApp.branchIdFromData = function branchIdFromData(node) {
  const top = new Set(["model", "harness", "multi", "gov"]);
  if (top.has(node.id)) return node.id;
  const path = ancestorPathFromRoot(node.id);
  for (const p of path) {
    if (top.has(p.id)) return p.id;
  }
  return "agent";
};

function findNodeData(data, id) {
  if (!data || !id) return null;
  if (data.id === id) return data;
  if (!data.children) return null;
  for (const child of data.children) {
    const found = findNodeData(child, id);
    if (found) return found;
  }
  return null;
}

function ancestorPathFromRoot(id) {
  const path = [];
  function walk(node, stack) {
    const next = [...stack, node];
    if (node.id === id) {
      path.push(...next);
      return true;
    }
    if (!node.children) return false;
    for (const child of node.children) {
      if (walk(child, next)) return true;
    }
    return false;
  }
  if (state.rawData) walk(state.rawData, []);
  return path;
}

function getFocusContext(centerId) {
  const path = ancestorPathFromRoot(centerId);
  const center = path[path.length - 1] || state.rawData;
  const parent = path.length > 1 ? path[path.length - 2] : null;
  const siblings = parent ? parent.children.filter((c) => c.id !== centerId) : [];
  return { center, parent, siblings, path };
}

function hasChildren(node) {
  return (node.children?.length || 0) > 0;
}

function docHref(path) {
  return `../../${path}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function captureRects() {
  const map = new Map();
  el.scene.querySelectorAll("[data-id]").forEach((node) => {
    map.set(node.dataset.id, node.getBoundingClientRect());
  });
  return map;
}

function playFlip(beforeRects) {
  const afterNodes = el.scene.querySelectorAll("[data-id]");
  const afterIds = new Set();

  afterNodes.forEach((node) => {
    const id = node.dataset.id;
    afterIds.add(id);
    const first = beforeRects.get(id);
    const last = node.getBoundingClientRect();

    if (!last.width && !last.height) return;

    if (!first) {
      node.style.opacity = "0";
      node.style.transform = "scale(0.88)";
      requestAnimationFrame(() => {
        node.style.transition = `opacity 0.4s ease, transform ${FLIP_MS}ms ${FLIP_EASE}`;
        node.style.opacity = "1";
        node.style.transform = "";
      });
      node.addEventListener(
        "transitionend",
        () => {
          node.style.transition = "";
          node.style.opacity = "";
        },
        { once: true }
      );
      return;
    }

    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = first.width / (last.width || 1);
    const sy = first.height / (last.height || 1);

    node.style.transformOrigin = "top left";
    node.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    node.style.transition = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}, opacity 0.35s ease`;
        node.style.transform = "";
        node.style.transformOrigin = "";
      });
    });

    node.addEventListener(
      "transitionend",
      (e) => {
        if (e.propertyName === "transform") {
          node.style.transition = "";
        }
      },
      { once: true }
    );
  });

  beforeRects.forEach((rect, id) => {
    if (!afterIds.has(id)) {
      /* departed nodes already removed from DOM */
    }
  });
}

function renderBreadcrumb() {
  if (!state.rawData) return;
  const pathData = ancestorPathFromRoot(state.centerId);

  el.breadcrumb.innerHTML = "";
  pathData.forEach((item, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "›";
      el.breadcrumb.appendChild(sep);
    }
    if (i < pathData.length - 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ACMScenes.stripBadge(item.label);
      btn.addEventListener("click", () => focusNode(item.id, true));
      el.breadcrumb.appendChild(btn);
    } else {
      const span = document.createElement("span");
      span.className = "current";
      span.textContent = ACMScenes.stripBadge(item.label);
      el.breadcrumb.appendChild(span);
    }
  });

  el.btnExitFocus.classList.toggle("hidden", state.centerId === "agent");
}

function updateProgressStat() {
  if (!el.progressStat || !state.rawData) return;
  const agg = ACMProgress.aggregateForSubtree(state.rawData);
  el.progressStat.textContent = agg.total ? `${agg.lit}/${agg.total} · ${agg.pct}%` : "—";
}

function renderDetail(node) {
  if (!node) {
    el.detail.innerHTML = `
      <div class="detail-empty">
        <p class="detail-kicker">查阅便签</p>
        <p>点选模块查看说明与文章。</p>
      </div>`;
    return;
  }

  const meta = ACMScenes.bayMeta(node);
  const wiki = node.wiki || [];
  const docs = node.docs || [];
  const st = ACMProgress.statusForNode(node);
  const agg = ACMProgress.aggregateForSubtree(node);
  const statusLabel = { lit: "已点亮", active: "进行中", dim: "未触达", none: "无绑定" }[st];

  let html = `<p class="detail-kicker">${meta.code} · 查阅</p>`;
  html += `<h2>${escapeHtml(ACMScenes.stripBadge(node.label))}</h2>`;
  if (node.summary) html += `<p class="summary">${escapeHtml(node.summary)}</p>`;
  html += `<p class="meta"><span class="status-pill status-${st}">${statusLabel}</span>`;
  if (agg.total) html += ` · 子树 ${agg.pct}%`;
  html += `</p>`;

  if (wiki.length) {
    html += `<p class="section-title">Wiki</p><ul class="chip-list">`;
    wiki.forEach((w) => {
      html += `<li><span class="wiki-chip">[[${escapeHtml(w)}]]</span></li>`;
    });
    html += `</ul>`;
  }

  if (docs.length) {
    html += `<p class="section-title">文章</p><ul class="chip-list doc-list">`;
    docs.forEach((p) => {
      const score = ACMProgress.scoreForDoc(p);
      const name = p.split("/").pop();
      const cls = score >= 85 ? "lit" : score > 0 ? "active" : "";
      html += `<li><a class="doc-link ${cls}" href="${escapeHtml(docHref(p))}" target="_blank" rel="noopener" data-path="${escapeHtml(p)}">${escapeHtml(name)} <span class="doc-score">${score}%</span></a></li>`;
    });
    html += `</ul>`;
  }

  if (node.children?.length) {
    html += `<p class="section-title">子模块（点击画布聚焦）</p><ul class="child-preview">`;
    node.children.forEach((c) => {
      const cst = ACMProgress.statusForNode(c);
      html += `<li data-id="${escapeHtml(c.id)}" class="status-${cst}">${escapeHtml(ACMScenes.stripBadge(c.label))}</li>`;
    });
    html += `</ul>`;
  }

  el.detail.innerHTML = html;

  el.detail.querySelectorAll(".child-preview li").forEach((li) => {
    li.addEventListener("click", () => focusNode(li.dataset.id, true));
  });

  el.detail.querySelectorAll(".doc-link").forEach((a) => {
    a.addEventListener("click", () => {
      setTimeout(() => {
        ACMProgress.markRead(a.dataset.path);
        redraw(false);
        renderDetail(node);
        updateProgressStat();
      }, 600);
    });
  });
}

function highlightSelection() {
  el.scene.querySelectorAll("[data-id]").forEach((mod) => {
    const id = mod.dataset.id;
    mod.classList.toggle("is-selected", id === state.selectedId);

    if (state.searchQuery && id) {
      const node = findNodeData(state.rawData, id);
      const q = state.searchQuery.toLowerCase();
      const hit =
        node &&
        (node.label.toLowerCase().includes(q) || (node.summary || "").toLowerCase().includes(q));
      mod.classList.toggle("is-hit", hit);
      mod.classList.toggle("is-dimmed", !hit);
    } else {
      mod.classList.remove("is-hit", "is-dimmed");
    }
  });
}

function onModuleClick(node, e) {
  e.stopPropagation();
  state.selectedId = node.id;
  renderDetail(node);
  highlightSelection();

  if (hasChildren(node)) {
    if (node.id !== state.centerId) {
      focusNode(node.id, true);
    }
    return;
  }

  if (node.docs?.[0]) {
    window.open(docHref(node.docs[0]), "_blank");
    ACMProgress.markRead(node.docs[0]);
    redraw(false);
  }
}

function bindSceneEvents() {
  el.scene.querySelectorAll("[data-id]").forEach((mod) => {
    const id = mod.dataset.id;
    const node = findNodeData(state.rawData, id);
    if (!node) return;
    mod.addEventListener("click", (e) => onModuleClick(node, e));
    mod.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onModuleClick(node, e);
    });
  });

  el.scene.querySelectorAll("[data-focus-up]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      focusNode(btn.dataset.focusUp, true);
    });
  });
}

function focusNode(id, animate = true) {
  if (state.animating || !id) return;
  const node = findNodeData(state.rawData, id);
  if (!node) return;

  state.centerId = id;
  state.selectedId = id;
  redraw(animate);
}

function redraw(animate = false) {
  if (!state.rawData) return;

  const before = animate ? captureRects() : null;
  state.animating = animate;

  const ctx = getFocusContext(state.centerId);
  el.scene.innerHTML = ACMScenes.render(state.centerId, ctx);

  const node = findNodeData(state.rawData, state.selectedId) || ctx.center;
  renderDetail(node);
  renderBreadcrumb();
  updateProgressStat();
  bindSceneEvents();
  highlightSelection();

  if (animate && before) {
    playFlip(before);
    setTimeout(() => {
      state.animating = false;
    }, FLIP_MS + 40);
  } else {
    state.animating = false;
  }
}

function bindUi() {
  el.search.addEventListener("input", () => {
    state.searchQuery = el.search.value.trim();
    highlightSelection();
  });
  el.btnExitFocus.addEventListener("click", () => {
    const path = ancestorPathFromRoot(state.centerId);
    if (path.length > 1) {
      focusNode(path[path.length - 2].id, true);
    } else {
      focusNode("agent", true);
    }
  });
  window.addEventListener("resize", () => redraw(false));
}

async function load() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.rawData = await res.json();
  } catch (err) {
    el.detail.innerHTML = `<div class="detail-empty"><p>无法加载 data.json</p><p class="muted">${escapeHtml(err.message)}</p></div>`;
    return;
  }

  await ACMProgress.load();
  bindUi();
  state.centerId = "agent";
  state.selectedId = "agent";
  redraw(false);
}

load();
