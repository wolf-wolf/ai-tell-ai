#!/usr/bin/env bash
# 安装 macOS launchd：每天 08:00 运行 generate-trends.sh
# 用法: ./scripts/install-trends-schedule.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PLIST_SRC="${SCRIPT_DIR}/launchd/com.ai-tell-ai.trends.plist"
APPLESCRIPT_TMPL="${SCRIPT_DIR}/launchd/run-trends.applescript.template"
LAUNCHER_TMPL="${SCRIPT_DIR}/launchd/launchd-run.sh.template"
PLIST_DST="${HOME}/Library/LaunchAgents/com.ai-tell-ai.trends.plist"
LABEL="com.ai-tell-ai.trends"
GENERATE_SH="${REPO_ROOT}/scripts/generate-trends.sh"
GRANT_SH="${SCRIPT_DIR}/grant-trends-permissions.sh"
APP_SUPPORT="${HOME}/Library/Application Support/ai-tell-ai"

[[ -f "${PLIST_SRC}" ]] || { echo "缺少 ${PLIST_SRC}"; exit 1; }
[[ -f "${APPLESCRIPT_TMPL}" ]] || { echo "缺少 ${APPLESCRIPT_TMPL}"; exit 1; }
[[ -f "${LAUNCHER_TMPL}" ]] || { echo "缺少 ${LAUNCHER_TMPL}"; exit 1; }

chmod +x "${GENERATE_SH}" "${GRANT_SH}"

mkdir -p "${REPO_ROOT}/trends/.logs"
mkdir -p "${HOME}/Library/LaunchAgents"
mkdir -p "${APP_SUPPORT}"

# 安装到 Application Support，避免 launchd 直接执行 Desktop 路径
sed -e "s|@REPO_ROOT@|${REPO_ROOT}|g" "${APPLESCRIPT_TMPL}" > "${APP_SUPPORT}/run-trends.applescript"
sed -e "s|@APP_SUPPORT@|${APP_SUPPORT}|g" "${LAUNCHER_TMPL}" > "${APP_SUPPORT}/launchd-run.sh"
chmod +x "${APP_SUPPORT}/launchd-run.sh"

if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)" "${PLIST_DST}" 2>/dev/null || true
fi

sed -e "s|@REPO_ROOT@|${REPO_ROOT}|g" \
    -e "s|@HOME@|${HOME}|g" \
    -e "s|@APP_SUPPORT@|${APP_SUPPORT}|g" \
    "${PLIST_SRC}" > "${PLIST_DST}"

launchctl bootstrap "gui/$(id -u)" "${PLIST_DST}"

echo "已安装定时任务: ${LABEL}"
echo "  plist: ${PLIST_DST}"
echo "  定时入口: ${APP_SUPPORT}/launchd-run.sh"
echo "  实际脚本: ${GENERATE_SH}"
echo "  时间: 每天 08:00（本机时区）"
echo ""
echo "── 下一步：授予权限（仓库在 Desktop 时必须）──"
"${GRANT_SH}"
echo ""
echo "权限完成后试跑: ${APP_SUPPORT}/launchd-run.sh"
echo "卸载: ${SCRIPT_DIR}/uninstall-trends-schedule.sh"
