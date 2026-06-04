---
tags:
  - concept
aliases:
  - context engineering
  - 上下文工程
prerequisites:
  - "[[llm]]"
  - "[[context-window]]"
  - "[[prompt-engineering]]"
related:
  - "[[prompt-engineering]]"
  - "[[harness-engineering]]"
  - "[[agent]]"
  - "[[rag]]"
  - "[[skill]]"
stability: long
layer: application
updated: 2026-05-26
---
# Context Engineering（上下文工程）

> [!tip] 核心本质
> Context Engineering 管理的是每次调用时 context window 里「该有什么」——模型只能处理它看到的内容，缺关键事实会幻觉，塞满无关信息会稀释注意力。若没有对 What/How/When 的裁剪与注入策略，再好的 prompt 也是在错误的信息集上优化措辞。

## 生命周期与演进

**当前定位**：三代范式中游（Prompt → Context → Harness），RAG、记忆、Skill 渐进披露都归此域。

**预期寿命**：长期；随 context window 变长，「全塞进去」的诱惑变大，筛选与检索反而更关键。

**近期演进**：长上下文 + 推理模型改变「检索 vs 塞满」权衡；多模态与工具结果并入 context 编排成为标配。

**终极威胁**：端到端 Agent 自动管理 context 后，人工编排退居调试与审计层；但检索质量仍是瓶颈。

## 核心原理

### 问题出在哪

[[llm|LLM]] 只能处理它"看到"的内容——[[context-window|context window]] 里有什么，它才知道什么。训练数据里有的知识是底层能力，但具体任务需要的上下文（当前对话、相关文档、用户偏好、工具结果……）必须在调用时明确放进去。

这就带来了两个核心矛盾：
- **信息不够**：模型没看到解题需要的关键信息，输出就会偏或幻觉
- **信息太多**：context window 有上限，塞满了反而噪声大、重点被稀释

Context Engineering 就是在这两个极端之间找平衡——**该放什么、不该放什么、怎么放**。

### 三个核心问题

**放什么（What）**

不是所有信息都值得占用 context window。优先级从高到低大致是：
1. 任务指令本身（必须有）
2. 当前轮次直接相关的事实/文档
3. 历史对话中真正有用的部分
4. 背景知识、偏好、约束

**怎么放（How）**

信息的组织方式影响模型的注意力。几个有效的做法：
- **放在开头或结尾**：模型对 context 的首尾注意力更强，重要指令不要埋在中间
- **结构化**：用标题、分隔符、XML 标签把不同来源的信息隔开，避免混淆
- **压缩历史**：长对话做摘要而不是全量保留，只留关键信息

**动态管理（When）**

不同任务阶段需要的信息不同。静态塞满一个固定 prompt 效果往往不如动态按需注入——这轮需要什么就取什么，不需要的不占位置。

### RAG：Context Engineering 的核心工具

RAG（Retrieval-Augmented Generation）是 Context Engineering 里最重要的一个模式：不把所有知识塞进 prompt，而是在每次调用前**检索**与当前问题最相关的片段，动态注入 context。

```
用户问题 → 检索相关文档片段 → 注入 context → LLM 回答
```

这样既解决了"模型不知道某个具体事实"的问题，又不会把整个知识库都塞进 context。

### 和 Prompt Engineering 的区别

Prompt Engineering 关注的是**一次调用里怎么写指令**，Context Engineering 关注的是**这次调用的 context window 里应该有什么**。

两者互补：Prompt Engineering 写好了任务指令，Context Engineering 负责把任务所需的信息送到位。

```
Prompt Engineering：这次调用，我该怎么说？
Context Engineering：这次调用，模型该看到什么？
```

### 三代演进的位置

```
Prompt Engineering → Context Engineering → Harness Engineering
   怎么说话              给什么信息              搭什么系统
```

Context Engineering 是从"写好 prompt"到"管理整个信息流"的升级。当你开始关心历史对话怎么裁剪、外部知识怎么检索、多轮任务信息怎么传递，就进入了 Context Engineering 的范畴。

---

## 实践与应用

一个客服 Agent 回答用户问题，不同的 context 管理策略：

| 策略 | context 里有什么 | 问题 |
|------|----------------|------|
| 无管理 | 只有用户这轮的问题 | 不知道用户历史、产品信息，只能泛泛回答 |
| 全量历史 | 所有历史对话 + 全部产品文档 | context 超限，噪声多，成本高 |
| Context Engineering | 用户最近3轮对话 + RAG 检索到的相关产品页 + 用户账户状态 | 信息精准，模型能给出有针对性的回答 |

第三种策略多了检索和筛选的工程工作，但输出质量和稳定性显著更高。

---

## 常见误区

最常见的误区是"context 越多越好"——把能找到的信息全塞进去，觉得信息量大模型就会更聪明。实际上超长 context 里噪声也多，模型对关键信息的注意力会被稀释，有时候反而不如精简的 context。

RAG 不是银弹。检索质量决定 RAG 效果——如果检索到的片段和问题不相关，注入 context 反而是干扰。Context Engineering 里最难的部分往往不是"怎么注入"，而是"怎么检索到对的东西"。

### Progressive Disclosure 与 Skill

[[skill]] 的 Discovery → Activation → Execution 是 Context Engineering 在**程序性知识**上的落地：用少量元数据路由，按需载入正文与 scripts，避免一次性塞满窗口。CE 管通用裁剪策略；Skill 管 SOP 分层写法（见 [[skill-engineering]]）。

## 进一步阅读

- [[prompt-engineering]] — 在管理 context 之前，先把指令写清楚
- [[harness-engineering]] — 当 context 需要动态管理、多轮维护，就需要系统层面的支撑
- [[context-window]] — 理解 context window 的上限和机制
- [[rag]] — Context Engineering 最核心的检索增强模式
- [[agent]] — Agent 系统里 context 管理是 Runtime 的核心职责之一
- [[skill]] — 渐进式披露作为 CE 的 SOP 特例
- [[agent-context-stack]] — 各类上下文资产如何分工
