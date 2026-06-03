#!/usr/bin/env bash
set -euo pipefail

LABEL="com.ai-tell-ai.trends"
PLIST_DST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
APP_SUPPORT="${HOME}/Library/Application Support/ai-tell-ai"

if [[ -f "${PLIST_DST}" ]]; then
  launchctl bootout "gui/$(id -u)" "${PLIST_DST}" 2>/dev/null || true
  rm -f "${PLIST_DST}"
  echo "已卸载 ${LABEL}"
else
  echo "未找到 ${PLIST_DST}"
fi

if [[ -d "${APP_SUPPORT}" ]]; then
  rm -f "${APP_SUPPORT}/launchd-run.sh" "${APP_SUPPORT}/run-trends.applescript"
  rmdir "${APP_SUPPORT}" 2>/dev/null || true
  echo "已移除 ${APP_SUPPORT}/ 下的定时入口文件"
fi
