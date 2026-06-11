#!/usr/bin/env bash
# 将 AI LaTeX Math 安装到当前仓库 Vault 的 .obsidian/plugins/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT="${VAULT:-$REPO_ROOT}"
DEST="$VAULT/.obsidian/plugins/ai-latex-math"

mkdir -p "$DEST"
cp "$SCRIPT_DIR/manifest.json" "$SCRIPT_DIR/main.js" "$SCRIPT_DIR/styles.css" "$DEST/"
touch "$DEST/.hotreload"

COMMUNITY="$VAULT/.obsidian/community-plugins.json"
PLUGIN_ID="ai-latex-math"

if [[ -f "$COMMUNITY" ]] && command -v python3 >/dev/null 2>&1; then
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
fi

echo ""
echo "Installed to: $DEST"
echo "Next: Obsidian → Settings → Community plugins → enable AI LaTeX Math"
echo "Reload: Cmd+P →「LaTeX Math: 重新加载本插件」"
