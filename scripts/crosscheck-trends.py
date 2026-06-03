#!/usr/bin/env python3
"""交叉校验 index.md 信号与 .research 底稿；剔除无根信号并回写 md。"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from trends_json_utils import (
    JsonBlock,
    extract_json_blocks,
    load_schema,
    parse_block_raw,
    replace_block_in_md,
)

URL_RE = re.compile(r"https?://[^\s\)>\"']+")
LABEL_BULLET_RE = re.compile(
    r"^\s*[-*]\s*(机制|触发|差异|创新点|方法|结果|问题|任务|可替换|限制|此前|变化)\s*[:：]",
    re.MULTILINE,
)
CONFIDENCE_RE = re.compile(r"置信度\s*[:：]\s*(高|中|低)", re.I)
METRIC_LINE_RE = re.compile(r"\*\*metric\*\*\s*[:：]\s*(.+)", re.I)
URL_LINE_RE = re.compile(r"\*\*URL\*\*\s*[:：]\s*(https?://[^\s]+)", re.I)


def normalize_url(url: str) -> str:
    url = url.strip().rstrip(".,;)")
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    host = parsed.netloc.lower()
    if "github.com" in host and path:
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            path = f"/{parts[0].lower()}/{parts[1]}"
    return f"{parsed.scheme}://{host}{path}"


def _metric_field(sig: dict, kind: str, rules: dict[str, Any]) -> str:
    key = rules.get("metric_field")
    if key:
        val = str(sig.get(key, "")).strip()
        if val:
            return val
    for fallback in ("metric", "event", "signal", "signal_type"):
        val = str(sig.get(fallback, "")).strip()
        if val:
            return val
    return ""


def _digits_tokens(text: str) -> set[str]:
    return set(re.findall(r"\d[\d.kK★%→\-]*", text))


def metric_overlaps(signal_metric: str, research_metrics: list[str]) -> bool:
    if not signal_metric or not research_metrics:
        return False
    if "未核实" in signal_metric:
        return True
    sm = signal_metric.lower()
    for rm in research_metrics:
        rl = rm.lower()
        if sm in rl or rl in sm:
            return True
        sd = _digits_tokens(sm)
        rd = _digits_tokens(rl)
        if sd and rd and sd & rd:
            return True
    return False


def parse_research_file(text: str) -> dict[str, dict[str, Any]]:
    """解析 research md，返回 normalized_url -> {metrics, confidence, raw_url}."""
    index: dict[str, dict[str, Any]] = {}
    sections = re.split(r"\n###\s+", text)
    if not sections[0].strip().startswith("#"):
        sections = ["\n".join(sections)]

    for section in sections:
        if not section.strip():
            continue
        urls: list[str] = []
        for m in URL_LINE_RE.finditer(section):
            urls.append(m.group(1).strip())
        for m in URL_RE.finditer(section):
            u = m.group(0).strip().rstrip(".,;)")
            if u not in urls:
                urls.append(u)

        conf = "中"
        cm = CONFIDENCE_RE.search(section)
        if cm:
            conf = cm.group(1)

        metrics: list[str] = []
        for mm in METRIC_LINE_RE.finditer(section):
            metrics.append(mm.group(1).strip())
        for line in section.splitlines():
            if "★" in line or "star" in line.lower() or "下载" in line:
                if "**metric**" not in line.lower():
                    metrics.append(line.strip().lstrip("-* ").strip())

        for raw_url in urls:
            key = normalize_url(raw_url)
            entry = index.setdefault(key, {"metrics": [], "confidence": conf, "raw_urls": []})
            entry["raw_urls"].append(raw_url)
            entry["metrics"].extend(metrics)
            if cm:
                entry["confidence"] = conf

    full_text = text
    for m in URL_RE.finditer(full_text):
        key = normalize_url(m.group(0))
        index.setdefault(key, {"metrics": [], "confidence": "中", "raw_urls": [m.group(0)]})

    return index


def url_in_research(signal_url: str, research_text: str, research_index: dict) -> bool:
    norm = normalize_url(signal_url)
    if norm in research_index:
        return True
    if signal_url in research_text:
        return True
    norm_path = urlparse(norm).path
    return norm_path in research_text if norm_path else False


def check_signal(
    sig: dict,
    kind: str,
    rules: dict[str, Any],
    research_text: str,
    research_index: dict[str, dict[str, Any]],
) -> tuple[bool, str, list[str]]:
    """返回 (keep, drop_reason, warnings)."""
    warnings: list[str] = []
    url = str(sig.get(rules.get("url_field", "url"), "")).strip()
    title = str(sig.get(rules.get("title_field", "title"), sig.get("title", ""))).strip()

    if not url_in_research(url, research_text, research_index):
        return False, f"url 不在 .research/{kind}.md: {url}", warnings

    norm = normalize_url(url)
    entry = research_index.get(norm, {})
    research_conf = entry.get("confidence", "中")

    sig_conf = str(sig.get("source_confidence", research_conf)).strip()
    if research_conf == "低" and sig_conf != "低":
        return False, f"research 标记低置信: {title or url}", warnings

    metric = _metric_field(sig, kind, rules)
    research_metrics = entry.get("metrics", [])
    if metric and research_metrics and not metric_overlaps(metric, research_metrics):
        return False, f"metric 与 research 不匹配: {metric!r}", warnings

    body = sig.get("body", "")
    if isinstance(body, str) and LABEL_BULLET_RE.search(body):
        warnings.append(f"body 含标签式 bullet: {title or url}")

    return True, "", warnings


def research_dir_for(md_path: Path) -> Path:
    return md_path.parent / ".research"


def has_research(research_dir: Path) -> bool:
    if not research_dir.is_dir():
        return False
    return any(
        (research_dir / f"{k}.md").is_file() and (research_dir / f"{k}.md").stat().st_size > 0
        for k in ("github-growth", "github-novel", "huggingface", "bigtech", "papers")
    )


def crosscheck_md(md_path: Path, *, write_back: bool = True) -> tuple[int, list[str], list[str]]:
    """返回 (exit_code, drops, warnings)."""
    md_text = md_path.read_text(encoding="utf-8")
    research_dir = research_dir_for(md_path)

    if not has_research(research_dir):
        print(f"SKIP crosscheck: 无 .research 目录 ({research_dir})", file=sys.stderr)
        return 0, [], []

    schema = load_schema()
    blocks = extract_json_blocks(md_text)
    drops: list[str] = []
    warnings: list[str] = []
    changed = False

    kind_counts: dict[int, tuple[str, int, int]] = {}  # block_idx -> (kind, kept, min_n)

    for block in reversed(blocks):
        try:
            data = parse_block_raw(block.raw)
        except json.JSONDecodeError as exc:
            drops.append(f"块 {block.index} JSON 无法解析: {exc}")
            continue

        if not isinstance(data, dict):
            continue
        kind = str(data.get("kind", ""))
        rules = schema.get("kinds", {}).get(kind, {})
        research_file = research_dir / f"{kind}.md"
        if not research_file.is_file():
            drops.append(f"块 {block.index}（{kind}）缺少 {research_file.name}，跳过交叉校验")
            continue

        research_text = research_file.read_text(encoding="utf-8")
        research_index = parse_research_file(research_text)
        signals = data.get("signals", [])
        if not isinstance(signals, list):
            continue

        kept: list[dict] = []
        for si, sig in enumerate(signals):
            if not isinstance(sig, dict):
                continue
            keep, reason, sig_warnings = check_signal(
                sig, kind, rules, research_text, research_index
            )
            title = sig.get("title") or sig.get("entity") or f"信号{si+1}"
            for w in sig_warnings:
                warnings.append(f"块 {block.index} {title}: {w}")
            if keep:
                kept.append(sig)
            else:
                drops.append(f"块 {block.index} 剔除 [{title}]: {reason}")

        kind_counts[block.index] = (kind, len(kept), rules.get("min_signals", 1))

        if len(kept) != len(signals):
            data["signals"] = kept
            new_raw = json.dumps(data, ensure_ascii=False, indent=2)
            md_text = replace_block_in_md(md_text, block, new_raw)
            changed = True

    if changed and write_back:
        md_path.write_text(md_text, encoding="utf-8")

    exit_code = 0
    for block_idx, (kind, count, min_n) in kind_counts.items():
        if count < min_n:
            drops.append(
                f"FAIL: 块 {block_idx}（{kind}）交叉校验后仅 {count} 条，需要 ≥{min_n}"
            )
            exit_code = 1

    return exit_code, drops, warnings


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: crosscheck-trends.py <trends/YYYY-MM-DD/index.md>", file=sys.stderr)
        return 1
    md_path = Path(sys.argv[1]).resolve()
    if not md_path.is_file():
        print(f"ERROR: 不存在 {md_path}", file=sys.stderr)
        return 1

    exit_code, drops, warnings = crosscheck_md(md_path)
    date = md_path.parent.name
    log_dir = md_path.parent.parent / ".logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"crosscheck-{date}.log"

    lines = [f"[{datetime.now().isoformat(timespec='seconds')}] crosscheck {md_path}"]
    if drops:
        lines.append("--- 剔除 / 失败 ---")
        lines.extend(drops)
    if warnings:
        lines.append("--- 警告 ---")
        lines.extend(warnings)
    if not drops and not warnings:
        lines.append("OK: 全部信号通过交叉校验")
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"crosscheck log: {log_path}")

    for d in drops:
        print(d, file=sys.stderr)
    for w in warnings:
        print(f"WARN: {w}", file=sys.stderr)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
