---
tags:
  - algorithm
  - metric
  - evaluation
aliases:
  - Precision@K
  - 精确率@K
  - 精排 Top-K 命中率
related:
  - "[[recall-at-k]]"
  - "[[retrieval-pipeline]]"
  - "[[cross-encoder]]"
  - "[[rag]]"
  - "[[chunking]]"
prerequisites:
  - "[[recall-at-k]]"
stability: long
layer: algorithm
updated: 2026-06-15
---

# Precision@K（精确率 @K）

> [!tip] 核心本质
> **Precision@K** 衡量 Top-K 检索结果里**有多少比例真相关**：分子是 Top-K 中相关文档数，分母是 **K**（固定为 K，不随相关文档总数变）。它回答「前 K 条干不干净」——与 [[recall-at-k]]「找全了没有」配对：高 Recall 低 Precision → 候选池够大但噪声多，[[cross-encoder|Rerank]] 与 prompt 压力大；低 Recall 高 Precision → 干净但常漏正确答案。

适合已读 [[recall-at-k]]、调 [[retrieval-pipeline]] 或 [[chunking]] 的工程师。本篇给出定义、与 Recall 对照、RAG 诊断顺序。

*检索说明：定义对齐 IR 标准与 [LangSmith RAG eval tutorial](https://docs.langchain.com/langsmith/evaluate-rag-tutorial)、[RAG eval 2026 实践](https://www.devshelfhub.com/articles/llm-rag-evaluation-crash-course/)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：与 Recall@K、MRR、NDCG 并列的检索度量；map 待补充表 P1，本篇补算法层节点。

**预期寿命**：长期。K 随产品变（5/10/20），定义不变。

**近期演进**：RAGAS **context precision** 与 Precision@K 同族；LLM-as-judge 评检索相关性作在线近似。

**终极威胁**：端到端 judge 若完全取代检索层指标，工程调试仍依赖 Precision/Recall 分解。

## 1 定义

单 query：

\[
\text{Precision@K} = \frac{|\{\text{相关}\} \cap \{\text{Top-K}\}|}{K}
\]

| 项目 | Recall@K | Precision@K |
| --- | --- | --- |
| 分母 | 全部相关文档数 | **K** |
| 问句 | 找全了吗 | Top-K 干净吗 |
| 相关文档很多时 | 难接近 1 | 仍 ≤ 1 |
| 相关文档 1 篇、K=10 | 命中即 1.0 | 命中仅 0.1 |

**表 1：** 手算示例（相关：A、B 共 2 篇；Top-5：A、X、Y、B、Z）

| 指标 | 值 |
| --- | --- |
| Recall@5 | 2/2 = 1.0 |
| Precision@5 | 2/5 = 0.4 |

## 2 RAG 诊断顺序

1. **Recall@K 低** → [[chunking]]、embed、混合召回、[[hyde]]/改写
2. **Recall 够、Precision 低** → 减 K、加 [[cross-encoder]] Rerank、metadata 过滤
3. **两者都够、答案仍错** → 生成侧或 query-document 鸿沟

社区经验：RAGAS context precision **< ~0.6** 时常先查检索再堆生成技巧。

## 3 实现要点

- 金标准：每 query 标注相关 chunk id 集合
- 与 [[recall-at-k]] **同数据集同 K** 一起报
- 多 K 曲线（K=3,5,10）看 trade-off
- LangSmith/自定义 evaluator：`precision = len(relevant ∩ topk) / k`

## 4 与 MRR / NDCG

- **MRR**：第一个相关结果排名多靠前（单答案友好）
- **NDCG@K**：分级相关性 + 位置折扣
- 待建专文 `mrr-ndcg` → 见 [[mrr-ndcg]]

## 要点收束

- Precision@K = Top-K 里相关的比例；Recall@K = 相关被找全的比例。
- 高 Recall 低 Precision → Rerank/减噪；低 Recall → 入库与召回。
- 与 [[recall-at-k]] 成对评测；K 与金标准 id 对齐。

## 进一步阅读

### 库内

- [[recall-at-k]] — 配对指标
- [[retrieval-pipeline]] — 粗排精排链路
- [[cross-encoder]] — 抬 Precision 常用手段
- [[chunking]] — 影响两者共同的上游

### 外部

- [LangSmith Evaluate RAG](https://docs.langchain.com/langsmith/evaluate-rag-tutorial)
