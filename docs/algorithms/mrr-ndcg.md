---
tags:
  - algorithm
  - metric
aliases:
  - MRR
  - NDCG
  - Mean Reciprocal Rank
  - nDCG
related:
  - "[[recall-at-k]]"
  - "[[precision-at-k]]"
  - "[[retrieval-pipeline]]"
  - "[[llm-as-judge]]"
prerequisites:
  - "[[recall-at-k]]"
stability: long
layer: algorithm
updated: 2026-06-15
---

# MRR 与 NDCG（排序质量指标）

> [!tip] 核心本质
> **MRR**（Mean Reciprocal Rank，平均倒数排名）问「第一个相关结果排第几」；**NDCG@K**（Normalized Discounted Cumulative Gain）问「Top-K 里相关文档是否排在前面、且高相关是否更靠前」。二者来自经典 IR，常用于 [[cross-encoder|Rerank]] 与搜索评测；在 RAG 里与 [[recall-at-k]] / [[precision-at-k]] 互补——Recall/Precision 不强调**排序位置**，MRR/NDCG 强调**第一个有用段落在第几位**。

适合已做召回评测、上调 Rerank 或合并多路列表的工程师。注意：LLM **整批读 context** 时，传统位置折扣假设与人不同，端到端 RAG 相关性有时需 [[llm-as-judge]] 或 UDCG 类新指标补充（EACL 2026）。

*检索说明：定义对齐 IR 教科书；RAG 错位讨论见 [Redefining Retrieval Evaluation in the Era of LLMs (EACL 2026)](https://aclanthology.org/2026.eacl-long.391.pdf)（观测 2026-06-15）。*

## 1 MRR

单 query：第一个相关结果排名为 \(rank\)，则 \(RR = 1/rank\)；无相关则 0。  
**MRR** = 所有 query 的 RR 平均。

| 场景 | MRR 友好 |
| --- | --- |
| 单答案 QA（一个 gold chunk） | ✅ |
| 多 relevant 需全召回 | ⚠️ 用 Recall@K |

## 2 NDCG@K

对每个位置 \(i\) 赋予**相关性等级** \(rel_i\)（0/1 或 0–3），折扣 \(discount(i) = \log_2(i+1)\)：

\[
DCG@K = \sum_{i=1}^{K} \frac{2^{rel_i}-1}{discount(i)}
\]

**NDCG@K** = DCG@K / IDCG@K（理想排序下的 DCG）。

适合**分级相关**（部分相关 chunk）和 Rerank 消融。

## 3 与 Recall / Precision 分工

| 指标 | 问句 |
| --- | --- |
| Recall@K | 相关是否进 Top-K |
| Precision@K | Top-K 噪声比例 |
| MRR | 第一个相关多靠前 |
| NDCG@K | 排序是否符合等级 |

调 [[retrieval-pipeline]]：Recall 低先改召回；Recall 够、MRR/NDCG 低 → 加 Rerank 或改 fusion。

## 4 RAG 语境 caveat

[EACL 2026 工作][eacl-udcg] 指出：nDCG/MRR 假设**顺序浏览**与**忽略无关文档**；LLM 可能**同时读全部 chunk**，且** distractor chunk  actively 害生成**。因此：

- 离线调检索/Rerank：MRR/NDCG 仍有用
- 端到端答案质量：加 groundedness Judge 或 UDCG 类指标

## 要点收束

- MRR = 第一个命中排名；NDCG@K = 分级相关 + 位置折扣。
- 与 Recall/Precision 组成检索评测四件套。
- Rerank 阶段最常看 MRR/NDCG 提升。
- RAG 端到端需知 IR 指标与 LLM 消费方式可能错位。

## 进一步阅读

### 库内

- [[recall-at-k]] — [[precision-at-k]] — 配对基础
- [[retrieval-pipeline]] — Rerank 阶段
- [[llm-as-judge]] — 端到端补评

### 外部

- [eacl-udcg]: [Redefining Retrieval Evaluation in the Era of LLMs](https://aclanthology.org/2026.eacl-long.391.pdf)
