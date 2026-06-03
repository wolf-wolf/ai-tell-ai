# docs/ 目录结构说明

本文档记录 `docs/` 的组织逻辑，供后续持续添加新文章时参考。

---

## 当前目录树

```
docs/
  model/
    concept/        LLM 作为系统的行为与约束（llm, context-window, embedding, llm-generation-traps）
    mechanism/      LLM 内部机制（transformer, attention, token-prediction）
    training/       预训练理论（training-data, tokenization, rlhf, rlvr）
    fine-tuning/    微调方法（占位：LoRA, QLoRA, instruction tuning, PEFT）
    evaluation/     模型评估（占位：benchmarks, LLM-as-judge, 红队测试）

  data/             AI 数据工程实践（占位：清洗、合成数据、标注、质量评估）

  methodology/      范式级思维框架（prompt-engineering, context-engineering, harness-engineering, instruction-design, instruction-linguistics, cross-lingual-instruction）

  algorithms/       可复用公式与算法节点（扁平一层：bm25, cosine-similarity, rrf, ann…）

  topic-overviews/  尚无 wiki 节点的模式速览；仅 map.md 单页索引 + 少量 *-overview.md（不为已有 algorithms 节点再建 overview）

  agent/
    core/           Agent 系统类型（agent, workflow, multi-agent）
    pattern/        执行模式（planning, reAct, reflection, chain-of-thought, memory）
    context/        上下文管理（agent-context-stack：Soul / Rules / AGENTS.md / Commands 分工）
    skill/          Skill 生态（skill, skill-engineering, skill-governance, skill-loading-library, skill-scripts, claude-code-skill-selection）
    tool/           工具体系（tool-use, function-calling, tool-mcp, tool-self-learning, cursor-hooks）
    retrieval/      检索与知识（rag, retrieval-pipeline, query-transformation, knowledge-fusion, conflict-resolution, fts5）

  latest/           前沿产品与框架（… openclaw, claude-code, memx, mem0 — 演化快、版本敏感）
```

**仓库根目录 `trends/`**（不在 `docs/` 内）：AI 生态**按日观测日志**（GitHub 增速/新颖、HuggingFace、大厂中英文动态、论文、社区讨论）。与 `docs/latest/` 的分工：

| 位置 | 放什么 | 不放什么 |
| --- | --- | --- |
| `trends/YYYY-MM-DD/index.md` + `index.html` | 多维度可验证信号、分级标签、深读摘要（HTML 便于阅读） | 长篇选型深潜、稳定范式 |
| `trends/weekly/YYYY-Www.md` | 跨日周信号聚合（可选） | 替代每日笔记 |
| `docs/latest/*.md` | 升格后的产品/框架知识节点 | 未核实的「感觉火了」 |

达升格阈值（同一主题连续 ≥2 天且边界清晰）后，从当日笔记链到新 `latest/` 文章。模板：`templates/template-trend-daily.md`；自动化：`scripts/generate-trends.sh`。

---

## 分层原则

**model/**：只放「LLM 本身」相关的内容，不放「怎么用模型做产品」。

| 子目录 | 放什么 | 不放什么 |
| --- | --- | --- |
| `concept/` | 能力、局限、上下文窗口、生成偏置 | 应用架构、RAG 流水线 |
| `mechanism/` | 架构与机制（Transformer、Attention、token 预测） | 训练数据清洗脚本 |
| `training/` | **预训练与对齐的理论**（语料、分词、RLHF 原理） | 数据清洗 ETL、标注 SOP |
| `fine-tuning/` | **微调方法与范式**（LoRA、PEFT、指令微调、DPO 与 PPO 对比） | Agent 运行时调参 |
| `evaluation/` | **模型能力与风险评测**（benchmark、LLM-as-judge、红队） | 业务 A/B 实验（偏产品） |

**data/**：AI **数据工程实践**——数据从哪来、怎么洗、怎么标、怎么验质量。与 `model/training/` 的区别：

- `model/training/` 回答「训练为什么需要某种数据/流程」（理论、因果）
- `data/` 回答「这批数据怎么做成可用数据集」（工程、操作）

典型主题：清洗与去重、合成数据生成、标注规范、质量指标、版本与血缘。推理期的文档解析/chunking 若偏 **RAG 入库流水线**，优先 `agent/retrieval/`；若偏 **通用数据集构建**，放 `data/`。

**methodology/**：范式级的思维方式，不绑定具体技术实现。判断标准：是否描述「一种思考 LLM 使用的框架」而非「一个具体技术或组件」。核心递进链：Prompt Engineering → Context Engineering → Harness Engineering；[[instruction-design]] 与 [[instruction-linguistics]] 分别覆盖工程实践与学术研究地图；[[cross-lingual-instruction]] 为跨语言子专题。

**agent/**：一切「构建 Agent 系统」相关内容。子目录按功能域划分：

- `core/`：Agent 系统的顶层分类（Agent、Workflow、Multi-Agent）
- `pattern/`：Agent 的执行行为模式（不依赖具体实现的通用模式）
- `context/`：上下文资产的分工与治理（Rules、Context Stack）
- `skill/`：Skill 体系是一个完整生态，独立成域
- `tool/`：工具调用体系，从协议到自学习
- `retrieval/`：检索**流水线与知识处理**（RAG 架构、Query 改写、多源融合、冲突消解）；**打分/索引算法**见 `algorithms/`

**algorithms/**：跨领域可复用的**公式、度量、索引算法**——回答「这个数怎么算、复杂度与超参是什么」，**不关心**具体 Agent 产品怎么配。文章**直接放在 `algorithms/` 一层**（暂不按 CS 主题分子目录；节点增多后再考虑拆分）。全库索引见根 [map.md](../map.md)「算法与度量」一节。与 `model/mechanism/` 的区别：Transformer、Attention 属于 LLM 内部机制，不进 algorithms。

**topic-overviews/**：**仅**收录尚无对应 wiki 节点的模式速览（如 LLM Wiki）；用 **`map.md` 单页**列目录。已有 `algorithms/` 或 `agent/` 节点的主题**不再**建 `*-overview.md`；读者从根 map 进入 wiki 节点。

**latest/**：具体 **Agent 产品、CLI 宿主、编排框架**（Hermes、LangGraph、AgentMemory 等）。与 `agent/` 的区别：`agent/` 讲可迁移的模式与组件；`latest/` 讲可点名的实现、当前 API 与选型边界。默认 `stability: short|mid`，正文应标注观测日期。

**尚未单独成域、但可能持续补充的主题**（推理部署、AI 安全、垂直场景应用等）：在积累到阈值前，见下文「目录创建阈值」；临时可放在最接近的现有目录，并在文内 `related` 链到更合适的 hub 文章。

---

## 新文章放哪里：决策树

```
这篇文章讲的是…

├── LLM 本身的内部原理/机制？
│     ├── 运作机制（注意力、架构）     → model/mechanism/
│     ├── 行为与约束（能力、局限）     → model/concept/
│     ├── 预训练/对齐理论（为何这样训） → model/training/
│     ├── 微调/适配方法（LoRA、DPO…）  → model/fine-tuning/
│     └── 评测/红队/benchmark        → model/evaluation/

├── 数据工程（清洗、标注、合成、质量）？
│     └── data/（可按主题再分子目录，见「目录创建阈值」）

├── 范式级思维框架（如何思考使用 LLM）？
│     └── methodology/

├── 纯公式 / 度量 / 索引算法（BM25、余弦、RRF、HNSW…）？
│     └── algorithms/（扁平放置，如 bm25.md、cosine-similarity.md）

├── 模式速览，且尚无 wiki 节点？
│     └── topic-overviews/（收录进 topic-overviews/map.md）

└── 构建 Agent / 应用系统？
      ├── 系统类型（什么是 X）       → agent/core/
      ├── 执行行为模式               → agent/pattern/
      ├── 上下文/Rules 治理          → agent/context/
      ├── Skill 相关                 → agent/skill/
      ├── 工具相关                   → agent/tool/
      ├── 检索/知识/RAG 流水线       → agent/retrieval/
      └── 具体产品/框架（Hermes 等）  → latest/
```

**易混边界速查**

| 主题 | 放哪里 | 理由 |
| --- | --- | --- |
| RLHF 原理 | `model/training/` | 对齐训练理论 |
| 偏好数据标注规范 | `data/` | 数据工程实践 |
| RAG chunk 策略 | `agent/retrieval/` | 推理期检索流水线 |
| 预训练语料去重算法 | `data/` | 数据集构建工程 |
| Constitutional AI 思想 | `model/training/` 或 `model/fine-tuning/` | 偏对齐范式则 training；偏微调实践则 fine-tuning |
| vLLM / 量化部署 | 暂 `model/concept/` 或新建顶层（见阈值） | 非 Agent 构建，不宜塞 agent/ |
| … / Claude Managed Agents / MemGPT·Letta / Mem0 | `latest/` | 具体框架与产品，非通用模式 |
| Claude Agent SDK（本地库） | 官方 docs + 与 [[claude-managed-agents]]、[[claude-code]] 对照 | 未单独成文；SDK 非托管产品 |
| Claude Code Skill listing / frontmatter 细节 | `agent/skill/claude-code-skill-selection` | 产品专篇 vs 机制深潜 |
| Aiming Lab Agent0（零数据 RL 训练） | 暂 `model/training/` 或 Research | 训练研究，非部署 Runtime |
| Memory 三分法、遗忘策略 | `agent/pattern/memory` | 范式；AgentMemory 实现见 `latest/` |
| BM25 / 余弦 / RRF / ANN 公式与参数 | `algorithms/` | 可复用算法节点 |
| 混合召回、Rerank、RAG 生产架构 | `agent/retrieval/` | 应用编排 |
| Embedding 为何存在、训练动机 | `model/concept/embedding` | 模型概念 |
| 稠密向量形态、与稀疏/BM25 对比 | `model/concept/dense-vector` | 模型概念；度量与索引见 algorithms |
| Bi-Encoder / 双塔相似度与粗排 | `model/concept/bi-encoder` | 模型概念；公式见 `algorithms/cosine-similarity` |
| Cross-Encoder / 双塔分工、精排机制 | `model/concept/cross-encoder` | 模型概念；流水线选型见 retrieval |
| 余弦相似度公式与手算 | `algorithms/cosine-similarity` | 度量算法；embedding 只链过去 |
| FTS5 / SQLite 全文引擎 | `agent/retrieval/fts5` | 引擎绑定；排序语义链 `[[bm25]]` |
| LLM Wiki 工作流（Karpathy 模式） | `topic-overviews/llm-wiki-overview` | 无单独 wiki 节点时的速览 |

---

## 目录创建阈值

避免过早拆目录，也避免一个目录无限膨胀。

1. **新建子目录**：同一主题已有 **≥ 3 篇** 独立文章（非 stub），且与相邻目录的边界在 STRUCTURE 里能用一句话说清。
2. **新建顶层目录**（与 `model/`、`agent/` 并列）：该主题 **≥ 3 篇** 且无法干净归入现有顶层（例如推理部署、AI 安全），并在 [map.md](../map.md) 增加对应章节。
3. **迁移**：新建目录后，批量移动文件即可；wikilink 仅用文件名，**不必**改链接（保证文件名全库唯一）。
4. **临时归位**：未达阈值时，放在决策树中最接近的目录，在 frontmatter `tags` 加主题标签（如 `deployment`、`data-pipeline`），便于日后 `rg` 批量迁移。

`data/` 子目录示例（达到阈值后再建）：`pipeline/`、`synthetic/`、`annotation/`、`quality/`。

---

## Wikilink 规范

所有 wikilink 只写文件名，不写路径：

```markdown
✓ [[skill]]
✓ [[skill|Skill 加载]]
✓ [[skill-loading-library#库演化]]

✗ [[agent/skill/skill]]
✗ [[docs/agent/skill/skill]]
```

Obsidian 会在整个 vault 范围内自动解析文件名。只要文件名在 vault 内唯一，路径不影响链接。新文章命名时，确保文件名在全库唯一。

图片引用同理，使用 `![[filename.png]]` 而非相对路径。

---

## 文章结构规范

每篇文章遵循 `writing-rules.md` 的标准结构（见根目录）。关键节：

1. Frontmatter（tags / aliases / related / stability / layer / updated）
2. `> [!tip] 核心本质`（概念是什么 + 没有它会在哪里出问题）
3. `## 生命周期与演进`（当前定位 / 预期寿命 / 近期演进 / 终极威胁）
4. 核心内容各节（标题自定）
5. `## 进一步阅读`

---

## 稳定性标签含义

| 标签 | 含义 | 阅读策略 |
| --- | --- | --- |
| `permanent` | 底层机制，几乎不过时 | 深挖，值得反复读 |
| `long` | 核心设计理念，具体实现会演化 | 理解思路，关注边界 |
| `mid` | 当前最佳实践，会变化 | 知道能干嘛、边界在哪 |
| `short` | 当前 workaround，随时可能消失 | 扫一眼即可 |
