---
tags: [trends, daily-insight]
aliases: []
date: 2026-06-05
stability: short
related: []
---

# AI 趋势日报 — 2026-06-05

> 观测窗口：2026-06-05（本地日历日）  
> 阅读目标：约 15–25 分钟  
> **Star 说明**：总 star 经 GitHub REST API 核对；日/周增量来自 Trending「Built by」字段。

---

## 一、GitHub 动态增长（看增速，非总 Star）

```json
{
  "schema_version": 2,
  "kind": "github-growth",
  "signals": [
    {
      "tier": "选型级",
      "title": "chopratejas/headroom",
      "url": "https://github.com/chopratejas/headroom",
      "metric": "总 star 12,581；+3,142 stars today；+9,421 stars this week",
      "hook": "RAG 压缩仍占日榜榜首",
      "layer": "Context",
      "source_confidence": "高",
      "body": "headroom 在 tool output、日志、文件与 RAG chunk 进入 LLM 前做压缩，README 宣称 60–95% token 节省，并提供 library、proxy 与 MCP server。Trending 日榜 +3,142、周榜 +9,421，较昨日日增略回落但仍居 Agent/RAG 垂直榜首，与 codegraph 预索引形成「压 payload + 减检索轮次」组合。\n\n- Python 实现，日/周双榜前列\n- 总 star 较 2026-06-04 快照继续抬升（约 +1.8k）",
      "action": "在 RAG 链路上游接 headroom proxy，对照 bare chunk 的 tool call 解析错误率与召回"
    },
    {
      "tier": "选型级",
      "title": "NousResearch/hermes-agent",
      "url": "https://github.com/NousResearch/hermes-agent",
      "metric": "总 star 181,043；+1,913 stars today",
      "hook": "自改进 agent 日增近两千",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "hermes-agent 定位「随使用成长的 agent」：从复杂任务经验生成并迭代 skill 文档，持久化长期记忆，支持 400+ 模型含 Ollama 本地栈，MIT 许可。日榜 +1,913 为今日第二增速，说明社区从「静态 harness 配置」转向「运行期复利技能树」。\n\n- HN 讨论强调与 OpenClaw 迁移工具、Honcho 用户建模（默认关闭）\n- 与 ECC 等同属 harness 层，但强调 autonomous skill crystallization",
      "action": "选一条重复性 chore 跑 1 周 hermes-agent，记录 skill 文档数量与同类任务 token/步数是否下降"
    },
    {
      "tier": "选型级",
      "title": "affaan-m/ECC",
      "url": "https://github.com/affaan-m/ECC",
      "metric": "总 star 207,275；+1,750 stars today；+10,369 stars this week",
      "hook": "ECC harness 周增破万",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Everything Claude Code 提供 skills、instincts、memory、security 与 research-first development，覆盖 Claude Code、Codex、Cursor 等。尽管总 star 已超 20 万，日增 +1,750、周增 +10,369 仍显著，延续「可配置 harness」堆叠而非换底座模型的社区选择。\n\n- 日增速略低于昨日 +2,141，趋势仍强\n- 与 revfactory/harness（周 +2,159）等同轨 meta-skill",
      "action": "对照 ECC 的 security / memory 模块与自有 Claude Code skills 目录，评估长会话漂移是否改善"
    },
    {
      "tier": "选型级",
      "title": "colbymchenry/codegraph",
      "url": "https://github.com/colbymchenry/codegraph",
      "metric": "总 star 40,958；+9,452 stars this week",
      "hook": "代码图谱周增仍近万",
      "layer": "Context",
      "source_confidence": "高",
      "body": "codegraph 预索引代码知识图，面向 Claude Code、Codex、Gemini、Cursor、OpenCode 与 Hermes Agent 等，卖点是更少 token、更少 tool call、100% 本地。本周 +9,452 star 仍居 Agent 相关仓前列；今日未进 daily Top 15，增量证据仅周榜。\n\n- TypeScript 实现\n- 与 headroom 互补：图谱减检索，headroom 压进入模型的 payload",
      "action": "在自有 monorepo 对比 codegraph 与纯 grep 的首轮定位 token 与 tool call 次数"
    }
  ]
}
```

**数据源**：GitHub Trending（today/weekly）；Star 经 API 核对。

---

## 二、GitHub 新颖探索（< 5k ★ 或新发布，含社区讨论）

```json
{
  "schema_version": 2,
  "kind": "github-novel",
  "signals": [
    {
      "tier": "选型级",
      "title": "patoles/agent-flow",
      "url": "https://github.com/patoles/agent-flow",
      "signal_type": "★ 955（2026-06-05 API）；HN item 47528814",
      "hook": "Claude Code 编排可视化",
      "layer": "Harness",
      "source_confidence": "高",
      "community_url": "https://news.ycombinator.com/item?id=47528814",
      "body": "Agent Flow 是 VS Code 扩展，实时可视化 Claude Code / Agent SDK 的 agent 分支、tool call 链、token 消耗、父子 agent 关系与文件读写热力图，支持会话回放。相对「黑盒终端输出」，它把 harness 调试面产品化，便于迭代 prompt 与工具设计。\n\n- Show HN 帖为本次可核实社区讨论\n- 与 AgentClaw/SwarmClaw 的「框架/面板」分叉不同，专注观测而非编排 DSL",
      "action": "在一条多 sub-agent 任务上开启 Agent Flow，记录失败时能否定位到具体 tool call 链"
    },
    {
      "tier": "选型级",
      "title": "ghostwright/phantom",
      "url": "https://github.com/ghostwright/phantom",
      "signal_type": "★ 1,424（2026-06-05 API）；HN item 47574045",
      "hook": "独立 VM 持久 co-worker",
      "layer": "Harness",
      "source_confidence": "高",
      "community_url": "https://news.ycombinator.com/item?id=47574045",
      "body": "Phantom 基于 Claude Agent SDK，在专属 VM 上持续运行：动态注册 MCP 工具并跨重启保留，本地 Qdrant 向量记忆，自进化配置由另一模型校验。作者对比 OpenClaw 强调跳过屏幕视觉循环、直接用 shell/FS/git/MCP，并可用 Specter 在 90s 内 provision VM。\n\n- 与昨日 AgentClaw「声明式工作流」路线不同，偏持久基础设施\n- Show HN 讨论链可核实",
      "action": "若已用 OpenClaw 做自动化，用 HN 帖中的三命令路径试 Phantom 动态 MCP 是否降低跨会话状态丢失"
    },
    {
      "tier": "工具级",
      "title": "coast-guard/coasts",
      "url": "https://github.com/coast-guard/coasts",
      "signal_type": "★ 397（2026-06-05 API）",
      "hook": "worktree 本地服务隔离",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Coasts 为 git worktree 提供 localhost 服务隔离与编排，让多分支/多 agent 并行开发时各 worktree 拥有独立端口与服务生命周期，减少「共用一个 dev server」造成的串扰。\n\n- 出现在 GitHub Trending Today 第三方列表，非纯 Agent 仓但直击多 agent 并行工程痛点\n- 与 SwarmClaw 面板编排互补：偏底层运行时隔离",
      "action": "在多 agent 并行改同一 monorepo 时，用 coasts 为每个 worktree 起隔离 dev 服务，记录端口冲突与清理成本"
    }
  ]
}
```

---

## 三、HuggingFace 动态

```json
{
  "schema_version": 2,
  "kind": "huggingface",
  "signals": [
    {
      "tier": "选型级",
      "title": "google/gemma-4-12B",
      "url": "https://huggingface.co/google/gemma-4-12B",
      "signal": "downloads 1,978；likes 272；lastModified 2026-06-04；12B encoder-free",
      "hook": "Gemma4 12B 权重持续更新",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Gemma 4 12B Unified 为 encoder-free 多模态密集模型，256K context，原生文本+图像+视频帧+音频，支持 function calling 与 thinking。Google 称约 16GB VRAM 可本地跑；Apache 2.0。HF 上 instruct 变体 `gemma-4-12B-it` 下载量更高（14,866），适合直接接入 agent loop。\n\n- 与 Build 2026 Gemma 4 发布叙事延续\n- 面向本地 sub-agent / 多模态工具调用",
      "action": "在 16GB 档机器试 gemma-4-12B-it 本地 agent loop，对照云 API 的多模态 tool call 延迟"
    },
    {
      "tier": "选型级",
      "title": "JetBrains Mellum2",
      "url": "https://huggingface.co/blog/JetBrains/mellum2-launch",
      "signal": "Blog 2026-06-01；12B 总参 / 2.5B active/token；文内 6.94k 下载、186 likes",
      "hook": "12B MoE 专做 sub-agent",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Mellum2 为 12B MoE（64 experts、每 token 8 experts），131K 上下文，面向 routing、RAG 压缩/摘要、sub-agents 与高吞吐 coding，Apache 2.0。JetBrains 称相对同尺寸模型 >2× 推理加速（arxiv:2605.31268）。\n\n- 非多模态 frontier\n- 与 Gemma4 12B 竞争本地中间层槽位",
      "action": "用 Mellum2-Instruct 替换现有 sub-agent 规划调用，记录延迟与下游主模型 token 节省"
    },
    {
      "tier": "方向级",
      "title": "NVIDIA Cosmos（GitHub + HF）",
      "url": "https://github.com/NVIDIA/cosmos",
      "signal": "GitHub Trending +133 stars today；Cosmos 3 blog 2026-05-31",
      "hook": "Physical AI 开源栈升温",
      "layer": "Model",
      "source_confidence": "中",
      "body": "NVIDIA Cosmos 为开放世界模型、数据集与工具平台；GitHub 日榜 +133 与 Physical AI 叙事共振。HF 侧 Cosmos 3 统一文本/图像/视频/音频/action（官方 blog），本次未成功经 API 拉取具体 model card 下载数。\n\n- 与 OpenAI Robotics 重启、英特尔 OpenVINO Physical AI 等组织信号同周出现\n- 算力与许可需读各 model card",
      "action": "若做机器人/AV 合成数据，先读 Cosmos 3 Nano model card 算力门槛再决定是否接 Diffusers pipeline"
    },
    {
      "tier": "选型级",
      "title": "google/gemma-4-12B-it",
      "url": "https://huggingface.co/google/gemma-4-12B-it",
      "signal": "downloads 14,866；likes 414（API 2026-06-05）",
      "hook": "Instruct 变体下载领跑",
      "layer": "Model",
      "source_confidence": "高",
      "body": "同系列 instruct 权重下载显著高于 base 卡（14,866 vs 1,978），反映社区更倾向直接部署对话/agent 策略模型而非仅做基座实验。\n\n- 与 gemma-4-12B base 卡同日维护\n- 适合作为本地 tool-calling 后端",
      "action": "对比 base 与 it 在同一 agent harness 下的 function call JSON 合规率"
    }
  ]
}
```

---

## 四、大公司动态

### 4.1 英文大厂

```json
{
  "schema_version": 2,
  "kind": "bigtech",
  "signals": [
    {
      "tier": "方向级",
      "entity": "Anthropic",
      "url": "https://www.anthropic.com/news/confidential-draft-s1-sec",
      "event": "2026-06-01 向美国 SEC 秘密提交 Form S-1 草案；股数与发行价尚未确定",
      "hook": "Anthropic 秘交 S-1 仍发酵",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Anthropic, PBC 于 2026-06-01 秘密提交 Form S-1 草案；SEC 审查完成后可选择上市，实际发行取决于市场条件。公告为 Rule 135 非要约声明。第三方媒体报道的估值、收入 run-rate 未在官方 S-1 公开稿中核实。\n\n- 资本市场结构变化，非模型技术发布\n- 与 OpenAI、SpaceX 同期 IPO 叙事持续",
      "action": "企业采购侧跟踪 SEC 公开稿披露节奏，避免仅凭媒体估值预测调整年度 API 预算"
    },
    {
      "tier": "选型级",
      "entity": "Anthropic",
      "url": "https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan",
      "event": "2026-06-15 起 Agent SDK / claude -p 移出订阅池；Pro $20、Max 5x $100、Max 20x $200 月度 credit",
      "hook": "6/15 双桶计费改 Agent 成本",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Claude Pro/Max/Team/Enterprise 订阅用户将获得独立 Agent SDK 月度美元 credit，覆盖 Claude Agent SDK、`claude -p`、Claude Code GitHub Actions 及通过 Agent SDK 认证的第三方应用；交互式 Claude Code TUI、Cowork 与 claude.ai 聊天仍走原订阅额度。Credit 不滚存，需一次性 claim；耗尽后自动化请求停止，除非开启 extra usage 按 API 全价计费。\n\n- 直接影响基于订阅 key 的 CI agent 与后台自动化\n- Enterprise Standard seat 不符合 claim 条件（Help Center 明示）",
      "action": "在 6 月 15 前盘点所有 `claude -p`/Agent SDK 自动化，估算月度 credit 并决定是否改 API key 计费"
    },
    {
      "tier": "选型级",
      "entity": "Microsoft",
      "url": "https://www.microsoft.com/en-us/research/blog/mai-v1-and-mai-thinking-v1/",
      "event": "Build 2026；MAI-Thinking-1；宣称 SWE Bench Pro 与 Claude Opus 4.6 持平、无第三方蒸馏",
      "hook": "微软自研推理模型上桌",
      "layer": "Model",
      "source_confidence": "高",
      "body": "微软在 Build 2026 发布 MAI 模型家族，核心为 MAI-Thinking-1 高级推理模型：官方称 SWE Bench Pro 与 Claude Opus 4.6 持平，AIME 2025 97.0%，预训练排除 AI 生成内容与第三方蒸馏数据。标志微软从「主要转售 OpenAI 模型」走向自研 frontier 竞争。\n\n- benchmark 为厂商自述\n- 与 GitHub copilot-sdk 开源嵌入形成「模型+SDK」组合",
      "action": "在 Azure AI Foundry 试 MAI-Thinking-1 一条编码 agent 流水线，对照现有 Claude/GPT 路由的成本与通过率"
    },
    {
      "tier": "方向级",
      "entity": "Microsoft",
      "url": "https://news.microsoft.com/source/asia/2026/06/03/miscrosoft_build_2026_majorana2/?lang=zh-hant",
      "event": "2026-06-03 Majorana 2；量子位元可靠性 ×1000；Microsoft Discovery GA",
      "hook": "Agentic AI 助力量子研发",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Microsoft Build 2026 发布拓扑量子芯片 Majorana 2，称 Agentic AI 协助材料堆叠研发，量子位元可靠性较上一代提升约 1000 倍、平均寿命 20 秒。同步宣布 Microsoft Discovery 平台开放：科研专用 agent、Discovery Engine 与企业级治理，用于加速 R&D 工作流。\n\n- 非通用 coding agent 发布\n- 展示 agent 在硬核科研流程中的落地范式",
      "action": "若做科研类 agent 产品，阅读 Discovery 平台 agent 契约，评估与自有 RAG/实验日志系统的对接面"
    }
  ]
}
```

### 4.2 中文生态

```json
{
  "schema_version": 2,
  "kind": "bigtech",
  "signals": [
    {
      "tier": "方向级",
      "entity": "微软 / 中央社",
      "url": "https://www.cna.com.tw/news/ait/202606030190.aspx",
      "event": "2026-06-03 Build；Majorana 2；Agentic AI 协助量子研发",
      "hook": "Majorana2 中文官方转载",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "中央社转述 Microsoft Build 2026：Majorana 2 采用新一代材料堆叠，量子位元可靠性提升约 1000 倍，平均寿命 20 秒，部分可达 1 分钟；Microsoft Discovery 代理式 AI 用于缩短半导体导线等研发周期。与微软亚洲新闻稿一致。\n\n- 中文传播强调「科研 agent」而非消费级聊天产品\n- 2029 可扩展量子机目标为官方表述",
      "action": "跟踪 Microsoft Discovery 中文文档是否上线，再评估国内科研团队试点路径"
    },
    {
      "tier": "选型级",
      "entity": "微软 / InfoQ",
      "url": "https://www.infoq.cn/article/StrGjRRmFKm4fXCvLOSP",
      "event": "2026-06-03 报道 MAI-Thinking-1；拒绝第三方蒸馏",
      "hook": "中文解读微软 AI 独立日",
      "layer": "Model",
      "source_confidence": "中",
      "body": "InfoQ 解读 Build 2026 自研 MAI-Thinking-1：SWE Bench Pro 对标 Claude Opus 4.6、AIME 高分、强调从零训练且不含第三方模型蒸馏。技术细节应以 Microsoft Research Blog 为准；本文为中文社区速览。\n\n- 与英文官方 blog 同主线\n- 适合国内工程师快速建立认知",
      "action": "以微软官方 blog 为唯一基准更新内部「微软是否仍纯 OpenAI 依赖」判断，InfoQ 仅作传播参考"
    },
    {
      "tier": "方向级",
      "entity": "Anthropic / 钛媒体",
      "url": "https://www.tmtpost.com/8013199.html",
      "event": "转述 2026-06-01 秘密提交 S-1；估值等为媒体转述",
      "hook": "IPO 竞速中文舆论",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "钛媒体转述 Anthropic 抢在 OpenAI 前 IPO 的资本市场叙事，并援引外媒对募资与估值的讨论。递交事实可对照 https://www.anthropic.com/news/confidential-draft-s1-sec；估值预测非 SEC 公开稿。\n\n- 国内关注算力与资本，而非 Claude 模型细节\n- 与昨日日报同类信号延续",
      "action": "仅以官方 SEC 公开稿更新内部融资/采购假设，不把媒体估值写入技术选型文档"
    }
  ]
}
```

---

## 五、论文速览（arxiv 近 1–3 日）

```json
{
  "schema_version": 2,
  "kind": "papers",
  "signals": [
    {
      "tier": "选型级",
      "title": "Self-Reflective APIs: Structure Beats Verbosity for AI Agent Recovery",
      "url": "https://arxiv.org/abs/2606.05037",
      "repo_url": "https://github.com/arquicanedo/self-reflective-apis",
      "hook": "结构化 API 错误助 agent 修复",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Siemens 团队（Submitted 2026-06-04）：验证失败时 API 返回 `recovery_feedback.suggestions[]` 机器可读修复建议，使 agent 无需外部推理即可重试。泄漏审计试点 N=30/cell、3 LLM、10 对抗任务：在 Anthropic 模型上 structured suggestions 将 task-completion 提升 +36.7–40.0 pp（Fisher p≤0.0022），per-success token 效率约 1.8–2.2×。开源 audit_prompt_leakage.py 与实现仓库。\n\n- 面向 tool/API 层的 agent 可靠性\n- gpt-4o-mini 上提升不显著（论文自述）",
      "action": "在一条内部 REST 验证失败路径试点 suggestions[] 载荷，记录 agent 重试次数与修复 token"
    },
    {
      "tier": "方向级",
      "title": "From Prompt to Process: a Process Taxonomy for AI Software Development Agents",
      "url": "https://arxiv.org/abs/2606.04967",
      "hook": "六维框架对比 Spec Kit 等",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "IFG 学者（2026-06-03）：提出六维过程 taxonomy——specification、context、roles、execution、validation、portability，并评分对比 Spec Kit、OpenSpec、BMAD、GSD、Spec Kitty、Reversa 与 out-of-sample Spec-Flow。结论：有过程的框架收敛于持久 artifact、工作契约与人类 review；**无任何框架强覆盖六维**，暴露过程深度与跨 agent 可移植性的结构性权衡。\n\n- 直接回应「只堆 agent 无流程」的工程风险\n- 与 github/spec-kit 日榜 +321 star 形成论文—产品共振",
      "action": "用六维表给自有 Claude Code/Spec 流程打分，标出 portability 与 validation 短板"
    },
    {
      "tier": "方向级",
      "title": "Simulate, Reason, Decide: Scientific Reasoning with LLMs for Simulation-Driven Decision Making",
      "url": "https://arxiv.org/abs/2606.04505",
      "hook": "仿真驱动科学推理 agent",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "Submitted 2026-06-04：将 LLM 科学推理与仿真驱动决策结合，面向需要实验/仿真反馈的研究工作流，而非 coding agent 或 GUI agent。摘要未给出可核实 benchmark 数字，本次仅作方向收录。\n\n- 与 Microsoft Discovery 科研 agent 叙事同轨\n- 关键数字待读全文",
      "action": "若做科研 agent，下载全文核对仿真闭环是否优于纯 RAG+工具调用基线"
    }
  ]
}
```

---

## 六、今日关键判断

GitHub 增速呈现 **「压缩/context 基建 + 自改进 harness」双主线**：headroom 仍占日榜第一（+3,142），但今日最大变量是 **hermes-agent 日增 +1,913**——社区资金时间从静态 skills 转向运行期技能复利；ECC 与 codegraph 周增仍破万，说明 harness 配置与预索引并未减速。

新颖探索从昨日的声明式框架，扩展到 **可观测与持久运行时**：Agent Flow 把 Claude Code 编排可视化，Phantom 把 co-worker 放到独立 VM 并动态扩展 MCP；coasts 则补 worktree 级服务隔离。HF 侧 **Gemma 4 12B 权重持续更新**，instruct 卡下载显著高于 base；大厂侧 **6 月 15 日 Claude Agent SDK 双桶计费** 是比新模型更近的落地约束，与微软 **MAI-Thinking-1** 自研推理模型形成「成本治理 + 供给多元化」对撞。

论文 **Self-Reflective APIs** 把 agent 可靠性前移到 API 错误契约层，**Process Taxonomy** 则为 Spec Kit/BMAD 等 harness 提供可复现对比尺。综合信号：Agent 栈正在同时优化 **带宽（headroom）、复利（hermes）、流程（论文+spec-kit）、计费边界（Anthropic 6/15）** 四条曲线。

---

## 七、深读 1 条

- **分级**：`[选型级]`
- **对象**：Self-Reflective APIs — *Structure Beats Verbosity for AI Agent Recovery*（arXiv:2606.05037）
- **链接**：https://arxiv.org/abs/2606.05037 · https://github.com/arquicanedo/self-reflective-apis · audit_prompt_leakage.py 见仓库
- **正文**：当 LLM agent 调用企业 API 遭遇领域特定校验失败（文化规则、认证面粉、级联约束）时，通用模型很难凭训练先验猜对修复方式；传统 RFC 7807 式错误只说明「坏了什么」，不说「下一步改哪个参数」。本文提出 self-reflective API：在失败响应中附带 `recovery_feedback.suggestions[]`，每条建议含可执行 action 与 parameters，使下一轮请求可直接合并。

  作者在泄漏审计后的试点（N=30/cell、3 LLM、10 对抗任务）报告：相对纯英文诊断，结构化建议在 Anthropic 模型上将 task-completion 提升约 +36.7–40.0 个百分点（Fisher exact p≤0.0022），且 per-success token 效率约 1.8–2.2×；gpt-4o-mini 上提升不显著。论文同时强调必须先审计 benchmark 中的「答案泄漏」，并开源 audit 脚本——这对 agent 评测与合成数据管线同样重要。

  对 Agent 栈的意义是把可靠性从 prompt 层下沉到 **tool/API 契约层**，与 headroom 压带宽、hermes 复利技能形成正交优化；局限是试点域较窄（recipe + billing 复制）、企业 API 改造成本高。建议在一条内部校验密集型 API 上试点 suggestions 载荷，再决定是否写入 agent gateway 标准。
- **知识库节点**：待建 `self-reflective-api-agent-recovery`

---

## 八、跟进

- [ ] 观察 — Anthropic 6 月 15 日前 Agent SDK credit claim 邮件与团队 seat 类型
- [ ] 观察 — hermes-agent 日增能否持续 3 日并带动 skill 文档生态
- [ ] 观察 — headroom 日增是否重回 +3.5k 档及 MCP 集成样例增多
- [ ] 观察 — Microsoft MAI-Thinking-1 在 Azure Foundry 的 GA 范围与定价
- [ ] 升格 — [[self-reflective-api-agent-recovery]]（若 API 结构化错误与 agent gateway 连续 ≥2 日共振）

---

## 九、与昨日衔接

- 昨日：[[2026-06-04]] — headroom 日增 +3,530；AgentClaw/SwarmClaw；SaliMory 深读；Anthropic S-1
- 周信号：Context 压缩（headroom）延续但日增略降；Harness 新增 **hermes-agent 自改进** 与 **Agent Flow/Phantom 观测·持久运行时**；大厂 **6/15 双桶计费** 压近；论文从 SaliMory 记忆转向 **API 自反思恢复 + 过程 taxonomy**

---

## 十、疑问 / 待查

- hermes-agent 日增是否伴随新版本 release tag（本次未核对 releases 页）
- NVIDIA Cosmos HF model card API 鉴权失败，具体 downloads 未写入 metric
- Simulate, Reason, Decide（2606.04505）全文 benchmark 数字待补
- revfactory/harness 周 +2,159、openclaw-windows-node 日 +411 有增速但未写入 JSON（控篇幅）
- 机器之心 2026-06-04～05 未命中可核实 bigtech 首发稿
