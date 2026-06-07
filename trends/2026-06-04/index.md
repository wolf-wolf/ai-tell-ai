---
tags: [trends, daily-insight]
aliases: []
date: 2026-06-04
stability: short
related: []
---

# AI 趋势日报 — 2026-06-04

> 观测窗口：2026-06-04（本地日历日）  
> 阅读目标：约 15–25 分钟  
> **Star 说明**：GitHub REST `/repos` 触发 403 限速；总 star 以仓库页快照为准，日/周增量仅来自 Trending「Built by」字段。

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
      "metric": "总 star ≈10,798；+3,530 stars today；+6,245 stars this week",
      "hook": "RAG 入口压缩日增 3530",
      "layer": "Context",
      "source_confidence": "高",
      "body": "headroom 在 tool output、日志、文件与 RAG chunk 进入 LLM 前做压缩，README 宣称 60–95% token 节省，并提供 library、proxy 与 MCP server。Trending 日榜 +3,530、周榜 +6,245，较昨日总量继续抬升，仍是 Agent/RAG 垂直最清晰的日增速信号。\n\n- Python 实现，日/周双榜前列\n- 与 codegraph 预索引互补：headroom 压 payload，图谱减检索轮次",
      "action": "在 RAG 链路上游接 headroom proxy，对照 bare chunk 的 tool call 解析错误率与召回"
    },
    {
      "tier": "选型级",
      "title": "colbymchenry/codegraph",
      "url": "https://github.com/colbymchenry/codegraph",
      "metric": "总 star ≈40,071；+9,796 stars this week",
      "hook": "多客户端代码图谱周增近万",
      "layer": "Context",
      "source_confidence": "高",
      "body": "codegraph 预索引代码知识图，面向 Claude Code、Codex、Gemini、Cursor、OpenCode、AntiGravity、Kiro、Hermes Agent 等，卖点是更少 token、更少 tool call、100% 本地。本周 +9,796 star 在 Agent 相关仓中居前，属 harness / context engineering 而非纯模型仓。\n\n- TypeScript 实现\n- 今日增量未核实，仅周增速有 Trending 证据",
      "action": "在自有 monorepo 对比 codegraph 与纯 grep 的首轮定位 token 与 tool call 次数"
    },
    {
      "tier": "选型级",
      "title": "affaan-m/ECC",
      "url": "https://github.com/affaan-m/ECC",
      "metric": "总 star ≈206,238；+2,141 stars today；+10,008 stars this week",
      "hook": "ECC harness 周增破万",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Everything Claude Code 定位 agent harness 性能优化——skills、instincts、memory、security、research-first development，覆盖 Claude Code、Codex、Opencode、Cursor 等。尽管总 star 已超 20 万，日增 +2,141、周增 +10,008 仍显著，说明社区仍在向「可配置 harness」堆叠而非换底座模型。\n\n- 列入依据为可验证新增 star 速度\n- 与 revfactory/harness 等 meta-skill 仓同轨",
      "action": "对照 ECC 的 security / memory 模块与自有 Claude Code skills 目录，评估是否减少长会话漂移"
    },
    {
      "tier": "选型级",
      "title": "supermemoryai/supermemory",
      "url": "https://github.com/supermemoryai/supermemory",
      "metric": "总 star ≈25,344；+600 stars today；+2,260 stars this week",
      "hook": "Memory API 日榜持续增量",
      "layer": "Context",
      "source_confidence": "高",
      "body": "supermemory 自述 Memory engine and app，并提供 Memory API for the AI era，TypeScript 实现。日增 +600、周增 +2,260，同时出现在 daily 与 weekly Trending，与 headroom 形成「压缩带宽 + 记忆层」并行升温。\n\n- 属 Agent 记忆/RAG 基础设施\n- 非模型权重仓",
      "action": "用 Memory API 替换现有向量记忆中间层，记录长会话 recall 与写入延迟"
    }
  ]
}
```

**数据源**：GitHub Trending（today/weekly）；Star 经仓库页核对。

---

## 二、GitHub 新颖探索（< 5k ★ 或新发布，含社区讨论）

```json
{
  "schema_version": 2,
  "kind": "github-novel",
  "signals": [
    {
      "tier": "选型级",
      "title": "negai-ai/agentclaw",
      "url": "https://github.com/negai-ai/agentclaw",
      "signal_type": "★ 314（2026-06-04 直访）",
      "hook": "声明式工作流+可复利 Claw",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "AgentClaw 在 Harness 上提供声明式 Workflow / LLMNode / router，支持一句话生成 agent、Dashboard、调度、知识库 RAG 注入、全局 memory，并可发布为 API/MCP。README 对比表强调相对 LangGraph 的「约定优于配置 + 内置前端/调试」、相对 OpenClaw 的「工作流框架 + 可定制 Claw」而非开箱桌面产品。\n\n- `agent_style=\"agentic\"` 时在 Harness 层做工具风险门控\n- 知识库/解析/检索内置于同一框架，非外接独立 ingest 管线",
      "action": "用 README 对比表列一条自有 LangGraph 流程，试迁移为 AgentClaw 声明式节点并记录调试面差异"
    },
    {
      "tier": "选型级",
      "title": "swarmclawai/swarmclaw",
      "url": "https://github.com/swarmclawai/swarmclaw",
      "signal_type": "★ 545（2026-06-04 直访）；HN item 47210887",
      "hook": "OpenClaw 编排面板嵌 LangGraph",
      "layer": "Harness",
      "source_confidence": "高",
      "community_url": "https://news.ycombinator.com/item?id=47210887",
      "body": "SwarmClaw 自述自托管 agent runtime/swarm，连接 OpenClaw 等 14+ 提供商，带 MCP、调度、委派，并在 dashboard 内嵌 LangGraph-powered multi-agent workflows。相对 LangGraph 不替代图编排，而是作 orchestration/management 层；相对 OpenClaw 提供一键安装脚本与多提供商面板。\n\n- Show HN 帖为本次唯一可核实社区讨论链\n- 与 AgentClaw「内置框架」路线形成「管理面板 vs 框架」分叉",
      "action": "若已跑 OpenClaw，用 HN 帖中的 install 路径试 SwarmClaw 多 agent 委派是否降低渠道切换成本"
    },
    {
      "tier": "工具级",
      "title": "CloudWide851/easy-agent",
      "url": "https://github.com/CloudWide851/easy-agent",
      "signal_type": "★ 120（2026-06-04 直访）；README v0.3.6",
      "hook": "白盒 Python Agent 运行时",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "easy-agent 明确为 runtime layer underneath an agent product，拆开 scheduler / orchestrator / harness / registry / SQLite 轨迹层，反对 opaque framework。支持 single_agent、sub_agent、graph workflow、Agent Teams，以及 initializer/worker/evaluator 长时 harness（checkpoint/replay/approval）。重心在 workflow.yml doctor/validate/plan/run、runs triage、OTel 导出等运维可观测，而非图 DSL 本身。\n\n- 不提供 OpenClaw 式聊天渠道/桌面产品\n- memory/checkpoint 一等公民，通过 MCP/skills 链入检索",
      "action": "在试点服务嵌入 easy-agent runtime，对照 LangGraph 同等任务的 trace 可导出字段是否满足 on-call triage"
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
      "signal": "Cosmos3-Nano 17,903 月下载、149 likes；发布 2026-05-31；Nano 16B / Super 64B",
      "hook": "Physical AI omni 世界模型",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Cosmos 3 以 Mixture-of-Transformers 统一文本、图像、视频、音频与 action 的物理世界生成与推理，替代此前 Cosmos Predict/Transfer/Reason/Policy 多模型流水线。Cosmos3-Nano 16B（8B reasoner + 8B generator）面向工作站级 RTX PRO 6000 等，Cosmos3-Super 64B 面向 Hopper/Blackwell；支持 Diffusers Cosmos3OmniPipeline 与 vllm-omni 容器。\n\n- 许可 OpenMDW 1.1；官方仅测试 BF16\n- 与消费级纯视频生成竞品不同，主攻机器人/AV 合成数据",
      "action": "若做具身或仿真数据管线，先读 Nano model card 算力门槛再决定是否接 Diffusers pipeline"
    },
    {
      "tier": "选型级",
      "title": "JetBrains Mellum2",
      "url": "https://huggingface.co/blog/JetBrains/mellum2-launch",
      "signal": "Blog 文内 6.94k 下载、186 likes；发布 2026-06-01；12B / 2.5B active/token",
      "hook": "12B MoE 专做 sub-agent",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Mellum2 为 12B 总参 / 2.5B active/token MoE（64 experts、每 token 8 experts），上下文 131,072，面向 routing、RAG 压缩/摘要、sub-agents 与高吞吐 coding，Apache 2.0。JetBrains 称相对同尺寸模型 >2× 推理加速（arxiv:2605.31268）；含 Base / Instruct / Thinking 变体。\n\n- 非多模态 frontier\n- 适合 IDE 内嵌或私有部署的高频中间步骤",
      "action": "用 Mellum2-Instruct 替换现有 sub-agent 规划调用，记录延迟与下游主模型 token 节省"
    },
    {
      "tier": "选型级",
      "title": "google/gemma-4-12B",
      "url": "https://huggingface.co/google/gemma-4-12B",
      "signal": "google/gemma-4-12B：10 月下载、175 likes；lastModified 2026-06-03；encoder-free 12B",
      "hook": "Gemma4 12B 本地多模态",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Gemma 4 12B Unified 为 encoder-free 多模态密集模型（约 11.95B），256K context，原生文本+图像+视频帧+音频，支持 function calling 与 thinking 模式。Google 称约 16GB VRAM/统一内存可本地跑；Apache 2.0，生态覆盖 Transformers、llama.cpp、MLX、SGLang、vLLM 等，家族级 MTP drafters 提速。\n\n- 与 Gemma 4 E4B（独立 encoder）及 Qwen3-Omni 同档竞争\n- HF 博文强调与 agents/inference engines 集成",
      "action": "在 16GB 档机器试 gemma-4-12B 本地 agent loop，对照云 API 的多模态 tool call 延迟"
    },
    {
      "tier": "选型级",
      "title": "H Company Holo3.1",
      "url": "https://huggingface.co/blog/hcompany/holo31",
      "signal": "发布 2026-06-02；集合 8 items、18 likes；0.8B–35B-A3B",
      "hook": "GUI Agent 量化本地栈",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Holo3.1 为基于 Qwen 族的 GUI computer-use VLM，覆盖 web/desktop/mobile，支持 function-calling 与 JSON 输出；尺寸 0.8B / 4B / 9B / 35B-A3B，35B 首次提供 FP8、Q4 GGUF、NVFP4 量化。博文称 NVFP4 在 DGX Spark 上约 1.41× FP8 吞吐，特定 harness 下 agent step 6.8s→3.3s（厂商自述，未独立核实 benchmark）。\n\n- 可与 Holo Models API 或 HF collection 部署\n- 许可需逐卡核对，本次抓取未展开",
      "action": "在目标 OS 上试 9B Q4 本地 agent，对照云 API 的 screen 任务成功率与单价"
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
      "hook": "Anthropic 秘交 S-1 草案",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Anthropic, PBC 于 2026-06-01 向美国 SEC 秘密提交 Form S-1 草案，拟进行普通股 IPO；公司称 SEC 审查完成后可选择上市，实际发行取决于市场条件等因素。公告明确不构成出售或购买证券要约（Rule 135）。第三方媒体报道 Series H 融资与估值、收入 run-rate 等未在官方 S-1 公告中核实。\n\n- 资本市场结构变化，非模型技术发布\n- 与 OpenAI、SpaceX 同期 IPO 叙事形成「御三家」竞速背景",
      "action": "企业采购侧跟踪 SEC 公开稿披露节奏，避免仅凭媒体估值预测调整年度 API 预算"
    },
    {
      "tier": "选型级",
      "entity": "OpenAI",
      "url": "https://openai.com/index/codex-for-every-role-tool-workflow/",
      "event": "2026-06-02；Codex 周活 >500 万；非开发者约 20%、增速约为开发者 3×",
      "hook": "Codex 六角色插件扩职能",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "OpenAI 2026-06-02 发布数据分析、创意、销售、产品设计、公募投资、投行等 6 个角色向 Codex 插件，捆绑 62 个应用与 110 项 skills；官方称 Codex 周活 >500 万，非开发者用户约占 20% 且增速约为开发者 3×。同步推出 Sites（Business/Enterprise 预览）与 Annotations（对文档/表格/幻灯片就地精修）。\n\n- 把 Codex 从纯编码 harness 扩到企业知识工作流\n- 与 2026-06-01 AWS Bedrock GA 形成云治理 + 职能扩展双线",
      "action": "选一条非开发 chore 试角色插件，对照 hand-written skills 的稳定性与审批流"
    },
    {
      "tier": "选型级",
      "entity": "Google",
      "url": "https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemma-4-12b/",
      "event": "2026-06-03；Gemma 4 系列累计下载 >1.5 亿；本地约 16GB；Apache 2.0",
      "hook": "Gemma4 12B 无编码器多模态",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Google 2026-06-03 发布 Gemma 4 12B：vision/audio 直接进 LLM backbone（无独立 multimodal encoder），宣称 benchmark 接近更大 26B MoE、内存约为后者一半。配套 Gemma Skills Repository、Hugging Face/Kaggle 权重与多推理栈支持，面向本地 agent 与开发者工具链。\n\n- 与同日 HF `google/gemma-4-12B` 权重上架共振\n- 边缘/本地 agent 基建信号强于 frontier 闭源模型",
      "action": "对照 Gemma Skills Repository 与自有 Claude Code skills，评估 12B 本地多模态是否承担 sub-agent 角色"
    },
    {
      "tier": "选型级",
      "entity": "NVIDIA + Microsoft",
      "url": "https://blogs.nvidia.com/blog/microsoft-build-windows-local-cloud-devices/",
      "event": "2026-06-02；RTX Spark 宣称 1 petaflop、最高 128GB 统一内存；DGX Station for Windows 最高 748GB、20 petaflops FP4",
      "hook": "NV×MS 端云统一 Agent 栈",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Jensen Huang 远程参与 Satya Nadella Build keynote，扩展 NVIDIA–Microsoft 合作：RTX Spark / DGX Station for Windows 面向本地 agent，集成 NVIDIA OpenShell 安全运行时（含 GitHub Copilot）。Nemotron 3 Ultra 等开放模型上 Microsoft Foundry；Fabric Data Warehouse SQL 官方内测称最高 6–7× 快于 CPU 基线（Microsoft 内测，非第三方审计）。\n\n- 与 GitHub 侧 headroom/codegraph 本地上下文工具链叙事衔接\n- 性能倍数为合作方内测表述，置信度中",
      "action": "跟踪 Build 材料中 OpenShell 与 Copilot 的 GA 范围，再决定是否调整 Windows 端 agent 运行时选型"
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
      "entity": "Anthropic / 钛媒体",
      "url": "https://www.tmtpost.com/8013199.html",
      "event": "转述 2026-06-01 秘密提交 S-1；估值 9650 亿美元等为媒体转述",
      "hook": "御三家 IPO 竞速中文解读",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "钛媒体转述 Anthropic 6 月 1 日秘密提交 S-1，强调抢在 OpenAI 之前进入公开市场叙事，并援引 WSJ/FT 等对募资体量、与 SpaceX/OpenAI 同期 IPO 预期的行业判断。核心递交事实可对照 https://www.anthropic.com/news/confidential-draft-s1-sec；估值与募资预测为媒体分析，非 SEC 公开稿。\n\n- 国内传播层偏资本与算力军备，非模型细节\n- 与英文官方公告同属一条主线",
      "action": "仅以官方 SEC 公开稿更新内部融资/采购假设，不把媒体估值写入技术选型文档"
    },
    {
      "tier": "选型级",
      "entity": "阿里云 / 千问",
      "url": "https://www.163.com/dy/article/KUGNMJ6M0534A4SC.html",
      "event": "报道 2026-06-03；千问 APP 向第三方 Agent/Skill 开放",
      "hook": "千问 APP 开放第三方 Agent",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "界面新闻（网易转载）称千问 APP 宣布向第三方 Agent、Skill 开放，企业可运营品牌 Agent（人设、服务边界、记忆与主动规划），场景包括行程提醒、权益到期、复购推荐等；首批测试接入瑞幸、肯德基、蜜雪冰城、东航等为报道列举，各品牌已上线状态未核实。未检索到 alibabacloud.com / tongyi 官网同日对等 press release。\n\n- 国内超级应用 agent 分发信号\n- 与 Meta Business Agent Platform 商业消息 agent 形成中外对称叙事",
      "action": "待补阿里云官方稿后，再评估是否把千问 Agent 接入层纳入企业客服/运营选型"
    },
    {
      "tier": "方向级",
      "entity": "量子位 / OpenAI",
      "url": "https://www.qbitai.com/2026/06/427238.html",
      "event": "量子位稿；部分岗位基础年薪 21–31 万美元（报道表述）",
      "hook": "OpenAI 机器人赛道重启",
      "layer": "Model",
      "source_confidence": "中",
      "body": "量子位报道称 OpenAI 重启机器人赛道，开放电气、仿真环境、执行器设计、控制系统软件等岗位，团队由 World Simulation 转型为 OpenAI Robotics（报道叙述）。薪酬与组织细节需以 OpenAI 招聘页为准；奥特曼 X 帖文为报道引用，非 OpenAI 官方新闻稿。\n\n- 与 NVIDIA Cosmos 3 Physical AI 权重形成模型侧 + 组织侧共振\n- 属招聘信号，非产品 GA",
      "action": "跟踪 OpenAI 官方是否发布 Robotics 专文，避免仅凭招聘页推断产品路线图"
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
      "title": "SaliMory: Orchestrating Cognitive Memory for Conversational Agents",
      "url": "https://arxiv.org/abs/2606.04120",
      "repo_url": "https://github.com/facebookresearch/SaliMory",
      "hook": "Meta 认知结构对话记忆",
      "layer": "Context",
      "source_confidence": "高",
      "body": "Meta Reality Labs（Submitted 2026-06-02）提出 SaliMory：认知结构记忆（事实 / 偏好 / working memory）+ 分阶段 process reward + GRPO 对比精炼；9B 政策模型 + 冻结 Qwen3-235B 生成器。LoCoMo + 新 benchmark LoCoMo-P13n 上 E2E accuracy 72.9%、Good Personalization 39.8%，memory-attributed failures 约减 1/3。代码标注 To be released，仓库可访问性未核实。\n\n- 面向 conversational agent 长期记忆编排\n- 与 supermemory 等工程记忆层形成「论文闭环 vs 产品 API」对照"
    },
    {
      "tier": "选型级",
      "title": "What Makes Interaction Trajectories Effective for Training Terminal Agents? (Terminal-Lego)",
      "url": "https://arxiv.org/abs/2606.03461",
      "repo_url": "https://stephen0808.github.io/terminal-lego.github.io/",
      "hook": "1/30 数据量达 Terminal SOTA",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "华为 + 港大 + NTU 等（Submitted 2026-06-02）：15.3k Terminal-Lego 轨迹微调 Qwen3-32B，Terminal-Bench 2.0 达 24.3%（约为此前 SOTA 数据量的 1/30）。提出 Pedagogical paradox——教师 standalone 分数高不等于蒸馏效果好；Environment-Grounded Supervision 与 TOR 指标；DeepSeek-V3.2 教师 TOR 13.4% vs Claude Opus 4.6 2.5%。数据管线 StackOverflow → Docker 验证任务（90+ 领域）。\n\n- 终端 agent 数据效率与教师选择方法论\n- 项目页为官方 artifact 入口"
    },
    {
      "tier": "方向级",
      "title": "Joint Agent Memory and Exploration Learning via Novelty Signals (JAMEL)",
      "url": "https://arxiv.org/abs/2606.01528",
      "repo_url": "https://github.com/MobileLLM/JAMEL",
      "hook": "GUI 探索+记忆联合训练",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "清华 + 百度 + 北大等（Submitted 2026-06-01）：用 GUI code coverage 作为 novelty 监督，联合训练 latent memory 与探索策略；ScaleWoB 测试集 50 步/session 平均 cumulative coverage reward 20.7，对比 ReAct-vision 20.9、MAI-UI-8B 8.4；训练 24k 样本 / 86 应用；token 约为 Mobile-Agent-v3.5 的 1/2.76。开源 https://github.com/MobileLLM/JAMEL。\n\n- 与昨日日报深读对象延续，属同类信号加强\n- 弱化「先探索完再挂向量库」两段式 harness"
    },
    {
      "tier": "方向级",
      "title": "The Ghost Couple: Correlated LLM Name Priors and Their Haunting of the Web and Academic Publishing",
      "url": "https://arxiv.org/abs/2606.02184",
      "hook": "LLM 幽灵作者污染学术",
      "layer": "Context",
      "source_confidence": "高",
      "body": "Samsung AI Center Warsaw + 华沙大学（Submitted 2026-06-01）：Claude pair-prompt 中 Elena Vasquez + Marcus Chen 共现峰值 23%（sonnet-4-20250514）；Zenodo 1,655 条 ghost-authored 记录、991 条在 2026-03 单月注册，含真实 DataCite DOI。与 agent 训练无直接关系，但对合成数据、学术诚信、内容溯源高相关。\n\n- 模型族相关「幽灵角色」先验 + 版本边界抑制\n- HN 专帖未核实"
    }
  ]
}
```

---

## 六、今日关键判断

GitHub 增速延续 **Context 带宽战**：headroom 日增进一步抬升至 +3,530，codegraph 周增 +9,796 与 ECC 周增 +10,008 并列，说明社区仍在为 coding agent 堆「压缩 + 预索引 + harness 配置」，而非换底座模型。新颖探索侧出现 **AgentClaw / SwarmClaw / easy-agent** 三条分叉——声明式框架、OpenClaw 编排面板、白盒 runtime——Harness 层从「单产品」拆成可嵌入与可治理组件。

HF 与英文大厂在同周叠加 **本地可跑多模态 + 子 agent 专用小模型**：Gemma 4 12B、Mellum2 与 Holo3.1 量化 GUI 权重，对齐 NVIDIA×Microsoft 端云统一 agent 栈与 Anthropic S-1 资本化叙事。论文侧 **SaliMory** 把对话记忆收成认知结构 + RL 精炼，与 **Terminal-Lego** 的轨迹数据效率方法论，分别补上 Context 与终端 Harness 的理论锚点。

综合信号：今日主线仍是「压 Context 出口 + 统一工具/部署面 + 记忆与轨迹数据方法论」三线并行；与 2026-06-03 相比，增速数字上移、新颖探索从 VFS/治理扩展到 **声明式工作流与 OpenClaw 编排层**。

---

## 七、深读 1 条

- **分级**：`[选型级]`
- **对象**：SaliMory — *Orchestrating Cognitive Memory for Conversational Agents*（arXiv:2606.04120）
- **链接**：https://arxiv.org/abs/2606.04120 · https://github.com/facebookresearch/SaliMory（To be released） · https://huggingface.co/papers/2606.04120
- **正文**：长期对话 agent 的失败常归因于记忆：外挂向量库难以区分事实、偏好与当下任务上下文，检索噪声会直接污染下一轮规划。SaliMory 由 Meta Reality Labs 提出，用认知结构化的 memory（事实 / 偏好 / working memory）承载不同半衰期的信息，并以分阶段 process reward 与 GRPO 对比精炼，让 9B 规模的 policy 模型在冻结 Qwen3-235B 生成器之上学会「何时写入、何时召回、何时遗忘」。

  在新 benchmark LoCoMo-P13n（可个性化查询）与 LoCoMo 上，论文报告 E2E accuracy 72.9%、Good Personalization 39.8%，并将 memory-attributed failures 约削减三分之一。工程上仍处早期：官方 GitHub 标注 To be released，尚无法像 supermemory 一样直接接入生产流水线。

  对 Agent 栈的影响在于把「记忆 API」推进到可训练的编排层，与 JAMEL 的 GUI 探索记忆、headroom 的 payload 压缩形成「结构记忆 + 探索记忆 + 带宽压缩」三角；局限是依赖大生成器冻结、复现成本与真实产品对话分布可能偏离 LoCoMo 系列。待代码发布后值得对照自有长会话日志做 failure attribution 复现。
- **知识库节点**：待建 `cognitive-structured-agent-memory`

---

## 八、跟进

- [ ] 观察 — headroom 日增 +3,530 是否带动更多 MCP/proxy 集成示例
- [ ] 观察 — SaliMory 官方仓库发布与 LoCoMo-P13n 数据可用性
- [ ] 观察 — Anthropic SEC 公开 S-1 全文与股数定价披露
- [ ] 观察 — 千问 APP 第三方 Agent 开放是否有阿里云官方 press release
- [ ] 升格 — [[cognitive-structured-agent-memory]]（若记忆编排论文/产品连续 ≥2 日共振）

---

## 九、与昨日衔接

- 昨日：[[2026-06-03]] — headroom/codegraph 增速、Mirage VFS、agent-governance-toolkit、Glasswing 扩伙伴；深读 JAMEL
- 周信号：Context 压缩与预索引延续（headroom、codegraph、ECC 周增破万）；Harness 从治理扩展到 **AgentClaw/SwarmClaw 声明式与编排**；模型侧 **Gemma4 12B + Mellum2** 本地/sub-agent 槽位；深读由 JAMEL 转向 **SaliMory 认知记忆**

---

## 十、疑问 / 待查

- GitHub API 恢复后补核 colbymchenry/codegraph 总 star 与 star-history斜率
- revfactory/harness、oh-my-pi、tastyeffectco/sandboxes 有周增速或新建信号但本次 JSON 未写入（控篇幅）
- FLARE（2606.01774）摘要置信度为中，未写入 JSON
- OpenAI 跨芯片调度抽象层报道（163 转载）置信度为低，未写入 JSON
- Holo3.1 各 model card 许可证与 benchmark 数字需独立核对
- 机器之心 2026-06-01～06-04 未命中可核实 bigtech 首发稿
