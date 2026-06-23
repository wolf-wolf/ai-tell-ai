---
tags:
  - evaluation
aliases:
  - LLM-as-Judge
  - LLM 作为评判者
prerequisites:
  - "[[llm]]"
  - "[[agent-evaluation]]"
related:
  - "[[rag]]"
  - "[[recall-at-k]]"
  - "[[precision-at-k]]"
  - "[[hallucination]]"
  - "[[rlhf]]"
stability: mid
layer: model
updated: 2026-06-15
---

# LLM-as-Judge（模型即评判）

> [!tip] 核心本质
> **LLM-as-Judge** 用强（或专用）LLM 按 rubric 对另一模型的输出或**轨迹**打分——扩展人工评测到规模化回归，用于 RAG 的 faithfulness/relevance、Agent 的 task completion、偏好数据构造。Judge 自身有**位置偏置、自我偏好、长度偏置**；不能替代 [[recall-at-k]] 等检索金标准，而是补**无标答或开放域**维度。

适合建 [[agent-evaluation]]、RAG 评测集的工程师。读完知 Judge 适用边界与校准要点。

*检索说明：实践对照 [LangSmith RAG evaluators](https://docs.langchain.com/langsmith/evaluate-rag-tutorial)、[DevShelf RAG eval 2026](https://www.devshelfhub.com/articles/llm-rag-evaluation-crash-course/)、[genai.qa trajectory judge 2026](https://genai.qa/ai-agent-trajectory-testing-2026/)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：RAGAS、LangSmith、DeepEval GEval 等默认组件；[[agent-evaluation]] 中 trajectory judge 与 cheap model（mini 级）组合常见。

**预期寿命**：中期。Judge 模型换代快；rubric 与 pairwise 协议较稳。

**近期演进**：组件级 judge（只评检索 span）；与 OTEL trace 联动；EACL 2026 讨论 IR 指标 vs LLM 消费文档方式错位（见 [[mrr-ndcg]]）。

**终极威胁**：可验证环境（代码测试、SQL 执行）可替代部分 judge；开放域仍要 judge 或人类。

## 1 评什么

| 对象 | 典型 rubric |
| --- | --- |
| 最终答案 | 正确性、 helpfulness、安全性 |
| RAG 生成 | Groundedness、answer relevance |
| 检索结果 | Context relevance（无需标答） |
| Agent 轨迹 | 工具是否合理、步骤是否冗余 |
| 偏好对 | A/B 哪个更好（构造 [[dpo]] 数据） |

## 2 与确定性指标分工

| 有 gold chunk id | 优先 Recall/Precision@K |
| --- | --- |
| 开放生成质量 | Judge + 人工 spot-check |
| Agent 工具序列 | 规则 + trajectory match；Judge 补语义 |

**不要**用 Judge  alone 调 [[chunking]]——先用 id 级 Recall/Precision。

## 3 偏差与缓解

| 偏差 | 缓解 |
| --- | --- |
| 自我偏好（同系列模型） | 换家族 Judge；或人工校准 |
| 长度偏置 | rubric 强调简洁；pairwise 时 shuffle |
| 位置偏置 | 多样本投票；交换 A/B 顺序 |
| 确定性标签过拟合 | 温度 0 + 多 seed；与规则分结合 |

**成本**：高流量用便宜 Judge；全量最强 Judge 仅 audit 抽样。

## 4 工程模式

1. **Rubric 模板化**：criteria + 1–5 分 + 必须引用 evidence
2. **Reference 可选**：有 golden 轨迹时作 Judge 参考（LangSmith agentevals）
3. **与 CI**：LangSmith `client.evaluate` / DeepEval pytest；失败 block merge
4. **人工闭环**：低置信 sample 进标注队列

## 5 与 RLHF / DPO

偏好标注可来自 Judge（[[rlhf]] RM 数据、[[dpo]] pairs）；但**生产对齐**仍要人类抽检，防 Judge 系统性偏。

## 要点收束

- LLM-as-Judge 扩展开放域与端到端评测，不替代检索 id 指标。
- 分维度 rubric；便宜 Judge + 抽样强 Judge。
- 知偏差：自我偏好、长度、位置。
- 与 [[agent-evaluation]]、[[agent-observability]] trace 联用。

## 进一步阅读

### 库内

- [[agent-evaluation]] — 轨迹与工具指标
- [[precision-at-k]] — 检索侧 gold
- [[hallucination]] — groundedness 语境
- [[dpo]] — 偏好对来源

### 外部

- [LangSmith Evaluate RAG](https://docs.langchain.com/langsmith/evaluate-rag-tutorial)
