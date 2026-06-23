---
tags:
  - retrieval
  - production
aliases:
  - Rerank
  - Reranker 选型
  - 精排生产
prerequisites:
  - "[[retrieval-pipeline]]"
  - "[[cross-encoder]]"
  - "[[bi-encoder]]"
related:
  - "[[rrf]]"
  - "[[recall-at-k]]"
  - "[[precision-at-k]]"
  - "[[mrr-ndcg]]"
  - "[[crag]]"
stability: long
layer: application
updated: 2026-06-15
---

# Rerank 生产选型

> [!tip] 核心本质
> **Rerank（精排）**是 RAG 漏斗第二段：粗排 [[bi-encoder]]/[[bm25]] 捞出 Top-50~100，**[[cross-encoder]]** 逐对联合打分，取 Top-3~10 进 prompt。机制见 [[cross-encoder]] 与 [[retrieval-pipeline#第四阶段：精排（Rerank）]]；本篇只答**生产选型**：开不开、用哪模型、延迟预算、失败降级。

典型 trade-off：**+10~15pt 精准度，+100~300ms**（50 候选，GPU）。多数生产 RAG **值得开**。

*检索说明：模型与延迟对照 [FlagEmbedding BGE reranker](https://github.com/FlagOpen/FlagEmbedding)、[vLLM 无关] Cohere Rerank 文档、[[retrieval-pipeline]] 内实测区间（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：[[retrieval-pipeline]] 已含实现细节；独立节点供 map wikilink「rerank 选型」。

**预期寿命**：long。两阶段漏斗稳定；checkpoint 名年年换。

**近期演进**：Qwen3-Reranker、Cohere Rerank 4；ColBERT 替代部分全交互；TEI/Marlin 批处理。

**终极威胁**：小库端到端检索头；超长 context 仍要分数做 [[crag]] 门控。

## 1 何时启用

| 启用 | 可暂缓 |
| --- | --- |
| 混合召回后 Top-5 噪声明显 | 库 <1k、延迟极严 |
| 要 rerank 分数作 CRAG 阈值 | 已有 ColBERT 路且精度够 |
| 中英/多语混合库 | POC 仅验证 recall |

## 2 模型选型（2026 默认）

| 场景 | 首选 | 备注 |
| --- | --- | --- |
| 中英混合、自托管 | `BAAI/bge-reranker-v2-m3` | 生产开源默认 |
| 要最高质量、可接受延迟 | `bge-reranker-v2-gemma` | 更大 |
| 中文对比 | `Qwen3-Reranker` | 与 bge 消融 |
| 快速原型 / 无 GPU 运维 | **Cohere Rerank** API | 按量付费 |
| 超长 query/doc | Jina Reranker v2 | 8k+ context |
| 极低延迟 | MiniLM / mxbai-rerank-base | 质量换速度 |

闭源 vs 开源：API 省运维；自托管控数据与 QPS 成本。

## 3 延迟预算

| 因素 | 建议 |
| --- | --- |
| 候选数 K | **50** 常见；>100 收益递减 |
| 文档截断 | ≤512 token/对 |
| 批处理 | 必须 batch pairs；勿逐条 |
| 硬件 | A10/L4 级 GPU；CPU 仅低 QPS |
| 吞吐 | bge-v2-m3 ~200–400 pair/s FP16 |

**Wall-clock 粗算**：50 对 ÷ 300 pair/s ≈ **150ms** + 融合/网络。

两阶段：**轻量 rerank 筛 → 重型 rerank Top-20** 可省 60%+ 延迟。

## 4 与全链路

```mermaid
flowchart LR
  Q[Query] --> COARSE[粗排 Top-50]
  COARSE --> RER[Rerank CE]
  RER --> TOP[Top-5 → LLM]
  RER -->|score low| CRAG[[crag]]]
```

- 融合在 rerank **前**：[[rrf]]
- 指标：粗排 [[recall-at-k]]；精排 [[precision-at-k]]、[[mrr-ndcg]]
- 观测：log 每对 score、丢弃 chunk（[[agent-observability]]）

## 5 降级策略

1. **超时** — 回退 RRF Top-N，无 rerank
2. **GPU 不可用** — API rerank 或跳过
3. **分数阈值** — 全低于 τ → 触发 [[crag]] / 拒答

## 6 常见坑

| 坑 | 后果 |
| --- | --- |
| 对全库 rerank | 不可扩展 |
| 不截断长 doc | 延迟爆炸 |
| 无 batch | GPU 空转 |
| 跳过粗排直接 CE | 漏召回 |
| 不看域内消融 | 榜单模型域外差 |

## 要点收束

- Rerank = Cross-Encoder 对 Top-50~100 精排；机制见 [[cross-encoder]]。
- 默认 **bge-reranker-v2-m3** 自托管；原型可用 Cohere。
- 预算 ~100–300ms；必 batch + 截断。
- 细节与代码见 [[retrieval-pipeline]]。

## 进一步阅读

### 库内

- [[retrieval-pipeline]] — 全链路第四阶段
- [[cross-encoder]] — 架构与复杂度
- [[crag]] — 低分纠错
- [[mrr-ndcg]] — 精排评测

### 外部

- [FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding)
- [BEIR benchmark](https://github.com/beir-cellar/beir)
