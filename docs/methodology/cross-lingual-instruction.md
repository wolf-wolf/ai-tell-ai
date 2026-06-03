---
tags: [methodology]
aliases: [跨语言指令, Cross-lingual Instruction, 中英文 Prompt 差异, Chinese vs English Prompting]
related:
  - "[[instruction-linguistics]]"
  - "[[instruction-design]]"
  - "[[prompt-engineering]]"
  - "[[context-engineering]]"
prerequisites: ["[[instruction-design]]", "[[instruction-linguistics]]"]
stability: mid
layer: methodology
updated: 2026-05-31
---

# 跨语言指令（Cross-lingual Instruction）

> [!tip] 核心本质
> 同一条语义指令，换成中文或英文写进 system prompt / Skill / Rules，模型行为**不必相同**——训练语料占比、tokenizer、社会 register（命令式 obligatory force）都会改变 attention 与遵循拓扑。若没有跨语言视角，容易把英语 A/B 测试结论直接套到中文 Skill，或误以为「中文 native 模型 = 中文 prompt 一定更好」。本篇梳理**哪些差异有论文支撑、哪些仍是工程推断**。

## 生命周期与演进

**当前定位**：Multilingual IF 评测（MaXIFE 等）与 register 研究（Imperative Interference）在 2025–2026 集中出现；工业界已形成「英文指令 + 中文输出」等混合策略，但**中文措辞选型**（必须/严禁 vs 陈述式）仍缺专项 benchmark。

**预期寿命**：中期。中文训练数据与 Qwen/DeepSeek 等模型持续增强，纯中文 prompt 在推理与遵循上的相对劣势可能缩小；register 与指令冲突问题不会随模型变大自动消失。

**近期演进**：Imperative Interference 将同一 production prompt 译为英/西/法/中四语做 ablation；MaXIFE 覆盖 23 语 1667 项可验证 IF 任务；AdaMCoT / CLP 等探索「指令语言 ≠ 输出语言」的混合 CoT。

**终极威胁**：多语言对齐与统一 tokenizer 使语言差异缩小；SkillOpt 类优化按轨迹自动改 Skill 文本，人工语言选型退居初稿——但产品仍须决定**默认写入语言**与验收集语言。

---

## 核心结论（先读这里）

| 命题 | 是否有论文支撑 | 置信度 |
|---|---|---|
| 同语义指令，不同语言 → 模型行为可不同 | 是（Imperative Interference、MaXIFE） | 高 |
| 英语下指令「合作性」拓扑，西语下可反转为「竞争性」 | 是（Imperative Interference，EN↔ES 为主对比） | 高 |
| 中文与西语表现相同（同属「非英语」） | **否** — 论文明确 EN–Mandarin ≠ EN–Spanish | 高 |
| 陈述式改写可降低跨语言方差 | 是（单块约 81%↓，p=0.029） | 中（样本与语言有限） |
| 复杂推理：英文 system 指令 + 中文输出 常优于纯中文 | 方向性支持（XLT、CLP、AdaMCoT + 工程实践） | 中 |
| 中文 Skill 必用「必须/严禁」优于「X：禁用」 | **尚无**专项 AB | 低 |
| 中文 few-shot CoT 示例在 reasoning 模型上安全 | **否** — 与语言无关，强 reasoning 模型上常反效果 | 高 |

---

## 四条研究线

### 1. Register 与指令拓扑：Imperative Interference

**论文**：[Imperative Interference](https://arxiv.org/abs/2603.25015)（2026）

将同一套 56-block production system prompt 译为 **英语、西班牙语、法语、普通话**，在 4 个模型上做指令级 ablation（用户消息仍为英语）。

**指令拓扑**（移除某 block 对整体遵循的边际效应）：

| 语言 | 拓扑特征 |
|---|---|
| **英语** | **合作性（cooperative）** — 移除任一块通常伤害整体遵循 |
| **西班牙语** | **竞争性（competitive）** — 移除部分块反而提升遵循；与英语 main effect **反相关**（r ≈ −0.274） |
| **法语** | **扁平（flat）** — 弱效应，无清晰 hub |
| **普通话** | **部分保留 hub**，但**不是**西语那种整体反转 |

论文原意：**不能**概括成「西语差」或「中文稳」——块级差异极大。例如 `commit-restrictions`：Haiku 在英语 1.00、在普通话 0.00（同语义翻译）。

**Register 机制**：命令式（「NEVER do X」）在不同语域 obligatory force 不同；陈述式（「X: disabled」）更接近「事实描述」，跨语言方差更小。改写 3/11 条命令式为陈述式后，西语拓扑可从 competitive 转为 cooperative，且**未改写的块也受益**（spillover）。

**对中文 Skill 的推断（非直接实验结论）**：
- 堆叠「必须/严禁/禁止」在中文里未必等价于英语里的「合作性堆叠」——可能更接近西语式的 obligation 竞争，需实测。
- 关键禁止项可优先试 **陈述式事实**（「输出格式：仅 JSON」「Emoji：禁用」）。

**边界**：22 个 probe、手工翻译、用户侧英语；**不是**「中文用户 + 中文 system」全中文会话设定。

---

### 2. 多语言指令遵循评测：MaXIFE

**论文**：[MaXIFE](https://aclanthology.org/2025.acl-long.698/)（ACL 2025）

1667 项可验证 instruction-following 任务 × **23 种语言**（含中文），规则 + 模型混合评测。

**支持什么**：
- 指令遵循能力**因语言而异**，不能假设 IFEval（英语为主）分数代表中文表现。
- **跨语言设定**（指令用英语、要求用目标语回答）在低资源语上有时显著增益；高资源语（含中文）增益较小，**依模型与训练覆盖而定**。

**不支持什么**：
- 中文内部哪种措辞（请 / 必须 / 不得）最优。
- Skill/Rules 长文档在多语言下的拓扑（MaXIFE 是任务级 IF，不是 system prompt 块 ablation）。

---

### 3. 指令语言 vs 输出语言：Cross-lingual Reasoning

若干工作表明：**推理链的语言**与**最终输出的语言**可以分离。

| 工作 | 要点 |
|---|---|
| [Cross-Lingual Thought (XLT)](https://aclanthology.org/2023.findings-emnlp.826/) | 跨语思维模板缩小语种间性能差；算术/QA 等任务上多语 democratization 提升 |
| [Cross-lingual Prompting (CLP)](https://arxiv.org/abs/2310.14799) | 跨语对齐 + CoT，优于简单「翻译成英语再推理」基线 |
| [AdaMCoT](https://arxiv.org/html/2501.16154v4) | 自适应多语 CoT；如 LLaMA 在中文 CrossMMLU 等上有明显相对增益 |

**工程侧常见模式**（行业共识，严格 AB 少于论文线）：

```
System / Skill 控制流：English（或混合）
约束与 Done：目标交付语言（中文产品 → 中文）
显式一句：Please reply in Chinese / 请用中文回答
```

**原因（机制推断）**：
- RLHF、CoT、Constitutional 数据**英语占比高** → 英语指令更易激活「逐步推理」路径。
- 中文 native 模型（Qwen、DeepSeek）在**对话与文风**上纯中文仍可能更自然；**复杂逻辑**未必纯中文最优。

**Tokenizer 差异**（模型依赖）：
- CJK 友好分词（Qwen 等）：中文同样语义常更省 token。
- Western-first（Llama、Mistral 等）：中文 prompt 易碎片化，**英语指令 + 中文输出**更稳。

---

### 4. 与语言无关但影响「示例语言」的线

以下结论**不区分中英文**，但决定 Skill 里是否放 few-shot：

| 现象 | 论文 | 对跨语言 Skill 的含义 |
|---|---|---|
| Reasoning 模型 + few-shot CoT 示例常**降分** | [From Harm to Help](https://arxiv.org/abs/2509.23196) | 中文/英文示例均可能伤 o1/R1 类模型 |
| CoT 分散对 constraint 的注意力 | [When Thinking Fails](https://arxiv.org/abs/2505.11423) | 复合约束任务慎用推理示例 |
| 示例 pattern 与指令冲突 | Demonstration Conflict；Control Illusion | 中英示例均可能覆盖显式 Rules |

格式/结构类示例（JSON 模板、输出样例）跨语言仍相对稳——见 [[instruction-design#行业共识但缺严格 benchmark]]。

---

## 决策：中文产品怎么写 prompt / Skill / Rules

```
你的目标是什么？
│
├── 复杂推理 / 多步 Agent / 工具编排
│     ├── 模型：Qwen / DeepSeek 等中文强
│     │     → 可试：中文 Skill + 英文仅用于「推理段/系统级 CoT 模板」
│     │     → 或：英文 system 指令 + 「请用中文回答与交付」
│     └── 模型：Llama / 欧美主导
│           → 优先：英文指令 + 中文输出
│
├── 约束 / 格式 / 交付契约（Done、JSON schema）
│     → 用**交付语言**（中文产品用中文）
│     → 禁止项优先**陈述式**（「X：禁用」），少堆命令式 MUST
│
├── 对话文风 / 创意 / 本土表达
│     → 纯中文 prompt 在 Qwen 等上往往合适
│
└── 不确定？
      → 3 正例 + 2 负例，对比：纯中文 vs EN 指令+中文输出 vs 纯英文
```

与 [[instruction-design#约束三分类：决定「加不加」的判断框架]] 正交：先决定**加不加约束**，再决定**用什么语言写**。

---

## 尚未有直接数据的问题

诚实记录，避免过度引用本篇：

- 中文「必须/严禁」 vs 「X：禁用」在 Claude/GPT/ Qwen 上的遵循率 AB
- 全中文会话（用户 + system 均中文）下的指令拓扑 vs Imperative Interference 的「用户英语 + system 多语」设定
- Rule（中文）与 Skill（英文）混用时的优先级冲突量化
- 同一 Skill 中英双语并存是否优于单语（token 成本 vs 遵循率）

**最低验收**：在**目标模型 + 目标宿主**上跑典型任务；不要跨模型移植 PromptQuorum 类行业数字。

---

## 与相邻文档的分工

| 文档 | 本篇与其关系 |
|---|---|
| [[instruction-linguistics]] | 总研究地图；本篇是其**跨语言子专题** |
| [[instruction-design]] | 工程写法（契约、三分类、Harness）；语言选型是补充维度 |
| [[prompt-engineering]] | 单次调用措辞；跨语言是 system/Skill 层策略 |
| [[llm-generation-traps]] | RLHF 端水等；与「英语推理数据占优」部分重叠 |

---

## 进一步阅读

### 本库

- [[instruction-linguistics]] — 指令语言学总览
- [[instruction-design]] — 契约四要素、约束三分类、示例边界
- [[context-engineering]] — 指令语言与 RAG/记忆语言可以不同

### 外部论文

- [Imperative Interference](https://arxiv.org/abs/2603.25015) — register、四语 ablation、陈述式改写
- [MaXIFE](https://aclanthology.org/2025.acl-long.698/) — 23 语 instruction following benchmark
- [Cross-Lingual Thought (XLT)](https://aclanthology.org/2023.findings-emnlp.826/)
- [Cross-lingual Prompting (CLP)](https://arxiv.org/abs/2310.14799)
- [AdaMCoT](https://arxiv.org/html/2501.16154v4)
- [From Harm to Help](https://arxiv.org/abs/2509.23196) — reasoning 模型上的 few-shot 反效果
