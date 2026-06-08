---
tags: [technique]
aliases: [记忆, agent memory, 长期记忆, 短期记忆]
prerequisites:
  - "[[llm]]"
  - "[[context-window]]"
related:
  - "[[agent]]"
  - "[[context-window]]"
  - "[[rag]]"
  - "[[llm]]"
  - "[[skill]]"
  - "[[agent-context-stack]]"
stability: long
layer: application
updated: 2026-05-31
---

# Memory（记忆）

> [!tip] 核心本质
> Memory 是对「LLM 无状态」这一根本约束的补偿机制：模型权重在推理时固定，每次 API 调用之间不持有任何状态，因此所有跨会话的信息保持都必须由 Agent 运行时在**外部**主动管理——写入什么、何时写入、何时遗忘、冲突时取哪个，都是系统工程决策，不是模型能力。没有 Memory，Agent 每次对话都是失忆的新手；设计不当的 Memory 比没有更危险，因为过期或冲突的记忆会让 Agent 基于错误前提行动。

## 生命周期与演进

**当前定位**：Memory 是 Agent 系统的基础组件，已有大量框架支持（LangMem、MemGPT/Letta、OpenAI memory）。核心机制成熟，但「写什么、怎么忘、冲突如何解决」的工程规范仍是研究热点。

**预期寿命**：长期。只要 LLM 保持无状态推理架构，外部 Memory 就不会消失；形态从简单 KV 存储演化为带时效、重要性加权、多模态的记忆系统。

**近期演进**：MemGPT/Letta 引入操作系统式分页内存（working memory + archival）；LangMem 提供框架级 memory 管理 API；OpenAI 在产品层直接集成用户记忆；研究方向转向「selective memory」——模型主动判断哪些值得存。

**终极威胁**：足够长的 context window（如 Claude 100k+、Gemini 1M+）使「当次会话已经记住一切」，大幅压缩对外部 Memory 的依赖；但跨会话持久性与多用户共享场景仍只能靠外部 Memory。

## 记忆类型三分法

[Cognitive Architectures for Language Agents（CoALA）](https://arxiv.org/abs/2309.02427) 把 Agent 的记忆分为三类，理解这个分类是避免设计混乱的前提：

| 类型 | 物理位置 | 生命周期 | 典型内容 |
| --- | --- | --- | --- |
| **In-context（上下文记忆）** | context window | 当次会话 | 对话历史、tool result、RAG 注入 |
| **External（外部记忆）** | 向量库 / KV / 关系库 | 持久（可配置） | 用户偏好、任务进度、历史摘要 |
| **Parametric（参数记忆）** | 模型权重 | 模型版本生命周期 | 预训练知识、fine-tuning 后的技能 |

**关键区分**：

- **In-context 不是「短期记忆」的全部**——RAG 检索的结果、MemGPT 的 working memory 都在 context 里，但来源不同。
- **Parametric 是只读的**（推理时固定）。Fine-tuning 是向 parametric memory「写入」的唯一路径，代价高昂且不可精细撤销。RAG 和外部 Memory 是绕开参数限制的补偿方案：两者不是替代关系，而是解决不同范围的问题（通用知识 vs 个体/任务专属状态）。
- 本文主要讨论 **External Memory**——即可在运行时动态读写的外部存储。

## LLM 无状态，Memory 必须外部维护

[[llm|LLM]] 是纯函数：给定输入返回输出，调用之间不持有任何状态。ChatGPT 里「它记得刚才说的话」是应用层把历史消息打包塞进 context，模型自身什么都没记。

没有 Memory 时，Agent 的典型缺陷：

- **偏好消失**：上次说「用 Obsidian 不用 Notion」，下次又推荐 Notion。
- **历史断档**：长任务分多次完成，Agent 不知道做到哪了。
- **重复犯错**：某工具调用上次失败，下次照样踩同一个坑。
- **无法积累**：某类任务做多了本应越来越顺，但每次仍是新手。

## External Memory 实现形式

| 形式 | 存取特征 | 适合存什么 | 不适合 |
| --- | --- | --- | --- |
| **键值存储** | 精确键查找，O(1) | 结构化状态：`user_language: zh-CN`、`last_checkpoint: 42` | 模糊语义检索 |
| **向量数据库** | 语义相似度检索 | 非结构化记忆：「用户提到他们用 GitLab」 | 需精确键值的场景 |
| **摘要记忆** | 压缩后注入 context | 对话历史精华 | 细节要求高的场景（摘要丢信息） |
| **关系型 / 图数据库** | 结构化查询 + 关系遍历 | 实体关系、知识图谱式记忆 | 纯语义检索 |

实践中常组合使用：KV 存精确状态，向量库存语义记忆，摘要记忆压历史对话。

## 记忆操作：写入、检索、遗忘、合并

Memory 不只是「存和取」，完整的操作链有五步：

### 写入（Write）

**最难的决策是写入时机**，三种策略各有权衡：

| 策略 | 触发条件 | 优点 | 风险 |
| --- | --- | --- | --- |
| **每轮写入** | 每次 LLM 输出后 | 不遗漏 | 噪声极高，大量无用信息入库 |
| **模型主动判断** | LLM 决定「这件事值得记」 | 语义精准 | 模型可能漏判或误判 |
| **任务完成写入** | Done 事件触发 | 状态干净 | 任务中断时无进度恢复 |

工程上通常组合：**关键状态用事件驱动写入**（完成、报错），**用户偏好用模型主动提取**，**对话历史用定期压缩摘要**。

写入前应校验：内容是否完整、状态是否已验证（避免把「执行中」的错误状态写成「已完成」）。

### 检索（Query）

长期记忆在被 LLM 读到前，必须先检索进 context。检索策略：

- **语义相似度**：向量检索，适合非结构化记忆。
- **精确键查找**：KV 直接读，适合状态类记忆。
- **时间过滤**：优先最近 N 天的记忆，避免过期信息干扰。
- **重要性加权**：高置信度 / 高频访问的记忆优先注入。

检索结果要**标注来源与时间**再注入 context，让 LLM 有依据判断哪条更可信。

### 遗忘（Forget）

「什么该忘」与「什么该记」同等重要。不遗忘的 Memory 会导致：检索噪声上升、context 被过期信息占满、Library Drift 类似问题（见 [[skill-loading-library]]）。

常用机制：

- **TTL（生存时间）**：偏好类记忆设 30/90 天过期；任务进度在任务结束后删除。
- **重要性衰减**：长期不被检索的记忆降权或归档。
- **显式删除**：用户说「忘掉这条」时主动清除。
- **版本替换**：同一实体有新记录时，旧版本归档而非直接删除（保留修订历史）。

### 合并与压缩（Consolidate）

大量细碎记忆积累后，需要合并：

- **摘要压缩**：近期对话片段 → 摘要条目，保留要点删除细节。
- **去重合并**：语义相近的多条记忆 → 一条更精确的。
- **MemGPT 的 archival 机制**：working memory（活跃 context 内）↔ archival memory（外部压缩归档），类比操作系统内存分页。

### 时效性与冲突

记忆会过期、会自相矛盾。解决方案：

- **时间戳标注**：每条记忆记录写入时间，检索时一并返回。
- **冲突检测**：同一实体新旧记录冲突时，给 LLM 上下文中标注「新版本」，明确优先级。
- **置信度标注**：模型提取的记忆（可能有误）与用户明确告知的记忆（高置信）区别对待。

## 程序性记忆 vs 陈述性记忆

| | 陈述性（含 episodic） | 程序性 |
| --- | --- | --- |
| 内容 | 事实、偏好、历史、状态 | 「怎么做某类任务」的 SOP |
| 典型载体 | External Memory、RAG chunk | [[skill]]（`SKILL.md`） |
| 加载方式 | 检索后注入 context | Discovery → Activation |

**分工原则**：Memory 存频繁变更的个体化事实；Skill 存稳定的程序性知识。勿用 Memory 存完整 SOP（会和 Skill 冲突），勿用 Skill 存频繁更新的运行状态。详见 [[agent-context-stack]]。

Memory 与 RAG 的区别：RAG 检索的是**预先准备的外部知识库**（人工策划，相对静态）；Memory 存的是 **Agent 运行时产生或感知的信息**（动态、个体化）。Memory 的检索实现可以复用 RAG 的向量检索底层，但用途不同。

## 何时需要外部 Memory

**需要**：
- 任务跨多个会话分批完成，需维持进度状态。
- 个人助手类 Agent，需跨会话保持用户偏好一致。
- 多 Agent 协作，需共享工作状态。
- 需从过去成功/失败中学习并调整策略。

**不需要**：
- 一次性任务，完成即结束。
- 每次任务完全独立，历史对当前无帮助。
- context 窗口已够大，当次会话信息充分。

## 工程示例

### 场景一：个人助手跨会话保留偏好

```
# 第一次对话
用户：帮我写周报，格式先结论后数据，语气正式。
Runtime：[写完后，提取偏好写入 Memory]
  → memory.write("report_style", "先结论后数据，语气正式", ttl=90d)

# 一周后新会话
用户：帮我写这周的周报。
Runtime：[session 开始，检索相关 Memory]
  → memory.query("周报") → "先结论后数据，语气正式"（写于 7 天前）
  → 注入 context：「用户偏好（7 天前）：先结论后数据，语气正式」
Agent：直接按偏好格式写，不再询问
```

### 场景二：长任务分批完成，维持进度

```python
# 任务：分三次会话爬取 100 个竞品页面

# 会话 1 结束前，校验后写入检查点
memory.write("competitive_analysis", {
    "total": 100,
    "completed": 35,
    "last_url": "https://example.com/product/35",
    "findings_vector_id": "vec_xxx",   # 摘要存向量库
    "status": "in_progress",           # 只在验证后写 completed
    "written_at": "2026-05-31T10:00Z"
})

# 会话 2 开始时，检索状态 + 标注时间
progress = memory.read("competitive_analysis")
# → 从第 36 个继续，findings 向量摘要注入 context
# → 检查 status 是否 in_progress，避免重复执行
```

## 坑与反模式

| 反模式 | 危险 | 对策 |
| --- | --- | --- |
| 把对话历史全量存入 | 噪声淹没信号；context 被低质历史占满 | 过滤 + 压缩摘要；只存「值得记」的片段 |
| 不设 TTL，Memory 只增不减 | 过期信息干扰决策；检索成本上升 | 按信息类型设 TTL；定期归档/清理 |
| 任务未完成时写「已完成」状态 | 下次基于错误前提执行 | 关键状态只在验证后写入 |
| context 里已有信息，Memory 又检索到旧版本 | LLM 不知道该信哪个 | 注入时标注来源与时间，显式声明优先级 |
| 多用户系统不隔离 Memory | 用户 A 的信息泄露给用户 B | 访问控制是必须项，不是可选优化 |
| 误以为 Memory 能提升模型推理能力 | Memory 只扩展信息访问范围，不改变推理水平 | 明确 Memory 的边界：它改变 context，不改变模型 |

## 进一步阅读

- [[agent]] — Memory 是 Agent 三大组件之一，理解整体架构才能看清 Memory 的位置
- [[context-window]] — In-context 记忆的物理载体；context 限制是外部 Memory 存在的根本原因
- [[rag]] — External Memory 的检索实现和 RAG 底层高度重叠；RAG vs Memory 的区别也在此处深化
- [[llm]] — 无状态推理架构决定了 Memory 为何必须外部维护
- [[skill]] — 程序性「记忆」与陈述性 Memory 的分工
- [[agent-context-stack]] — Memory 在上下文资产栈（RAG / Memory / Skill / Rules）中的位置
- [[agentmemory]] — AgentMemory 产品：MCP 持久记忆层、自动 Hook 与混合检索（`latest/`）
- [[memgpt]] — MemGPT/Letta：OS 式分页记忆与 Letta 有状态 Runtime（`latest/`）
- [[mem0]] — Mem0 可插拔记忆层（`latest/`）
- [[honcho]] — Honcho 推理优先 peer 表征记忆（`latest/`）
- [[skill-loading-library]] — Skill 库演化与 Memory 治理的类比（Library Drift）
- [MemGPT: Towards LLMs as Operating Systems (2023)](https://arxiv.org/abs/2310.08560) — 操作系统式分页内存引入 LLM Memory；working memory + archival memory 分层的原型
- [Cognitive Architectures for Language Agents / CoALA (2023)](https://arxiv.org/abs/2309.02427) — 系统定义 in-context / external / parametric 三类记忆；是目前最清晰的 Memory 分类框架
