---
tags:
  - pattern
aliases:
  - ReAct
  - react
  - Reason and Act
  - 推理与行动
prerequisites:
  - "[[llm]]"
  - "[[agent]]"
  - "[[tool-use]]"
related:
  - "[[agent]]"
  - "[[tool-use]]"
  - "[[planning]]"
  - "[[reflection]]"
  - "[[chain-of-thought]]"
  - "[[function-calling]]"
  - "[[harness-engineering]]"
stability: long
layer: application
updated: 2026-06-04
---

# ReAct（推理与行动）

> [!tip] 核心本质
> ReAct（**Re**ason + **Act**）是 [[agent|Agent]] 最常用的执行模式：[[llm|LLM]] 在每一轮先写出**推理**（决定下一步意图），再发起**行动**（通常经 [[tool-use|工具调用]]），Harness 把真实环境反馈作为**观察**（Observe）写回 context，然后进入下一轮。名字里的 Act 不是「模型自己执行」，而是「输出可执行的调用意图」——循环、权限、重试、终止条件都由 Runtime / Harness 维持。若没有 ReAct 式交替，模型只能在训练权重里「空想」外部世界，无法根据搜索结果、命令退出码等**新事实**修正路线；[[chain-of-thought|CoT]] 只外化文本推理，ReAct 把推理与对外部系统的探测绑在一起。

## 生命周期与演进

**当前定位**：Yao et al. 2022 提出后，已成为 Agent 教科书的默认循环；与 [[agent]] 文中的「思考 → 行动 → 观察」是同一结构。现代产品（Cursor Agent、Claude Code、LangGraph）多在 API 层用 [[function-calling|Function Calling]] 表达 Act，语义仍是 ReAct，只是 Observation 由 Harness 自动注入为 tool result。

**预期寿命**：长期。只要任务需要多轮、依赖实时外部状态，交替推理与行动就不会被单次超长生成取代。

**近期演进**：并行 tool call（一轮多个 Act）；Reasoning 模型拉长单轮思考，减少无效循环；在 Observe 后挂 [[reflection|Reflection]] 做自检已成常见增强；GUI / Computer Use 把 Observation 扩展为截图与 DOM 状态。

**终极威胁**：更强模型缩短所需轮次，或一次调用内完成更多子步骤；但权限边界与可观测性仍要求 Harness 显式记录每轮 Thought/Action/Observation，模式会内化到工程实践而非消失。

## 与 Agent 核心循环的关系

[[agent]] 的感知-思考-行动循环在 ReAct 里被**命名并论文化**：

```mermaid
flowchart LR
    T[Thought / Reason] --> A[Action / Act]
    A --> O[Observation]
    O --> T
```

| 阶段 | 谁产生 | 典型内容 |
| --- | --- | --- |
| **Reason** | LLM 生成 | 「需要先查航班」「上一步 API 404，应改查备用源」 |
| **Act** | LLM 输出意图，Harness 执行 | `web_search(...)`、`read_file(...)` |
| **Observe** | 环境 / Harness 写回 | 搜索结果、文件内容、错误信息 |

ReAct 是**模式**（交替什么）；Harness 是**实现**（如何拼 prompt、解析 tool call、设 `max_steps`、做审批）。二者不可混谈：同一 ReAct 模式可用几十行 Python 或 LangGraph 图编排实现。

## 与 Chain-of-Thought、Planning 的边界

| | [[chain-of-thought]] | ReAct | [[planning]] |
| --- | --- | --- | --- |
| **外化什么** | 纯文本推理链 | 推理 + 工具行动 + 环境反馈 | 子任务列表或动态重规划 |
| **新信息从哪来** | 仅已有 context | 每轮 Observation | 计划 + 每步执行结果 |
| **典型用途** | 单轮复杂推导 | 多轮需查资料、试错的任务 | 复杂目标的分解与顺序 |

CoT 解决「跳步推理」；ReAct 在 CoT 之上增加**对外部世界的探测**。静态 [[planning]] 可先列出 1→2→3 再执行；ReAct 更适合**每一步执行完再决定下一步**的动态规划，二者常组合（先 plan 一轮，再 ReAct 执行）。

## Prompt 与 Harness 分工

经典论文轨迹用显式标签（便于人类调试）：

```
Thought: 需要查询明天北京到上海的航班
Action: SearchFlights["北京", "上海", "2026-06-05"]
Observation: [航班列表 JSON…]
Thought: 筛选最早且最便宜的早班经济舱
Action: …
```

工程上常见两种落地：

1. **文本轨迹**：模型输出 Thought/Action 行，Harness 用正则或解析器提取 Action，执行后拼 `Observation:` 再继续生成。
2. **原生 tool call**：模型返回结构化 tool_calls，Reason 常出现在 `content` 或 reasoning 通道，Observation 即 `tool` role 消息——对用户不可见，但循环语义不变。

Harness 必做事项（与 [[agent]] Runtime 职责一致）：

- 维护 `history`（含每轮 Observation）
- 校验 Action 是否在工具白名单、参数是否符合 schema
- 捕获执行异常并写成 Observation（避免整链崩溃）
- 终止条件：`max_steps`、无新 tool call、LLM 声明完成、关键写操作人工确认

## 实践要点

**有效时**：

- 任务依赖**实时或私有数据**（搜索、数据库、仓库文件）
- 需要**试错**（命令失败 → 改参数重试）
- 中间状态应**可审计**（合规、调试）

**慎用或不必用**：

- 步骤固定、可代码编排 → [[workflow]] 更省 token、更可预测
- 单轮问答、无外部依赖 → 普通 Chat 即可
- 纯心算推理、无工具 → CoT 足够，不必套 Act

**与 Reflection 组合**：在 Observation 写入后增加一轮「结果是否合理？是否偏离目标？」，可缓解错误累积；详见 [[reflection]]。

## 常见误区

- **ReAct = LangChain**：任何维持 Think→Act→Observe 的 Runtime 都算实现，框架只是可选依赖。
- **Observation 由模型编造**：必须由 Harness 注入真实 tool result；让模型自己写 Observation 会幻觉环境状态。
- **Reason 越长越好**：冗长 Thought 浪费 context；应服务于下一步 Action 的选择。
- **有 Function Calling 就不是 ReAct**：API 形态变了，交替结构未变。
- **每轮只能一个工具**：现代模型支持并行 Act；Harness 需支持批量执行与合并 Observation。

## 进一步阅读

- [[agent]] — 感知-思考-行动循环与 Runtime 职责
- [[tool-use]] — Act 阶段的能力边界与风险模型
- [[function-calling]] — 结构化 Action 的协议与 schema
- [[planning]] — 静态计划 vs ReAct 式动态重规划
- [[chain-of-thought]] — 纯文本外化推理，ReAct 的推理侧基础
- [[reflection]] — Observe 之后的自检增强
- [[harness-engineering]] — 让 ReAct 循环长期可靠运行的系统工程
- [ReAct: Synergizing Reasoning and Acting (Yao et al., 2022)](https://arxiv.org/abs/2210.03629) — 原始论文与 Thought/Action/Observation 轨迹
