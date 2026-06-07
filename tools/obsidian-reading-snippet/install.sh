#!/usr/bin/env bash
# 将正文阅读排版 CSS snippet 安装到 Vault 的 .obsidian/snippets/ 并尝试自动启用
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAULT="${VAULT:-$REPO_ROOT}"
SNIPPETS_DIR="$VAULT/.obsidian/snippets"
SNIPPET_FILE="ai-reading.css"
DEST="$SNIPPETS_DIR/$SNIPPET_FILE"
SNIPPET_ID="${SNIPPET_FILE%.css}"

mkdir -p "$SNIPPETS_DIR"
cp "$SCRIPT_DIR/reading.css" "$DEST"

APPEARANCE="$VAULT/.obsidian/appearance.json"
if [[ -f "$APPEARANCE" ]] && command -v python3 >/dev/null 2>&1; then
  python3 - "$APPEARANCE" "$SNIPPET_ID" <<'PY'
import json, sys
path, snippet_id = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
enabled = data.setdefault("enabledCssSnippets", [])
if snippet_id not in enabled:
    enabled.append(snippet_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Enabled snippet: {snippet_id}")
else:
    print(f"Snippet already enabled: {snippet_id}")
PY
else
  echo "Tip: enable manually in Settings → Appearance → CSS snippets → ai-reading"
fi

echo ""
echo "Installed to: $DEST"
echo "Next: Obsidian → Settings → Appearance → CSS snippets → reload → enable ai-reading"
