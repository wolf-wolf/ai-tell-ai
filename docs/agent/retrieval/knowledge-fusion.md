---
tags:
  - technique
aliases:
  - 知识融合
  - Knowledge Fusion
  - 知识整合
prerequisites:
  - "[[rag]]"
  - "[[embedding]]"
  - "[[llm]]"
related:
  - "[[knowledge-extraction]]"
  - "[[rag]]"
  - "[[memory]]"
  - "[[embedding]]"
  - "[[conflict-resolution]]"
  - "[[retrieval-pipeline]]"
  - "[[rrf]]"
  - "[[rlhf]]"
stability: long
layer: application
updated: 2026-06-04
---

# 知识融合（Knowledge Fusion）

> [!tip] 核心本质
> 知识融合解决的是：当新知识从异构来源进入时，如何**只更新知识结构中应变的部分**，并保留仍成立的部分——例如已知「A 公司主营硬件」，新文说「今年开始做软件订阅」，合理做法是**补充**而非整段替换。若没有融合机制，[[llm|LLM]] 只能依赖单一源头：知识不完整、同一实体描述矛盾、或新旧冲突导致错误回答。融合要在**一致性**前提下汇聚多源知识；最常见失败不是「找不到」，而是**归错节点**或**静默用错误来源覆盖正确来源**——后者比不融合更危险，细节见 [[conflict-resolution]]。

## 生命周期与演进

**当前定位**：企业知识库、多文档库 [[rag]]、知识图谱合并的基础问题；工程上推理层「多源检索 + 重排」最普遍，存储层实体对齐与冲突消解在 KG 场景仍是刚需。

**预期寿命**：长期。数据源只会增多（文档、工单、图谱、多模态），不会回归单库；形态从离线批融合演进到近实时增量融合与带来源的写回契约。

**近期演进**：GraphRAG / LightRAG 把关系结构带入推理层；STORM 等多源流水线内置冲突处理；LLM 参与一致性判断与冲突说明，与经典 Truth Discovery 并存；知识编辑（ROME/MEMIT）仍偏研究，生产多退回 RAG + 外部库。

**终极威胁**：超长 context「全库塞进窗口」绕过显式融合管线；强检索内置到模型权重后，部分场景融合层变薄——但权限、版本、冲突追溯在合规场景仍需要显式融合与 [[conflict-resolution]]。

## 为什么需要知识融合

单一来源很少覆盖真实问题。知识分散在：不同格式（文本、表格、图像）、不同存储（结构化 / 非结构化）、不同时间版本、不同机构维护的图谱。

核心问题：**在保持一致性的前提下，让模型能利用多个异构源头的知识**。

入库前须由 [[knowledge-extraction|知识提取]] 产出带溯源的候选记录；融合不负责从 raw 散文里「猜事实」，只对已提交的候选做对齐与更新。

## 三个层面：在哪里融合

融合发生的位置决定代价、灵活性与可靠性。

### 外部存储层（推理前融合）

知识在进模型前完成整合，模型拿到已对齐的知识——知识图谱领域的经典路径。

- **实体对齐（Entity Resolution）**：判断两库描述是否同一对象。浅层：编辑距离、TF-IDF；深层：[[embedding]] 余弦、图结构（邻居相似则实体更可能相同）。难点：同名异义与异名同义并存。
- **本体对齐（Ontology Alignment）**：概念体系映射（如「心肌梗死」↔「MI」）。规则可解释，维护成本随规模上升。
- **[[conflict-resolution|冲突消解]]**：同一实体互斥属性值时估计可信度、投票或 Truth Discovery，并写回置信度与来源。选错信任源比不融合更危险——算法与工程契约见专文。

### 推理层（推理时融合）

不预先合并，每次推理动态拉取、组合后注入。

- **多源 RAG**：多向量库 / 文档库并行检索，[[rrf]] 或 Rerank 并榜后注入 context——当前最常见实用方案。
- **GraphRAG**：检索图谱子图而非裸 chunk，适合多跳（A→B→C）。
- **长上下文直接注入**：多文档塞进窗口由模型自融合；成本高，且有 Lost-in-the-Middle（中间段注意力下降）。

优势：改外部库即可更新，零重训。劣势：每问都走检索，延迟与成本更高。

### 模型权重层（训练时融合）

知识写入参数，推理无需外部检索。

- **持续预训练**：新语料继续训练；风险是灾难性遗忘。
- **知识编辑（ROME、MEMIT 等）**：试图精准改单条事实；范围一大副作用难控，多跳推理受损，生产慎用。
- **LoRA**：轻量领域适配；难承载大规模事实更新。

优势：推理零额外检索成本。劣势：更新贵、失败难排查。

## 多模态融合

跨文本、图像、表格时需**跨模态对齐**：各模态投影到同一语义空间才能统一检索与融合。CLIP 式对比学习是代表——拉近匹配图文对、推开不匹配对，使图像与文本向量可比较（依赖 [[embedding]] 基础设施）。

## 可靠性：核心矛盾与缓解

| 风险 | 表现 | 应对 |
| --- | --- | --- |
| 实体歧义 | 同名实体被错误合并 | 类型、关系等上下文特征，不单靠名称 |
| 信息冲突 | 两源矛盾属性值 | 来源标注、显式冲突标记；见 [[conflict-resolution]] |
| 时效错误 | 新旧覆盖方向错误 | 时间戳；区分演变型与历史型事实 |
| 灾难性遗忘 | 训练融合破坏旧知识 | 持续预训练加 replay 保留旧域样本 |

## 实践与应用

**场景：企业问答，同时接产品文档库与工单系统**

```
知识库 A：产品文档（PDF，半年更新）
知识库 B：工单历史（DB，实时）

用户问：「这个报错在文档里有说明吗？之前有人遇到过吗？」

多源 RAG：
1. 问题转向量
2. 并行检索 A、B
3. 重排、去重、合并 top-K
4. 注入 Prompt，LLM 生成并引用双源

失败案例：不重排直接合并 → 过时工单方案与新文档说明同屏 →
模型可能选错，且无法说明哪条更可信（缺来源与 [[conflict-resolution]] 元数据）。
```

## 坑与误区

- **RAG 等于知识融合**：RAG 只是推理层子集；多跳关系、行为改变（需微调）不能单靠 Naive RAG；选型看更新频率、关系复杂度、延迟预算。
- **知识编辑可放心上生产**：ROME/MEMIT 等孤立事实尚可，规模一大副作用难预测；2024 起多项工作指出损害多跳推理——优先 RAG + 外部库。
- **来源越多越好**：冲突概率同步上升；消解不到位时多源比单源更不可靠——应先做来源质量过滤再接入。

## 工具与实现

### 实体对齐 / 实体链接

| 项目 | Stars | 核心特点 |
| --- | --- | --- |
| [Splink](https://github.com/moj-analytical-services/splink) | ~1.5k | Fellegi-Sunter，DuckDB/Spark/Athena，亿级 |
| [Dedupe](https://github.com/dedupeio/dedupe) | ~4k | 主动学习，交互标注，百万级以下 |
| [Zingg](https://github.com/zinggAI/zingg) | ~1k | Spark + 深度学习，分布式 |
| [PyJedAI](https://github.com/AI-team-UoA/pyJedAI) | ~220 | 多种 blocking，算法对比 |

### 知识图谱融合

| 项目 | Stars | 核心特点 |
| --- | --- | --- |
| [OpenKE](https://github.com/thunlp/OpenKE) | ~3.8k | TransE/RotatE/ComplEx，KG 嵌入入口 |
| [OpenEA](https://github.com/nju-websoft/OpenEA) | ~850 | 15+ 对齐算法评测基准 |
| [ULTRA](https://github.com/DeepGraphLearning/ULTRA) | ~600 | zero-shot 迁移到新图谱 |

### Truth Discovery

| 项目 | Stars | 核心特点 |
| --- | --- | --- |
| [CrowdKit](https://github.com/Toloka/crowd-kit) | ~900 | TruthFinder / Dawid-Skene / GLAD / MACE |

Truth Discovery 实现碎片化；LLM 流水线（如 STORM）越来越多承担冲突说明，经典算法适用边界在收窄——详见 [[conflict-resolution]]。

### RAG 多源融合 / GraphRAG

| 项目 | Stars | 核心特点 |
| --- | --- | --- |
| [GraphRAG](https://github.com/microsoft/graphrag) | ~22k | 实体关系图，全局 + 局部查询 |
| [LightRAG](https://github.com/HKUDS/LightRAG) | ~12k | 轻量双层检索 |
| [LlamaIndex](https://github.com/run-llama/llama_index) | ~38k | QueryFusion、KG + 向量混合 |
| [LangChain](https://github.com/langchain-ai/langchain) | ~95k | EnsembleRetriever 多路融合 |
| [STORM](https://github.com/stanford-oval/storm) | ~15k | 多源检索 + 内置冲突处理 |
| [RAGFlow](https://github.com/infiniflow/ragflow) | ~25k | KG + 多路检索 + Web UI |

### 知识编辑

| 项目 | Stars | 核心特点 |
| --- | --- | --- |
| [EasyEdit](https://github.com/zjunlp/EasyEdit) | ~2k | ROME/MEMIT/GRACE/MEND 等集成 |
| [ROME](https://github.com/kmeng01/rome) | ~1.2k | 单条事实编辑原始实现 |
| [MEMIT](https://github.com/kmeng01/memit) | ~900 | ROME 批量扩展 |
| [GRACE](https://github.com/thartvigsen/grace) | ~200 | 外挂码本，少改权重 |

知识编辑仍偏研究；GRACE 外挂码本本质接近 RAG。生产优先推理层融合方向。

## 进一步阅读

- [[knowledge-extraction]] — 入库前候选与 handoff 契约
- [[rag]] — 推理层最常见实现；本篇覆盖更广的三层融合
- [[conflict-resolution]] — 存储层冲突消解专文（Truth Discovery、写回契约）
- [[rrf]] — 多路检索并榜（BM25 + 向量等）
- [[embedding]] — 实体对齐与多模态对齐的基础设施
- [[retrieval-pipeline]] — 检索栈与入库编排
- [[memory]] — 融合结果在多轮对话中的持久化
- [[rlhf]] — 训练时将人类偏好融入行为的一种特殊「融合」
