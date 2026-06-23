/* global window */
/**
 * 阅读进度：优先读 Obsidian Read Tracker 的 data.json，否则 localStorage。
 */
window.ACMProgress = {
  files: {},
  manual: {},

  async load() {
    const paths = [
      "../../.obsidian/plugins/ai-read-tracker/data.json",
      "/.obsidian/plugins/ai-read-tracker/data.json",
    ];
    for (const p of paths) {
      try {
        const res = await fetch(p);
        if (!res.ok) continue;
        const data = await res.json();
        this.files = data.files || {};
        return true;
      } catch {
        /* try next */
      }
    }
    try {
      this.manual = JSON.parse(localStorage.getItem("acm-progress") || "{}");
    } catch {
      this.manual = {};
    }
    return false;
  },

  entryForDoc(path) {
    return this.files[path] || this.manual[path] || null;
  },

  scoreForDoc(path) {
    const e = this.entryForDoc(path);
    if (!e) return 0;
    if (typeof e.progressScore === "number") return e.progressScore;
    if (typeof e.maxScrollRatio === "number") return Math.round(e.maxScrollRatio * 100);
    if (e.state?.id && e.state.id !== "unread") return 40;
    return 0;
  },

  statusForNode(nodeData) {
    const docs = nodeData.docs || [];
    if (docs.length) {
      const scores = docs.map((p) => this.scoreForDoc(p));
      const touched = docs.some((p) => this.entryForDoc(p));
      const max = Math.max(...scores, 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (max >= 95 || avg >= 88) return "lit";
      if (avg >= 55 || touched) return "active";
      return "dim";
    }
    return "none";
  },

  aggregateForSubtree(nodeData) {
    const leaves = [];
    (function walk(n) {
      if (n.docs?.length) leaves.push(n);
      n.children?.forEach(walk);
    })(nodeData);
    if (!leaves.length) return { lit: 0, total: 0, pct: 0 };
    let lit = 0;
    for (const n of leaves) {
      const st = this.statusForNode(n);
      if (st === "lit" || st === "active") lit += st === "lit" ? 1 : 0.5;
    }
    const total = leaves.length;
    return { lit: Math.round(lit), total, pct: total ? Math.round((lit / total) * 100) : 0 };
  },

  markRead(path) {
    this.manual[path] = { progressScore: 100, state: { id: "complete" } };
    localStorage.setItem("acm-progress", JSON.stringify(this.manual));
  },
};
