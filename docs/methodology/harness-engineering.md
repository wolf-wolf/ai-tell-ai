---
tags:
  - concept
aliases:
  - harness engineering
  - 驾驭工程
  - 系统工程
prerequisites:
  - "[[llm]]"
  - "[[agent]]"
  - "[[prompt-engineering]]"
  - "[[context-engineering]]"
related:
  - "[[prompt-engineering]]"
  - "[[context-engineering]]"
  - "[[agent]]"
  - "[[workflow]]"
  - "[[skill-loading-library]]"
  - "[[cursor-hooks]]"
stability: mid
layer: application
updated: 2026-05-26
---
# Harness Engineering（驾驭工程）

> [!tip] 想一想
> **你写好了 prompt、管好了 context，模型还是不能稳定干活，为什么？**
>
> *因为缺了"系统"——没有循环、没有工具、没有状态管理、没有错误恢复，模型只能一次性输出，干不了复杂任务。*
>
> Harness Engineering 研究的是：怎么给模型搭一套可控的运行系统，让它能长期、稳定、靠谱地完成多步任务。

---

## 🧠 深入理解

### 从"说话"到"干活"的鸿沟

[[prompt-engineering|Prompt Engineering]] 教你怎么对模型说话，[[context-engineering|Context Engineering]] 教你怎么管理模型能看到的信息——但这两者都只解决**单次调用**的问题。

真实任务往往需要：
- 多步执行（查资料 → 分析 → 写报告）
- 调用工具（搜索、写文件、调 API）
- 维护状态（记住上一步做了什么）
- 错误恢复（某一步失败了怎么办）
- 安全边界（不能删库、不能乱花钱）

这些都不是 prompt 或 context 能解决的，需要在模型外面包一层**系统**——这就是 Harness。

### Harness 是什么

Harness 这个词借用自软件测试领域的"test harness"（测试套具），指的是**包裹核心组件、让它能在受控环境中运行的基础设施**。

在 AI Agent 语境里，Harness 是模型外面的那一整套系统，包括：

| 组成部分 | 作用 |
|---------|------|
| 循环管理 | 维持"思考 → 行动 → 观察"的循环，不让模型一次输出就结束 |
| 工具编排 | 定义模型能调用哪些工具、怎么调用、结果怎么返回 |
| Skill 加载 | Discovery 注入 listing、Activation 载入 `SKILL.md`、Execution 调 scripts/MCP |
| 状态管理 | 跨轮次记住历史、中间结果、任务进度 |
| 错误处理 | 工具调用失败、模型输出格式错误时的兜底逻辑 |
| 安全边界 | 限制模型能做什么；含 [[cursor-hooks]] 审批 |

这些加起来，就是 [[agent|Agent]] 里的 Runtime 层——Harness Engineering 就是设计和实现这一层的工程学科。

### 和前两代的关系

```
Prompt Engineering → Context Engineering → Harness Engineering
   怎么说话              给什么信息              搭什么系统
   单次调用              单次调用              多步任务
```

三者是递进关系，不是替代关系：
- Harness 里每次调用模型，还是要写好 prompt（Prompt Engineering）
- 每次调用前，还是要管理好 context（Context Engineering）
- Harness 负责的是**把这些单次调用串起来，形成一个能完成复杂任务的系统**

### 核心设计问题

**工具怎么给**

不是把所有工具都暴露给模型——工具越多，模型越容易选错或幻觉。Harness 要做的是：
- 按任务类型精选工具（写代码的 Agent 不需要发邮件工具）
- 定义清晰的工具 schema（参数类型、返回格式）
- 拦截非法调用（调用不存在的工具、参数格式错误）

**状态怎么管**

多步任务需要记住中间状态，但不能无限堆积——Harness 要决定：
- 哪些信息放短期记忆（当前任务的 context）
- 哪些信息放长期记忆（跨任务的用户偏好、历史经验）
- 什么时候清空、什么时候压缩

**错误怎么处理**

模型不是完美的，工具调用也会失败。Harness 要有兜底策略：
- 工具执行失败：把错误信息喂回模型，让它换个方向
- 模型输出格式错误：重试或降级到安全默认行为
- 循环不终止：设 `max_steps` 强制退出

**边界怎么划**

模型有自主性，但不能无限制。Harness 要定义红线：
- 哪些操作需要人工确认（删除、付款）
- 哪些资源有配额限制（token 预算、API 调用次数）
- 哪些目录/文件不能碰（系统文件、敏感数据）

### 典型实现

现成的 Harness 实现包括：
- **LangChain / LangGraph**：提供循环、工具、记忆的标准组件
- **LlamaIndex**：偏重检索和知识管理的 Harness
- **AutoGPT / BabyAGI**：早期的自主 Agent Harness
- **自定义 Python 循环**：几十行代码也能实现基础 Harness

选哪个取决于任务复杂度——简单任务自己写循环更灵活，复杂任务用框架省时间。

---

## 💡 示例

同一个任务"写一篇技术博客"，三种实现方式的对比：

| 方式 | 实现 | 问题 |
|------|------|------|
| 纯 Prompt | 一次性让模型输出全文 | 长文容易跑题、格式不稳定、无法查资料 |
| Workflow | 固定流程：大纲 → 查资料 → 写正文 → 润色 | 流程写死，遇到意外情况（资料不够）无法调整 |
| Harness（Agent） | 循环：模型决定下一步（查资料/写大纲/补充细节），工具支持搜索和文件读写，状态记住已完成的部分 | 灵活、可恢复、能处理复杂情况，但成本更高 |

第三种方式需要 Harness 支撑——没有它，模型无法调工具、无法记住状态、无法多步执行。

---

## ⚠️ 坑与误区

最大的误区是"模型越强，Harness 就越不重要"。模型再强也是无状态的，循环、工具、状态管理这些事模型自己做不了。o1、o3 这类推理模型让 Harness 的**决策部分**变简单了（模型自己能规划），但**执行部分**（工具调用、状态管理、错误恢复）还是需要 Harness。

另一个常见问题是过度设计 Harness——给模型配一堆工具、复杂的记忆系统、多层规划，结果系统变得又慢又不稳定。好的 Harness 是**薄的、可组合的、可替换的**，不是越复杂越好。能用 [[workflow|Workflow]] 解决的任务，别上 Agent 级别的 Harness。

---

## 💬 我的理解

> 写下你自己读完之后的感受——哪里让你"咔"了一下，哪里还没想清楚，和你已知的什么东西连上了。

---

## 📖 进一步阅读

- [[agent]] — Agent 系统就是 Harness Engineering 的典型产物
- [[prompt-engineering]] — Harness 里每次调用模型，还是要写好 prompt
- [[context-engineering]] — Harness 负责动态管理每次调用的 context
- [[workflow]] — 搞清楚什么时候该用固定流程，什么时候才需要 Harness
- [[tool-use]] — 工具调用是 Harness 的核心能力之一
- [[skill-loading-library]] — Harness 如何注入 Skill 目录
- [[cursor-hooks]] — 事件级安全边界
