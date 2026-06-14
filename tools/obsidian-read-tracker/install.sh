#!/usr/bin/env bash
# 将 AI Read Tracker 安装到当前仓库 Vault 的 .obsidian/plugins/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT="${VAULT:-$REPO_ROOT}"
DEST="$VAULT/.obsidian/plugins/ai-read-tracker"

mkdir -p "$DEST"

# Obsidian 无法可靠加载 require('./coverage-graph.js')，安装时合并为单文件 main.js
python3 - "$SCRIPT_DIR" "$DEST" <<'PY'
import re
import sys
from pathlib import Path

script_dir = Path(sys.argv[1])
dest = Path(sys.argv[2])
main_path = script_dir / "main.js"
cov_path = script_dir / "coverage-graph.js"

main = main_path.read_text(encoding="utf-8")
cov = cov_path.read_text(encoding="utf-8")
cov = re.sub(r"// coverage-graph\.js[^\n]*\n\s*", "", cov, count=1)
cov = re.sub(
    r'const \{ ItemView, TFile \} = require\("obsidian"\);\s*\n',
    "",
    cov,
    count=1,
)
cov = re.sub(r"\nmodule\.exports\s*=\s*\{[\s\S]*\}\s*;\s*$", "\n", cov)

marker = 'const VIEW_TYPE = "ai-read-tracker-dashboard";'
if marker not in main:
    raise SystemExit("install bundle: marker missing in main.js")

bundled = main.replace(marker, cov + marker, 1)
(dest / "main.js").write_text(bundled, encoding="utf-8")
print("Bundled coverage-graph.js into main.js")
PY

cp "$SCRIPT_DIR/manifest.json" "$DEST/"
if [[ -f "$SCRIPT_DIR/styles.css" ]]; then
  cp "$SCRIPT_DIR/styles.css" "$DEST/"
fi
# 若安装了社区插件 Hot Reload，会自动监视并热重载
touch "$DEST/.hotreload"

COMMUNITY="$VAULT/.obsidian/community-plugins.json"
PLUGIN_ID="ai-read-tracker"

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
    echo "Tip: add \"ai-read-tracker\" to $COMMUNITY and enable in Settings."
  fi
else
  echo "Tip: create $COMMUNITY with [\"ai-read-tracker\"] if needed."
fi

echo ""
echo "Installed to: $DEST"
echo "Next: Obsidian → Settings → Community plugins → turn off Restricted mode → enable AI Read Tracker"
echo "Apply updates (pick one):"
echo "  1. Cmd+P →「Read Tracker: 重新加载本插件」"
echo "  2. Settings → Community plugins → disable & enable AI Read Tracker"
echo "  3. Cmd+P →「Reload app without saving」（需在 设置→快捷键 自行绑定，默认无 Cmd+R）"
