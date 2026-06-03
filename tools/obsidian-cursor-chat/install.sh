#!/usr/bin/env bash
# 将 AI Cursor Chat 安装到当前仓库 Vault 的 .obsidian/plugins/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT="${VAULT:-$REPO_ROOT}"
DEST="$VAULT/.obsidian/plugins/ai-cursor-chat"

mkdir -p "$DEST"
# 单文件 main.js（Obsidian 对 require('./acp-client') 常加载失败）
cp "$SCRIPT_DIR/manifest.json" "$SCRIPT_DIR/main.js" "$DEST/"
if [[ -f "$SCRIPT_DIR/styles.css" ]]; then
  cp "$SCRIPT_DIR/styles.css" "$DEST/"
fi
touch "$DEST/.hotreload"

COMMUNITY="$VAULT/.obsidian/community-plugins.json"
PLUGIN_ID="ai-cursor-chat"

if [[ -f "$COMMUNITY" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$COMMUNITY" "$PLUGIN_ID" <<'PY'
import json, sys
path, pid = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
if pid not in data:
    data.append(pid)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"Added {pid} to community-plugins.json")
else:
    print(f"{pid} already in community-plugins.json")
PY
  else
    echo "Tip: add \"ai-cursor-chat\" to $COMMUNITY and enable in Settings."
  fi
else
  echo "Tip: create $COMMUNITY with [\"ai-cursor-chat\"] if needed."
fi

echo ""
echo "Installed to: $DEST"
echo "Prerequisites:"
echo "  - Cursor Agent CLI: ~/.local/bin/agent (or set path in plugin settings)"
echo "  - agent login"
echo ""
echo "Next: Obsidian → Settings → Community plugins → enable AI Cursor Chat"
echo "Apply updates:"
echo "  1. Cmd+P →「Cursor Chat: 重新加载本插件」"
echo "  2. Settings → Community plugins → disable & enable AI Cursor Chat"
