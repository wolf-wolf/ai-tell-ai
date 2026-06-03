#!/usr/bin/env python3
"""修复 trends/index.md 内 JSON 代码块的语法问题并写回。"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from trends_json_utils import extract_json_blocks, parse_block_raw, repair_json_text, replace_block_in_md


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: repair-trends-json.py <trends/YYYY-MM-DD/index.md>", file=sys.stderr)
        return 1
    md_path = Path(sys.argv[1]).resolve()
    if not md_path.is_file():
        print(f"ERROR: 不存在 {md_path}", file=sys.stderr)
        return 1

    md_text = md_path.read_text(encoding="utf-8")
    blocks = extract_json_blocks(md_text)
    log_dir = md_path.parent.parent / ".logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    date = md_path.parent.name
    log_path = log_dir / f"repair-{date}.log"
    log_lines = [f"[{datetime.now().isoformat(timespec='seconds')}] repair {md_path}"]

    changed = False
    for block in reversed(blocks):
        try:
            parse_block_raw(block.raw)
            log_lines.append(f"块 {block.index}（{block.heading}）：OK，无需修复")
            continue
        except json.JSONDecodeError:
            pass
        repaired, actions = repair_json_text(block.raw)
        try:
            parse_block_raw(repaired)
        except json.JSONDecodeError as exc:
            log_lines.append(
                f"块 {block.index}（{block.heading}）：程序修复后仍无法解析 — {exc}"
            )
            continue
        if repaired != block.raw:
            md_text = replace_block_in_md(md_text, block, repaired)
            changed = True
            log_lines.append(
                f"块 {block.index}（{block.heading}）：已修复 ({', '.join(actions)})"
            )
        else:
            log_lines.append(f"块 {block.index}（{block.heading}）：未变更")

    if changed:
        md_path.write_text(md_text, encoding="utf-8")
        log_lines.append("已写回 index.md")
    else:
        log_lines.append("无写回")

    log_path.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
    print(f"repair log: {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
