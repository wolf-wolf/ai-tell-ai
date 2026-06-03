#!/usr/bin/env python3
"""对 index.md JSON 块 spine 字段做快照或比对（fix-json 护栏）。"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from trends_json_utils import extract_json_blocks, load_schema, parse_block_raw

SPINE_KEYS = ("title", "entity", "url", "metric", "event", "signal", "signal_type", "hook", "body", "action")


def spine_digest(sig: dict) -> str:
    parts: list[str] = []
    for key in SPINE_KEYS:
        if key in sig:
            val = sig[key]
            if isinstance(val, (dict, list)):
                parts.append(json.dumps(val, ensure_ascii=False, sort_keys=True))
            else:
                parts.append(str(val))
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]


def snapshot_md(md_path: Path) -> dict[int, list[str]]:
    md_text = md_path.read_text(encoding="utf-8")
    blocks = extract_json_blocks(md_text)
    out: dict[int, list[str]] = {}
    for block in blocks:
        try:
            data = parse_block_raw(block.raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, dict):
            continue
        signals = data.get("signals", [])
        if not isinstance(signals, list):
            continue
        out[block.index] = [spine_digest(s) for s in signals if isinstance(s, dict)]
    return out


def main() -> int:
    if len(sys.argv) < 3:
        print("用法: spine-snapshot.py save|check <index.md> [snapshot.json]", file=sys.stderr)
        return 1
    cmd = sys.argv[1]
    md_path = Path(sys.argv[2]).resolve()
    snap_path = Path(sys.argv[3]) if len(sys.argv) > 3 else md_path.parent / ".spine-snapshot.json"

    if cmd == "save":
        snap = snapshot_md(md_path)
        snap_path.write_text(json.dumps(snap, indent=2), encoding="utf-8")
        print(f"saved: {snap_path}")
        return 0

    if cmd == "check":
        if not snap_path.is_file():
            print(f"ERROR: 缺少快照 {snap_path}", file=sys.stderr)
            return 1
        before = json.loads(snap_path.read_text(encoding="utf-8"))
        after = snapshot_md(md_path)
        before_map = {int(k): v for k, v in before.items()}
        for idx, digests in after.items():
            if idx not in before_map:
                continue
            if digests != before_map[idx]:
                print(
                    f"ERROR: 块 {idx} spine 字段被 fix-json 修改（禁止改 title/url/metric/hook/body/action）",
                    file=sys.stderr,
                )
                return 1
        print("OK: spine 未变")
        return 0

    print(f"未知命令: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
