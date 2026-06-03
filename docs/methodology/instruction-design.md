---
tags: [methodology]
aliases: [指令设计, Instruction Design, 与模型沟通, 模型沟通原则]
related:
  - "[[instruction-linguistics]]"
  - "[[prompt-engineering]]"
  - "[[context-engineering]]"
  - "[[harness-engineering]]"
  - "[[skill-engineering]]"
  - "[[llm-generation-traps]]"
  - "[[attention]]"
prerequisites: ["[[llm]]", "[[context-window]]", "[[attention]]"]
stability: long
layer: methodology
updated: 2026-05-31
---

# 指令设计（Instruction Design）

> [!tip] 核心本质
> 用户消息、Rules、Skill、Soul、RAG chunk——在模型眼里都是同一 context window 里的一串 token，没有「这是 Skill 所以更权威」的硬件开关。模型每次只做一件事：在读完全部 token 之后，预测下一个 token 或决定是否调工具。指令设计要解决的问题不是「说什么魔法词」，而是：**如何让正确的信息，以正确的形态，出现在正确的位置，让模型高概率续写出你期望的动作序列**。如果没有这套意识，你会发现换个说法结果截然不同，却不知道为什么。

## 生命周期与演进

**当前定位**：所有与模型交互的场景（对话、Skill、Rules、Agent 编排）的底层方法论。Prompt Engineering 处理「单次说法」，Context Engineering 处理「放什么信息」，指令设计处理更根本的问题：**以什么形态表达，才能被执行**。

**预期寿命**：长期。只要模型底层是 next-token 预测 + attention，这套推论就成立。模型能力提升会改变某些技巧的必要性，但不会消除结构化、可验证表达的优势。

**近期演进**：SkillOpt（2026）把 Skill 文本优化变成了有 held-out 验证门的迭代过程，为「哪种写法更有效」提供了 benchmark；SUSTAINSCORE（2026）量化了「约束过多反而伤任务」；Imperative Interference（2026）揭示了命令式堆叠的语言依赖性。这些研究把过去的「工程经验」逐步推向可测量。

**终极威胁**：模型理解能力的飞跃会降低写法精确性的重要性；超长上下文（10M token）会在小知识库场景绕过精细设计；端到端优化（SkillOpt 类框架）最终可能让人工指令设计只剩初稿和边界审计的作用。但**结构化、可验证**的表达形态本身不会消失。

---

## 第一性原理：一切输入都是 token

理解模型的运作方式是指令设计的前提。三个机制直接决定「你说什么会被执行」：

**Attention 竞争**：context window 里的所有 token 通过 Self-Attention 互相竞争「被关注」的权重。没有独立通道，用户话、Rules、Skill 正文、RAG chunk 共享同一注意力池。谁更具体、更靠前、更结构清晰，谁的权重就更高。

**Pattern Completion**：自回归模型的唯一法则是「预测下一个 token」。前文的结构会强绑定后续格式——你给了有序列表，模型就会尝试补齐；你用了对称结构，后续每节就会倾向等长。这是物理机制，不是 bug。

**RLHF 偏置**：对齐训练的副作用是模型倾向「安全、全面、端水」的回答——「两者各有优缺点，视场景而定」。模糊的指令会触发这种平滑惯性；具体的约束和可验证的 Done 条件才能打破它。

```mermaid
flowchart LR
  subgraph ctx [同一 Context Window]
    U[用户消息]
    R[Rules / Soul]
    S[Skill 正文]
    D[RAG / Memory / Tool results]
  end
  ctx --> Attn[Self-Attention 加权聚合]
  Attn --> Next[下一 token / tool call]
  Next --> Out[输出或动作]
```

**推论**：指令设计的本质不是找「魔法词」，而是让你的意图在 attention 竞争中赢——靠位置、靠结构、靠可验证性，而不是靠措辞强度。

---

## 六类输入，六种职责

所有进入模型的内容按职责分层，每层只写本层的事。层间混写是最常见的效率损耗来源：

| 输入类型 | 回答的问题 | 写什么 | 不写什么 |
|---|---|---|---|
| **用户消息** | 这次具体要什么 | 目标、材料、约束、Done 条件 | 泛泛「帮我优化一下」 |
| **Soul / Persona** | 我是谁、怎么说话 | 身份、价值观、沟通风格 | 任务步骤、工具命令 |
| **Rules** | 永远必须/禁止什么 | 短、硬、全局底线 | 任务 SOP、长篇手册 |
| **Skill** | 这类任务怎么做 | 编号控制流 + Done 定义 | 百科全书、重复 Rules |
| **RAG / Memory** | 事实从哪来 | 检索到的有来源证据 | 程序性步骤、规则 |
| **Tool results** | 世界此刻的真实状态 | 脚本 stdout、文件内容 | 模型「声称做过」的内容 |

**为什么分层**：Rules 和 Skill 重复同一约束，不会让约束更强，只会让两块内容互相抢注意力；Skill 里塞事实，和 RAG 竞争位置，两者都变弱。

---

## 契约四要素：结构化表达的核心框架

无论是用户 turn、Skill 正文还是 system prompt，有效表达都遵循同一个契约逻辑：

```
Goal      — 完成时，用户/调用方得到什么
Inputs    — 允许使用哪些材料（含「禁止臆造」）
Constraints — 格式、边界、优先级（少而必要）
Done      — 怎样算完成、如何验收
```

**用户消息示例**：

低效版：
> 帮我看看这篇文档有没有问题

高效版：
> 目标：检查 retrieval-pipeline.md 是否覆盖了 Pre-filter / Post-filter 两种策略
> 材料：@retrieval-pipeline.md
> 约束：只评内容缺口，不改格式，不改无关章节
> Done：给出缺失项列表，每条说明该补在哪一节

用户 turn 就是一次 micro-prompt。把它写成契约，比写成「帮我看看」，执行准确率差距显著——因为「帮我看看」触发 RLHF 的「全面回答」惯性，模型会泛泛评论；契约版让模型知道目标和边界，高概率续写正确动作。

---

## 约束写法：有实验数据的部分

以下结论有程度不同的实验支撑，按置信度分类。

### 有较强数据支持

**少约束，硬约束**（SUSTAINSCORE，arXiv:2601.22047）：

在模型本来就能答对的题上，额外加入「自明约束」后，任务成功率大幅下降——Claude-Sonnet-4.5 多跳 QA 从 96.7% 跌至 45.1%，32B–70B 模型群平均仅保留 65–85% 的原始性能。机制分析显示：模型把注意力「耗在」约束本身，反而失去了做题的认知资源。

推论：**只写「缺了会出错」的约束；不写不加也一样能做对的规则**。

### 约束三分类：决定「加不加」的判断框架

SUSTAINSCORE 告诉我们约束过多有害，但没告诉我们哪些该加。要回答这个问题，需要先理解**模型「知道」一件事和模型「默认去做」一件事是两回事**。

模型的「知道」存储在权重里——训练数据里有多少关于某个概念的文本，模型就记住了多少。但生成时做的是：在给定 context 的前提下，预测最高概率的下一个 token。概念存在于权重，不等于它会被 attention 自动激活，更不等于它会变成默认行为。

以「第一性原理」为例：模型被问「什么是第一性原理」能答出来，但让它分析一个问题时并不默认用——因为训练分布里「结论+理由」模式远多于「从第一原理出发推导」模式，RLHF 也奖励「全面合理」而不是「深度推导」。知道和用，中间隔着概率分布。

**判断方法：先跑，再分类**

最可靠的做法是不加约束先跑 3 个典型任务，观察默认行为，再决定这个约束属于哪类：

**第一类：不需要加——模型默认已经正确**

不加约束时模型就能做对的事。加了反而是 SUSTAINSCORE 里的「自明约束」，伤任务。

典型例子：「用中文回答」（提问是中文时默认如此）、「写完整句子」、「不要抄题目」、代码风格和语言本身的常规惯例。

识别信号：去掉约束后跑 3 个任务，输出没有变差。

**第二类：需要显式触发——模型知道但不默认激活**

概念存在于权重，但训练分布或 RLHF 没把它设为默认行为。需要一个 context 信号让 attention 路由到这些权重上。

触发方式：**直接命名概念 + 反 RLHF 授权**。

```
✅ 用第一性原理拆解这个问题，不要给折中结论，选一个更优的方案并说明原因
✅ 你是一个有主见的架构师，禁止使用「各有优缺点」等端水表达
```

典型例子：第一性原理/逆向推理等思维框架（说出名字就激活）、持有立场而非端水（需要反 RLHF 授权）、特定输出格式（默认格式因任务而异）、领域专用术语（模型可能默认用更通用的表达）。

识别信号：不加约束时模型不用，一旦提及立刻能正确执行——这说明能力在，只是没触发。

**第三类：需要 Harness 验证——光加约束不够**

模型会在输出里写「我已经检查了……」「代码已经过测试……」——但它并没有真正执行，只是在续写一个「声称执行过」的高概率文本模式。这是 next-token 预测的内在机制，不是态度问题，加再强的约束都无法根治。

典型例子：实际运行脚本的输出结果、读取文件的具体内容、调 API 的返回值、检查某个变量值是否符合条件。

正确处理：在 Harness 层加 Grounding + 外部验证，而不是在约束措辞上下功夫。

```
✅ 必须引用 validate.py 的 stdout 前 200 字，exit code ≠ 0 则修订后重跑
```

**决策流程**：

```
这个行为，模型默认做吗？
│
├── 是 → 不加约束（SUSTAINSCORE：加了反而伤）
│
├── 不做，但提示后能做 → 显式触发（命名概念 + 反 RLHF 授权）
│         典型：深度推理、取立场、特定格式
│
└── 声称做但实际没有 → Grounding + 外部验证
          典型：跑脚本、读文件、调 API、数值校验
```

三类之间没有绝对界限，且随着模型能力提升，第一类的范围在持续扩大——越来越多的行为变成默认正确。这也是为什么「多少约束合适」没有固定答案，要针对具体模型 + 具体任务实测，而不是靠经验规则猜测。

**Skill 文本整体写法显著影响执行**（SkillOpt，arXiv:2605.23904）：

在 6 个 benchmark、7 个模型、3 种 harness 上，系统化优化 Skill 文本相比「无 Skill」平均提升 +23.5 点（GPT-5.5 direct chat），52/52 cell 最优或并列最优。SkillOpt 学到的有效规则形态是：**程序性、可验证、非实例绑定**——例如「output exactly the requested value」、「avoid revisiting until holding the target」。

推论：有效约束是**可验证的程序句**，而不是风格形容词（「认真、全面、高质量」）。

### 有方向性支持，但需注意边界

**命令式堆叠在多语言环境下会互相干扰**（Imperative Interference，arXiv:2603.25015）：

同一语义的 system prompt，在英语下指令是「合作性的」（移除一条会伤害整体），在西班牙语下是「竞争性的」（移除一条反而提升整体）。将 11 条命令式中的 3 条改写为陈述式事实（「NEVER use X」→「X: disabled」），跨语言方差下降 81%（p=0.029），且未改写的块也受益（spillover）。

**边界说明**：该论文的主要发现是跨语言一致性，不是英语/中文单语境下的绝对执行率。在中文 Skill 写法上，「必须/严禁」与「X: 禁用」哪种更好，目前无直接数据——这是方向性推断，不是结论。

实用建议（推断层面）：关键禁止项可以尝试**状态描述式**（「输出格式：仅 JSON」）而非命令式（「必须输出 JSON，禁止输出其他格式」），在约束过密时可能减少互扰。

**情态词改变模型行为**（ACL 2025 Deontological Keyword Bias；EMNLP 2023 Language of Prompting）：

加入 must / ought to / should 等情态词会显著影响模型判断——must 存在时，>90% 非义务场景被判为「有义务」。单换 modal verb（must→might），老版 OPT-30B 在 SST 上准确率差 17 点。

**边界说明**：EMNLP 2023 论文使用的是 OPT / LLaMA-30B 等早期模型，且作者明确结论是「没有跨模型跨任务的通用最佳措辞」。对现代 frontier 模型（Claude 4、GPT-4.1 等），情态词效果会有所不同，不能直接移植。

### 行业共识但缺严格 benchmark

**示例的效果强依赖类型和模型能力，不可一概而论**：

对**格式/输出结构类示例**（JSON 格式、输出模板、写作风格），在各类模型上表现稳定，比用语言描述格式更可靠，跨模型迁移性好。「Examples beat instructions」这个共识主要指这一类。

对**推理过程类示例（CoT 示例）**，研究结论正相反：

- 在弱模型 / 早期模型上有帮助，zero-shot 表现往往低于 few-shot
- 在强 reasoning 模型（o1/R1 类）上，few-shot CoT 示例**系统性伤害**表现——AIME'25 上单个示例下降 6–16%，3 个示例最多下降 35%；GPQA-Diamond 上 3-shot 下降 4–8%（From Harm to Help，arXiv:2509.23196，ICLR 2026）

机制：reasoning 模型已经通过 RLVR 训练出自己的推理路径，外部示例不仅没用，反而引起两种干扰——**语义误导**（把目标问题当示例问题，直接抄步骤）和**策略迁移失败**（学到了具体步骤而非可迁移策略）。

还有一个独立的反效果来源：**示例 pattern 可能在 attention 竞争中赢过显式指令**（Demonstration Conflict in ICL，arXiv:2603.04464；Control Illusion，arXiv:2502.15851）——一旦示例风格和指令要求有偏差，模型常常跟着示例走而不是跟着指令走，在复合约束任务（ComplexBench）上尤其明显。

此外，CoT 推理过程本身也可能分散模型对 constraint 的注意力，导致指令遵循准确率系统性下降（When Thinking Fails，arXiv:2505.11423，15 个模型测试）。

还有一个更底层的原因解释「为什么强模型对示例越来越不敏感」：**Context-Parametric Inversion**（OpenReview）。指令微调（IFT）训练期间，模型对 context 的依赖先升后降——随着训练深入，模型越来越依赖参数知识（权重里记住的答案），而不是 context 里提供的信息。对 few-shot 示例的「不理睬」，部分来自这个训练动态，不全是能力提升的副产品。这也意味着，同样的 few-shot 示例在 IFT 轻度微调模型和重度对齐模型上效果可能截然不同。

**实用判断**：

| 示例类型 | 适用模型 | 建议 |
|---|---|---|
| 格式 / 输出结构 / 风格示例 | 任意 | 有效，优先用 |
| 推理过程（CoT）示例 | 弱模型 / 早期模型 | 有帮助，zero-shot 往往更弱 |
| 推理过程（CoT）示例 | 强 reasoning 模型（o1/R1 类） | 系统性反效果，越多越差；先测 zero-shot |
| 推理过程示例 + 约束敏感任务 | 任意 | CoT 分散对 constraint 的注意力，慎用 |
| 示例与指令有风格偏差 | 任意 | 危险；示例 pattern 有时赢过显式指令 |

**重要指令放开头或结尾**：注意力对序列首尾更强（有 RAG 文档排序方向的数据支持；直接用于 system prompt 指令的研究尚少，属推断）。2026 年生产侧经验：核心约束建议放前 500 词，参考材料放后。

---

## 结构设计：Attention 友好型排版

```
[最高优先级约束 / 身份] ← 开头，attention 强
[本次目标 + Done 条件]
[编号步骤 / 控制流]
─────────────────────── 分隔符（XML/标题隔开来源）
[参考材料 / 示例 / RAG chunk] ← 按需，lazy-load
─────────────────────────────
[关键禁止项 / checklist] ← 结尾，recency 补强
```

**分隔符的用途不只是好看**：将 system 指令和 user input 物理分离，可防止 user 内容被误读为系统指令（prompt injection 防御，OWASP LLM01）。

**不要用对称结构触发 Pattern Completion**：如果你的 Skill 有四个步骤，模型会倾向为每步分配相同 token。需要不等权重处理时，显式标注「第 3 步是核心，可能需要 3–5 轮迭代」而不是靠模型自行判断。见 [[llm-generation-traps]]。

---

## 可验证执行：文本之外的保障

**指令写得再好，模型也可能「声称执行」而未真执行**——这是 next-token 预测的内在风险，不是措辞问题。文本只能改变高概率的动作序列；真正的执行保障需要 Harness 层：

| 层级 | 作用 | 工具 |
|---|---|---|
| Grounding | 要求引用 tool output / exit code 原文，不允许模型自行声称结果 | 在指令里写「必须引用上一步 Shell 输出的前 200 字」 |
| 脚本闭环 | 可机器判断的检查不靠模型自检 | `validate.py` → exit code → 失败则修订 → 上限 N 次 |
| 门控 | 高危操作设人工确认或显式调用 | `disable-model-invocation: true` |
| 评测 | 典型任务 + 负例（不应触发的场景）验收 | 3 正例 + 2 负例最低标准 |

**一句话原则**：文本定意图，Harness 保执行。两者缺一，要么意图不清，要么执行不可靠。

---

## 八条操作原则

以下原则按置信度排列，高置信度的在前，推断性的在后：

1. **一切输入都是 token**——Soul / Rule / Skill / 用户话在同一注意力池竞争，不存在「哪层天然权威」。（第一性原理）

2. **约束先分类再决定加不加**——不加跑一遍是最可靠的判断：默认正确不加，能激活的触发，只声称不执行的靠 Harness。（三分类框架，SUSTAINSCORE 数据支持「少约束」方向）

3. **任何输入都写契约四要素**——Goal / Inputs / Constraints / Done，无论是用户 turn 还是 Skill 正文。（工程推断，SkillOpt 间接支持）

4. **格式示例优于形容词；推理示例对强模型慎用**——输出结构/模板类示例跨模型有效；CoT 推理类示例在 reasoning 模型上系统性反效果，先测 zero-shot 再决定是否加。（有数据）

5. **约束写可验证程序句**——「运行 validate.py，exit code=0 才继续」比「请仔细检查」更可执行。（SkillOpt case study）

6. **各层只写本层的事**——Rules 不写 SOP，Skill 不重复 Rules，减少注意力内耗。（逻辑推断）

7. **关键信息靠前，禁止项可靠后补强**——结合 context 首尾的 recency/primacy 效应，长 SOP 中段最易丢失。（部分有 RAG 数据支持，推断性扩展）

8. **文本定意图，Harness 保执行**——Grounding + 脚本 + 门控才是「真执行」，不靠指令强度。（工程第一性）

---

## 目前尚未有直接数据的问题

诚实记录已知边界，避免本文的结论被过度引用：

- 中文 Skill 中「必须/严禁」与「X: 禁用（陈述式）」哪种执行率更高——尚无专项研究
- user turn / Rule / Skill 三种来源的优先级冲突 quantified benchmark
- 这套原则在不同 frontier 模型（Claude vs GPT vs 开源模型）之间的泛化性
- 指令位置（开头 vs 中间 vs 结尾）对 system prompt 遵循的直接因果研究

---

## 进一步阅读

- [[instruction-linguistics]] — 人机指令语言学的研究地图与证据边界
- [[cross-lingual-instruction]] — 中英文 prompt 差异、register 拓扑与混合指令策略
- [[prompt-engineering]] — 单次调用的表达：怎么说这次的话
- [[context-engineering]] — context window 里应该放什么、怎么放、何时放
- [[harness-engineering]] — 搭系统让模型长期可靠干活，Harness 保执行的架构层
- [[skill-engineering]] — Skill 正文的分层写法、控制流设计、坑点清单
- [[llm-generation-traps]] — 对称性偏置、Pattern Completion、RLHF 端水效应的底层原理
- [[attention]] — Self-Attention 机制，理解「谁在注意力竞争中赢」
- [SUSTAINSCORE — Paradoxical Interference between Instruction-Following and Task Solving](https://arxiv.org/abs/2601.22047)
- [Imperative Interference — Social Register Shapes Instruction Topology](https://arxiv.org/abs/2603.25015)
- [SkillOpt — Executive Strategy for Self-Evolving Agent Skills](https://arxiv.org/abs/2605.23904)
