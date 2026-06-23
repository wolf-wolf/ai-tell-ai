---
tags:
  - index
  - tools
aliases:
  - 知识融合工具清单
  - Knowledge Fusion Tools
prerequisites:
  - "[[knowledge-fusion]]"
  - "[[knowledge-extraction]]"
  - "[[conflict-resolution]]"
related:
  - "[[graph-rag]]"
  - "[[modular-rag]]"
  - "[[retrieval-pipeline]]"
  - "[[rrf]]"
  - "[[rag]]"
stability: short
layer: application
updated: 2026-06-15
---

# 知识融合工具清单

> [!tip] 核心本质
> 本页是 [[knowledge-fusion]] 的**开源工具索引**——按融合阶段（对齐、冲突、推理层多源、GraphRAG、知识编辑）列可点名的 GitHub 项目，便于 POC 选型。不是替代 [[conflict-resolution]] / [[graph-rag]] 的原理文；Stars 与 API 随版本变，**以仓库 README 为准**。生产多数走「推理层 [[rrf]] + LLM 说明冲突」，存储层 Truth Discovery 与 KG 对齐在合规/多库场景仍需要。

*检索说明：各项目 Stars/定位对照 GitHub README 与 [LightRAG](https://github.com/HKUDS/LightRAG)、[GraphRAG](https://github.com/microsoft/graphrag)、[STORM](https://github.com/stanford-oval/storm)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：`short` 索引节点；[[knowledge-fusion]] 正文保留机制，本篇便于 wikilink「工具清单」。

**预期寿命**：短。仓库更名、Stars 波动快；半年一刷即可。

**近期演进**：GraphRAG / LightRAG 双轨；STORM 类多源写作；Semantica/Cognee 等「graph memory」产品化。

**终极威胁**：云 RAG 一体机内置融合；索引价值在「知道有哪些可自托管选项」。

## 1 选型维度

先读 [[knowledge-fusion]] 中「三个层面：在哪里融合」。

| 阶段 | 要问 | 索引章节 |
| --- | --- | --- |
| 入库前 | 候选事实从哪提取？ | → [[knowledge-extraction]] |
| 存储层 | 实体对齐 / 跨库合并？ | §2 对齐 |
| 冲突 | 互斥事实谁信？ | §3 Truth Discovery |
| 推理层 | 多路检索怎么并？ | §4 RAG / Graph |
| 权重层 | 改模型记忆？ | §5 知识编辑（偏研究） |

## 2 实体对齐 / 记录链接

| 项目 | 规模取向 | 一句话 |
| --- | --- | --- |
| [Splink](https://github.com/moj-analytical-services/splink) | 亿级 | Fellegi-Sunter；DuckDB/Spark |
| [Dedupe](https://github.com/dedupeio/dedupe) | 百万以下 | 主动学习交互标注 |
| [Zingg](https://github.com/zinggAI/zingg) | 分布式 | Spark + 深度学习 blocking |
| [PyJedAI](https://github.com/AI-team-UoA/pyJedAI) | 研究/对比 | 多算法 entity resolution 评测 |

## 3 Truth Discovery / 冲突

| 项目 | 一句话 |
| --- | --- |
| [CrowdKit](https://github.com/Toloka/crowd-kit) | TruthFinder、Dawid-Skene、MACE 等经典算法 |

算法细节与写回契约 → [[conflict-resolution]]。LLM 流水线（[STORM](https://github.com/stanford-oval/storm)）常内置「多源对照 + 叙述冲突」。

## 4 RAG / Graph 多源融合

| 项目 | 融合形态 | 链内节点 |
| --- | --- | --- |
| [GraphRAG](https://github.com/microsoft/graphrag) | 社区图 + 全局/局部查询 | [[graph-rag]] |
| [LightRAG](https://github.com/HKUDS/LightRAG) | 双层 KG + 向量；增量友好 | [[graph-rag]] 互补 |
| [LlamaIndex](https://github.com/run-llama/llama_index) | QueryFusion、Ensemble retriever | [[retrieval-pipeline]] |
| [LangChain](https://github.com/langchain-ai/langchain) | EnsembleRetriever 多路 | [[modular-rag]] |
| [RAGFlow](https://github.com/infiniflow/ragflow) | KG + 多路 + UI | 产品化 POC |
| [STORM](https://github.com/stanford-oval/storm) | 多源检索写作 + 冲突处理 | 研究向 pipeline |
| [Cognee](https://github.com/topoteretes/cognee) | ECL 构图 + cognitive search | 开源 graph memory |

推理层默认组合：**BM25 + 向量 + [[rrf]]**；Graph 补全局/多跳。见 [[retrieval-pipeline]]。

## 5 KG 嵌入 / 跨图对齐

| 项目 | 一句话 |
| --- | --- |
| [OpenKE](https://github.com/thunlp/OpenKE) | TransE/RotatE/ComplEx |
| [OpenEA](https://github.com/nju-websoft/OpenEA) | 实体对齐 benchmark 套件 |
| [ULTRA](https://github.com/DeepGraphLearning/ULTRA) | Zero-shot 关系预测迁移 |

## 6 知识编辑（研究为主）

| 项目 | 方法 |
| --- | --- |
| [EasyEdit](https://github.com/zjunlp/EasyEdit) | ROME/MEMIT/GRACE/MEND 工具箱 |
| [ROME](https://github.com/kmeng01/rome) / [MEMIT](https://github.com/kmeng01/memit) | 权重内编辑 |
| [GRACE](https://github.com/thartvigsen/grace) | 外挂码本，近 RAG |

生产更常 **RAG + 外部库版本化**，而非改权重。

## 7 快速选型

| 需求 | 优先试 |
| --- | --- |
| 多库实体 dedup | Splink / Dedupe |
| 文档库 + 全局问答 | GraphRAG 或 LightRAG |
| 已有向量库，要多路融合 | LlamaIndex QueryFusion / LangChain Ensemble |
| 多源报告 + 冲突叙述 | STORM |
| 冲突算法实验 | CrowdKit + [[conflict-resolution]] |

## 要点收束

- 索引按融合阶段组织；原理读 [[knowledge-fusion]]。
- 推理层 GraphRAG/LightRAG + [[rrf]] 是 2026 主流 POC 路径。
- Stars 会过期；动手前打开 GitHub README。
- 与 [[knowledge-extraction]]、[[conflict-resolution]] 配套使用。

## 进一步阅读

### 库内

- [[knowledge-fusion]] — 三层融合机制
- [[conflict-resolution]] — 冲突消解专文
- [[graph-rag]] — GraphRAG 原理
- [[retrieval-pipeline]] — 生产检索栈

### 外部

- [GraphRAG](https://github.com/microsoft/graphrag)
- [LightRAG paper](https://arxiv.org/abs/2410.05779)
