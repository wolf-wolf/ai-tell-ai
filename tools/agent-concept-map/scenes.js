/* global window, ACMProgress */
/**
 * 单页聚焦舞台：overview（根全景）| focus（中心 + 边缘同级 + 子模块）
 */
window.ACMScenes = (() => {
  const BAY = {
    model: { code: "M-01", glyph: "◈", color: "#2a9d8f", glow: "rgba(42,157,143,0.25)", wash: "rgba(42,157,143,0.12)" },
    harness: { code: "H-02", glyph: "⟲", color: "#7c6cbf", glow: "rgba(124,108,191,0.25)", wash: "rgba(124,108,191,0.12)" },
    multi: { code: "A-03", glyph: "◎", color: "#e07a3a", glow: "rgba(224,122,58,0.25)", wash: "rgba(224,122,58,0.12)" },
    gov: { code: "G-04", glyph: "⬡", color: "#c9a227", glow: "rgba(201,162,39,0.25)", wash: "rgba(201,162,39,0.12)" },
    agent: { code: "CORE", glyph: "◇", color: "#5c5c5c", glow: "rgba(92,92,92,0.2)", wash: "rgba(92,92,92,0.08)" },
    default: { code: "MOD", glyph: "▣", color: "#7a7a7a", glow: "rgba(122,122,122,0.2)", wash: "rgba(122,122,122,0.08)" },
  };

  const OVERVIEW_POS = { model: "north", harness: "east", multi: "south", gov: "west" };
  const BAY_TILT = { north: "-0.7deg", east: "0.9deg", south: "-0.5deg", west: "0.6deg" };
  const EDGE_SLOTS = ["north", "east", "south", "west", "nw", "ne", "sw", "se"];

  function bayMeta(node) {
    const id = window.ACMApp.branchIdFromData(node);
    return BAY[id] || BAY.default;
  }

  function stripBadge(label) {
    return String(label).replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "");
  }

  function partCode(node) {
    const m = bayMeta(node);
    const suffix = node.id.split("-").pop()?.slice(0, 3).toUpperCase() || "X";
    return `${m.code}-${suffix}`;
  }

  function statusLed(st) {
    if (st === "lit") return "led-on";
    if (st === "active") return "led-warn";
    return "led-off";
  }

  function childrenLayout(node) {
    const visual = node.visual;
    const id = node.id;
    if (visual === "pipeline" || id.includes("pipeline") || id === "h-rag" || id === "model-pipeline") {
      return "pipe";
    }
    if (visual === "hub" || id === "multi" || id === "ma-topo") return "hub";
    return "grid";
  }

  function moduleCard(node, opts = {}) {
    const { role = "child", slot = "", compact = false } = opts;
    const meta = bayMeta(node);
    const st = ACMProgress.statusForNode(node);
    const agg = ACMProgress.aggregateForSubtree(node);
    const hasKids = (node.children?.length || 0) > 0;
    const title = stripBadge(node.label);
    const maxSummary = role === "center" ? 120 : role === "sibling" || compact ? 0 : 56;
    const summary =
      node.summary && maxSummary > 0
        ? node.summary.length > maxSummary
          ? `${node.summary.slice(0, maxSummary)}…`
          : node.summary
        : "";

    const tilt = slot.includes("bay-") ? BAY_TILT[slot.replace("bay-", "")] || "0deg" : "0deg";
    const roleClass = `module--${role}${compact ? " module--compact" : ""}`;

    return `
      <article class="module ${roleClass} status-${st} ${slot}" data-id="${node.id}" data-role="${role}" tabindex="0"
        style="--tilt:${tilt};--wash:${meta.wash};--accent:${meta.color}">
        <div class="module-frame">
          <svg class="module-sketch-border" viewBox="0 0 280 180" preserveAspectRatio="none" aria-hidden="true">
            <path d="M8,14 Q6,6 18,5 H262 Q272,4 275,16 V164 Q276,174 264,175 H16 Q4,176 7,164 Z" fill="none" stroke="currentColor" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
          </svg>
          <header class="module-head">
            <span class="module-code">${partCode(node)}</span>
            <span class="module-led ${statusLed(st)}"></span>
          </header>
          ${role !== "sibling" && !compact ? `<div class="module-glyph">${meta.glyph}</div>` : ""}
          <h3 class="module-title">${title}</h3>
          ${summary ? `<p class="module-desc">${summary}</p>` : ""}
          ${role !== "sibling" ? `<footer class="module-foot">
            <span class="module-stat">${hasKids ? `${node.children.length} 项` : "终端"}${agg.total ? ` · ${agg.pct}%` : ""}</span>
            ${hasKids ? `<span class="module-hint">点击进入</span>` : ""}
          </footer>` : ""}
          ${agg.total && role !== "sibling" ? `<div class="module-gauge"><span style="width:${agg.pct}%;background:${meta.color}"></span></div>` : ""}
        </div>
      </article>`;
  }

  function centerHero(node) {
    const meta = bayMeta(node);
    const st = ACMProgress.statusForNode(node);
    const agg = ACMProgress.aggregateForSubtree(node);
    const isAgent = node.id === "agent";

    if (isAgent) {
      const title = stripBadge(node.label);
      const layer = (label, variant, w) => `
        <div class="core-layer core-layer--${variant}" style="--layer-w:${w}px">
          <svg class="core-layer-border" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
            <path d="M8,10 Q5,4 16,3 H184 Q196,2 198,12 V36 Q199,44 188,45 H12 Q3,46 6,36 Z"/>
          </svg>
          <span class="core-layer-label">${label}</span>
        </div>`;
      return `
        <div class="core-assembly module--center" data-id="${node.id}" data-role="center">
          <div class="core-stack" role="img" aria-label="${title}">
            ${layer("UI 交互层", "ui", 138)}
            <div class="core-gap" aria-hidden="true"><span></span><span></span></div>
            ${layer("Harness / Skills", "harness", 162)}
            <div class="core-gap" aria-hidden="true"><span></span><span></span></div>
            ${layer("Model Core", "model", 186)}
          </div>
          <p class="core-caption">${title}</p>
        </div>`;
    }

    return moduleCard(node, { role: "center" });
  }

  function renderOverview(agent) {
    const children = agent.children || [];
    const agg = ACMProgress.aggregateForSubtree(agent);
    const slots = { north: "", east: "", south: "", west: "" };

    children.forEach((child) => {
      const pos = OVERVIEW_POS[child.id] || "north";
      slots[pos] = moduleCard(child, { role: "overview", slot: `bay-${pos}` });
    });

    return `
      <div class="scene scene-overview" data-scene="overview">
        <svg class="blueprint-wires" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true" filter="url(#sketch-wobble)">
          <path class="wire" d="M500,320 Q498,210 500,118"/>
          <path class="wire" d="M500,320 Q660,318 818,322"/>
          <path class="wire" d="M500,320 Q502,430 500,522"/>
          <path class="wire" d="M500,320 Q340,322 182,318"/>
          <circle class="wire-node" cx="500" cy="320" r="5"/>
        </svg>
        <header class="scene-hero">
          <p class="scene-kicker">✎ 全景拆解 · 点击模块聚焦</p>
          <h2 class="scene-title">${agent.label}</h2>
          ${agent.summary ? `<p class="scene-lead">${agent.summary}</p>` : ""}
          ${agg.total ? `<p class="scene-progress">已点亮 ${agg.pct}% · ${agg.lit}/${agg.total}</p>` : ""}
        </header>
        <div class="bay-grid">
          <div class="bay-slot bay-north">${slots.north}</div>
          <div class="bay-slot bay-west">${slots.west}</div>
          <div class="bay-slot bay-core">${centerHero(agent)}</div>
          <div class="bay-slot bay-east">${slots.east}</div>
          <div class="bay-slot bay-south">${slots.south}</div>
        </div>
      </div>`;
  }

  function renderFocus(ctx) {
    const { center, siblings, parent } = ctx;
    const children = center.children || [];
    const meta = bayMeta(center);
    const layout = childrenLayout(center);
    const agg = ACMProgress.aggregateForSubtree(center);

    const edgeHtml = siblings
      .map((s, i) => {
        const edge = EDGE_SLOTS[i % EDGE_SLOTS.length];
        return `<div class="focus-edge focus-edge--${edge}" data-edge="${edge}">${moduleCard(s, { role: "sibling", compact: true })}</div>`;
      })
      .join("");

    const childHtml = children.map((c) => moduleCard(c, { role: "child" })).join("");

    const parentBtn =
      parent && parent.id !== center.id
        ? `<button type="button" class="focus-up" data-focus-up="${parent.id}">↑ ${stripBadge(parent.label)}</button>`
        : "";

    return `
      <div class="scene scene-focus" data-scene="focus" style="--accent:${meta.color}">
        ${parentBtn}
        <div class="focus-edges" aria-label="同级模块">${edgeHtml}</div>
        <div class="focus-center-wrap">
          <div class="focus-center">${centerHero(center)}</div>
          ${center.summary && center.id !== "agent" ? `<p class="focus-lead">${center.summary}</p>` : ""}
          ${agg.total ? `<p class="focus-progress">子树 ${agg.pct}% · ${children.length} 个子模块</p>` : ""}
        </div>
        ${children.length ? `
          <div class="focus-children focus-children--${layout}">
            <p class="focus-children-label">子模块</p>
            <div class="focus-children-inner">${childHtml}</div>
          </div>` : `<p class="focus-empty">终端模块 · 右侧可打开文章</p>`}
      </div>`;
  }

  function render(centerId, ctx) {
    if (!centerId || centerId === "agent") {
      return renderOverview(ctx.center);
    }
    return renderFocus(ctx);
  }

  return { render, bayMeta, stripBadge, childrenLayout };
})();
