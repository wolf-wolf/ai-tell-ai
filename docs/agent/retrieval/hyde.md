---
tags:
  - technique
aliases:
  - HyDE
  - Hypothetical Document Embeddings
  - 假设文档嵌入
  - 假想文档嵌入
prerequisites:
  - "[[rag]]"
  - "[[embedding]]"
related:
  - "[[query-transformation]]"
  - "[[retrieval-pipeline]]"
  - "[[embedding]]"
  - "[[cosine-similarity]]"
  - "[[crag]]"
  - "[[bm25]]"
  - "[[qmd]]"
stability: mid
layer: application
updated: 2026-06-14
---

# HyDE（假设文档嵌入）

> [!tip] 核心本质
> **HyDE**（Hypothetical Document Embeddings）不直接用用户短问句的向量去搜库，而是先让指令跟随型大语言模型生成一段**假设答案文档**（内容可错、可含幻觉），再对该段文本做 [[embedding]]，用「文档—文档」相似度在语料库中召回真实 chunk。第二步的稠密编码器充当有损压缩，滤掉假设文档里的错误细节，把检索锚定到真实语料邻域。若没有这层「问句→答案形态」的对齐，短口语 query 与长篇书面文档在向量空间里常相距甚远，稠密检索零样本召回会系统性偏低。

适合已读 [[rag]]、[[embedding]]，遇到**词汇/句型不匹配**而非「完全没文档」的读者。读完 [[#2 两步机制|§2]] 能复述生成—编码—检索链；[[#3 边界与选型|§3]] 判断何时用 HyDE、何时用 [[bm25]] 或查询改写；[[#5 工程落地|§5]] 含可粘贴的 prompt 与 Python 骨架。

*检索说明：机制对照 [Gao et al., 2022 / ACL 2023][hyde-paper]、[texttron/hyde](https://github.com/texttron/hyde)；变体与混合检索见论文 §3 与社区实践（观测 2026-06-14）。*

## 生命周期与演进

**当前定位**：[[query-transformation]] 家族中的**单手段专文**（mid）；论文为零样本稠密检索设计，无需训练检索器，工业界多作为 Advanced RAG 的**可选前置步**。

**预期寿命**：中期。「问句与文档形态不对齐」问题长期存在；是否默认开启取决于延迟预算与 [[crag]] 式「低分才改写」是否普及。

**近期演进**：多草稿 HyDE（N 条假设文档取并集或平均向量）；与原始 query 向量**混合**以抑制跑题假设；本地工具 [[qmd]] 将 `hyde` 作为 typed 检索模式；与 [[crag]] 串联——原 query 检索分低时再走 HyDE。

**终极威胁**：多语言统一 embedding（如 bge-m3 的 dense+sparse）缩小语义鸿沟；超长上下文下小库直灌窗口绕过检索。HyDE 的额外 LLM 调用在延迟敏感场景会被跳过。

## 1 问题：短问句为什么搜不到长文档

稠密检索用 [[cosine-similarity]]（或内积）比较 query 向量与 chunk 向量。训练数据里 query 往往是**短文本**，语料是**长段落**——二者分布不同，即使用同一编码器，「怎么配置 X？」与「X 的配置步骤如下……」在空间里也可能相距较远。

| 失败表象 | 例子 | HyDE 是否对症 |
| --- | --- | --- |
| **句型鸿沟** | 问句 vs 陈述句文档 | ✅ 主场景 |
| **术语口语化** | 「输出飘」vs「Temperature 漂移」 | ✅ 假设文档会倾向书面术语 |
| **代词指代** | 「那它呢？」 | ❌ 先用[[query-transformation]] 查询改写 |
| **多跳聚合** | 「A 和 B 价差」 | ❌ 用子查询分解 |
| **精确 SKU / 错误码** | `ECONNREFUSED` | ⚠️ 优先 [[bm25]] / 混合检索 |

[Gao et al.][hyde-paper] 的动机是：**零样本稠密检索**在没有相关性标注时很难学好 query–document 相关性；HyDE 把检索改写成「生成假设文档 + 文档—文档相似」，绕开显式 query 编码。

## 2 两步机制

论文将稠密检索分解为两个任务（见图 1）：

```mermaid
flowchart LR
  Q["用户 query"]
  G["指令 LLM<br/>生成假设文档"]
  E["对比学习编码器<br/>embed 假设文档"]
  V["语料库向量索引"]
  R["Top-K 真实 chunk"]
  Q --> G --> E --> V --> R
```

**Step 1 — 生成（NLG）**：向指令跟随模型（论文用 InstructGPT）提示「写一段能回答该问题的文档」。输出**不必事实正确**；目的是让文本在体裁、长度、术语上**像**目标文档。

**Step 2 — 检索（文档—文档）**：用无监督对比学习编码器（论文用 Contriever）将假设文档编码为向量，在语料 embedding 空间中找最近邻的真实文档。编码器的瓶颈被认为能**滤掉**假设文档中的幻觉细节，只保留与召回相关的语义方向。

读图 takeaway：HyDE **不显式计算 query–document 相似度**；query 只驱动生成，检索相似度发生在**假设文档 vs 真实文档**之间。

**论文提示（英文，与官方实现一致）**：

```text
Please write a passage to answer the question.
Question: {query}
Passage:
```

中文知识库可把指令改为「写一段能回答下列问题的说明性段落」，但需与库内文档语体一致。

## 3 边界与选型

**表 1 — 与兄弟手段分工**

| 手段 | 对齐对象 | 额外成本 | 库内节点 |
| --- | --- | --- | --- |
| **HyDE（本篇）** | 问句 → **答案形态** | 1× LLM + 1× embed | — |
| **查询改写** | 指代、上下文补全 | 1× LLM | [[query-transformation]] |
| **多查询扩展** | 多角度措辞 | N× LLM + N× 检索 | [[query-transformation]]、[[rrf]] |
| **[[bm25]]** | 精确词匹配 | 低 | [[bm25]] |
| **[[crag]]** | 召回**是否可信** | 评估器 + 可能二次检索 | [[crag]] |

**何时值得开 HyDE**：

- 评测显示召回空或 Top-K 不相关，且失败 case 多为「用户口语 vs 文档书面语」；
- 专业手册、法律/医疗/技术文档库；
- 已愿意接受约 **1 次额外 LLM 调用**（常 100ms–1s+，视模型而定）。

**何时不必开**：

- [[bm25]] 或混合检索已解决（尤其错误码、API 名、路径）；
- 多轮对话缺指代——先改写再决定是否 HyDE；
- 延迟极敏感且召回已够好（见 [[query-transformation]] 决策树）。

**现代默认**：不要全局强制 HyDE。与 [[crag]] 相同思路——**先原 query 检索打分，低分再走 HyDE**（见 [[#5.3 与 CRAG 串联|§5.3]]）。

## 4 变体

论文与后续实践常见三种扩展：

| 变体 | 做法 | 权衡 |
| --- | --- | --- |
| **单草稿（标准）** | 一条假设文档 → 一个向量 → Top-K | 最简单；假设跑题时召回偏 |
| **多草稿** | 生成 N 条假设文档，分别检索后 [[rrf]] 融合 | 召回更稳；N 倍 LLM + 检索成本 |
| **混合向量** | `α·embed(hyde) + (1-α)·embed(query)` 再检索 | 抑制假设文档离题；α 需调参 |

[[qmd]] 的 typed 查询支持 `hyde` 模式（与 `lex` 全文、`vec` 向量并列），在本地 Markdown 索引上走假设文档检索路径，适合 Vault 级工具链（见 [[qmd]] §4）。

## 5 工程落地

### 5.1 最小 Python 骨架

与框架无关；`embed` / `search` 替换为你的编码器与向量库（Chroma、pgvector、LanceDB 等）。

```python
HYDE_PROMPT = """请写一段能回答下列问题的说明性段落。
要求：使用与知识库一致的书面语体；不必保证事实完全正确，但应像真实文档中的一节。
问题：{query}
段落："""

def hyde_retrieve(query: str, llm, embed_fn, index, top_k: int = 5) -> list[dict]:
    hypothetical = llm.complete(HYDE_PROMPT.format(query=query))
    vec = embed_fn(hypothetical)
    hits = index.search(vec, top_k=top_k)
    return hits, hypothetical  # 保留 hypothetical 便于调试与日志
```

生成答案时仍只使用**检索到的真实 chunk** 作 context；不要把假设文档当作事实来源喂给最终生成（除非仅作调试）。

### 5.2 Prompt 注意点

- **语体对齐**：提示中要求「像知识库文档」，避免生成聊天式短答。
- **长度控制**：假设文档过长会稀释向量、增加 embed 成本；可限 150–300 词（视 chunk 大小调）。
- **温度**：略提高温度有时能增加多草稿多样性；单草稿常用偏低温度求稳。
- **日志**：生产环境记录 `query`、`hypothetical` 前 200 字、`top_ids`，便于回放「HyDE 是否带偏」。

### 5.3 与 CRAG 串联

```python
def retrieve_with_hyde_fallback(query: str, threshold: float = 0.55):
    hits, score = retrieve_and_grade(query)  # 原 query
    if score >= threshold:
        return hits, "direct"
    hits_h, _ = hyde_retrieve(query, ...)
    return hits_h, "hyde"
```

与 [[crag]]、[[triggering-retrieval]] 的「先搜再判」一致：HyDE 是**纠错/增强手段**，不是每条 query 的默认税。

### 5.4 与混合检索

HyDE 改善的是**稠密通道**的 query–文档对齐；对 SKU、版本号、路径等，仍应保留 [[bm25]] 或稀疏通道，再用 [[rrf]] 与 HyDE 稠密结果融合（见 [[retrieval-pipeline]]）。

## 6 失效模式与反模式

| 现象 | 可能原因 | 对策 |
| --- | --- | --- |
| HyDE 后召回更差 | 假设文档离题或编造了库中不存在的概念 | 混合 query 向量；降温度；多草稿 + RRF |
| 延迟翻倍不可接受 | 每条 query 都走 HyDE | 改为 CRAG 式条件触发 |
| 答案仍幻觉 | 把假设文档当证据拼进 prompt | 仅用真实 chunk；假设文档只用于检索 |
| 多语言库失效 | 假设文档语言与库不一致 | 提示指定库主语言；或用多语言 embedder |

**反模式**：在 [[bm25]] 已完美命中的场景全局 HyDE；用更大模型生成超长假设文档导致 embed 噪声；不做 A/B 对比就默认开启。

## 要点收束

- HyDE = **假设答案文档的 embedding** 去搜**真实文档**，用文档—文档相似绕过短 query 编码难题。
- 假设内容可错；**召回靠真实 chunk**，生成阶段勿引用假设文档为事实。
- 对症 **句型/术语鸿沟**；不对症指代、多跳、纯关键词场景。
- 生产上宜 **低分 Fallback**，与 [[crag]]、[[query-transformation]] 组合，而非全量前置。
- 本地 [[qmd]] 等工具可将 `hyde` 作为与 `vec`/`lex` 并列的检索模式。

## 进一步阅读

### 库内关联

- [[query-transformation]] — HyDE 在改写手段谱系中的位置与决策树
- [[retrieval-pipeline]] — HyDE 在 Query 预处理阶段的角色
- [[embedding]] — 向量空间与相似度直觉
- [[cosine-similarity]] — 检索打分几何含义
- [[rrf]] — 多草稿 HyDE 结果融合
- [[crag]] — 低分再 HyDE / 改写的纠错回路
- [[rag]] — 整体 RAG 框架
- [[qmd]] — 本地 `hyde` typed 查询

### 外部参考

- [Precise Zero-Shot Dense Retrieval without Relevance Labels][hyde-paper] — HyDE 原论文（Gao, Ma, Lin, Callan）
- [texttron/hyde](https://github.com/texttron/hyde) — 官方开源实现
- [Zilliz: HyDE 与向量库实践](https://zilliz.com/blog/improving-information-retrieval-and-rag-with-hypothetical-document-embeddings-hyde) — 工程向导读

[hyde-paper]: https://arxiv.org/abs/2212.10496
