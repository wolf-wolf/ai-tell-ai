---
tags: [trends, index]
aliases:
  - AI 趋势洞察
  - trends
updated: 2026-06-03
---

# AI 趋势日报（trends/）

> **用途**：每日采集 **GitHub 增速与新颖探索**、**HuggingFace**、**大公司（中英文）**、**论文**、**社区讨论** 等可验证信号，沉淀为按日归档的观测日志。  
> **与 `docs/latest/`**：本目录是短时效日志（`stability: short`）；同一主题连续 ≥2 天且边界清晰时，再升格为知识节点。

---

## 目录约定

```
trends/
  README.md
  schema/daily-signals.v1.json   ← 信号 JSON 契约
  fixtures/                      ← repair/validate/render 自检
  YYYY-MM-DD/
    index.md             ← Agent 写入（信号区为 ```json 块）
    index.html           ← 脚本自动生成（**日常阅读面**）
  weekly/
    YYYY-Www.md          ← 周报（可选）
  prompts/
    daily-generate.prompt.md
    fix-json.prompt.md
  .logs/                 ← repair / validate / agent 日志（gitignore）
```

```bash
mkdir -p trends/$(date +%Y-%m-%d)
cp templates/template-trend-daily.md trends/$(date +%Y-%m-%d)/index.md

# 从已有 md 仅生成 HTML
HTML_ONLY=1 ./scripts/generate-trends.sh $(date +%Y-%m-%d)

# 浏览器打开
open trends/$(date +%Y-%m-%d)/index.html
```

---

## 本地定时自动生成（macOS + Cursor CLI）

前提：Cursor CLI、`cursor agent login` 已完成。

```bash
chmod +x scripts/generate-trends.sh scripts/install-trends-schedule.sh
./scripts/generate-trends.sh              # 今天
./scripts/install-trends-schedule.sh      # 每天 08:00（会引导授权）
./scripts/grant-trends-permissions.sh     # 仅打开权限设置说明
./scripts/uninstall-trends-schedule.sh    # 卸载
```

**仓库在 Desktop 时**：安装后按提示为 `osascript`、`zsh`、`Cursor` 开启「完全磁盘访问权限」；定时任务经 `~/Library/Application Support/ai-tell-ai/launchd-run.sh` 在用户会话下执行，避免 launchd 直接访问 Desktop 被拒。日志：`trends/.logs/launchd-osascript.log`。

| 文件 | 作用 |
|------|------|
| [`scripts/generate-trends.sh`](../scripts/generate-trends.sh) | 5 路检索 → 汇总 → **crosscheck** → repair → validate → HTML |
| [`scripts/crosscheck-trends.py`](../scripts/crosscheck-trends.py) | research↔JSON 交叉校验；无根信号剔除（`drop_warn`） |
| [`scripts/spine-snapshot.py`](../scripts/spine-snapshot.py) | fix-json 前后 spine 字段护栏 |
| [`scripts/repair-trends-json.py`](../scripts/repair-trends-json.py) | 程序修复 JSON 围栏语法 |
| [`scripts/validate-trends-md.py`](../scripts/validate-trends-md.py) | 契约校验（失败 exit 1） |
| [`scripts/render-trend-html.py`](../scripts/render-trend-html.py) | md → HTML（JSON 卡片 + 旧表格 fallback） |
| [`scripts/trends-check.sh`](../scripts/trends-check.sh) | 本地自检（fixtures + 可选归档日） |
| `prompts/daily-generate.prompt.md` | 日报 Agent（JSON envelope + golden 样例） |
| `prompts/fix-json.prompt.md` | 校验失败时仅修 JSON 块（最多 1 次） |
| [`scripts/launchd/com.ai-tell-ai.trends.plist`](../scripts/launchd/com.ai-tell-ai.trends.plist) | launchd 模板 |

**信号区格式（v2）**：`body` 为 **Markdown 字符串**（不再使用 `mechanism/trigger/diff` 等固定键）。见 [`schema/daily-signals.v1.json`](schema/daily-signals.v1.json)。

**生成流水线**：

1. **5 路并行检索**（`prompts/search/*.prompt.md`）→ `.research/{kind}.md` + `_status.json`（`ok`/`failed`）
2. **汇总 Agent** 只写 research 中有 URL 的条目，带 `source_confidence`
3. **crosscheck** → repair → validate →（可选）fix-json → HTML

**交叉校验（drop_warn）**：URL 不在底稿 / 低置信 / metric 对不上 → **剔除该 signal** 并写 `crosscheck-{DATE}.log`；某 JSON 块剔除后低于 `min_signals` → exit 1。

**JSON 质量**：prompt → repair → validate → fix-json（仅语法，spine 护栏）→ 否则 exit 1。

环境变量：`FORCE=1` 强制重做；`PARALLEL_SEARCH=0` 跳过检索；`CROSSCHECK=0` 跳过交叉校验；`HTML_ONLY=1` 仅渲染（无 `.research` 时自动 skip crosscheck）；`FIX_JSON=0` 跳过 fix-json。

---

## 每日 SOP（约 15–25 分钟阅读产出）

| 维度 | 主源 |
|------|------|
| GitHub 增速 | [Trending](https://github.com/trending)、OSS Insight |
| GitHub 新颖 | Trending 2–3 页、awesome PR、[HN](https://news.ycombinator.com/)、[r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/) |
| HuggingFace | [Models trending](https://huggingface.co/models?sort=trending)、Spaces |
| 英文大厂 | [Anthropic](https://www.anthropic.com/news)、[OpenAI](https://openai.com/blog)、[Google AI](https://blog.google/technology/ai/)、[Meta AI](https://ai.meta.com/blog/)、[NVIDIA](https://developer.nvidia.com/blog/) |
| 中文生态 | 机器之心、量子位、各云厂商官方博客 |
| 论文 | [cs.AI](https://arxiv.org/list/cs.AI/recent)、[cs.CL](https://arxiv.org/list/cs.CL/recent)、[cs.LG](https://arxiv.org/list/cs.LG/recent) |

**信号分级**：`[方向级]` / `[选型级]` / `[工具级]` — 见 [[template-trend-daily]]。

泛新闻通讯见 [30 天路线 §6 资讯源](../30天-agent学习路线/README.md#6-每日-10-分钟资讯源)。

---

## 最小产出检查清单

- [ ] `trends/YYYY-MM-DD/index.md` + `index.html` 已生成
- [ ] 每维度 ≥2 条带 URL 的事实（深读除外）
- [ ] 每条有分级标签
- [ ] 深读 1 条含背景/做法/数字/影响
- [ ] README「当前日志」已追加一行

---

## 升格到知识库

1. 在 `docs/latest/`（或合适 `docs/agent/` 子域）新建文章；
2. 当日笔记 `related` 链到新节点；
3. 日志保留为发现史。

模板：[[template-knowledge-node]]；规则：[[STRUCTURE]]。

---

## 当前日志

| 日期 | 文件 | 跟进 |
|------|------|------|
| 2026-06-03 | [[2026-06-03]] | Mirage VFS + agent-governance；Glasswing 扩伙伴；深读 JAMEL |
| 2026-06-02 | [[2026-06-02]] | OS 级 Agent 运行时（WAR、OpenShell、Vera）；观察 odysseus 增速与 Agent Store 政策 |
| 2026-06-01 | [[2026-06-01]] | Harness /interface-first 共振（Life-Harness、revfactory/harness）；观察 Managed Agents 与 agent-governance-toolkit |
