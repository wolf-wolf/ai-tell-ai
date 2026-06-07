#!/usr/bin/env python3
"""将 trends/YYYY-MM-DD/index.md 转为更易读的 index.html（仅标准库）。"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

KIND_BODY_FIELDS: dict[str, list[tuple[str, str]]] = {
    "github-growth": [("mechanism", "机制"), ("trigger", "触发"), ("diff", "差异")],
    "github-novel": [("innovation", "创新点"), ("diff", "差异")],
    "huggingface": [("task", "任务"), ("replaces", "可替换"), ("constraints", "限制")],
    "bigtech": [("before", "此前"), ("after", "变化")],
    "papers": [("problem", "问题"), ("method", "方法"), ("result", "结果"), ("key_number", "关键数字")],
}

CSS = """
:root {
  --bg: #f8f9fa;
  --paper: #f5f4f1;
  --rule: #d4d2cb;
  --text: #111827;
  --muted: #6b7280;
  --border: #d4d2cb;
  --accent: #ff6b3d;
  --link: #2563eb;
  --dir-fg: #9a3412;
  --dir-bg: #fff2e8;
  --sel-fg: #1e40af;
  --sel-bg: #eff6ff;
  --tool-fg: #065f46;
  --tool-bg: #ecfdf5;
}
* { box-sizing: border-box; }
body {
  font-family: "Inter", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.8125rem;
  background: #e2e0db;
  color: var(--text);
  line-height: 1.58;
  margin: 0;
}
.page-header {
  padding: 0.7rem 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.8rem;
  align-items: baseline;
  border-bottom: 1px solid var(--rule);
  background: #fafaf8;
}
.ph-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}
.ph-date {
  color: #374151;
  font-size: 0.8rem;
}
.ph-meta {
  color: var(--muted);
  font-size: 0.72rem;
}
.wrap {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  column-gap: 0;
  row-gap: 0;
  align-items: stretch;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 2rem;
  background: var(--paper);
}
.wrap > * {
  grid-column: 1 / -1;
}
.section-github-growth { grid-column: 1 / 3; }
.section-github-novel { grid-column: 3 / 5; }
.section-papers { grid-column: 5 / 7; }
.section-huggingface { grid-column: 1 / 3; }
.section-bigtech-en { grid-column: 3 / 5; }
.section-bigtech-zh { grid-column: 5 / 7; }
.section-judgment { grid-column: 1 / 3; }
.section-deep { grid-column: 3 / 7; }
h2 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.55rem;
  font-size: 0.86rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
  padding: 0 0 0.32rem;
  border-bottom: 1px solid var(--rule);
  letter-spacing: 0.01em;
  line-height: 1.35;
}
.section-title {
  flex: 0 1 auto;
}
.section-intro {
  flex: 1 1 auto;
  font-size: 0.7rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.4;
}
.section-intro::before {
  content: "·";
  margin-right: 0.35rem;
  color: #9ca3af;
}
h3 {
  font-size: 1.03rem;
  margin: 0.8rem 0 0.45rem;
  color: #374151;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
  align-items: center;
  font-size: 0.74rem;
  color: #4b5563;
  margin: 0;
  padding: 0.55rem 0.95rem;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
}
.meta .meta-item {
  padding: 0.08rem 0.32rem;
  border-bottom: none;
}
hr {
  display: none;
}
.section-block {
  min-width: 0;
  border-radius: 0;
  padding: 0.65rem 0.95rem 0.75rem;
  margin: 0;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  border-right: 1px solid var(--rule);
}
.section-papers,
.section-bigtech-zh,
.section-deep,
.wrap > .section-block:not(.section-github-growth):not(.section-github-novel):not(.section-papers):not(.section-huggingface):not(.section-bigtech-en):not(.section-bigtech-zh):not(.section-judgment):not(.section-deep) {
  border-right: none;
}
p { margin: 0.45rem 0; font-size: 0.78rem; }
ul {
  margin: 0.35rem 0;
  padding-left: 1rem;
  font-size: 0.78rem;
}
li { margin: 0.22rem 0; }
.section-judgment p,
.section-judgment li {
  font-size: 0.76rem;
  line-height: 1.52;
  margin: 0.28rem 0;
}
.judgment-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.judgment-prose {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.62;
  color: #1f2937;
}
.section-judgment ul {
  margin: 0.25rem 0;
}

.signal-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0.35rem 0 0;
  border-top: none;
}
.signal-card {
  padding: 0.5rem 0;
  margin: 0;
  border: none;
  border-bottom: 1px solid var(--rule);
}
.signal-card:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.signal-head-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.55rem;
  margin-bottom: 0.2rem;
}
.signal-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.4;
}
.signal-title a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: #93c5fd;
  text-underline-offset: 2px;
}
.signal-title a:hover {
  color: var(--link);
}
.signal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.45rem;
  margin-bottom: 0.3rem;
  font-size: 0.72rem;
  color: #4b5563;
  line-height: 1.48;
}
.signal-chip {
  background: rgba(255, 255, 255, 0.55);
  border-radius: 4px;
  padding: 0.1rem 0.38rem;
}
.confidence-low-chip {
  background: #f3f4f6;
  color: #6b7280;
}
.chip-label {
  color: #6b7280;
  font-weight: 600;
  margin-right: 0.15em;
}
.confidence-badge {
  font-size: 0.65rem;
  font-weight: 600;
  margin-left: 0.35rem;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
}
.confidence-high {
  color: #065f46;
  background: #ecfdf5;
}
.confidence-low {
  color: #6b7280;
  background: #f3f4f6;
}
.signal-body {
  font-size: 0.75rem;
  margin: 0.15rem 0 0.22rem;
}
.signal-body .kv-row {
  margin: 0.18rem 0;
}
.signal-plain {
  margin: 0;
  line-height: 1.65;
  color: #1f2937;
}
.signal-lead {
  margin: 0 0 0.2rem;
  font-size: 0.74rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.45;
}
.signal-prose {
  margin: 0.2rem 0 0;
  line-height: 1.58;
  color: #1f2937;
}
.signal-prose-list {
  margin: 0.2rem 0 0;
  padding-left: 1.05rem;
  list-style: disc;
  color: #1f2937;
  font-size: 0.75rem;
  line-height: 1.55;
}
.signal-prose-list li {
  margin: 0.14rem 0;
}
.insight-action {
  margin: 0.35rem 0 0;
  padding: 0.28rem 0 0.28rem 0.45rem;
  border-left: 2px solid #93c5fd;
  font-size: 0.75rem;
  line-height: 1.52;
  color: #1e3a5f;
}
.insight-list {
  margin: 0.15rem 0 0.2rem;
  padding-left: 1rem;
  list-style: disc;
}
.insight-list li {
  margin: 0.12rem 0;
  line-height: 1.5;
}
.kv-row {
  margin: 0.18rem 0;
  line-height: 1.52;
  font-size: 0.75rem;
  color: #1f2937;
}
.field-label {
  font-weight: 700;
  color: #111827;
}
.field-label::after {
  content: "：";
  font-weight: 700;
}
.field-head {
  margin: 0.22rem 0 0.1rem;
  font-size: 0.76rem;
  font-weight: 700;
  color: #374151;
  line-height: 1.35;
}
.field-head::after {
  content: "：";
}

.badge-dir,
.badge-sel,
.badge-tool {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.08rem 0.52rem;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
}
.badge-dir { color: var(--dir-fg); background: var(--dir-bg); border-color: #fed7aa; }
.badge-sel { color: var(--sel-fg); background: var(--sel-bg); border-color: #bfdbfe; }
.badge-tool { color: var(--tool-fg); background: var(--tool-bg); border-color: #bbf7d0; }

.wikilink {
  color: #b45309;
  border-bottom: 1px dashed #f59e0b;
}

.deep-article {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.52;
}
.deep-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.45rem;
  margin-bottom: 0.35rem;
  padding-bottom: 0.32rem;
  border-bottom: 1px solid var(--rule);
}
.deep-title {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.4;
  flex: 1 1 12rem;
}
.deep-title a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: #93c5fd;
  text-underline-offset: 2px;
}
.deep-title a:hover {
  color: var(--link);
}
.deep-aux {
  font-size: 0.68rem;
  font-weight: 400;
  white-space: nowrap;
}
.deep-aux-link {
  color: var(--link);
  text-decoration: none;
  margin-left: 0.35rem;
}
.deep-aux-link:hover {
  text-decoration: underline;
}
.deep-body {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}
.deep-prose {
  margin: 0;
  color: #1f2937;
  line-height: 1.62;
  font-size: 0.78rem;
}
.deep-prose-list {
  margin: 0.2rem 0 0;
  padding-left: 1.05rem;
  list-style: disc;
  font-size: 0.76rem;
  line-height: 1.55;
  color: #374151;
}
.deep-prose-list li {
  margin: 0.14rem 0;
}
.deep-foot {
  margin: 0.2rem 0 0;
  padding-top: 0.28rem;
  border-top: 1px dashed var(--rule);
  font-size: 0.7rem;
  color: #6b7280;
}

.footer {
  margin: 0;
  padding: 0.75rem 1.1rem;
  text-align: center;
  color: var(--muted);
  font-size: 0.78rem;
  background: #fafaf8;
  border-top: 1px solid var(--rule);
}

@media (max-width: 900px) {
  .wrap {
    display: block;
  }
  .section-block {
    border-right: none;
  }
}
@media (max-width: 760px) {
  .page-header { padding: 0.72rem 0.6rem; }
  .wrap { padding: 0 0 1.5rem; }
  .meta { padding: 0.55rem 0.75rem; }
  .section-block { padding: 0.55rem 0.7rem 0.65rem; }
}
"""

H2_IDS = [
    ("一、GitHub 动态增长", "github-growth"),
    ("二、GitHub 新颖探索", "github-novel"),
    ("三、HuggingFace", "huggingface"),
    ("四、大公司动态", "bigtech"),
    ("五、论文速览", "papers"),
    ("六、今日关键判断", "judgment"),
    ("七、深读", "deep-dive"),
]

SECTION_CLASS_BY_ID = {
    "github-growth": "section-github-growth",
    "github-novel": "section-github-novel",
    "huggingface": "section-huggingface",
    "bigtech": "section-bigtech",
    "papers": "section-papers",
    "judgment": "section-judgment",
    "deep-dive": "section-deep",
}

SECTION_INTROS: dict[str, str] = {
    "bigtech-en": "海外大厂产品与模型发布",
    "bigtech-zh": "国内媒体报道与生态价格",
    "judgment": "今日主线",
    "deep-dive": "一条深读",
}

_NUM_PREFIX = re.compile(
    r"^(?:[一二三四五六七八九十百千]+、|\d+(?:\.\d+)*[.．、\s]*)+"
)

def parse_section_title(raw: str) -> tuple[str, str]:
    text = re.sub(r"<[^>]+>", "", raw)
    text = html.unescape(text).strip()
    intro = ""
    paren = re.search(r"[（(]([^）)]+)[）)]\s*$", text)
    if paren:
        intro = paren.group(1).strip()
        text = text[: paren.start()].strip()
    text = _NUM_PREFIX.sub("", text).strip()
    return text, intro


def format_section_header(title_raw: str, sid: str = "") -> str:
    title, intro = parse_section_title(title_raw)
    if not intro and sid:
        intro = SECTION_INTROS.get(sid, "")
    id_attr = f' id="{html.escape(sid)}"' if sid else ""
    header = f'<h2{id_attr}><span class="section-title">{html.escape(title)}</span>'
    if intro:
        header += f'<span class="section-intro">{html.escape(intro)}</span>'
    header += "</h2>"
    return header


def format_heading_tag(heading: str, sid: str) -> str:
    inner_match = re.search(r"<h2[^>]*>(.*?)</h2>", heading, flags=re.DOTALL)
    inner = inner_match.group(1) if inner_match else heading
    return format_section_header(inner, sid)


def strip_frontmatter(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4 :].lstrip("\n")
    return text


def _wikilink(m: re.Match) -> str:
    raw = m.group(1)
    target = raw.split("|")[0].strip()
    label = raw.split("|")[-1].strip() if "|" in raw else target
    return f'<span class="wikilink" title="{html.escape(target)}">{html.escape(label)}</span>'


def strip_tier_labels(text: str) -> str:
    """移除 [方向级]/[选型级]/[工具级] 及常见变体，不展示分级标签。"""
    text = re.sub(r"\[方向级\]|\[选型级\]|\[工具级\]", "", text)
    text = re.sub(r"`\[方向级\]`|`\[选型级\]`|`\[工具级\]`", "", text)
    text = re.sub(r"信号分级\s*[:：]\s*[^。\n]+", "", text)
    text = re.sub(r"\s*[·•]\s*[·•]\s*", " · ", text)
    return re.sub(r"\s{2,}", " ", text).strip(" ·•")


def inline_format(text: str) -> str:
    text = strip_tier_labels(text)
    text = html.escape(text)
    text = re.sub(r"\[\[([^\]]+)\]\]", _wikilink, text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<a href="\2" target="_blank" rel="noopener">\1</a>',
        text,
    )
    text = re.sub(
        r"(?<![\"'>])(https?://[^\s<\"']+)",
        r'<a href="\1" target="_blank" rel="noopener">\1</a>',
        text,
    )
    return text


def h2_id(title: str) -> str:
    for prefix, sid in H2_IDS:
        if prefix in title:
            return sid
    return re.sub(r"[^\w\u4e00-\u9fff]+", "-", title).strip("-").lower() or "section"


def shorten_url_label(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.strip("/")
    parts = [p for p in path.split("/") if p]

    if "github.com" in host and len(parts) >= 2:
        return f"{parts[0]}/{parts[1]}"
    if "arxiv.org" in host:
        aid = parts[-1] if parts else "paper"
        return f"arXiv:{aid}"
    if "huggingface.co" in host and parts:
        return "/".join(parts[:2])
    if parts:
        return f"{host}/{parts[0]}"
    return host or url


def extract_first_url(cell: str) -> tuple[str, str] | None:
    md_link = re.search(r"\[([^\]]+)\]\((https?://[^)]+)\)", cell)
    if md_link:
        return md_link.group(2).strip(), md_link.group(1).strip()
    raw = re.search(r"https?://[^\s|]+", cell)
    if raw:
        url = raw.group(0).strip()
        return url, shorten_url_label(url)
    return None


def _link_col_rank(header_cell: str) -> int:
    hs = header_cell.strip()
    if hs == "链接":
        return 0
    if "实现仓库" in hs:
        return 1
    if "社区" in hs and "链接" in hs:
        return 3
    if "链接" in hs:
        return 2
    return 4


def pick_primary_url(header: list[str], row: list[str], link_cols: set[int]) -> str | None:
    for idx in sorted(link_cols, key=lambda i: (_link_col_rank(header[i]), i)):
        if idx >= len(row):
            continue
        cell = row[idx].strip()
        if not cell or cell in ("—", "-"):
            continue
        info = extract_first_url(cell)
        if info:
            return info[0]
    return None


def wrap_title_link(title_html: str, url: str | None) -> str:
    if not url or "<a " in title_html:
        return title_html
    return (
        f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{title_html}</a>'
    )


def kv_row(key: str, value: str) -> str:
    return (
        f'<p class="kv-row"><strong class="field-label">{html.escape(key)}</strong> '
        f"{inline_format(value.strip())}</p>"
    )


def kv_row_html(key: str, value_html: str) -> str:
    return (
        f'<p class="kv-row"><strong class="field-label">{html.escape(key)}</strong> '
        f"{value_html}</p>"
    )


def _body_field_texts(body_obj: dict, kind: str) -> list[str]:
    if not isinstance(body_obj, dict):
        return []
    texts: list[str] = []
    for key, _label in KIND_BODY_FIELDS.get(kind, []):
        val = str(body_obj.get(key, "")).strip()
        if val and val not in ("—", "-"):
            texts.append(val)
    return texts


def render_signal_prose(chunks: list[str]) -> str:
    """旧版 object body：合并为一段，不展示字段标签。"""
    chunks = [c.strip() for c in chunks if c.strip()]
    if not chunks:
        return ""
    return f'<p class="signal-prose">{inline_format("；".join(chunks))}</p>'


def render_body_markdown(text: str) -> str:
    """渲染 signal.body（Markdown 字符串）。"""
    text = text.strip()
    if not text:
        return ""
    parts: list[str] = []
    for block in re.split(r"\n\n+", text):
        block = block.strip()
        if not block:
            continue
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if lines and all(re.match(r"^[-*]\s+", ln.strip()) for ln in lines):
            items = "".join(
                f"<li>{inline_format(ln.strip()[2:].strip())}</li>" for ln in lines
            )
            parts.append(f'<ul class="signal-prose-list">{items}</ul>')
        else:
            merged = " ".join(ln.strip() for ln in lines)
            parts.append(f'<p class="signal-prose">{inline_format(merged)}</p>')
    return "".join(parts)


def render_signal_body(body: Any, kind: str, hook: str) -> str:
    if isinstance(body, str):
        html_parts: list[str] = []
        if hook:
            html_parts.append(f'<p class="signal-lead">{inline_format(hook)}</p>')
        html_parts.append(render_body_markdown(body))
        return "".join(html_parts)
    if isinstance(body, dict):
        chunks: list[str] = []
        if hook:
            chunks.append(hook)
        chunks.extend(_body_field_texts(body, kind))
        return render_signal_prose(chunks)
    return ""


def render_signal_card_from_json(signal: dict, kind: str) -> str:
    title_key = "entity" if kind == "bigtech" else "title"
    title = str(signal.get(title_key, signal.get("title", ""))).strip()
    url = str(signal.get("url", "") or signal.get("repo_url", "")).strip()
    title_inner = html.escape(title)
    if url:
        title_inner = (
            f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{title_inner}</a>'
        )
    aux_html = ""
    community = str(signal.get("community_url", "")).strip()
    if community and community not in ("—", "-"):
        aux_html = (
            f'<span class="deep-aux"><a class="deep-aux-link" href="{html.escape(community)}" '
            f'target="_blank" rel="noopener">社区</a></span>'
        )

    metric = (
        signal.get("metric")
        or signal.get("signal_type")
        or signal.get("event")
        or signal.get("signal")
        or ""
    )
    metric_str = str(metric).strip()
    conf = str(signal.get("source_confidence", "中")).strip() or "中"
    conf_badge = ""
    low_conf = conf == "低" or "未核实" in metric_str
    if low_conf:
        conf_badge = '<span class="confidence-badge confidence-low">未核实</span>'
    elif conf == "高":
        conf_badge = '<span class="confidence-badge confidence-high">高</span>'
    meta_block = ""
    if metric_str and metric_str not in ("—", "-"):
        chip_cls = "signal-chip confidence-low-chip" if low_conf else "signal-chip"
        meta_block = (
            f'<div class="signal-meta"><span class="{chip_cls}">'
            f'<span class="chip-label">信号</span> {inline_format(metric_str)}'
            f"{conf_badge}</span></div>"
        )

    hook = str(signal.get("hook", "")).strip()
    body_parts: list[str] = []
    body_html = render_signal_body(signal.get("body"), kind, hook)
    if body_html:
        body_parts.append(body_html)

    action = str(signal.get("action", "")).strip()
    action_html = ""
    if action and action not in ("—", "-"):
        action_html = f'<p class="insight-action">{inline_format(action)}</p>'

    body_inner = "".join(body_parts)
    body_wrap = ""
    if body_inner or action_html:
        body_wrap = f'<div class="signal-body">{body_inner}{action_html}</div>'

    return (
        "<article class=\"signal-card\">"
        "<header class=\"signal-head\">"
        f'<div class="signal-head-top"><strong class="signal-title">'
        f"{title_inner}{aux_html}</strong></div>"
        f"{meta_block}"
        "</header>"
        f"{body_wrap}"
        "</article>"
    )


def parse_json_fence(lines: list[str], start: int) -> tuple[str, int]:
    fence = lines[start].strip()
    lang = fence[3:].strip().lower() if len(fence) > 3 else ""
    if lang not in ("json", ""):
        return "", start
    i = start + 1
    body_lines: list[str] = []
    while i < len(lines) and not lines[i].strip().startswith("```"):
        body_lines.append(lines[i])
        i += 1
    if i >= len(lines):
        return "", start
    end = i
    i += 1
    raw = "\n".join(body_lines).strip()
    if not raw:
        return "", i
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"WARN: JSON 解析失败（行 {start + 1}）: {exc}", file=sys.stderr)
        return "", end + 1

    if isinstance(data, list):
        signals = data
        kind = "github-growth"
    elif isinstance(data, dict):
        kind = str(data.get("kind", "github-growth"))
        signals = data.get("signals", [])
    else:
        return "", i

    if not isinstance(signals, list):
        print("WARN: signals 不是数组", file=sys.stderr)
        return "", i

    cards = ['<div class="signal-list">']
    for sig in signals:
        if isinstance(sig, dict):
            cards.append(render_signal_card_from_json(sig, kind))
    cards.append("</div>")
    return "".join(cards), i


def _meta_label(header_cell: str) -> str:
    return re.sub(r"（[^）]*）", "", header_cell).strip() or header_cell


def render_keypoints_body(cell: str) -> str:
    plain = re.sub(r"\*\*", "", cell).strip()
    if not plain or plain in ("—", "-"):
        return ""
    matches = re.findall(
        r"(机制|差异|层级|输入|方法|输出|创新点|任务|可替换|限制)\s*[:：]\s*"
        r"([^：]+?)(?=(?:机制|差异|层级|输入|方法|输出|创新点|任务|可替换|限制)\s*[:：]|$)",
        plain,
    )
    if matches:
        inner = "".join(kv_row(key, value) for key, value in matches)
        return f'<div class="signal-body">{inner}</div>'

    if "→" in plain and len(plain) > 20:
        parts = [p.strip() for p in plain.split("→") if p.strip()]
        if len(parts) >= 2:
            labels = ["输入", "方法", "输出", "结论"]
            inner = "".join(kv_row(labels[min(idx, len(labels) - 1)], part) for idx, part in enumerate(parts))
            return f'<div class="signal-body">{inner}</div>'
    return f'<div class="signal-body"><p class="signal-plain">{inline_format(cell)}</p></div>'


def parse_table(lines: list[str], start: int) -> tuple[str, int]:
    rows: list[list[str]] = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        row = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        rows.append(row)
        i += 1
    if len(rows) < 2:
        return "", start
    header = rows[0]
    body_rows = rows[1:]
    if body_rows and re.match(r"^[\s|:-]+$", "|".join(body_rows[0])):
        body_rows = body_rows[1:]

    badge_idx = next((idx for idx, h in enumerate(header) if "分级" in h), 0)
    title_idx = next(
        (idx for idx, h in enumerate(header) if any(k in h for k in ("仓库", "论文", "主体", "模型"))),
        1 if len(header) > 1 else 0,
    )
    key_col_idx = next((idx for idx, h in enumerate(header) if "要点" in h), -1)
    link_cols = {idx for idx, h in enumerate(header) if "链接" in h or "实现仓库" in h}
    skip = {badge_idx, title_idx, key_col_idx} | link_cols
    meta_indices = [idx for idx in range(len(header)) if idx not in skip]

    cards = ['<div class="signal-list">']
    for row in body_rows:
        if re.match(r"^[\s|:-]+$", "|".join(row)):
            continue
        while len(row) < len(header):
            row.append("")

        title_raw = row[title_idx] if title_idx < len(row) else ""
        title_html = inline_format(title_raw)
        primary_url = pick_primary_url(header, row, link_cols)
        title_html = wrap_title_link(title_html, primary_url)

        meta_parts: list[str] = []
        for idx in meta_indices:
            val = row[idx].strip() if idx < len(row) else ""
            if not val or val in ("—", "-"):
                continue
            lbl = html.escape(_meta_label(header[idx]))
            meta_parts.append(
                f'<span class="signal-chip"><span class="chip-label">{lbl}</span> '
                f"{inline_format(val)}</span>"
            )
        meta_block = f'<div class="signal-meta">{"".join(meta_parts)}</div>' if meta_parts else ""

        body = render_keypoints_body(row[key_col_idx]) if 0 <= key_col_idx < len(row) else ""

        cards.append(
            "<article class=\"signal-card\">"
            "<header class=\"signal-head\">"
            f'<div class="signal-head-top"><strong class="signal-title">{title_html}</strong></div>'
            f"{meta_block}"
            "</header>"
            f"{body}"
            "</article>"
        )
    cards.append("</div>")
    return "".join(cards), i


def _keep_meta_item(item: str) -> bool:
    if "观测窗口" in item or "阅读目标" in item:
        return False
    if "信号分级" in item:
        return False
    return True


def parse_meta_block(lines: list[str], start: int) -> tuple[str, int]:
    items: list[str] = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("> "):
        items.append(lines[i].strip()[2:].strip())
        i += 1
    kept = [item for item in items if item and _keep_meta_item(item)]
    if not kept:
        return "", i
    chips = "".join(f'<span class="meta-item">{inline_format(item)}</span>' for item in kept)
    return f'<div class="meta">{chips}</div>', i


def _list_continuation_ahead(lines: list[str], start: int) -> bool:
    """Blank line inside a list may separate paragraphs of the same <li>."""
    j = start
    while j < len(lines) and not lines[j].strip():
        j += 1
    if j >= len(lines):
        return False
    next_line = lines[j]
    if re.match(r"^[-*] ", next_line.strip()):
        return False
    return next_line.startswith(("  ", "\t"))


def _append_list_continuation(out: list[str], text: str) -> None:
    block = f"<p>{inline_format(text)}</p>"
    if out and out[-1].endswith("</li>"):
        out[-1] = out[-1][: -len("</li>")] + block + "</li>"
    else:
        out.append(f"<li>{block}</li>")


def md_to_html(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    in_list = False

    while i < len(lines):
        stripped = lines[i].strip()

        if not stripped:
            if in_list and _list_continuation_ahead(lines, i + 1):
                i += 1
                continue
            if in_list:
                out.append("</ul>")
                in_list = False
            i += 1
            continue

        if stripped.startswith("```"):
            if in_list:
                out.append("</ul>")
                in_list = False
            json_html, i = parse_json_fence(lines, i)
            if json_html:
                out.append(json_html)
            continue

        if stripped.startswith("|"):
            if in_list:
                out.append("</ul>")
                in_list = False
            table_html, i = parse_table(lines, i)
            if table_html:
                out.append(table_html)
            continue

        if stripped == "---":
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append("<hr>")
            i += 1
            continue

        if stripped.startswith("### "):
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(f"<h3>{inline_format(stripped[4:])}</h3>")
            i += 1
            continue

        if stripped.startswith("## "):
            if in_list:
                out.append("</ul>")
                in_list = False
            title = stripped[3:]
            out.append(f'<h2 id="{h2_id(title)}">{inline_format(title)}</h2>')
            i += 1
            continue

        if stripped.startswith("# "):
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(f"<h1>{inline_format(stripped[2:])}</h1>")
            i += 1
            continue

        if stripped.startswith("> "):
            if in_list:
                out.append("</ul>")
                in_list = False
            meta_html, i = parse_meta_block(lines, i)
            out.append(meta_html)
            continue

        if re.match(r"^[-*] ", stripped):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{inline_format(stripped[2:])}</li>")
            i += 1
            continue

        if in_list and (lines[i].startswith(("  ", "\t")) or not stripped):
            _append_list_continuation(out, stripped)
            i += 1
            continue

        if in_list:
            out.append("</ul>")
            in_list = False
        out.append(f"<p>{inline_format(stripped)}</p>")
        i += 1

    if in_list:
        out.append("</ul>")
    return "\n".join(out)


def _collect_labeled_list_pairs(list_body: str) -> list[tuple[str, str]]:
    items = re.findall(r"<li>(.*?)</li>", list_body, re.DOTALL)
    pairs: list[tuple[str, str]] = []
    current_title = ""
    current_body_parts: list[str] = []

    for item in items:
        item_clean = item.strip()
        title_match = re.match(r"<strong>([^<]+)</strong>[：:]\s*(.*)", item_clean, re.DOTALL)
        if title_match:
            if current_title:
                pairs.append((current_title, "".join(current_body_parts).strip()))
            current_title = title_match.group(1).strip()
            first_body = title_match.group(2).strip()
            current_body_parts = [first_body] if first_body else []
        elif current_title:
            current_body_parts.append(f'<div class="deep-sub">• {item_clean}</div>')

    if current_title:
        pairs.append((current_title, "".join(current_body_parts).strip()))
    return pairs


def _urls_from_html_cell(cell: str) -> list[str]:
    urls: list[str] = []
    for match in re.finditer(r'href="(https?://[^"]+)"', cell):
        url = html.unescape(match.group(1))
        if url not in urls:
            urls.append(url)
    plain = re.sub(r"<[^>]+>", " ", cell)
    for chunk in re.split(r"\s*[·•]\s*", plain):
        info = extract_first_url(chunk.strip())
        if info and info[0] not in urls:
            urls.append(info[0])
    return urls


def _deep_urls(*cells: str) -> list[str]:
    urls: list[str] = []
    for cell in cells:
        for url in _urls_from_html_cell(cell):
            if url not in urls:
                urls.append(url)

    def rank(url: str) -> tuple[int, str]:
        if "arxiv" in url:
            return (0, url)
        if "github" in url:
            return (1, url)
        return (2, url)

    return sorted(urls, key=rank)


def _aux_link_label(url: str) -> str:
    if "github.com" in url:
        return "GitHub"
    if "arxiv.org" in url:
        return "arXiv"
    return shorten_url_label(url)


def _normalize_deep_prose_html(text: str) -> str:
    """列表项内多段 <p> → 双换行，供 _render_deep_prose 分段。"""
    text = re.sub(r"</p>\s*<p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</?p>", "", text, flags=re.IGNORECASE)
    return text.strip()


def _render_deep_prose(text: str) -> str:
    """深读正文：Markdown 字符串 → 段落/列表，无字段标签。"""
    text = _normalize_deep_prose_html(text.strip())
    if not text:
        return ""
    parts: list[str] = []
    for block in re.split(r"\n\n+", text):
        block = block.strip()
        if not block:
            continue
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if lines and all(re.match(r"^[-*]\s+", ln.strip()) for ln in lines):
            items = "".join(
                f"<li>{inline_format(ln.strip()[2:].strip())}</li>" for ln in lines
            )
            parts.append(f'<ul class="deep-prose-list">{items}</ul>')
        else:
            merged = " ".join(ln.strip() for ln in lines)
            parts.append(f'<p class="deep-prose">{inline_format(merged)}</p>')
    return "".join(parts)


def _legacy_deep_prose(data: dict[str, str]) -> str:
    """旧版带标签字段 → 合并为自然段（无小标题）。"""
    chunks: list[str] = []
    bg = data.get("背景", "").strip()
    if bg:
        chunks.append(bg)
    done = data.get("做了什么", "").strip()
    nums = data.get("关键数字", "").strip()
    if done and nums:
        chunks.append(f"{done} {nums}")
    elif done:
        chunks.append(done)
    elif nums:
        chunks.append(nums)
    impact = data.get("对 Agent 学习路径的影响", "").strip()
    if impact:
        impact_plain = re.sub(r"<div class=\"deep-sub\">•\s*", "- ", impact)
        impact_plain = re.sub(r"</div>", "\n", impact_plain)
        impact_plain = re.sub(r"<[^>]+>", "", impact_plain).strip()
        if impact_plain:
            chunks.append(impact_plain)
    return "\n\n".join(chunks)


def _strip_html_text(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _judgment_list_items(html_fragment: str) -> list[str]:
    items: list[str] = []
    for raw in re.findall(r"<li>(.*?)</li>", html_fragment, flags=re.DOTALL):
        plain = _strip_html_text(raw)
        plain = re.sub(r"^\d+\.\s*", "", plain)
        plain = strip_tier_labels(plain)
        if plain and "最强信号" not in plain:
            items.append(plain)
    return items


def _judgment_prose_from_data(data: dict[str, str]) -> str:
    body = data.get("正文", "").strip()
    if body:
        return body
    chunks: list[str] = []
    sig_key = next((k for k in data if "最强信号" in k), None)
    if sig_key:
        chunks.extend(_judgment_list_items(data[sig_key]))
    layer = data.get("层级", "").strip()
    if layer:
        chunks.append(_strip_html_text(layer))
    one = data.get("一句话", "").strip()
    if one:
        chunks.append(_strip_html_text(one))
    return "\n\n".join(chunks)


def transform_judgment_section(section_html: str) -> str:
    m = re.search(
        r'(<section class="[^"]*section-judgment[^"]*">.*?<h2[^>]*>.*?</h2>)(.*?)(</section>)',
        section_html,
        flags=re.DOTALL,
    )
    if not m:
        return section_html
    header, body, footer = m.group(1), m.group(2), m.group(3)
    orphan_paras = re.findall(r"<p>(.*?)</p>", body, flags=re.DOTALL)
    prose = ""
    ul_match = re.search(r"<ul>(.*?)</ul>", body, flags=re.DOTALL)
    if ul_match:
        pairs = _collect_labeled_list_pairs(ul_match.group(1))
        if len(pairs) >= 1:
            prose = _judgment_prose_from_data(dict(pairs))
    if prose:
        inner = _render_deep_prose(prose).replace("deep-prose", "judgment-prose")
    elif orphan_paras:
        inner = "".join(
            f'<p class="judgment-prose">{p.strip()}</p>' for p in orphan_paras if p.strip()
        )
    else:
        return section_html
    if not inner:
        return section_html
    return f'{header}<div class="judgment-body">{inner}</div>{footer}'


def transform_deep_section(section_html: str) -> str:
    orphan_blocks = [
        (block, re.sub(r"<[^>]+>", "", inner).strip())
        for block, inner in re.findall(r"(<p>(.*?)</p>)", section_html, flags=re.DOTALL)
        if inner.strip()
    ]
    orphan_paras = [plain for _, plain in orphan_blocks]
    consumed_blocks: list[str] = []

    def convert_list(match: re.Match) -> str:
        pairs = _collect_labeled_list_pairs(match.group(1))
        if len(pairs) < 3:
            return match.group(0)

        data = dict(pairs)
        obj_html = data.get("对象", "")
        urls = _deep_urls(data.get("链接", ""), data.get("对象", ""))

        title_inner = obj_html or "—"
        if urls:
            title_inner = (
                f'<a href="{html.escape(urls[0])}" target="_blank" rel="noopener">'
                f"{title_inner}</a>"
            )
        aux_parts = [
            f'<a class="deep-aux-link" href="{html.escape(url)}" target="_blank" rel="noopener">'
            f"{html.escape(_aux_link_label(url))}</a>"
            for url in urls[1:]
        ]
        aux_html = f'<span class="deep-aux">{"".join(aux_parts)}</span>' if aux_parts else ""

        prose = data.get("正文", "").strip() or _legacy_deep_prose(data)
        prose_plain = re.sub(r"<[^>]+>", " ", prose)
        prose_plain = re.sub(r"\s+", " ", prose_plain).strip()
        if orphan_paras:
            extras = [
                p for p in orphan_paras if p and p not in prose_plain and prose_plain not in p
            ]
            if extras:
                for block, plain in orphan_blocks:
                    if plain in extras:
                        consumed_blocks.append(block)
                prose = (prose + "\n\n" + "\n\n".join(extras)).strip() if prose else "\n\n".join(extras)

        body_parts: list[str] = []
        if prose:
            body_parts.append(_render_deep_prose(prose))

        kb = data.get("知识库节点", "")
        if kb:
            body_parts.append(f'<p class="deep-foot">{inline_format(kb)}</p>')

        return (
            '<article class="deep-article">'
            f'<header class="deep-head"><h3 class="deep-title">{title_inner}{aux_html}</h3></header>'
            f'<div class="deep-body">{"".join(body_parts)}</div>'
            "</article>"
        )

    result = re.sub(r"<ul>(.*?)</ul>", convert_list, section_html, count=1, flags=re.DOTALL)
    for block in consumed_blocks:
        result = result.replace(block, "", 1)
    # Legacy md: trailing <ul> with only 知识库节点 after orphan paragraphs
    result = re.sub(
        r"</article>\s*<ul>\s*<li><strong>知识库节点</strong>[：:].*?</li>\s*</ul>",
        "</article>",
        result,
        count=1,
        flags=re.DOTALL,
    )
    return result


def split_bigtech_columns(content: str) -> str:
    """将「四、大公司动态」拆为英文大厂 / 中文生态两列，与 HuggingFace 组成三列行。"""
    parts = re.findall(r"<h3>(.*?)</h3>(.*?)(?=<h3>|$)", content, flags=re.DOTALL)
    if len(parts) < 2:
        return f'<section class="section-block section-bigtech-en"><h2>大公司动态</h2>{content}</section>'
    blocks: list[str] = []
    classes = ("section-bigtech-en", "section-bigtech-zh")
    sid_suffix = ("bigtech-en", "bigtech-zh")
    for idx, (title, body) in enumerate(parts[:2]):
        cls = classes[idx]
        sid = sid_suffix[idx]
        blocks.append(
            f'<section class="section-block {cls}">'
            f"{format_section_header(title.strip(), sid)}{body.strip()}"
            "</section>"
        )
    return "".join(blocks)


def wrap_sections(body_html: str) -> str:
    pattern = r'(<h2 id="([^"]+)">.*?</h2>)(.*?)(?=<h2 id=|$)'
    first = re.search(pattern, body_html, flags=re.DOTALL)
    preamble = body_html[: first.start()] if first else ""

    sections: dict[str, str] = {}
    bigtech_html = ""
    doc_order: list[str] = []

    for m in re.finditer(pattern, body_html, flags=re.DOTALL):
        sid = m.group(2)
        doc_order.append(sid)
        heading = m.group(1)
        content = re.sub(r"(?:<hr>\s*)+$", "", m.group(3))
        if sid == "bigtech":
            bigtech_html = split_bigtech_columns(content)
            continue

        section_class = SECTION_CLASS_BY_ID.get(sid, "")
        card_class = f"section-block {section_class}".strip()
        block = f'<section class="{card_class}">{format_heading_tag(heading, sid)}{content}</section>'
        if sid == "deep-dive":
            block = transform_deep_section(block)
        elif sid == "judgment":
            block = transform_judgment_section(block)
        sections[sid] = block

    row_github = ("github-growth", "github-novel", "papers")
    row_hf_bigtech = ("huggingface",)
    row_top = ("judgment", "deep-dive")
    placed = set(row_github) | set(row_hf_bigtech) | set(row_top) | {"bigtech"}

    parts = [preamble]
    for sid in row_top:
        if sid in sections:
            parts.append(sections[sid])
    for sid in row_github:
        if sid in sections:
            parts.append(sections[sid])
    for sid in row_hf_bigtech:
        if sid in sections:
            parts.append(sections[sid])
    if bigtech_html:
        parts.append(bigtech_html)
    for sid in doc_order:
        if sid not in placed and sid in sections:
            parts.append(sections[sid])

    return "".join(parts)


def build_header(date: str) -> str:
    return (
        '<header class="page-header">'
        '<span class="ph-title">AI 趋势日报</span>'
        f'<span class="ph-date">{html.escape(date)}</span>'
        '<span class="ph-meta">观测窗口 · 约 15–25 分钟 · 信号分级阅读</span>'
        "</header>"
    )


def render(md_path: Path, html_path: Path) -> None:
    raw = strip_frontmatter(md_path.read_text(encoding="utf-8"))
    date_str = md_path.parent.name
    body = wrap_sections(md_to_html(raw))
    body = re.sub(r"^<h1>.*?</h1>\n?", "", body, count=1, flags=re.DOTALL)
    doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI 趋势日报 — {date_str}</title>
<style>{CSS}</style>
</head>
<body>
{build_header(date_str)}
<div class="wrap">
{body}
<p class="footer">由 trends/index.md 自动生成 · {html.escape(date_str)}</p>
</div>
</body>
</html>"""
    html_path.write_text(doc, encoding="utf-8")
    print(f"OK: {html_path}")


def main() -> None:
    if len(sys.argv) < 2:
        print("用法: render-trend-html.py <trends/YYYY-MM-DD/index.md>", file=sys.stderr)
        sys.exit(1)
    md_path = Path(sys.argv[1]).resolve()
    if not md_path.is_file():
        print(f"ERROR: 不存在 {md_path}", file=sys.stderr)
        sys.exit(1)
    render(md_path, md_path.parent / "index.html")


if __name__ == "__main__":
    main()
