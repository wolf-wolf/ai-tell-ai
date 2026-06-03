---
tags: [technique]
aliases: [Tool Use, 工具调用]
related: ["[[agent]]", "[[function-calling]]", "[[tool-mcp]]", "[[context-window]]", "[[planning]]", "[[tool-self-learning]]"]
prerequisites: ["[[agent]]", "[[llm]]"]
stability: long
layer: application
updated: 2026-05-31
---

# Tool Use（工具调用）

> [!tip] 核心本质
> LLM 只能生成文本，无法直接执行代码或访问外部系统；Tool Use 通过让 LLM 输出**结构化调用意图**、由外部 Harness 代为执行并回传结果，赋予 Agent 感知与行动能力。没有这层分离，要么让 LLM 直接执行（权限边界消失，一行 shell 指令可删库），要么把所有外部数据静态预注入 prompt（成本爆炸且无法获取实时信息）。

## 生命周期与演进

**当前定位**：GPT-4/Claude/Gemini 等主流模型均原生支持工具调用；Tool Use 已是 Agent 架构的标配组件，「LLM 决定意图 + Harness 执行」是工业级 Agent 的通用架构。

**预期寿命**：长期。I/O 类工具（文件读写、数据库、实时 API、代码执行）因安全隔离与实时性需求，不会被模型权重内化，外部执行层长期存在。

**近期演进**：并行工具调用（单轮 LLM 输出多个调用请求同步执行）；流式工具结果返回；Computer Use 级 GUI 工具（截图 + 鼠标键盘操作）；工具调用结果的 Prompt Cache 优化。

**终极威胁**：高频信息型工具（如基础知识查询）可能随模型规模增大被权重内化；但「工具作为权限边界」的安全价值使纯文本替代在写操作场景几乎不可能。

## 执行架构

LLM 在调用链中只做一件事：输出「调什么、传什么参数」的意图，不直接执行。

```
用户发起任务
      ↓
LLM 分析任务 → 输出工具调用请求（结构化 JSON）
      ↓
Harness 执行工具 → 获得真实结果
      ↓
结果注入 context → LLM 继续推理
      ↓
（可能再次发起工具调用，直到任务完成）
      ↓
LLM 输出最终回答
```

这是一个**多轮工具调用循环**：在用户视角的一次请求中，LLM 与 Harness 可能反复交互多次。LLM 依据当前 context（含历史工具结果）判断下一步是继续调用工具还是给出终态回答。

**并行调用**：现代模型支持单次输出多个工具调用请求。Harness 可并发执行后批量回传，显著缩短链路延迟——前提是多个调用之间没有数据依赖。

工具调用的协议细节（JSON schema 格式、模型如何专项训练）见 [[function-calling]]。

## 工具分类与风险模型

不同类别的工具在出错代价上差异极大，直接影响 Agent 的权限设计与人工审批策略：

| 类别 | 典型示例 | 可逆性 | 风险等级 |
| --- | --- | --- | --- |
| 数据读取 | web_search、db_query、read_file | 幂等 | 低 |
| 代码执行 | python_exec、shell | 取决于脚本 | 高 |
| 写操作 | write_file、send_email、db_write、git push | 通常不可逆 | 高 |
| Agent 调用 | spawn_subagent、call_external_api | 取决于被调用方 | 中-高 |

**风险设计原则**：
- **写操作与代码执行默认需要人工确认**，或在 Harness 层加强校验（参数白名单、dry-run 模式）。
- **代码执行工具需沙箱隔离**，防止 LLM 幻觉参数或提示注入引发宿主系统操作。
- **权限最小化**：每轮任务只向 LLM 暴露当前需要的工具，减少误路由概率——工具列表过长本身就是噪声。

## 工具描述即 Prompt

工具描述（description）是 LLM 选择工具、填写参数的**唯一信号**，其质量直接决定调用是否正确。

坏描述（LLM 无从判断）：
```
name: search
description: 搜索
```

好描述（明确边界与用法）：
```
name: web_search
description: 在互联网上搜索最新信息。
  适用：需要训练截止日期之后的实时数据、新闻、价格。
  不适用：搜索本地文件、查询私有数据库。
parameters:
  query (string): 搜索关键词，越具体越好
  max_results (int, 默认 3): 返回结果数量
```

三个要素缺一不可：**做什么**（功能边界）、**何时用**（触发条件）、**何时不用**（避免误路由）。参数描述中补充取值约束和示例，可进一步减少参数幻觉。

函数 schema 的完整设计规范见 [[function-calling]]；工具描述的官方最佳实践见 [[resources/writing-tools-for-agents]]。

## 工具结果与 Context 代价

工具调用的结果会作为消息注入 context window，带来两个影响：

1. **消耗上下文空间**：多轮工具调用后 context 可能膨胀，大体积结果（如 10 万字文档）需在 Harness 层先做摘要再注入，而非全量传入。
2. **影响后续推理质量**：无关的工具结果是噪声，会稀释 LLM 对关键信息的注意力。只传与当前推理步骤直接相关的内容。

## 进一步阅读

- [[function-calling]] — 工具调用的协议层：LLM 如何输出 JSON 意图、schema 设计与训练机制
- [[tool-mcp]] — MCP 标准：跨系统、跨宿主的工具互操作协议
- [[tool-self-learning]] — Agent 如何自学使用/创造工具（LATM、Toolformer、Voyager）
- [[reAct]] — 推理与工具调用交替的 Agent 执行模式
- [[resources/writing-tools-for-agents]] — Anthropic 官方「如何写好工具描述」
- [[resources/mcp-code-execution]] — MCP 工具协议与代码执行实践
