---
tags: [framework, orchestration, langchain]
aliases: [LangGraph, lang graph]
related:
  - "[[agent]]"
  - "[[workflow]]"
  - "[[query-transformation]]"
  - "[[reAct]]"
  - "[[harness-engineering]]"
stability: mid
layer: application
updated: 2026-05-31
---

# LangGraph

> [!tip] 核心本质
> LangGraph 用**有状态图**描述 Agent 与控制流：节点是步骤，边是条件转移，检查点可持久化会话状态。若没有图式 Runtime，复杂链路（检索失败 → 改写 → 再检索 → 降级回答）会散落在 if/else 与临时队列里，难以观测与复现；LangGraph 把这类 CRAG / 多工具循环收成可版本化的图。

## 生命周期与演进

**当前定位**：LangChain 生态里偏**生产编排**的一层；与裸 LangChain Chain 相比，强调循环、人机中断、并行分支与持久化 state。检索增强生成（RAG）中的 CRAG Fallback 模式见 [[query-transformation]]；编排取舍见 [[harness-engineering]]。

**预期寿命**：中期。图编排是 Agent 工业化的常见答案之一，实现会换，「状态机 + 检查点」思路会留。

**近期演进**：与 LangSmith 可观测性绑定；多 Agent 子图；与向量存储 / 工具节点的标准模板增多。

**终极威胁**：云厂商托管 Agent Runtime 内置同等能力；或更强模型单次推理覆盖短链图，图仅保留长事务与人审环节。

## 与通用模式的分工

| 层次 | 文档位置 |
| --- | --- |
| ReAct / Planning 等行为模式 | `agent/pattern/` |
| 查询改写、RAG 原理 | `agent/retrieval/` |
| LangGraph 具体 API、图设计、部署 | 本文（`latest/`） |

## 实践与应用

（待撰写：StateGraph 心智模型、节点/边/conditional edge、checkpointer、CRAG 范例图、与 [[workflow]] 选型对比。）

## 进一步阅读

- 本仓库：[[query-transformation]]、[[harness-engineering]]
- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)
