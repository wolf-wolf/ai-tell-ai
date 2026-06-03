#!/usr/bin/env python3
"""趋势日报 index.md 内 JSON 代码块：提取、语法修复、契约校验（仅标准库）。"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "trends" / "schema" / "daily-signals.v1.json"

LABEL_BULLET_RE = re.compile(
    r"^\s*[-*]\s*(机制|触发|差异|创新点|方法|结果|问题|任务|可替换|限制|此前|变化)\s*[:：]",
    re.MULTILINE,
)
CONFIDENCE_VALUES = frozenset({"高", "中", "低"})


@dataclass
class JsonBlock:
    """Markdown 内一个 ```json 围栏块。"""

    index: int
    start_line: int
    end_line: int
    heading: str
    kind_hint: str
    raw: str
    parsed: Any | None = None


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def normalize_date_arg(arg: str) -> str | None:
    arg = arg.strip()
    if arg.startswith("-"):
        return None
    if DATE_RE.match(arg):
        return arg
    return None


def extract_json_blocks(md_text: str) -> list[JsonBlock]:
    lines = md_text.splitlines()
    blocks: list[JsonBlock] = []
    current_heading = ""
    i = 0
    block_idx = 0
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith("## "):
            current_heading = stripped[3:].strip()
        elif stripped.startswith("### "):
            current_heading = stripped[4:].strip()
        if stripped.startswith("```"):
            lang = stripped[3:].strip().lower()
            if lang not in ("json", ""):
                i += 1
                continue
            start = i
            i += 1
            body_lines: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                body_lines.append(lines[i])
                i += 1
            if i >= len(lines):
                break
            end = i
            i += 1
            raw = "\n".join(body_lines).strip()
            kind_hint = _kind_hint_from_heading(current_heading)
            blocks.append(
                JsonBlock(
                    index=block_idx,
                    start_line=start,
                    end_line=end,
                    heading=current_heading,
                    kind_hint=kind_hint,
                    raw=raw,
                )
            )
            block_idx += 1
            continue
        i += 1
    return blocks


def _kind_hint_from_heading(heading: str) -> str:
    h = heading.lower()
    if "github" in h and ("增长" in heading or "增速" in heading):
        return "github-growth"
    if "github" in h or "新颖" in heading:
        return "github-novel"
    if "hugging" in h.lower() or "huggingface" in h.lower():
        return "huggingface"
    if "论文" in heading or "arxiv" in h:
        return "papers"
    if "英文" in heading or "4.1" in heading:
        return "bigtech"
    if "中文" in heading or "4.2" in heading or "生态" in heading:
        return "bigtech"
    if "大公司" in heading or "大厂" in heading:
        return "bigtech"
    return ""


def repair_json_text(text: str) -> tuple[str, list[str]]:
    """语法级修复，返回 (修复后文本, 修复动作列表)。"""
    actions: list[str] = []
    out = text.strip()
    if out.startswith("\ufeff"):
        out = out[1:]
        actions.append("strip_bom")
    out = (
        out.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )
    if out != text.strip():
        actions.append("normalize_quotes")
    trailing = re.sub(r",(\s*[}\]])", r"\1", out)
    if trailing != out:
        out = trailing
        actions.append("trailing_commas")
    try:
        json.loads(out)
        return out, actions
    except json.JSONDecodeError:
        pass
    closed, did_close = _close_json_brackets(out)
    if did_close:
        out = closed
        actions.append("heuristic_close_brackets")
    return out, actions


def _close_json_brackets(text: str) -> tuple[str, bool]:
    stack: list[str] = []
    in_string = False
    escape = False
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]" and stack and stack[-1] == ch:
            stack.pop()
    if not stack:
        return text, False
    suffix = "".join(reversed(stack))
    return text.rstrip() + suffix, True


def parse_block_raw(raw: str) -> Any:
    repaired, _ = repair_json_text(raw)
    return json.loads(repaired)


def replace_block_in_md(md_text: str, block: JsonBlock, new_raw: str) -> str:
    lines = md_text.splitlines()
    new_lines = lines[: block.start_line + 1] + new_raw.splitlines() + lines[block.end_line :]
    return "\n".join(new_lines) + ("\n" if md_text.endswith("\n") else "")


def validate_envelope(data: Any, block: JsonBlock, schema: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return [f"块 {block.index}（{block.heading}）：根必须是 object，含 schema_version/kind/signals"]
    allowed_versions = {schema.get("schema_version"), 1}
    if data.get("schema_version") not in allowed_versions:
        errors.append(
            f"块 {block.index}：schema_version 应为 {sorted(allowed_versions)} 之一"
        )
    kind = data.get("kind", "")
    kinds = schema.get("kinds", {})
    if kind not in kinds:
        errors.append(
            f"块 {block.index}（{block.heading}）：未知 kind `{kind}`，"
            f"允许: {', '.join(kinds.keys())}"
        )
        return errors
    if block.kind_hint and kind != block.kind_hint and block.kind_hint != "bigtech":
        errors.append(
            f"块 {block.index}：标题暗示 {block.kind_hint}，但 kind={kind}"
        )
    signals = data.get("signals")
    if not isinstance(signals, list):
        errors.append(f"块 {block.index}：signals 必须是数组")
        return errors
    rules = kinds[kind]
    min_n = rules.get("min_signals", 1)
    if len(signals) < min_n:
        errors.append(f"块 {block.index}（{kind}）：至少需要 {min_n} 条信号，当前 {len(signals)}")
    for si, sig in enumerate(signals):
        errors.extend(_validate_signal(sig, kind, rules, block.index, si))
    return errors


def _validate_signal(
    sig: Any, kind: str, rules: dict[str, Any], block_idx: int, sig_idx: int
) -> list[str]:
    errors: list[str] = []
    prefix = f"块 {block_idx} 信号 {sig_idx + 1}"
    if not isinstance(sig, dict):
        return [f"{prefix}：必须是 object"]
    tiers = load_schema().get("tier_values", [])
    tier = sig.get("tier", "")
    if tier not in tiers:
        errors.append(f"{prefix}：tier 必须是 {tiers} 之一")
    title_key = rules.get("title_field", "title")
    if not str(sig.get(title_key, "")).strip():
        errors.append(f"{prefix}：缺少 {title_key}")
    url = str(sig.get(rules.get("url_field", "url"), "")).strip()
    if not url.startswith("http"):
        errors.append(f"{prefix}：url 必须以 http 开头")
    schema = load_schema()
    body = sig.get("body")
    min_chars = int(schema.get("body_min_chars", 40))
    if isinstance(body, str):
        if len(body.strip()) < min_chars:
            errors.append(f"{prefix}：body 至少 {min_chars} 字（Markdown 正文）")
    elif isinstance(body, dict):
        for key in rules.get("body_required", []):
            if not str(body.get(key, "")).strip():
                errors.append(f"{prefix}：body.{key} 必填（旧版 object，建议升级为字符串 body）")
        if not any(str(body.get(k, "")).strip() for k in body):
            errors.append(f"{prefix}：body 为空")
    else:
        errors.append(f"{prefix}：body 必须是 Markdown 字符串（或旧版 object）")
    action_rule = rules.get("action_rule", "optional")
    action = str(sig.get("action", "")).strip()
    if action_rule == "required" and not action:
        errors.append(f"{prefix}：action 必填（{kind}）")
    if action_rule == "required_if_tier_选型级" and tier == "选型级" and not action:
        errors.append(f"{prefix}：选型级信号 action 必填")
    conf = str(sig.get("source_confidence", "")).strip()
    if conf and conf not in CONFIDENCE_VALUES:
        errors.append(f"{prefix}：source_confidence 必须是 高|中|低")
    return errors


def _validate_signal_warnings(
    sig: Any, block_idx: int, sig_idx: int
) -> list[str]:
    warnings: list[str] = []
    prefix = f"块 {block_idx} 信号 {sig_idx + 1}"
    if not isinstance(sig, dict):
        return warnings
    hook = str(sig.get("hook", "")).strip()
    body = sig.get("body")
    if hook and isinstance(body, str):
        body_start = body.strip()[:28]
        if hook == body_start or hook == body.strip()[: len(hook)] and len(hook) >= 10:
            if hook == body_start:
                warnings.append(f"{prefix}：hook 与 body 开头重复")
    if isinstance(body, str) and LABEL_BULLET_RE.search(body):
        warnings.append(f"{prefix}：body 含标签式 bullet（机制/触发/差异 等）")
    return warnings


def validate_md_file(md_path: Path) -> tuple[list[str], list[str], list[JsonBlock]]:
    md_text = md_path.read_text(encoding="utf-8")
    schema = load_schema()
    blocks = extract_json_blocks(md_text)
    all_errors: list[str] = []
    all_warnings: list[str] = []
    signal_section_ids = {
        r.get("section_h2_id") for r in schema.get("kinds", {}).values()
    }
    found_kinds: set[str] = set()
    for block in blocks:
        try:
            data = parse_block_raw(block.raw)
            block.parsed = data
        except json.JSONDecodeError as exc:
            all_errors.append(
                f"块 {block.index}（{block.heading}）行 {block.start_line + 1}：JSON 语法错误 — {exc}"
            )
            continue
        all_errors.extend(validate_envelope(data, block, schema))
        if isinstance(data, dict):
            signals = data.get("signals", [])
            if isinstance(signals, list):
                for si, sig in enumerate(signals):
                    all_warnings.extend(_validate_signal_warnings(sig, block.index, si))
        if isinstance(data, dict) and data.get("kind"):
            found_kinds.add(data["kind"])
    relax_sections = "fixtures" in md_path.parts
    if blocks and not relax_sections:
        for sid in signal_section_ids:
            if sid == "bigtech":
                continue
            kinds_for_section = [
                k for k, v in schema.get("kinds", {}).items() if v.get("section_h2_id") == sid
            ]
            if kinds_for_section and not any(k in found_kinds for k in kinds_for_section):
                all_errors.append(f"缺少信号节 JSON 块（期望 kind: {kinds_for_section[0]}）")
        if "bigtech" not in found_kinds:
            all_errors.append("缺少信号节 JSON 块（期望 kind: bigtech，4.1/4.2 各一块）")
    return all_errors, all_warnings, blocks


def format_errors_for_agent(errors: list[str], md_path: Path, blocks: list[JsonBlock]) -> str:
    lines = [
        f"文件: {md_path}",
        "请仅修复下列 JSON 代码块（```json ... ```），不要修改深读/判断/跟进等 Markdown 章节。",
        "",
        "错误列表:",
    ]
    lines.extend(f"- {e}" for e in errors)
    lines.append("")
    for block in blocks:
        if block.raw:
            preview = block.raw[:500] + ("..." if len(block.raw) > 500 else "")
            lines.append(f"--- 块 {block.index}（{block.heading}）行 {block.start_line + 1} ---")
            lines.append(preview)
            lines.append("")
    return "\n".join(lines)
