#!/usr/bin/env python3
"""校验 trends/index.md 内信号 JSON 是否符合 daily-signals.v1 契约。"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from trends_json_utils import format_errors_for_agent, validate_md_file


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: validate-trends-md.py <trends/YYYY-MM-DD/index.md>", file=sys.stderr)
        return 1
    md_path = Path(sys.argv[1]).resolve()
    if not md_path.is_file():
        print(f"ERROR: 不存在 {md_path}", file=sys.stderr)
        return 1

    errors, warnings, blocks = validate_md_file(md_path)
    log_dir = md_path.parent.parent / ".logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    date = md_path.parent.name
    log_path = log_dir / f"validate-{date}.log"

    if errors:
        report = format_errors_for_agent(errors, md_path, blocks)
        log_path.write_text(
            f"[{datetime.now().isoformat(timespec='seconds')}] FAILED\n{report}\n",
            encoding="utf-8",
        )
        print(report, file=sys.stderr)
        print(f"validate log: {log_path}", file=sys.stderr)
        return 1

    log_body = f"[{datetime.now().isoformat(timespec='seconds')}] OK {md_path}\n"
    if warnings:
        log_body += "WARNINGS:\n" + "\n".join(f"- {w}" for w in warnings) + "\n"
        for w in warnings:
            print(f"WARN: {w}", file=sys.stderr)
    log_path.write_text(log_body, encoding="utf-8")
    print(f"OK: {md_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
