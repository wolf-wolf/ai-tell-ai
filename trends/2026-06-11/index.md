---
tags: [trends, daily-insight]
aliases: []
date: 2026-06-11
stability: short
related: []
---

# AI 趋势日报 — 2026-06-11

> 观测窗口：2026-06-11（本地日历日）  
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
      "title": "addyosmani/agent-skills",
      "url": "https://github.com/addyosmani/agent-skills",
      "metric": "GitHub Trending Daily #1；+821 stars today；API 总 star 52,676",
      "hook": "工程skill包夺日榜第一",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "agent-skills 汇集面向 AI coding agent 的生产级工程 skill（Shell 形态分发），2026-06-11 日榜 #1、日增 +821，总 star 52,676。日榜冠军从 last30days-skill 切换至「工程方法论 + skill 模板」类仓库，说明社区热度从「研究检索 skill」扩散到「可复用工程实践 skill」。\n\n- 最近 push 2026-06-11\n- 与 obra/superpowers、phuryn/pm-skills 同日高增速，形成 skill 垂直多榜共振",
      "action": "选一条 code review 或 release 流程，对照 agent-skills 中对应 skill 与自建 SKILL.md 的步数与输出质量"
    },
    {
      "tier": "选型级",
      "title": "mvanhorn/last30days-skill",
      "url": "https://github.com/mvanhorn/last30days-skill",
      "metric": "Daily +2,535 stars today；Weekly +11,732 stars this week；API 总 star 39,323",
      "hook": "研究skill日增仍超2500",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "last30days-skill 虽让出日榜 #1，日增仍达 +2,535、周增 +11,732，总 star 39,323（较 6/10 的 37,410 再涨约 +1.9k）。跨平台 30 天窗口 synthesize 仍是 Agent 研究层标杆 install。\n\n- 最近 push 2026-06-10\n- 与 Agent-Reach（周 +5,021）继续构成「读网 + synthesize」双轨",
      "action": "把一条重复性调研任务拆成 last30days-skill 与 addyosmani/agent-skills 中 research 类 skill 对照"
    },
    {
      "tier": "选型级",
      "title": "chopratejas/headroom",
      "url": "https://github.com/chopratejas/headroom",
      "metric": "GitHub Trending Weekly +13,062 stars this week；API 总 star 22,192",
      "hook": "Context压缩周增破1.3万",
      "layer": "Context",
      "source_confidence": "高",
      "body": "headroom 周榜 +13,062、总 star 22,192（较 6/10 的 20,608 再涨约 +7.7%），仍是本周 Agent 垂直 Context 层最高增速档。library / proxy / MCP 三形态在 tool output 与 RAG chunk 入口做 60–95% 压缩叙事未衰减。\n\n- 最近 push 2026-06-11\n- 与 Fable 5 等长上下文模型发布形成「模型窗口变大 + harness 仍压 payload」张力",
      "action": "在 RAG 链路上游接 headroom MCP，对照 bare chunk 的召回率与 tool call 解析错误率"
    },
    {
      "tier": "选型级",
      "title": "obra/superpowers",
      "url": "https://github.com/obra/superpowers",
      "metric": "Daily Trending +1,104 stars today；API 总 star 223,950",
      "hook": "agentic技能框架日增破千",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "superpowers 定位「agentic skills framework & software development methodology」：不仅是 skill 集合，还附带软件开发方法论。日增 +1,104 与 agent-skills、pm-skills 同日上榜，指向 harness 层竞争从单 skill 升级为「框架 + 方法论 + skill 市场」。\n\n- 最近 push 2026-06-11\n- 总 star 已超 22 万，增速仍高说明新用户持续涌入",
      "action": "读 superpowers 的 skill 发现/激活约定，对照自有 Claude Code 项目的 SKILL.md 目录结构"
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
      "tier": "方向级",
      "title": "activeloopai/hivemind",
      "url": "https://github.com/activeloopai/hivemind",
      "signal_type": "★ 953（2026-06-11）；Daily Trending +64",
      "hook": "多agent统一记忆脑",
      "layer": "Context",
      "source_confidence": "中",
      "body": "hivemind 口号「One brain for all your agents」：Activeloop 近几日新建仓库，953 star，试图做跨 agent 的统一记忆/协调层。与 supermemory、Mem0、[[agentmemory]] 同属 memory 子栈，但强调多 agent 共享同一「脑」。\n\n- README 与 API 细节仍少，置信度「中」\n- 日榜出现说明社区对「多 agent 记忆中枢」仍有增量需求",
      "action": "跟踪 README 是否公布存储后端与 MCP 接口，再决定是否 PoC"
    },
    {
      "tier": "选型级",
      "title": "phuryn/pm-skills",
      "url": "https://github.com/phuryn/pm-skills",
      "signal_type": "★ 15,469（2026-06-11）；Daily +804；Weekly +2,056",
      "hook": "PM技能市场日增804",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "pm-skills 提供 100+ agentic skills/commands/plugins，覆盖 discovery→strategy→execution→launch→growth 全 PM 链路。日增 +804 进入日榜前列，说明 skill 包正垂直分化到「产品经理工作流」而非仅工程编码。\n\n- 与 addyosmani/agent-skills（工程向）、last30days-skill（研究向）形成三角",
      "action": "选一条 PRD/竞品分析任务，试装 pm-skills 中对应 command，记录与裸 Claude 的产出差异"
    },
    {
      "tier": "工具级",
      "title": "luongnv89/claude-howto",
      "url": "https://github.com/luongnv89/claude-howto",
      "signal_type": "★ 36,683（2026-06-11）；Daily +211",
      "hook": "Claude Code可视化教程仓",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "claude-howto 是面向 Claude Code 的可视化、示例驱动教程仓（copy-paste 模板），日增 +211。总 star 已超 3.6 万，归入新颖探索因增速与「降低 agent 上手门槛」叙事相关，而非 <5k 新仓。\n\n- Python 为主，偏教育/模板分发\n- 与 skill 仓库互补：howto 教用法，skill 教执行",
      "action": "从新手上手场景挑 1 个模板跑通，评估是否可并入团队 onboarding 文档"
    },
    {
      "tier": "选型级",
      "title": "google/skills",
      "url": "https://github.com/google/skills",
      "signal_type": "★ 13,414（2026-06-11）；Daily +211；Weekly 持续上榜",
      "hook": "Google官方skill仓库",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "google/skills 提供面向 Google 产品与技术栈的 Agent Skills，总 star 13,414。与 AAIF/MCP 标准叙事、last30days-skill 等社区 skill 形成「官方技能包 + 社区技能包」双轨；日增 +211 说明仍在扩散期。\n\n- 最近 push 2026-06-10\n- 选型时须核对 skill 与自家 GCP/Gemini 栈的依赖",
      "action": "若有 Gemini API 项目，试装 1 个 google/skills 条目并记录与裸 function call 的差异"
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
      "title": "Qwen/Qwen3.6-35B-A3B",
      "url": "https://huggingface.co/Qwen/Qwen3.6-35B-A3B",
      "signal": "Trending 榜前列；downloads 维持百万级；Apache 2.0",
      "hook": "Agentic Coding MoE仍占位",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Qwen3.6-35B-A3B 仍在 HF Trending 前列，是本地 Agentic Coding loop 的默认 open-weight 候选之一。35B total / ~3B active MoE，SWE-bench Verified 73.4% 等指标在 model card 可查。\n\n- 与 Claude Fable 5 闭源旗舰形成「云 API vs 本地 MoE」选型对照\n- 适合作为 headroom 压缩后的下游模型做 token 经济性实验",
      "action": "在同一 harness 下对照 Qwen3.6-35B-A3B 与 gemma-4-31b-it 的 function call JSON 合规率"
    },
    {
      "tier": "方向级",
      "title": "NVIDIA Cosmos 3",
      "url": "https://huggingface.co/blog/nvidia/cosmos-3-for-physical-ai",
      "signal": "Physical AI；Cosmos3-Nano 16B / Super 64B；Trending 持续",
      "hook": "Physical AI权重仍热",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Cosmos 3 统一 world gen + physical reasoning + action，仍在 Trending。与中文原力灵机×Atomix「Picking 数据飞轮」、工信部万台级具身政策形成模型—场景—政策三线。\n\n- Diffusers Cosmos3OmniPipeline 可接\n- 与 GUI agent 权重（Holo3.1）分属 Physical vs digital 两条线",
      "action": "若做机器人/AV 合成数据，先读 Cosmos3-Nano model card 算力门槛"
    },
    {
      "tier": "选型级",
      "title": "HuggingFace SkillOpt paper",
      "url": "https://huggingface.co/papers/2606.08112",
      "signal": "HF Trending Papers；SkillOpt: Executive Strategy for Self-Evolving Agent Skills",
      "hook": "自进化skill策略论文",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "SkillOpt 登上 HF Trending Papers：提出 agent skill 的「执行层策略」自进化框架，与 GitHub 上 superpowers、agent-skills、hermes Skills Hub 等工程实践同频——skill 不只是静态 SKILL.md，而是可迭代优化的策略对象。\n\n- arXiv 编号以 HF papers 页为准\n- 与 obra/superpowers 方法论仓库形成论文—工程呼应",
      "action": "读 SkillOpt 摘要中的进化循环定义，对照自有 skill 是否缺「评估—改写」闭环"
    },
    {
      "tier": "选型级",
      "title": "google/gemma-4-31b-it",
      "url": "https://huggingface.co/google/gemma-4-31b-it",
      "signal": "Trending；Image-Text-to-Text 31B；近 1 日有更新",
      "hook": "Gemma4多模态占榜",
      "layer": "Model",
      "source_confidence": "高",
      "body": "gemma-4-31b-it 维持 Trending，竞争本地 vision+tool 混合 agent 槽位。Apple WWDC 后「系统级 Visual Intelligence + 可选第三方模型」叙事抬升多模态本地权重关注度。\n\n- 许可与商用条款需读 model card\n- 与 Qwen3.6 纯文本 Agentic Coding 差异化",
      "action": "若有 vision+tool 混合 agent，对照 gemma-4-31b-it 与 Qwen3.6 在同 harness 下的 GUI 任务成功率"
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
      "url": "https://www.anthropic.com/news/claude-fable-5-mythos-5",
      "event": "官方发布日期 2026-06-09；Claude Fable 5 GA + Claude Mythos 5 受限发布；定价 $10/$50 per M tokens",
      "hook": "Mythos级Fable5公开发布",
      "layer": "Model",
      "source_confidence": "高",
      "body": "Anthropic 发布 Mythos-class 双模型：Claude Fable 5（`claude-fable-5`）面向公众，含安全分类器，高风险域（网络安全、生物、化学）自动路由至 Opus 4.8；Claude Mythos 5 同权重但部分护栏解除，限 Project Glasswing 等受信伙伴。定价 $10/M input、$50/M output；至 6/22 Pro/Max/Team/Enterprise 计划内暂免额外费用。\n\n- 与 6/4 递归自改进警告形成「能力发布 + 治理叙事」同周共振\n- API 集成须处理 Fable 5 refusal 与 fallback 逻辑",
      "action": "在一条长程 agent 任务上 A/B Fable 5 与 Opus 4.8，记录 refusal 率、fallback 触发与总成本"
    },
    {
      "tier": "方向级",
      "entity": "Apple",
      "url": "https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/",
      "event": "WWDC 2026-06-09/10；Siri AI 开发者测试即日起；媒体 6/11 报道股价回调",
      "hook": "Siri AI余波与市场预期",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Apple 发布 Siri AI：personal context、onscreen awareness、跨 app action、专用 Siri app；开发者测试随 iOS 27 beta 开放。6/11 外媒称 WWDC 后股价小幅回落，反映市场对「相对 ChatGPT/Gemini 的差异化是否足够」的再定价，而非产品未发布。\n\n- EU DMA 下 iOS/iPadOS 暂不提供 Siri AI\n- 与 GitHub skill/OS agent 叙事形成 consumer vs developer 双轨",
      "action": "若有 Supported Device，在 Developer Beta 测 cross-app action 失败恢复，勿仅凭股价报道判断产品成熟度"
    },
    {
      "tier": "方向级",
      "entity": "OpenAI",
      "url": "https://fortune.com/2026/06/09/openai-files-confidential-s-1-sec-ipo/",
      "event": "2026-06-08/09 秘密递交 S-1；6/11 媒体持续报道与 Anthropic、SpaceX IPO 线并列",
      "hook": "三巨头IPO叙事并行",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "OpenAI 已秘密递交 S-1，与 Anthropic（6/1）、SpaceX/xAI（媒体称 6/11 定价窗口）形成 2026 年中「AI 独角兽公开市场」并行线。OpenAI 声明尚未决定 timing，部分战略在私有状态更易完成。\n\n- 资本市场叙事，非模型 changelog\n- 企业 API 采购应跟踪 SEC 公开稿而非媒体估值标题",
      "action": "采购侧建立 SEC 披露 watchlist，避免按传闻估值调整年度预算"
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
      "entity": "原力灵机 / Atomix",
      "url": "https://www.qbitai.com/2026/06/432417.html",
      "event": "量子位等 6 月初报道；并购 Atomix + 智谱/阶跃/商汤/阿里投资；6/15 计划发布仓储三级分拣系统",
      "hook": "具身Picking数据飞轮",
      "layer": "Model",
      "source_confidence": "高",
      "body": "原力灵机并购物流机器人 Atomix，头部大模型厂商集体押注；路线主张 Picking 是具身的 Coding——真实仓储 picking 数据回流 DM0 具身模型。合并后「北京+海外五地」架构，Atomix 在 20+ 国 500+ 项目数据作训练燃料。\n\n- 报道略早于严格 3 日，仍属本周中文主信号\n- 与 HF Cosmos 3、工信部万台级政策同频",
      "action": "关注 6/15 三级分拣系统是否公开 DM0 接口与数据闭环指标"
    },
    {
      "tier": "方向级",
      "entity": "工信部 / 国务院国资委",
      "url": "https://www.163.com/dy/article/KV1UE8460514R9P4.html",
      "event": "澎湃新闻 2026-06-10；人形机器人与具身智能实景实训专项行动",
      "hook": "万台级具身落地目标",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "工信部与国资委专项行动：到 2026 年底带动万台级人形机器人落地能力，2026 年为「商业验证元年」。政策量化指标与民间原力灵机合并叙事相互印证。\n\n- 政策文件，非单家公司发布\n- 选型具身栈时可对照「代表性场景」清单",
      "action": "若做具身/物流 agent，对照专项行动场景评估产品 fit"
    },
    {
      "tier": "工具级",
      "entity": "Google（中文二次传播）",
      "url": "https://github.com/google/skills",
      "event": "GitHub 仓库 2026-06-11 API 总 star 13,414；Agent Skills for Google products",
      "hook": "Google技能包中文圈扩散",
      "layer": "Harness",
      "source_confidence": "中",
      "body": "google/skills 在中文社区随「skill 包日」讨论二次传播：官方 Agent Skills 覆盖 Google 产品与技术栈。与 AAIF、MCP 标准讨论同屏出现，但本条为 **仓库增速信号** 而非 Google 新闻稿。\n\n- 置信度「中」：无独立中文官方通稿，靠 GitHub 指标核实\n- 与 last30days-skill、agent-skills 构成中外 skill 分发对照",
      "action": "有 GCP 项目时试装 1 个 skill，记录与社区 skill 的维护频率差异"
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
      "title": "SkillOpt: Executive Strategy for Self-Evolving Agent Skills",
      "url": "https://arxiv.org/abs/2606.08112",
      "repo_url": null,
      "hook": "skill自进化执行策略",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "SkillOpt 研究 agent skill 如何通过「执行层策略」自进化：将 skill 视为可评估、可改写的策略对象而非静态 prompt 附件。HF Trending 与 GitHub superpowers/agent-skills 同日共振，论文侧给出形式化框架。\n\n- arXiv cs.AI 近批次；编号以 arxiv 页为准\n- 工程落地需自备评估集与改写护栏",
      "action": "读 SkillOpt 的方法节，对照自有 skill 目录是否缺「执行后评分→改写」环节"
    },
    {
      "tier": "方向级",
      "title": "How AI Agents Reshape Knowledge Work: Autonomy, Efficiency, and Scope",
      "url": "https://arxiv.org/abs/2606.07489",
      "repo_url": null,
      "hook": "Perplexity生产级agent实证",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Perplexity/HBS 生产数据：Computer agent median 自主 26 分钟 vs Search 33 秒；matched pairing 下任务时间 -87%、不满率 -55%。与 Fable 5 强调的 long-horizon agentic work 产品定位一致。\n\n- arXiv 2026-06-05 提交；6/11 仍为 fresh\n- harness 设计应校准 20+ 分钟 loop 的 checkpoint",
      "action": "用该文 median 26min 重新设计 tool budget 与 human-in-the-loop 节奏"
    },
    {
      "tier": "方向级",
      "title": "Agentic Monte Carlo: Test-Time RL for Black-Box LLM Agents",
      "url": "https://arxiv.org/abs/2606.05296",
      "repo_url": "https://github.com/layer6ai-labs/Agentic-Monte-Carlo",
      "hook": "SMC黑盒agent test-time RL",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "Layer 6 Labs 用 Sequential Monte Carlo 做黑盒 LLM agent 的 test-time RL；WebShop AMC 0.625 vs ReAct 0.159。面向无法微调权重的 agent 栈，与「堆 skill + 压 context」路线互补。\n\n- ICML 2026 accepted；代码仓库可查",
      "action": "在 WebShop 子集复现 AMC vs ReAct baseline"
    },
    {
      "tier": "选型级",
      "title": "Latent Reasoning with Normalizing Flows (NF-CoT)",
      "url": "https://arxiv.org/abs/2606.06447",
      "repo_url": null,
      "hook": "Meta参与连续thought推理",
      "layer": "Model",
      "source_confidence": "高",
      "body": "NF-CoT 用 normalizing flow 在 backbone 内建模连续 thought，降低中间推理 token 同时提升 coding benchmark pass rate。与 Fable 5 等闭源推理模型形成开源推理结构创新对照。\n\n- cs.CL + cs.LG；2026-06-04",
      "action": "对照 NF-CoT 与 explicit-CoT 的 token/正确率 Pareto"
    }
  ]
}
```

---

## 六、今日关键判断

今日 GitHub 增速出现 **skill 垂直「日榜换王」**：addyosmani/agent-skills 夺日榜 #1（+821），last30days-skill 让位但日增仍 +2,535；obra/superpowers（+1,104）、phuryn/pm-skills（+804）同日上榜，说明社区从「单一神 skill」扩散到 **工程 / 研究 / 方法论 / PM** 多细分 skill 包。headroom 周增 +13,062 延续 Context 压缩主轴，与 Fable 5 等「更长上下文、更重 agentic」模型发布形成「模型窗口↑、harness 仍压 payload」张力。

大厂侧，Anthropic **Fable 5 / Mythos 5**（6/9 官方）是本周最强模型信号：Mythos-class 能力首次以带分类器路由的 Fable 5 向公众开放，Mythos 5 限 Glasswing；定价翻倍于 Opus 4.8。Apple Siri AI WWDC 余波进入 **市场预期消化期**（6/11 媒体报道股价回调），不等于功能未交付。OpenAI S-1 与 SpaceX/Anthropic IPO 叙事在 6/11 继续被财经媒体并列讨论。

对 Agent 栈：短期应把 **skill 选型** 从「装一个 last30days」升级为「按工作流选垂直 skill 包 + 方法论框架（superpowers）」；模型侧若上 Fable 5，须在集成层处理 **refusal 与 Opus fallback**；Context 层 headroom 仍是性价比最高的可插拔件。论文 SkillOpt 与 GitHub skill 爆发互证：**skill 的下一步是自进化策略，而非只堆静态 SKILL.md**。

---

## 七、深读 1 条

- **分级**：`[方向级]`
- **对象**：Claude Fable 5 and Claude Mythos 5（Anthropic，2026-06-09）
- **链接**：[官方发布](https://www.anthropic.com/news/claude-fable-5-mythos-5) · [API 文档](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- **正文**：
  Anthropic 首次将 **Mythos-class** 能力以两种产品形态同时推出：**Fable 5** 是带安全分类器的公众版，`claude-fable-5` 在 API、Bedrock、Vertex、Foundry 均可调用；遇到网络安全、生物、化学、distillation 等高风险请求时 **自动路由到 Opus 4.8**，而非直接回答。 **Mythos 5** 与 Fable 5 **同权重**，但部分护栏解除，限 Project Glasswing 网络安全伙伴及后续受信生物学研究者，Successor to Mythos Preview。

  定价 $10/M input、$50/M output（约为 Opus 4.8 两倍）。6/9–6/22，Pro/Max/Team/Enterprise 订阅内暂免额外费用；6/23 起改用量计费，Anthropic 称容量允许后拟恢复为计划内标准模型。对 harness 含义：集成 Fable 5 必须实现 **refusal 处理、fallback 模型选择与计费分支**——不能把 Fable 5 当作「更强 Opus」无缝替换。

  与 6/4 递归自改进长文对照：Anthropic 在「公开警告能力曲线」与「发布 Mythos-class」之间走 **分类器 + 受信访问** 双轨，而非单纯延迟发布。局限：Mythos 5 能力边界对公众不可直接验证；Fable 5 在高风险域的表现取决于分类器是否误拦/漏拦。
- **知识库节点**：待建 `mythos-class-model-routing`（可选）

---

## 八、跟进

- [ ] 观察 addyosmani/agent-skills 是否在 6/12 维持日榜前列，验证「工程 skill」是否接棒 last30days
- [ ] 观察 headroom 总 star 是否突破 2.3 万
- [ ] Fable 5 订阅免费窗口（至 6/22）内跑一条长程 agent 任务，记录 refusal/fallback 率
- [ ] 6/15 原力灵机仓储三级分拣系统发布
- [ ] 升格 — [[agent-skill-as-package]]（多垂直 skill 分化）
- [ ] 升格 — [[model-safety-routing]]（Fable/Mythos 双轨）

---

## 九、与昨日衔接

- 昨日：[[2026-06-10]]
- 延续：skill 叙事（last30days 高增速、headroom Context 压缩、hermes runtime）
- 新增：日榜冠军切换至 agent-skills；Anthropic Fable 5/Mythos 5 进入消化期；Siri AI 市场预期回调报道

---

## 十、疑问 / 待查

- SkillOpt arXiv 2606.08112 正文与 HF papers 页编号是否完全一致？
- hivemind 存储架构与 MCP 接口何时公开？
- SpaceX IPO 定价细节需以 SEC 文件为准，勿仅凭媒体标题
