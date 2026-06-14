#!/usr/bin/env bash
# 将 AI ECharts 安装到 Vault 的 .obsidian/plugins/，并下载 Apache ECharts 运行时
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT="${VAULT:-$REPO_ROOT}"
DEST="$VAULT/.obsidian/plugins/ai-echarts"
ECHARTS_VERSION="${ECHARTS_VERSION:-5.6.0}"
ECHARTS_URL="https://cdn.jsdelivr.net/npm/echarts@${ECHARTS_VERSION}/dist/echarts.min.js"

mkdir -p "$DEST"
cp "$SCRIPT_DIR/manifest.json" "$SCRIPT_DIR/main.js" "$SCRIPT_DIR/styles.css" "$DEST/"
touch "$DEST/.hotreload"

if [[ ! -f "$DEST/echarts.min.js" ]] || [[ "${FORCE_ECHARTS:-0}" == "1" ]]; then
  echo "Downloading echarts@${ECHARTS_VERSION} ..."
  curl -fsSL "$ECHARTS_URL" -o "$DEST/echarts.min.js"
else
  echo "echarts.min.js already present (set FORCE_ECHARTS=1 to re-download)"
fi

COMMUNITY="$VAULT/.obsidian/community-plugins.json"
PLUGIN_ID="ai-echarts"

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
echo "Next: Obsidian → Settings → Community plugins → enable AI ECharts"
echo "Reload: Cmd+P →「ECharts: 重新加载本插件」"
