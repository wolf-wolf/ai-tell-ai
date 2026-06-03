#!/usr/bin/env bash
# 趋势日报：并行 research 子 Agent → 汇总 Agent → crosscheck → repair → validate → HTML
# 用法:
#   ./scripts/generate-trends.sh
#   FORCE=1 ./scripts/generate-trends.sh 2026-06-02
#   PARALLEL_SEARCH=0 ./scripts/generate-trends.sh
#   HTML_ONLY=1 ./scripts/generate-trends.sh 2026-06-02
#   CROSSCHECK=0 ./scripts/generate-trends.sh
#   FIX_JSON=0 ./scripts/generate-trends.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TRENDS_DIR="${REPO_ROOT}/trends"
PROMPT_FILE="${TRENDS_DIR}/prompts/daily-generate.prompt.md"
FIX_PROMPT_FILE="${TRENDS_DIR}/prompts/fix-json.prompt.md"
SEARCH_DIR="${TRENDS_DIR}/prompts/search"
SHARED_RULES_FILE="${SEARCH_DIR}/_shared-research-rules.md"
RENDER_PY="${SCRIPT_DIR}/render-trend-html.py"
REPAIR_PY="${SCRIPT_DIR}/repair-trends-json.py"
VALIDATE_PY="${SCRIPT_DIR}/validate-trends-md.py"
CROSSCHECK_PY="${SCRIPT_DIR}/crosscheck-trends.py"
SPINE_PY="${SCRIPT_DIR}/spine-snapshot.py"
LOG_DIR="${TRENDS_DIR}/.logs"

DATE_ARG="${1:-}"
DATE="${DATE_ARG:-$(date +%Y-%m-%d)}"
OUT_DIR="${TRENDS_DIR}/${DATE}"
OUT_FILE="${OUT_DIR}/index.md"
OUT_HTML="${OUT_DIR}/index.html"
RESEARCH_DIR="${OUT_DIR}/.research"
STATUS_FILE="${RESEARCH_DIR}/_status.json"
SPINE_SNAP="${OUT_DIR}/.spine-snapshot.json"
FORCE="${FORCE:-0}"
DRY_RUN="${DRY_RUN:-0}"
HTML_ONLY="${HTML_ONLY:-0}"
FIX_JSON="${FIX_JSON:-1}"
PARALLEL_SEARCH="${PARALLEL_SEARCH:-1}"
CROSSCHECK="${CROSSCHECK:-1}"

SEARCH_KINDS=(github-growth github-novel huggingface bigtech papers)

export PATH="/usr/local/bin:/opt/homebrew/bin:${PATH:-/usr/bin:/bin:/usr/sbin:/sbin}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "${LOG_FILE}"
}

die() {
  log "ERROR: $*"
  exit 1
}

validate_date_arg() {
  if [[ -n "${DATE_ARG}" && "${DATE_ARG}" == -* ]]; then
    die "无效日期参数「${DATE_ARG}」"
  fi
  if ! [[ "${DATE}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    die "无效日期格式「${DATE}」，应为 YYYY-MM-DD"
  fi
}

render_html() {
  [[ -f "${RENDER_PY}" ]] || die "缺少 ${RENDER_PY}"
  python3 "${RENDER_PY}" "${OUT_FILE}"
  [[ -f "${OUT_HTML}" ]] || die "HTML 生成失败: ${OUT_HTML}"
  log "HTML: ${OUT_HTML}"
}

run_crosscheck() {
  if [[ "${CROSSCHECK}" != "1" ]]; then
    log "CROSSCHECK=0：跳过交叉校验"
    return 0
  fi
  python3 "${CROSSCHECK_PY}" "${OUT_FILE}"
}

run_json_pipeline() {
  [[ -f "${OUT_FILE}" ]] || die "缺少 ${OUT_FILE}"
  run_crosscheck
  python3 "${REPAIR_PY}" "${OUT_FILE}"
  if python3 "${VALIDATE_PY}" "${OUT_FILE}"; then
    return 0
  fi
  if [[ "${FIX_JSON}" != "1" ]]; then
    die "JSON 校验失败，且 FIX_JSON=0。见 trends/.logs/validate-${DATE}.log"
  fi
  [[ -f "${FIX_PROMPT_FILE}" ]] || die "缺少 ${FIX_PROMPT_FILE}"
  local err_file="${LOG_DIR}/validate-${DATE}.log"
  local errors=""
  if [[ -f "${err_file}" ]]; then
    errors="$(cat "${err_file}")"
  fi
  python3 "${SPINE_PY}" save "${OUT_FILE}" "${SPINE_SNAP}"
  local fix_body
  fix_body="$(sed -e "s/{{DATE}}/${DATE}/g" "${FIX_PROMPT_FILE}")"
  fix_body="${fix_body//\{\{VALIDATE_ERRORS\}\}/${errors}}"
  log "JSON 校验未通过，启动 fix-json Agent（最多 1 次）"
  local fix_log="${LOG_DIR}/agent-fix-json-${DATE}.log"
  set +e
  "${CURSOR_BIN}" agent -p "${fix_body}" \
    --print \
    --output-format text \
    --force \
    --trust \
    --workspace "${REPO_ROOT}" \
    2>&1 | tee -a "${fix_log}"
  local fix_exit=${PIPESTATUS[0]}
  set -e
  if [[ "${fix_exit}" -ne 0 ]]; then
    die "fix-json agent 退出码 ${fix_exit}，详见 ${fix_log}"
  fi
  python3 "${SPINE_PY}" check "${OUT_FILE}" "${SPINE_SNAP}" || die "fix-json 修改了 spine 字段，见 ${fix_log}"
  rm -f "${SPINE_SNAP}"
  python3 "${REPAIR_PY}" "${OUT_FILE}"
  run_crosscheck
  python3 "${VALIDATE_PY}" "${OUT_FILE}" || die "fix-json 后仍校验失败，见 ${err_file}"
}

write_search_status() {
  local kind="$1"
  local status="$2"
  mkdir -p "${RESEARCH_DIR}"
  python3 - "${STATUS_FILE}" "${kind}" "${status}" <<'PY'
import json, sys
from pathlib import Path
path = Path(sys.argv[1])
kind, status = sys.argv[2], sys.argv[3]
data = {}
if path.is_file():
    data = json.loads(path.read_text(encoding="utf-8"))
data[kind] = status
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
}

build_search_prompt() {
  local kind="$1"
  local prompt_file="${SEARCH_DIR}/${kind}.prompt.md"
  [[ -f "${prompt_file}" ]] || die "缺少 ${prompt_file}"
  [[ -f "${SHARED_RULES_FILE}" ]] || die "缺少 ${SHARED_RULES_FILE}"
  local shared
  shared="$(sed -e "s/{{DATE}}/${DATE}/g" -e "s/{{KIND}}/${kind}/g" "${SHARED_RULES_FILE}")"
  local body
  body="$(sed -e "s/{{DATE}}/${DATE}/g" -e "s/{{KIND}}/${kind}/g" "${prompt_file}")"
  body="${body//\{\{SHARED_RULES\}\}/${shared}}"
  printf '%s' "${body}"
}

run_search_agent() {
  local kind="$1"
  local out_file="${RESEARCH_DIR}/${kind}.md"
  local log_file="${LOG_DIR}/search-${kind}-${DATE}.log"
  local prompt_body
  prompt_body="$(build_search_prompt "${kind}")"
  log "检索子 Agent 开始: ${kind} → ${out_file}"
  set +e
  "${CURSOR_BIN}" agent -p "${prompt_body}" \
    --print \
    --output-format text \
    --force \
    --trust \
    --workspace "${REPO_ROOT}" \
    2>&1 | tee -a "${log_file}"
  local exit_code=${PIPESTATUS[0]}
  set -e
  if [[ "${exit_code}" -ne 0 ]]; then
    log "WARN: search agent ${kind} 失败（exit ${exit_code}），见 ${log_file}"
    write_search_status "${kind}" "failed"
    return 1
  fi
  if [[ ! -s "${out_file}" ]]; then
    log "WARN: search agent ${kind} 未写入 ${out_file}"
    write_search_status "${kind}" "failed"
    return 1
  fi
  write_search_status "${kind}" "ok"
  log "检索完成: ${out_file}"
  return 0
}

run_parallel_research() {
  mkdir -p "${RESEARCH_DIR}"
  local pids=()
  local kinds_started=()
  local kind
  for kind in "${SEARCH_KINDS[@]}"; do
    run_search_agent "${kind}" &
    pids+=("$!")
    kinds_started+=("${kind}")
  done
  local failed=0
  local ok=0
  local i=0
  for pid in "${pids[@]}"; do
    if wait "${pid}"; then
      ok=$((ok + 1))
    else
      failed=$((failed + 1))
      log "检索失败: ${kinds_started[$i]}"
    fi
    i=$((i + 1))
  done
  if [[ "${ok}" -eq 0 ]]; then
    die "全部 research 子 Agent 失败，见 ${LOG_DIR}/search-*-${DATE}.log"
  fi
  log "并行检索完成：${ok} 成功，${failed} 失败"
}

require_research_files() {
  local ok_count=0
  local kind
  for kind in "${SEARCH_KINDS[@]}"; do
    if [[ -s "${RESEARCH_DIR}/${kind}.md" ]]; then
      ok_count=$((ok_count + 1))
    else
      log "缺少或空 research: ${RESEARCH_DIR}/${kind}.md"
    fi
  done
  if [[ "${ok_count}" -lt 1 ]]; then
    die "无任何 research 底稿。设 PARALLEL_SEARCH=1 重新生成"
  fi
  if [[ "${ok_count}" -lt 3 ]]; then
    log "WARN: 仅 ${ok_count}/5 个 kind 有 research，汇总 Agent 不得编造缺失维度"
  fi
}

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/generate-${DATE}.log"
validate_date_arg

if [[ "${HTML_ONLY}" == "1" ]]; then
  [[ -f "${OUT_FILE}" ]] || die "缺少 ${OUT_FILE}"
  run_json_pipeline
  render_html
  exit 0
fi

if [[ ! -f "${PROMPT_FILE}" ]]; then
  die "缺少提示词文件: ${PROMPT_FILE}"
fi

CURSOR_BIN=""
for candidate in cursor "${HOME}/.local/bin/cursor" "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"; do
  if command -v "${candidate}" >/dev/null 2>&1; then
    CURSOR_BIN="$(command -v "${candidate}")"
    break
  fi
done
[[ -n "${CURSOR_BIN}" ]] || die "未找到 cursor CLI"

if ! "${CURSOR_BIN}" agent status >/dev/null 2>&1; then
  die "Cursor Agent 未登录。请先执行: cursor agent login"
fi

if [[ -f "${OUT_FILE}" && "${FORCE}" != "1" ]]; then
  log "已存在 ${OUT_FILE}，跳过（FORCE=1 可强制）"
  run_json_pipeline
  [[ -f "${OUT_HTML}" ]] || render_html
  exit 0
fi

if [[ "${FORCE}" == "1" && -d "${OUT_DIR}" ]]; then
  log "FORCE=1：删除 ${OUT_DIR}/"
  rm -rf "${OUT_DIR}"
fi

mkdir -p "${OUT_DIR}"

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN: 将运行 ${#SEARCH_KINDS[@]} 个 search agent + 1 个汇总 agent"
  exit 0
fi

if [[ "${PARALLEL_SEARCH}" == "1" ]]; then
  run_parallel_research
else
  log "PARALLEL_SEARCH=0：跳过检索子 Agent"
fi

require_research_files

PROMPT_BODY="$(sed "s/{{DATE}}/${DATE}/g" "${PROMPT_FILE}")"
log "汇总 Agent 开始 → ${OUT_FILE}"
AGENT_LOG="${LOG_DIR}/agent-synthesize-${DATE}.log"
set +e
"${CURSOR_BIN}" agent -p "${PROMPT_BODY}" \
  --print \
  --output-format text \
  --force \
  --trust \
  --workspace "${REPO_ROOT}" \
  2>&1 | tee -a "${AGENT_LOG}"
AGENT_EXIT=${PIPESTATUS[0]}
set -e

if [[ "${AGENT_EXIT}" -ne 0 ]]; then
  die "汇总 agent 退出码 ${AGENT_EXIT}，详见 ${AGENT_LOG}"
fi

if [[ ! -f "${OUT_FILE}" ]]; then
  die "汇总 Agent 结束但未找到 ${OUT_FILE}"
fi

run_json_pipeline
render_html
log "完成: ${OUT_FILE} + ${OUT_HTML}"
