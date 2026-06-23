---
tags:
  - framework
  - observability
  - evaluation
aliases:
  - LangSmith
  - LangSmith 可观测
prerequisites:
  - "[[agent]]"
  - "[[langchain]]"
  - "[[langgraph]]"
related:
  - "[[agent-observability]]"
  - "[[agent-evaluation]]"
  - "[[llm-as-judge]]"
  - "[[harness-engineering]]"
stability: mid
layer: application
updated: 2026-06-15
---

# LangSmith

> [!tip] 核心本质
> **LangSmith** 是 LangChain 生态的 **LLM 可观测 + 评测平台**：把一次请求记录为 **trace**（含嵌套 **run/span**），支持离线 dataset 评测与在线生产监控，并与 [[langgraph]] / [[langchain]] 自动集成或 `@traceable` 手动埋点。没有 trace，Agent 的 tool 环、检索改写、多步 prompt 只能黑盒猜；没有 dataset eval，[[harness-engineering]] 的「改 prompt 不回归」无法闭合。LangSmith 与 [[agent-observability]] 互补：后者讲 OTEL/通用范式，本篇讲 LangChain 栈的默认产品化路径。

适合已跑通 LangGraph Agent、要接 tracing 与 [[agent-evaluation]] 的团队。框架无关项目也可只用 `@traceable` 或 OpenAI/Anthropic wrapper 集成。

*检索说明：概念与 API 对照 [LangSmith Observability concepts](https://docs.langchain.com/langsmith/observability-concepts)、[Evaluate complex agent](https://docs.langchain.com/langsmith/evaluate-complex-agent)、[Evaluation types](https://docs.langchain.com/langsmith/evaluation-types)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：[[langchain]] 产品线中的观测/评测层（mid）；LangGraph README 默认推荐配对使用。

**预期寿命**：中期。UI 与 SDK 迭代快；「trace + dataset + evaluator」三元组是行业共识形态。

**近期演进**：Agent 轨迹评测（trajectory partial credit）、在线 LLM-as-judge、Chat 分析 trace；SaaS  trace 保留约 400 天，长期样本需导出 **dataset**。

**终极威胁**：OpenTelemetry 原生 LLM semantic convention + 自建 eval 平台；短项目用日志 + pytest 足够。

## 1 数据模型

| 概念 | 含义 |
| --- | --- |
| **Trace** | 一次用户请求的完整记录 |
| **Run / Span** | trace 内单步：LLM 调用、tool、子图节点 |
| **Project** | trace 集合；`LANGCHAIN_PROJECT` 指定 |
| **Feedback** | 对 run 的离散/连续评分（人工或自动） |
| **Dataset** | 输入/期望输出样例，离线 eval 源 |

嵌套结构：外层 `assistant` → 内层 `get_context` tool → 内层 `ChatOpenAI`，与 [[agent-observability]] 的 span 树同构。

## 2 接入方式

**自动集成**（零改码或环境变量）：

- LangChain / LangGraph、OpenAI/Anthropic wrapper、CrewAI 等
- 设置 `LANGCHAIN_TRACING_V2=true`、`LANGCHAIN_API_KEY`

**手动埋点**（任意 Python/TS）：

- `@traceable` / `traceable` 装饰函数
- `trace` context manager、`RunTree` 低层 API

与 [[langgraph]]：编译图后每次 `invoke`/`stream` 自动产生节点级 span；配合 checkpointer 可对照状态恢复。

## 3 评测类型

LangSmith 区分 **何时评** 与 **怎么评**（[Evaluation types](https://docs.langchain.com/langsmith/evaluation-types)）：

| 类型 | 场景 |
| --- | --- |
| **Offline / dataset** | 发版前 benchmark、回归、单元测试 |
| **Online / production** | 生产流量抽样、异常检测、趋势监控 |

**Agent 三维**（[Evaluate complex agent](https://docs.langchain.com/langsmith/evaluate-complex-agent)）：

1. **Final response** — 最终答案对不对（常配 [[llm-as-judge]]）
2. **Trajectory** — tool 路径与期望步骤的 partial credit
3. **Single step** — 单步 tool 选择或参数

Evaluators：**LLM-as-judge**、**code evaluator**（`evaluate()` 传入 Python 函数）、composite / pairwise。

## 4 与库内节点分工

| 主题 | 读哪 |
| --- | --- |
| OTEL、通用 tracing 概念 | [[agent-observability]] |
| 轨迹指标定义 | [[agent-evaluation]] |
| 图编排 Runtime | [[langgraph]] |
| Judge rubric 设计 | [[llm-as-judge]] |

LangSmith 是 **实现选型**；范式层仍归 methodology / evaluation 节点。

## 5 最小工作流

1. 开发期：开 tracing → 在 UI 看失败 trace → 抽成 dataset 样例
2. 改 prompt/图：跑 `client.evaluate(target, data=dataset, evaluators=[...])`
3. 上线：在线 evaluator 或 feedback 收集 → 回流 dataset

与 [[harness-engineering]]：**trace 是门禁的证据源**——没有 trace 的「感觉变好了」不可合并。

## 要点收束

- LangSmith = trace（嵌套 run）+ dataset 离线 eval + 在线监控。
- Agent 评 final / trajectory / step 三层；trajectory 给 partial credit。
- 自动集成 LangGraph；也可 `@traceable` 框架无关使用。
- 与 [[agent-observability]]、[[agent-evaluation]] 分工：产品 vs 范式。

## 进一步阅读

### 库内

- [[agent-observability]] — 通用可观测
- [[agent-evaluation]] — 轨迹与任务指标
- [[langgraph]] — 图 Runtime
- [[llm-as-judge]] — Judge evaluator

### 外部

- [Observability concepts](https://docs.langchain.com/langsmith/observability-concepts)
- [Evaluate a complex agent](https://docs.langchain.com/langsmith/evaluate-complex-agent)
