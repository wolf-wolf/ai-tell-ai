#!/usr/bin/env bash
# 打开系统「隐私与安全性」并说明定时任务需要的权限
# 用法: ./scripts/grant-trends-permissions.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_SUPPORT="${HOME}/Library/Application Support/ai-tell-ai"

CURSOR_APP="/Applications/Cursor.app"
CURSOR_CLI=""
for candidate in cursor "${HOME}/.local/bin/cursor" "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"; do
  if command -v "${candidate}" >/dev/null 2>&1; then
    CURSOR_CLI="$(command -v "${candidate}")"
    break
  fi
done

open_privacy() {
  local url="$1"
  if open "${url}" 2>/dev/null; then
    return 0
  fi
  return 1
}

echo "=== AI 趋势日报 · 权限设置 ==="
echo ""
echo "仓库路径: ${REPO_ROOT}"
echo "定时入口: ${APP_SUPPORT}/launchd-run.sh"
echo ""
echo "若仓库在 Desktop，launchd 后台任务需要下列权限（建议全部添加）："
echo ""
echo "1. 完全磁盘访问权限（Full Disk Access）"
echo ""
echo "   说明：点「+」弹窗里通常没有「前往文件夹」(Cmd+Shift+G)，"
echo "   请用下面「拖入」或「选 .app」方式，不要依赖 + 里的快捷键。"
echo ""
echo "   方式 A — 拖入 osascript（推荐）"
echo "     1) 保持本说明与「隐私」窗口都打开"
echo "     2) 执行后会自动在 Finder 里定位 osascript，把它拖到权限列表里"
echo "     3) 若拖不进去，改用方式 B"
echo ""
echo "   方式 B — 添加系统自带 App（与定时任务等价）"
echo "     在 + 弹窗左侧选「应用程序」→「实用工具」，勾选："
echo "       · 脚本编辑器 (Script Editor)"
echo "       · 终端 (Terminal)"
echo "     或从应用程序文件夹拖入 Cursor（你已添加可跳过）"
echo ""
if [[ -n "${CURSOR_CLI}" ]]; then
  echo "   可选 CLI: ${CURSOR_CLI}"
fi
if [[ -d "${CURSOR_APP}" ]]; then
  echo "   可选: ${CURSOR_APP}"
fi
echo ""
echo "2. 文件与文件夹 → 桌面（若有该项）"
echo "   为「脚本编辑器」或「终端」打开「桌面文件夹」"
echo ""
echo "3. 首次定时运行若弹出访问提示，请选择「允许」"
echo ""

if [[ -x /usr/bin/osascript ]]; then
  echo "正在 Finder 中定位 osascript，请拖到「完全磁盘访问权限」列表…"
  open -R /usr/bin/osascript 2>/dev/null || open /usr/bin
  sleep 1
fi

echo "正在打开「隐私与安全性」…"
if ! open_privacy "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles"; then
  open_privacy "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles" \
    || open "x-apple.systempreferences:com.apple.preference.security" \
    || true
fi

sleep 0.8
open_privacy "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_FilesAndFolders" \
  || true

echo ""
echo "添加完成后，可试跑定时入口（约 3–8 分钟，会调 Cursor Agent）："
echo "  ${APP_SUPPORT}/launchd-run.sh"
echo ""
echo "查看日志:"
echo "  tail -f ${REPO_ROOT}/trends/.logs/launchd-osascript.log"
echo "  tail -f ${REPO_ROOT}/trends/.logs/launchd-stderr.log"
