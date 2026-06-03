---
tags: [trends, daily-insight]
aliases: []
date: 2026-06-03
stability: short
related: []
---

# AI 趋势日报 — 2026-06-03

> 观测窗口：2026-06-03（本地日历日）  
> 阅读目标：约 15–25 分钟  
> **Star 说明**：GitHub REST `/repos` 批量调用触发 403；总量经 Search API 单条核实，增速仅来自 Trending「Built by」字段。

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
      "metric": "总 star 6,488；+1,265 today、+3,002 this week",
      "hook": "RAG 入口压缩双榜第一",
      "layer": "Context",
      "source_confidence": "高",
      "body": "headroom 在 tool output、log、文件与 RAG chunk 进入 LLM 前做压缩，README 宣称 60–95% token 节省，并提供 library、proxy 与 MCP server。Trending daily #1 与 weekly 同时上榜，单日 +1,265、本周 +3,002 约占总量 46%，仍是 Agent/RAG 垂直最清晰的增速 breakout。\n\n- 最近 release v0.22.4（2026-06-01）\n- 与 codegraph 预索引互补：headroom 压 payload，图谱减检索轮次",
      "action": "在 RAG 链路上游接 headroom proxy，对照 bare chunk 的 tool call 解析错误率与召回"
    },
    {
      "tier": "选型级",
      "title": "Lum1104/Understand-Anything",
      "url": "https://github.com/Lum1104/Understand-Anything",
      "metric": "总 star 50,127；+15,774 this week",
      "hook": "代码图谱本周仍+1.5万",
      "layer": "Context",
      "source_confidence": "高",
      "body": "Understand-Anything 把代码库转为可探索、可搜索、可问答的交互式知识图谱，README 明确兼容 Claude Code、Codex、Cursor、Copilot 与 Gemini CLI。Trending weekly 本周 +15,774 star，增量约占总量 31%，与 colbymchenry/codegraph 并列 coding-agent 上下文基础设施爆发。\n\n- TypeScript 实现\n- 适合与 headroom 做 A/B：结构索引 vs 流式压缩",
      "action": "在自有 monorepo 对比 Understand-Anything 与纯 grep 的首轮定位 token 与准确率"
    },
    {
      "tier": "选型级",
      "title": "microsoft/agent-governance-toolkit",
      "url": "https://github.com/microsoft/agent-governance-toolkit",
      "metric": "总 star 3,817；+1,391 this week",
      "hook": "Agent 治理 harness 周增四成",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "agent-governance-toolkit 提供 policy enforcement、zero-trust identity、execution sandboxing 与 reliability engineering，README 宣称覆盖 OWASP Agentic Top 10 全部 10 项。本周 +1,391 star 约占总量 36%，反映 agent 从「能跑」到「能管」的二阶需求与 revfactory/harness 等配置层升温并行。\n\n- Python 实现，企业向\n- 与 Context 层爆发形成「带宽 + 治理」双线",
      "action": "对照现有 agent 沙箱策略，试跑 toolkit 的 policy 模板是否覆盖自有 tool/MCP 面"
    },
    {
      "tier": "选型级",
      "title": "nesquena/hermes-webui",
      "url": "https://github.com/nesquena/hermes-webui",
      "metric": "总 star 12,551；+1,722 today",
      "hook": "Hermes Agent 单日+1.7k UI",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "hermes-webui 为 Hermes Agent 提供 Web 与手机端 UI（Python），Trending daily 单日 +1,722 star，显示 terminal agent 向多端 UI 扩散。与 ECC 文档中的 Hermes operator shell 叙事同生态；本周 weekly Top 20 片段未核实，仅 daily 增速有证据。\n\n- 属 agent 运行时/UI 层，非模型权重\n- 与 NVIDIA×Microsoft agentic 栈、OpenClaw 类本地助手形成多端入口竞争",
      "action": "若已用 Hermes CLI，评估 WebUI 是否降低长会话监控与审批摩擦"
    }
  ]
}
```

**数据源**：GitHub Trending（today/weekly）；Star 经 Search API 核对。

---

## 二、GitHub 新颖探索（< 5k ★ 或新发布，含社区讨论）

```json
{
  "schema_version": 2,
  "kind": "github-novel",
  "signals": [
    {
      "tier": "选型级",
      "title": "strukto-ai/mirage",
      "url": "https://github.com/strukto-ai/mirage",
      "signal_type": "★ 2,992；Created 2026-05-06；HN item 48077914",
      "hook": "多后端统一虚拟文件系统",
      "layer": "Harness",
      "source_confidence": "高",
      "community_url": "https://news.ycombinator.com/item?id=48077914",
      "body": "Mirage 将 S3、Slack、Gmail、GitHub、Redis 等挂载为单一虚拟文件树，Agent 用 grep/cat/cp 等 bash 管道跨服务编排，README 对标「agents reason about one abstraction instead of N SDKs and M MCPs」。提供 Python/TS SDK、FUSE 挂载与 workspace snapshot，可插入 OpenAI Agents SDK、LangChain、Pydantic AI 等作为 sandbox/tool 层。\n\n- 不做 LangGraph 状态图，统一工具面语义\n- 与 OpenClaw 个人助手 runtime 不同层：Mirage 是基础设施",
      "action": "选两条跨服务查询用 Mirage 路径语法对照 per-service MCP tool 的 token 与步骤数"
    },
    {
      "tier": "选型级",
      "title": "open-gitagent/gitagent-protocol",
      "url": "https://github.com/open-gitagent/gitagent-protocol",
      "signal_type": "★ 2,796；Spec v0.1.0；HN item 47376584",
      "hook": "Git 原生 Agent 开放标准",
      "layer": "Harness",
      "source_confidence": "高",
      "community_url": "https://news.ycombinator.com/item?id=47376584",
      "body": "OpenGAP（Git Agent Protocol）以 agent.yaml + SOUL.md 为最小必需文件，opengap export/run 可适配 Claude Code、OpenAI Agents SDK、CrewAI、LangChain、OpenClaw、Nanobot、Cursor 等。内置 Segregation of Duties、FINRA/SEC 合规字段与 SkillsFlow 确定性 YAML workflow，把 identity/prompt/skills 从各框架抽离为 git 制品。\n\n- 不实现 runtime graph；与 LangGraph 编排正交\n- HN Show HN 讨论 portability vs runtime discovery",
      "action": "用 export 把现有 Claude Code agents 目录转为 OpenGAP 布局，评估 PR 级版本化是否降低跨框架迁移成本"
    },
    {
      "tier": "工具级",
      "title": "self-evolving/repo",
      "url": "https://github.com/self-evolving/repo",
      "signal_type": "★ 38；Created 2026-04-28；release v0.3.0",
      "hook": "GHA 内自进化协作 Agent",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Sepo 在 issue/PR/discussion 中 @sepo-agent 触发，运行在 GitHub Actions 而非独立 chat gateway。持久上下文放在 repo 分支 agent/memory 与 agent/rubrics，支持 /implement、/review、/fix-pr、/orchestrate 等路由，可定时 workflow 做 daily summary 与 agent 自更新。\n\n- 与 OpenClaw 多 channel 个人助手不同：协作面在 GitHub 原生 UI\n- 记忆是 git 分支上的 curated artifacts，非 chunk+embedding RAG",
      "action": "在试点 repo 开一条只读 chore issue 试 @sepo-agent，核对 GHA secret 与写权限边界"
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
      "tier": "方向级",
      "title": "NVIDIA Cosmos 3",
      "url": "https://huggingface.co/blog/nvidia/cosmos-3-for-physical-ai",
      "signal": "Cosmos3-Nano 16B · 9.07k downloads · 109 likes；Cosmos3-Super 65B · 2.83k · 98；Blog 2026-06-01",
      "hook": "Physical AI omni 世界模型",
      "layer": "Model",
      "source_confidence": "高",
      "body": "NVIDIA Cosmos 3 以 MoT（AR reasoner + diffusion generator）统一世界生成、物理推理与 action 生成，替代此前 Cosmos Predict/Reason/Transfer/Policy 多模型流水线。Cosmos3-Nano 16B（8B+8B，RTX PRO 6000 级工作站）与 Cosmos3-Super 64B（32B+32B，Hopper/Blackwell）已上架 Hub Trending，支持 Diffusers Cosmos3OmniPipeline 与 vLLM-Omni。\n\n- 许可 OpenMDW 1.1；仅 BF16 官方测试\n- HN 强调主攻机器人/AV 合成数据，非消费级纯视频生成竞品",
      "action": "若做具身或仿真数据管线，先读 Nano 卡面算力门槛再决定是否接 Diffusers pipeline"
    },
    {
      "tier": "选型级",
      "title": "JetBrains Mellum2",
      "url": "https://huggingface.co/blog/JetBrains/mellum2-launch",
      "signal": "12B · 799 downloads · 132 likes；Blog 2026-06-01；2.5B active/token",
      "hook": "12B MoE 专做 sub-agent",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Mellum2 为 12B 总参 / 2.5B active/token MoE（64 experts, 8 active），面向 routing、RAG、摘要、sub-agent 与高吞吐 coding，Apache 2.0。JetBrains 称相对同规模开源模型 >2× 推理速度（见 arxiv 2605.31268）；预训练约 10.6T tokens，128K context（YaRN）。\n\n- 非 frontier 多模态通用模型\n- 适合 IDE 内嵌或私有部署的高频中间步骤",
      "action": "用 Mellum2-Instruct 替换现有 sub-agent 规划调用，记录延迟与下游主模型 token 节省"
    },
    {
      "tier": "选型级",
      "title": "H Company Holo3.1",
      "url": "https://huggingface.co/blog/Hcompany/holo31",
      "signal": "Blog 2026-06-02；0.8B–35B-A3B；AndroidWorld 67%→79.3%（35B-A3B，厂商自述）",
      "hook": "GUI Agent 量化本地栈",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Holo3.1 是基于 Qwen 族的 GUI computer-use VLM，覆盖 web/desktop/mobile，新增 function-calling 与 Holo3 JSON 输出；首发 FP8、Q4 GGUF、NVFP4 量化（35B-A3B）。厂商称 NVFP4 在 DGX Spark 上相对 BF16 1.74× token 吞吐，强调私有、不出网执行路径。\n\n- 可与 Holo Models API 或 Hub collection 部署\n- 与 Qwen3.7-Plus 等同属屏幕 agent 竞争带",
      "action": "在目标 OS 上试 9B Q4 本地 agent，对照云 API 的 AndroidWorld 类任务成功率与单价"
    },
    {
      "tier": "工具级",
      "title": "Spaces agents.md",
      "url": "https://huggingface.co/docs/hub/main/en/spaces-agents",
      "signal": "每 Space 四行模板（schema/call/poll/auth）；示例 microsoft/TRELLIS.2",
      "hook": "Gradio Space 当 Agent 工具",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Hub 文档定义 `https://huggingface.co/spaces/<ns>/<repo>/agents.md` 端点，返回 Gradio API schema、POST/GET 模板与 Bearer HF_TOKEN 提示。Agent 可链式调用 Space（如 flux-klein 出图 → TRELLIS.2 3D），无需硬编码集成；ZeroGPU Space 需 token 计费至用户配额。\n\n- 与 huggingface_hub Agents SDK / MCP 互补：前者 curl/任意 coding agent 通用\n- 优势在 discoverability 与统一 auth",
      "action": "用 curl 拉一条目标 Space 的 agents.md，试把其接入现有 Claude Code tool 列表"
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
      "url": "https://www.anthropic.com/news/expanding-project-glasswing",
      "event": "2026-06-02 扩展 Project Glasswing；新增约 150 家组织、15+ 国家；累计伙伴约 200",
      "hook": "Glasswing 扩至约200伙伴",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Anthropic 2026-06-02 宣布 Project Glasswing 扩展至电力、水务、医疗、通信、硬件等此前代表性不足行业，新增约 150 家组织、15+ 国家，累计伙伴约 200。早期约 50 家伙伴用 Claude Mythos Preview 扫描代码库，官网引用其已发现 10,000+ 高/严重漏洞；同步推出面向公众的 Claude Security（基于 Opus 4.8 等公开模型做代码扫描与补丁建议）。\n\n- 强调 6–12 个月内同业或将具备 Mythos 级能力\n- 与同日秘交 S-1 形成安全能力 + 资本叙事双线",
      "action": "企业安全团队对照 Claude Security 与现有 SAST 流水线，评估 Mythos 级能力披露节奏对补丁 SLA 的影响"
    },
    {
      "tier": "选型级",
      "entity": "OpenAI",
      "url": "https://openai.com/index/codex-for-every-role-tool-workflow/",
      "event": "2026-06-02；周活 >500 万；非开发者约 20%、增速为开发者 3×+；6 角色插件、62 应用、110 skills",
      "hook": "Codex 六角色插件扩职能",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "OpenAI 2026-06-02 发布数据分析、创意、销售、产品设计、公募股权投资、投行等 6 个角色向 Codex 插件，捆绑 62 个应用与 110 项 skills；官方称 Codex 周活 >500 万，非开发者用户约 20% 且增速为开发者 3×+。同步推出 Sites（Business/Enterprise 预览，可生成可分享 URL 的工作区站点）与 Annotations（对文档/表格/幻灯片选定区域就地迭代）。\n\n- 把 Codex 从纯编码 harness 扩到企业知识工作流\n- 与 2026-06-01 AWS Bedrock 路径形成云治理 + 职能扩展",
      "action": "选一条非开发 chore（如销售简报）试角色插件，对照 hand-written skills 的稳定性"
    },
    {
      "tier": "方向级",
      "entity": "NVIDIA + Microsoft",
      "url": "https://nvidianews.nvidia.com/news/nvidia-partners-with-microsoft-on-unified-stack-for-agentic-ai-deployment",
      "event": "新闻稿 2026-06-02；Windows—云—本地统一 agentic AI 部署栈",
      "hook": "NV×MS 统一 Agent 部署栈",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "NVIDIA Newsroom 2026-06-02 稿称 NVIDIA 与 Microsoft 联合提供从 Windows 终端到云与本地的 agentic AI 部署统一栈，与 COMPUTEX / GTC Taipei 2026 发布节奏同期。详细 SKU/GA 条款本次未在正文逐条核实，但标题与日期来自官方 Newsroom 列表。\n\n- 与 2026-06-01 Jetson JetPack 7.2 / NemoClaw 边缘叙事衔接\n- 本地 Hermes/OpenClaw 类 agent 与云端 Codex 的企业采购可能进一步收敛到「同一栈」叙事",
      "action": "跟踪 keynote 全文中的 GA 范围，再决定是否调整 Windows 端 agent 运行时选型"
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
      "tier": "选型级",
      "entity": "阿里云 / 千问",
      "url": "https://finance.sina.com.cn/tech/shenji/2026-06-02/doc-inhzysxu3287083.shtml",
      "event": "2026-06-02 发布 Qwen3.7-Plus；已上线阿里云百炼 API",
      "hook": "千问3.7-Plus 多模态",
      "layer": "Model",
      "source_confidence": "中",
      "body": "新浪财经 2026-06-02 报道阿里发布千问 3.7 系列多模态模型 Qwen3.7-Plus，强调 GUI/屏幕理解、长程「看想写做验」工作流与一键复刻 App 等场景，已上线阿里云百炼 API。文内 Vision Arena 排名等为报道转述，榜单名次未独立核实；与 Holo3.1、MiniMax M3 等同周竞争为媒体对比。\n\n- 发布日与产品名来自新浪财经\n- 国内 GUI agent 团队可对照百炼定价做 screen agent 批量任务",
      "action": "在百炼控制台试 Qwen3.7-Plus 屏幕输入 agent，对照 Claude/GPT 多模态 API 延迟与单价"
    },
    {
      "tier": "方向级",
      "entity": "量子位 / OpenAI",
      "url": "https://www.qbitai.com/2026/06/427238.html",
      "event": "OpenAI Robotics 大规模招聘；文称部分岗位年薪 21–31 万美元",
      "hook": "OpenAI 机器人赛道重启",
      "layer": "Model",
      "source_confidence": "中",
      "body": "量子位报道称世界模拟团队转型 OpenAI Robotics，开放电气/仿真/执行器/控制系统工程师等岗位，回顾 2019 Dactyl 与 2020 年前后关停机器人团队背景。URL 路径为 2026/06，页面未显示精确发布日；录用规模与编制人数未核实，属组织扩张信号而非产品 GA。\n\n- 与 NVIDIA Cosmos 3 Physical AI 权重形成模型侧 + 组织侧共振\n- 落地节奏仍待 OpenAI 官方新闻稿",
      "action": "跟踪 OpenAI 官方是否发布 Robotics 专文，避免仅凭招聘页推断产品路线图"
    },
    {
      "tier": "选型级",
      "entity": "腾讯云 / DeepSeek",
      "url": "https://finance.sina.com.cn/stock/t/2026-06-02/doc-inhzzqcm1518957.shtml",
      "event": "2026-06-02 公告；2026-06-03 00:00 起调价；最高降幅 97.5%（文内）",
      "hook": "腾讯 DeepSeek-V4 降价",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "新浪财经转述腾讯云 2026-06-02 公告：自 2026-06-03 00:00 起调整 DeepSeek-V4-Pro / Flash 推理与缓存命中价格，文称最高降幅 97.5% 且与 DeepSeek 官方价「持平」。具体价目表未逐条对照腾讯云官网；报道同时提及腾讯股价波动，与模型能力无直接因果关系。\n\n- 属云厂商 API 价格战 / 开发者成本信号\n- 影响 agent 流水线中 DeepSeek 后端选型而非 harness 架构",
      "action": "对照腾讯云价目表与 DeepSeek 直客价，更新 agent 批处理任务的单价模型"
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
      "tier": "方向级",
      "title": "Joint Agent Memory and Exploration Learning via Novelty Signals (JAMEL)",
      "url": "https://arxiv.org/abs/2606.01528",
      "repo_url": "https://github.com/MobileLLM/JAMEL",
      "hook": "GUI 探索+记忆联合训练",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "清华 + 百度 + 北大等（2026-06-02，cs.AI）提出 JAMEL：用 JS code coverage 等 persistent novelty signal 无标注监督 latent memory 与 exploration policy；Qwen3-VL-2B compressor + Qwen2.5-VL-7B policy。JAMEL-9B 在 10 个未见 GUI app 上 50 step 平均 cumulative coverage reward 20.7，对比 Gemini 3.1 Flash-Lite ReAct-vision 20.9、MAI-UI-8B 8.4；token 消耗约为 ReAct-vision 的 1/21.92；训练 24k samples / 86 apps（ScaleWoB）。\n\n- 代码仓 2026-06-02 创建，GitHub 3 stars（页面可见）\n- 把 GUI agent 探索与记忆从外挂 RAG 推进到联合 RL"
    },
    {
      "tier": "方向级",
      "title": "OpenWebRL: Demystifying Online Multi-turn Reinforcement Learning for Visual Web Agents",
      "url": "https://arxiv.org/abs/2606.02031",
      "repo_url": "https://github.com/OpenWebRL/OpenWebRL",
      "hook": "Live-web VLM RL 管线",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Microsoft + UIUC（2026-06-01，cs.LG）在 live browser 上 SFT warm-start + 多轮 MM-GRPO；OpenWebRL-4B 在三项 live-web benchmark 平均 68.4% success（WebVoyager 74.1%、Online-Mind2Web 67.0%、DeepShop 64.0%）。训练 0.4K SFT + 2.2K RL tasks；OpenWebRL-Judge-8B 蒸馏 F1 92.1% vs GPT-4.1 oracle；HF 数据集 OpenWebRL-RL-Tasks 含 2,198 条 RL tasks。\n\n- 基于 Qwen3-VL-4B/8B backbone\n- GitHub star 数未核实（API rate limit）"
    },
    {
      "tier": "工具级",
      "title": "From Layers to Submodules: Rethinking Granularity in Replacement-Based LLM Compression (SubFit)",
      "url": "https://arxiv.org/abs/2606.02559",
      "repo_url": "https://github.com/eliacunegatti/SubFit",
      "hook": "子模块粒度 LLM 剪枝",
      "layer": "Model",
      "source_confidence": "高",
      "body": "2026-06-01 投稿（cs.CL, cs.AI），SubFit 在 Attention/FFN 子模块做非连续选择 + fitted residual bypass。25% sparsity 下 aggregate downstream accuracy retention 84.6%（最强 baseline 81.6%），perplexity degradation 2.42× vs baseline 4.34×；评测 10 LLM × 5 sparsity levels。代码见 eliacunegatti/SubFit；GitHub 0 stars（页面可见，2026-06-03）。\n\n- 工程向 post-training 压缩\n- 与本地大模型部署门槛叙事相关"
    },
    {
      "tier": "选型级",
      "title": "ClinEnv: An Interactive Multi-Stage Long Horizon EHR Environment for Agents",
      "url": "https://arxiv.org/abs/2606.02568",
      "repo_url": "https://huggingface.co/datasets/ylin766gatech/ClinEnv",
      "hook": "住院 EHR 长程 Agent 环境",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "Georgia Tech + 北大 + 清华等（2026-06-02 批次）提出 ClinEnv：真实 EHR 多阶段住院轨迹 + 四 agent（patient/nurse/lab/history）主动查信息 + 确定性 ontology 打分。7 个 LLM 中最强 decision F1 仅 0.31；discharge diagnosis F1 0.51 vs management F1 0.17；基于 MIMIC-IV v3.1 + MIMIC-IV-Note v2.2。HF 数据集页存在但 dataset 为空（2.5 kB），论文摘要未给出 GitHub。\n\n- 医疗 agent 长程评测基础设施\n- artifact 尚未就绪，落地置信低于 JAMEL/OpenWebRL"
    }
  ]
}
```

---

## 六、今日关键判断

GitHub 增速侧延续 Context 工具链（headroom、Understand-Anything），并新增 **microsoft/agent-governance-toolkit** 与 **Mirage** 统一 VFS——工具面从「减 token」扩展到「可挂载、可治理」。

同日大厂叙事集中在 harness 与安全部署：**Anthropic Glasswing** 扩伙伴、**OpenAI Codex 角色插件**、**NVIDIA×Microsoft** 统一 agentic 栈，安全扫描与 OS/云/边缘部署话术共振。

论文与模型侧，**JAMEL** 把 GUI 探索与 latent memory 收成联合训练闭环，**Cosmos 3 Physical AI** 权重上架 HF；综合来看，今日信号指向「压缩上下文带宽 + 统一工具/部署面 + 治理与安全 harness」三条主线并行。

---

## 七、深读 1 条

- **分级**：`[方向级]`
- **对象**：JAMEL — *Joint Agent Memory and Exploration Learning via Novelty Signals*（arXiv:2606.01528）
- **链接**：https://arxiv.org/abs/2606.01528 · https://github.com/MobileLLM/JAMEL · https://huggingface.co/papers/2606.01528
- **正文**：JAMEL 面向 GUI agent 在从未见过的 Web/App 上探索：传统 ReAct 要么外挂向量记忆、要么纯 RAG，很难在无标注数据下同时学好「往哪点」和「记住什么」。论文用 JS code coverage 等 persistent novelty 信号，联合训练 latent memory compressor（Qwen3-VL-2B）和 exploration policy（Qwen2.5-VL-7B），在 ScaleWoB 96 个 app（86 训 / 10 测）与 BrowserGym 动作空间上完成训练，代码 2026-06-02 开源。

  在 10 个未见 app、50 step 设定下，JAMEL-9B 平均 cumulative coverage reward 20.7，接近 Gemini 3.1 Flash-Lite ReAct-vision 的 20.9，明显高于 MAI-UI-8B 的 8.4；token 消耗约为 ReAct-vision 的 1/22。训练规模 24k samples / 86 apps；GitHub 页面仅 3 stars，尚处早期。

  对行业的影响在于把「探索策略 + latent memory」收成一条训练闭环，弱化「先探索完再挂向量库」的两段式 harness，尤其适合企业内网 GUI 缺标注轨迹的场景；与 OpenWebRL 的 live-web 多轮 RL 形成互补（JAMEL 偏 app 覆盖，OpenWebRL 偏浏览器任务链）。风险是 benchmark 外泛化与独立复现尚未验证。
- **知识库节点**：待建 `GUI-agent-memory-exploration`

---

## 八、跟进

- [ ] 观察 — headroom proxy 与 Mirage VFS 在同一 agent loop 的 token 与步骤数三角对照
- [ ] 观察 — Anthropic Claude Security 公开版 vs Mythos Preview 的能力边界与披露节奏
- [ ] 观察 — NVIDIA×Microsoft 统一栈 keynote 全文中的 GA 与 Windows 端运行时名单
- [ ] 观察 — JAMEL GitHub 独立 benchmark 复现（当前 3 stars）
- [ ] 升格 — [[GUI-agent-memory-exploration]]（若连续 ≥2 日有 GUI memory/探索论文或产品共振）

---

## 九、与昨日衔接

- 昨日：[[2026-06-02]] — Context 爆发（headroom、codegraph、Understand-Anything）；Anthropic S-1 + Codex 角色插件；RTX Spark / Cosmos 3 / OpenWebRL 深读
- 周信号：Context 压缩与预索引延续；今日新增 **治理 toolkit**、**Mirage VFS**、**Glasswing 扩伙伴** 与 **JAMEL** 深读，Harness 层从配置扩展到工具面统一与安全扫描

---

## 十、疑问 / 待查

- GitHub API 恢复后补核 affaan-m/ECC 总量 203,988 的 star-history（research 标中置信，未写入 JSON）
- Mirage HN 帖 48077914 讨论尚少，社区验证待观察
- ClinEnv HF 数据集为空，代码发布未核实
- SeClaw（2606.02302）preliminary + 0 stars，未写入 JSON
- Qwen3.7-Plus Vision Arena 排名、腾讯云价目表需对照官网
- Google/Meta 近 3 日无新高置信官方稿（research 范围说明）
