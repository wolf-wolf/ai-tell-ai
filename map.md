---
tags:
  - index
aliases:
  - 知识地图
  - index
updated: 2026-06-15
---

# AI 知识地图

> 这不是目录，是骨架。每个节点告诉你它在整个体系里的位置，以及值不值得深挖。  
> 物理路径与分层规则见 [[STRUCTURE]]；文章写法见 [[writing-rules]]。

---

## 仓库导航（非知识节点）

| 入口 | 用途 |
|------|------|
| [[STRUCTURE]] | `docs/` 目录决策树、wikilink 规范、新建目录阈值 |
| [[writing-rules]] | 单篇知识节点的标准结构与 frontmatter |
| [[article-scoring]] | 知识节点评审与六维打分（light / multi-perspective full） |
| [[AI 趋势洞察]] | `trends/` 日报 SOP；每日 `trends/YYYY-MM-DD/index.md` + `index.html` |
| [[速览索引]] | 尚无独立 wiki 节点的模式文（`docs/topic-overviews/map.md`） |
| `scripts/generate-trends.sh` | 趋势日报生成脚本（见 trends README） |

---

## 为什么这样分层

AI 系统的三层是因果链，不是分类：

**模型**（训练 + 机制 + 概念）→ **方法论**（和模型协作的思维方式）→ **Agent 系统**（用模型解决实际问题）

理解这个因果链，你才能判断一个问题出在哪层、该往哪里找答案。

每个节点标注了稳定性：
- `permanent` — 底层机制，深挖，几乎不会过时
- `long` — 核心设计理念，理解思路，具体实现会演化
- `mid` — 当前最佳实践，知道能干嘛、怎么判断用不用
- `short` — 当前 workaround，扫一眼即可，随时可能消失

---

## 模型层

> LLM 是什么、怎么工作、边界在哪。这层是理解一切应用的前提。

### 训练

> 模型能学什么，由数据和训练流程决定。这层是地基，不需要深挖操作，但要理解它为什么重要。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[training-data\|训练数据与语料]] | permanent | 模型的知识从哪来，数据决定上限 |
| [[scaling-laws\|缩放法则]] | long | Loss 对参数量/数据/算力的幂律；Chinchilla 与 [[emergence\|涌现]] 争议 |
| [[tokenization\|Tokenization]] | permanent | 文本怎么变成模型能处理的东西 |
| [[sft\|SFT]] | long | 监督微调：示范把基座变成听指令的策略 |
| [[rlhf\|RLHF]] | long | SFT→RM→PPO 偏好对齐；DPO 等闭式替代 |
| [[rlhf-bias\|RLHF 偏置]] | long | 奖励模型代理不完美时的结构性偏置与缓解 |
| [[rlvr\|RLVR]] | mid | 用可自动验真的规则奖励做推理对齐（数学、代码等） |
| [[agentic-rl\|Agentic RL / GRPO]] | mid | 工具轨迹 RL；组相对 advantage；DeepSeek-R1 路线 |
| [[local-llama-pretrain\|本地 Llama 预训练]] | mid | 从零预训练 Llama 系小模型：路径区分、流水线、工具链与学习路径 |

### 机制

> 为什么 LLM 能做到它做到的事——从零设计你会怎么做。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[token-prediction\|Token Prediction]] | permanent | LLM 的本质：预测下一个 token，仅此而已 |
| [[transformer\|Transformer]] | permanent | 现代 LLM 的基础架构，为什么是这个设计 |
| [[attention\|Attention]] | permanent | Transformer 的核心：让模型知道该关注什么 |

### 概念

> 理解 LLM 作为一个系统的行为和约束。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[llm\|LLM]] | permanent | 大语言模型是什么、能做什么、不能做什么 |
| [[inductive-bias\|Inductive Bias]] | permanent | 学习为何必须「偏心」泛化；架构/目标与 No Free Lunch |
| [[context-window\|Context Window]] | permanent | 模型的工作内存，理解它才能理解所有上限 |
| [[hallucination\|模型幻觉]] | permanent | 流畅续写≠事实；分类、成因与 RAG/工具缓解 |
| [[world-model\|世界模型]] | long | 预测状态演化以支持想象与规划；JEPA / RL 两条脉络 |
| [[emergence\|涌现]] | long | 规模下不可外推的能力跃迁；Wei 定义与 Schaeffer 度量争议 |
| [[prefix-cache\|Prefix Cache]] | mid | 跨请求复用 prompt 前缀 KV，降延迟与输入成本 |
| [[vllm\|vLLM]] | mid | PagedAttention + continuous batching 高吞吐 serving |
| [[quantization\|模型量化]] | mid | GPTQ/AWQ/INT4；与 vLLM/Ollama 部署配套 |
| [[kv-cache-inference\|KV Cache 与推理加速]] | mid | FlashAttention、PagedAttention；补 [[prefix-cache]] |
| [[vlm\|视觉–语言模型 VLM]] | mid | CLIP/LLaVA 主线；多模态 RAG 与 Computer Use 基座 |
| [[embedding\|Embedding]] | long | 文本怎么变成向量，语义相似的底层原理 |
| [[dense-vector\|稠密向量]] | long | 固定维连续表示；Dense 召回的形态，与稀疏/BM25 互补 |
| [[bi-encoder\|Bi-Encoder（双塔）]] | long | 可预计算的 query/doc 双编码；粗排用 cos 等相似度 + ANN |
| [[cross-encoder\|Cross-Encoder]] | long | 查询–文档联合注意力精排；双塔保召回、交叉编码保精准 |
| [[llm-generation-traps\|LLM Generation Traps]] | long | 模型生成的系统性偏置：对称性偏置、顺从惩罚 |

### 微调 / 评测 / 数据（待建）

> 详表见下文 **[[#待补充知识节点|待补充知识节点]]**；目录规则见 [[STRUCTURE]]。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[agent-evaluation\|Agent 轨迹评测]] | mid | 任务完成率、轨迹匹配、工具 P/R、路径与成本效率 |
| [[llm-as-judge\|LLM-as-Judge]] | mid | 模型评模型：rubric、偏差、与确定性指标分工 |
| [[llm-benchmarks\|LLM Benchmark 地图]] | long | MMLU、HumanEval、SWE-bench、MT-Bench 各测什么 |
| [[red-teaming\|红队与安全评测]] | mid | OWASP 对抗探针；Agent 轨迹与工具滥用 |
| [[lora-peft\|LoRA / QLoRA / PEFT]] | long | 参数高效微调：秩、QLoRA、何时相对 RAG 使用 |
| [[dpo\|DPO]] | long | 直接偏好优化：SFT 后闭式对齐，替代 RM+PPO |
| [[constitutional-ai\|Constitutional AI]] | mid | 宪法原则 + SL-CAI + RLAIF；harm 用 AI 反馈 |
| [[tool-use-sft\|Tool-use SFT]] | mid | 工具调用微调；assistant-only loss masking |

---

## 方法论层

> 和模型协作的思维方式——不是操作手册，是思考框架。理解这层才能判断具体技术该不该用。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[causal-chain\|因果链]] | long | 因果分析习惯（三层链、消融）+ 可选 LLM 集成路线（改模型 / 改系统） |
| [[instruction-design\|指令设计]] | long | 一切输入都是 token——如何让意图在 attention 竞争中赢 |
| [[instruction-linguistics\|指令语言学]] | mid | 人机语言交互的研究地图：措辞、register、示例与证据边界 |
| [[cross-lingual-instruction\|跨语言指令]] | mid | 中英文 prompt 差异：MaXIFE、register 拓扑与混合指令策略 |
| [[prompt-engineering\|Prompt Engineering]] | mid | 怎么对模型说话，正在被 context engineering 部分替代 |
| [[structured-json-output\|Structured JSON Output]] | mid | 约束解码、JSON Schema、API strict 与基准数据：稳定结构化输出 |
| [[context-engineering\|Context Engineering]] | long | 管理模型能看到什么，比 prompt 更本质的问题 |
| [[harness-engineering\|Harness Engineering]] | mid | 搭系统让模型长期可靠干活，框架层，演化快 |
| [[agent-observability\|Agent 可观测性]] | mid | Tracing、OTEL、成本；闭合 Harness 闭环 |
| [[loop-engineering\|Loop Engineering]] | short | 2026-06：设计替人 prompt Agent 的外层自驱系统（触发/目标/验收/记忆） |
| [[prompt-injection\|Prompt 注入]] | mid | 直接/间接注入；Rule of Two；Agent 比 Chat 更致命 |
| [[agent-sandbox\|Agent 沙箱]] | mid | Firecracker/E2B 隔离不可信代码；与 Rule of Two、[[tool-use]] 并列 |
| [[skill-supply-chain\|Skill / MCP 供应链安全]] | mid | ClawHub 类市场；SKILL.md 注入与 curated 源 |

递进链：**Prompt → Context → Harness → Loop**（Loop 为 2026-06 社区命名的新层）；指令设计 / 语言学 / 跨语言是输入侧的专题。

---

## 算法与度量

> 可复用的公式、相似度与索引算法（`docs/algorithms/`）。RAG 流水线与产品选型见下方 Agent · 检索与知识。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[cosine-similarity\|余弦相似度]] | permanent | Dense 检索默认度量：比方向、忽略长度；归一化后与点积等价 |
| [[bm25\|BM25]] | long | 关键词相关度打分；倒排索引上的 sparse baseline |
| [[rrf\|RRF 倒数排名融合]] | long | 多路异构检索按排名合并；BM25 与向量分不可直接相加 |
| [[ann\|ANN 近似最近邻]] | long | HNSW / IVF-PQ / DiskANN；大规模向量检索的索引算法 |
| [[recall-at-k\|Recall@K]] | long | 检索召回率：Top-K 覆盖多少相关文档；RAG 粗排首要诊断指标 |
| [[precision-at-k\|Precision@K]] | long | Top-K 中相关比例；与 Recall@K 配对诊断噪声 |
| [[mrr-ndcg\|MRR / NDCG]] | long | 排序质量；Rerank 与第一个相关位置 |

**待建**（见 [[#待补充知识节点|待补充]]）：无（MRR/NDCG 已建 `[[mrr-ndcg]]`）。

---

## 数据工程

> 预训练/微调前的语料 ETL 与质量（`docs/data/`）。理论见模型层 [[training-data]]。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[corpus-cleaning\|语料清洗与去重]] | long | MinHash/LSH 近重复、过滤、benchmark 污染检测 |
| [[synthetic-data\|合成数据]] | mid | Self-Instruct、蒸馏；质量门禁与 collapse 风险 |
| [[data-annotation\|标注与偏好数据规范]] | mid | Pairwise、rubric、IAA；RLHF/DPO 数据契约 |
| [[data-lineage\|数据版本与血缘]] | mid | DVC/lakeFS；训练–评测可复现链 |

---

## Agent 层

> 怎么用模型解决实际问题。这层演化最快，但判断框架是稳定的。

### 系统类型（core/）

> Agent、Workflow、Multi-Agent 的边界——选型先于实现。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[agent\|Agent]] | long | LLM + 感知-思考-行动循环；从「能说」到「能持续执行任务」 |
| [[workflow\|Workflow]] | long | 固定步骤编排；可预测、可审计，适合流程明确的任务 |
| [[multi-agent\|Multi-Agent]] | long | Orchestrator-Worker、拓扑、Spawn 契约、评测与生产可靠性 |
| [[agent-frameworks\|Agent 框架选型]] | mid | LangGraph / CrewAI / AutoGen / AgentScope 对照 |

### 执行模式（pattern/）

> Agent 如何推理和行动——这些模式组合在一起就是 Agent 循环的骨架。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[workflow-patterns\|Workflow 五模式]] | long | Anthropic 编排索引：Chaining / Routing / Parallel / Orchestrator-Workers / Evaluator-Optimizer |
| [[prompt-chaining\|Prompt Chaining]] | long | 固定序 LLM 链 + 程序 gate；五模式之首 |
| [[routing\|Routing]] | long | 分类 → 专精 handler；分离关注点 |
| [[evaluator-optimizer\|Evaluator-Optimizer]] | long | Generator + Evaluator 循环至 pass；与 [[reflection]] 工作流分工 |
| [[parallelization\|Parallelization]] | long | Sectioning / Voting 并行 + Aggregator |
| [[agent-paradigms\|智能体经典范式]] | long | ReAct / Plan-and-Solve / Reflection 选型与组合索引 |
| [[plan-and-solve\|Plan-and-Solve]] | long | 先规划后执行；Wang 2023 两阶段范式 |
| [[planning\|Planning]] | long | 复杂目标拆解，Agent 面对大任务的必要能力 |
| [[reAct\|ReAct]] | long | Think→Act→Observe 循环，Agent 的基本执行框架 |
| [[reflection\|Reflection]] | long | 自我检查纠错，应对 Agent 错误累积的手段 |
| [[chain-of-thought\|Chain of Thought]] | long | 让模型显式推理，提升复杂任务准确率 |
| [[memory\|Memory]] | long | Agent 怎么跨轮次记住重要的事（范式）；产品实现见 `latest/` |

### 上下文管理（context/）

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[agent-context-stack\|Agent Context Stack]] | long | Soul / Rules / RAG / Skill / Memory / MCP 六类资产分工与加载边界 |

### 工具（tool/）

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[tool-use\|Tool Use]] | long | 给模型接上手脚，从"说"到"做" |
| [[function-calling\|Function Calling]] | long | 模型和外部工具之间的标准化调用协议 |
| [[a2a\|A2A 协议]] | mid | Agent↔Agent 互操作；Agent Card；与 [[tool-mcp]] 互补 |
| [[tool-mcp\|MCP]] | long | 标准化外部工具协议，Skill 互补 |
| [[codebase\|Codebase 代码库索引]] | mid | 整仓语义切块+多路索引+增量同步；Agent 仓库级上下文 |
| [[tool-self-learning\|Tool Self-Learning]] | mid | 模型自学调用 API 或现场造工具并沉淀复用 |
| [[cursor-hooks\|Cursor Hooks]] | mid | 事件钩子 vs Skill scripts 治理层 |

### 检索与知识（retrieval/）

> 算法节点（BM25、余弦、RRF、ANN）见上文 **[[#算法与度量|算法与度量]]**。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[modular-rag\|Modular RAG]] | mid | 可插拔算子架构：Linear / Conditional / Branching / Looping |
| [[graph-rag\|GraphRAG]] | mid | 图索引与社区摘要；全局/多跳；与向量 RAG 互补 |
| [[chunking\|文档分块 Chunking]] | long | 固定/语义/层次/Late/Contextual；RAG 入库第一杠杆 |
| [[rag\|RAG]] | long | 给模型接入外部知识，解决知识截止和幻觉问题 |
| [[retrieval-pipeline\|检索全链路]] | mid | 粗排/精排/融合/Rerank 生产架构；算法细节见算法与度量 |
| [[rerank\|Rerank 生产选型]] | long | 延迟–精度；模型默认 bge-v2-m3；链 [[cross-encoder]] |
| [[fts5\|FTS5 全文检索]] | long | SQLite 内置倒排+BM25；本地会话/笔记关键词检索，Hermes session search 底座 |
| [[query-transformation\|Query Transformation]] | mid | 跨越用户提问与知识库的语义鸿沟，高级 RAG 必经之路 |
| [[crag\|CRAG]] | mid | 检索后评估与三态纠错（精炼 / 换源 / 合并），检索失败时加固生成 |
| [[hyde\|HyDE]] | mid | 假设文档嵌入：用答案形态向量检索，对齐短 query 与长文档 |
| [[knowledge-extraction\|Knowledge Extraction]] | long | 从异构原文析出带溯源的候选事实，融合的入库前契约 |
| [[knowledge-fusion\|Knowledge Fusion]] | long | 多源异构知识整合，RAG 之上的更完整框架 |
| [[ontology\|Ontology 歧义索引]] | permanent | 指向 [[palantir-ontology]]；区分 Palantir 框架 vs OWL 语义网 |
| [[conflict-resolution\|Conflict Resolution]] | long | 多源冲突消解，Truth Discovery 与可信度推断 |
| [[triggering-retrieval\|如何更好地触发检索]] | long | RAG 能跑但不查时：选型、四类实践、注入、指标与场景速查 |
| [[context-compaction\|上下文压缩]] | mid | 长程 Agent 压 observation/history；ACON 与 parallel compaction |
| [[knowledge-fusion-tools\|知识融合工具清单]] | short | 对齐/冲突/GraphRAG 开源索引；链 [[knowledge-fusion]] |

### Skill 生态（skill/）

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[skill\|Skill]] | long | 程序化记忆，固化 SOP，防呆纠错的护城河 |
| [[skill-loading-library\|Skill Loading & Library]] | mid | 加载、开放标准与库演化（Discovery / Activation / Library Drift） |
| [[skillbank\|Skill Bank]] | mid | 跨回合技能仓库抽象：表示、检索、蒸馏与共演化谱系 |
| [[skill-scripts\|Skill Scripts]] | mid | scripts/ 执行：Shell 调用、模型传参、stdout 闭环 |
| [[skill-engineering\|Skill Engineering]] | long | 基于模型运行与加载机制的技能写法方法论与坑点 |
| [[skill-governance\|Skill Governance]] | mid | 资产分级、发布流程、测试金字塔、路由冲突、供应链与退役 |
| [[autoskill\|AutoSkill]] | mid | 经验驱动 Skill 抽取、混合检索注入、add/merge/discard 库演化 |
| [[claude-code-skill-selection\|Claude Code Skill 选择]] | mid | listing 预算、Skill 工具、frontmatter、context: fork |

---

## 主题速览（topic-overviews/）

> 尚无独立 wiki 节点的模式文；详情见 [[速览索引]]。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[llm-wiki-overview\|LLM Wiki 模式]] | mid | Karpathy 式 raw/wiki/schema 三层 + ingest/query/lint 工作流 |
| [[agent-concept-map\|Agent 概念谱系图]] | mid | 模型底座 + Harness 运行时 + 多 Agent + 工程治理总览脑图 |

---

## 工具与知识载体

> 本地 Markdown 知识库的宿主应用，不是 Agent Runtime。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[obsidian\|Obsidian]] | long | 本地 Markdown 知识库：Vault、wikilink、Graph 与 CLI |
| [[qmd\|qmd]] | mid | 本地 Markdown 混合检索：BM25 + 向量 + 重排；CLI 与 MCP |

---

## 前沿产品与框架（latest/）

> 具体 CLI 宿主、编排库、记忆产品——演化快，读边界与选型，少背 API。通用模式仍在 Agent 层。目录说明见 `docs/latest/README.md`。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[hermes-agent\|Hermes Agent]] | short | Nous 自托管 Agent：CLI/Gateway、三层记忆、Skill 闭环；POC 用 `hermes chat` |
| [[hermes-agent-memory\|Hermes Agent 记忆系统]] | short | Hermes 记忆深潜：Curated Memory、后台 Review、FTS5 会话检索、Curator/GEPA |
| [[langgraph\|LangGraph]] | mid | 有状态图 Runtime：检查点、条件边、HITL；CRAG/ReAct 编排 |
| [[crewai\|CrewAI]] | short | 角色 + Task + Crew；Sequential / Hierarchical 快速原型 |
| [[langchain\|LangChain]] | mid | 模型/工具/RAG 组合框架；create_agent；与 LangGraph 分层 |
| [[ollama\|Ollama]] | mid | 本地 GGUF 运行时：pull/serve、原生 REST 与 OpenAI `/v1` 兼容 |
| [[agentmemory\|AgentMemory]] | short | MCP 持久记忆层，混合检索与多宿主（含 Hermes） |
| [[agent-zero\|Agent Zero]] | short | Docker 内 Linux Agent 工作台（桌面/浏览器/A0 CLI） |
| [[openclaw\|OpenClaw]] | short | 个人助手 Gateway：多 IM、ClawHub Skills、SOUL/MEMORY workspace |
| [[openclaw-node-bridge\|Node Bridge]] | short | OpenClaw 历史协议：Gateway↔node 的 TCP JSONL 窄桥（已并入 WS） |
| [[claude-code\|Claude Code]] | mid | Anthropic 终端/IDE Agent（CLAUDE.md、Skills、Hooks、MCP） |
| [[codex-cli\|Codex CLI]] | short | OpenAI Rust 终端编码 Agent；exec/MCP/Cloud；对照 [[claude-code]] |
| [[memx\|memX]] | short | NeoLi00 记忆插件：hooks 自动 recall/capture、三层 lineage 存储 |
| [[claude-managed-agents\|Claude Managed Agents]] | short | Anthropic 托管 Agent API（Agent/Environment/Session/Events） |
| [[memgpt\|MemGPT / Letta]] | mid | OS 式分页记忆研究 + Letta 有状态 Agent 平台 |
| [[mem0\|Mem0]] | mid | 可插拔记忆 API（add/search，Cloud 或 OSS） |
| [[honcho\|Honcho]] | short | 推理优先 peer 记忆（representation、Dreaming，托管或自托管） |
| [[huggingface-transformers\|Hugging Face Transformers]] | long | 开源模型定义框架：Hub、Auto、Pipeline、Trainer 与推理生态枢纽 |
| [[langsmith\|LangSmith]] | mid | Trace + dataset eval + 在线监控；LangGraph 默认可观测层 |
| [[low-code-agents\|低代码 Agent 平台]] | short | Dify / n8n / Coze 选型；RAG vs 集成 vs 对外 bot |
| [[gbrain\|GBrain]] | short | Garry Tan 开源 brain 层：Markdown 主权 + 自连线图谱 + MCP think/search |
| [[palantir-ontology\|Palantir Ontology]] | mid | Foundry 运营孪生：Object/Action + OAG/AIP + OSDK/双 MCP |

**待建**（见 [[#待补充知识节点|待补充]]）：无。

---

## 外部精读（docs/resources/）

> 官方/社区长文摘要，链到图谱节点；正文在 `docs/resources/`（wikilink 用 `[[slug]]`）。

| 节点 | 稳定性 | 一句话 |
|------|--------|--------|
| [[building-effective-agents\|Building Effective Agents]] | long | Anthropic：Workflow vs Agent、何时不用 Agent |
| [[writing-tools-for-agents\|Writing Tools for Agents]] | mid | Anthropic：工具 schema 与描述怎么写才好用 |
| [[mcp-code-execution\|MCP Code Execution]] | mid | Anthropic：用代码执行降 token、提 MCP 效率 |
| [[knowledge-fusion-tools\|知识融合工具清单]] | short | 多源融合与冲突消解相关开源工具索引（正文在 `agent/retrieval/`） |

---

## AI 趋势日报（trends/）

> 短时效观测日志，不是知识节点。模板 [[template-trend-daily]]；自动化见 `scripts/generate-trends.sh`。

| 入口 | 稳定性 | 一句话 |
|------|--------|--------|
| [[AI 趋势洞察]] | short | GitHub 增速/新颖、HF、大厂、论文、社区信号；连续 ≥2 天且边界清晰可升格到 `latest/` |
| 近期归档 | short | `2026-06-01` / `2026-06-02` / `2026-06-03` → 各日 `index.md` + `index.html` |

---

## 研究与实验（可选）

| 位置 | 用途 |
|------|------|
| `Research/` | 深度调研稿（如 Knowledge Fusion Survey），达阈值后可拆为 wiki 节点 |
| `poc/` | Hermes 等 POC 与最小知识库试验 |
| `new-idea/` | 产品创意说明书，未纳入图谱 |

---

## 待补充知识节点

> 对照 [Hello Agents](https://github.com/datawhalechina/hello-agents)、[Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)、[Stanford CS324](https://stanford-cs324.github.io/winter2023/syllabus/)、[Modular RAG](https://arxiv.org/pdf/2407.21059) 与库内缺口整理（2026-06-14）。  
> **无 wikilink = 尚无正文**；`P0` 最高优先。建文后把对应行改为 `[[slug|标题]]` 并移入上文各层表格。

### 建议补充顺序

| 波次 | 节点 | 优先级 | 理由 |
|------|------|--------|------|
| Wave 1 | ~~Building Effective Agents~~、~~Workflow 五模式~~、~~Agent 评测~~、~~文档分块~~、~~MCP Code Execution~~；Writing Tools 已建 | P0 | Wave 1 完成 |
| Wave 2 | ~~A2A~~、~~可观测性~~、~~GraphRAG~~、~~LangSmith~~、~~低代码~~ | P1 | 低代码已建 `[[low-code-agents]]` |
| Wave 3 | SFT/LoRA/DPO、~~Benchmark~~/LLM-as-Judge、~~语料清洗~~、~~合成数据~~ | P0–P1 | 合成数据已建 `[[synthetic-data]]` |
| Wave 4 | ~~推理部署~~、KV 专文；合规与供应链 | P2 | KV 已建 `[[kv-cache-inference]]` |

### 已入地图、尚无正文（resources/）

| 节点 | 建议路径 | 优先级 | 稳定性 | 一句话 |
|------|----------|--------|--------|--------|
| （无） | — | — | — | 三篇 Anthropic 精读见 `docs/resources/` |

### 模型层 · 微调（`model/fine-tuning/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | CAI / tool SFT 见 `[[constitutional-ai]]`、`[[tool-use-sft]]` |

### 模型层 · 评测（`model/evaluation/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | 红队见 `[[red-teaming]]` |

### 数据工程（`data/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | 标注见 `[[data-annotation]]`；血缘见 `[[data-lineage]]` |

### 算法与度量（待建）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | MRR/NDCG 见 `[[mrr-ndcg]]` |

### Agent · 工作流模式（`agent/pattern/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （五模式专文齐备） | — | — | — | 见 `[[workflow-patterns]]` 与子节点 |

### Agent · 协议与编排框架

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | 专文见 `[[crewai]]`；横评见 `[[agent-frameworks]]` |

### Agent · 检索（`agent/retrieval/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | Palantir 框架见 `[[palantir-ontology]]`；OWL 语义见 `[[ontology]]` 索引 |

### 方法论 · Harness 延伸

> [[agent-observability]] 已建。

### 模型 · 推理与部署（暂归 `model/concept/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | 见 `[[vlm]]` |

### 安全与对齐（暂归 `methodology/` 或未来顶层）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （供应链） | — | — | — | 见 `[[skill-supply-chain]]` |

### Agent · 训练向（`model/training/` 或 `agent/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | Tool SFT 见 `[[tool-use-sft]]` |

### 前沿产品（`latest/`）

| 节点（待建） | 建议 slug | 优先级 | 稳定性 | 一句话 |
|--------------|-----------|--------|--------|--------|
| （无） | — | — | — | 见 `[[codex-cli]]` |

### 已有正文、待加深（非新建，修订 backlog）

| 现有节点 | 缺口 |
|----------|------|
| [[langgraph]] | StateGraph、checkpointer 正文已补；可与 [[crag]] 范例对照 |
| [[memory]] | 已链 [[agent-evaluation]]、[[agent-observability]] |
| [[harness-engineering]] | 已链 [[agent-observability]] |
| [[agent-paradigms]] | 宜链 [[workflow-patterns]] |

---

## 索引

**我想搞懂 LLM 是什么**
→ [[token-prediction\|Token Prediction]] → [[llm\|LLM]] → [[context-window\|Context Window]]

**我想判断要不要用 Agent**
→ [[workflow\|Workflow]] → [[agent\|Agent]] → [[building-effective-agents\|Anthropic 选型文]] → 各文「误区」节

**Agent / Workflow / Multi-Agent 怎么选**
→ [[workflow\|Workflow]] → [[agent\|Agent]] → [[multi-agent\|Multi-Agent]]

**我想理解 RAG 能解决什么问题**
→ [[context-window\|Context Window]] → [[rag\|RAG]] → [[context-engineering\|Context Engineering]]

**我想搞懂检索里的公式与算法（BM25、余弦、RRF、ANN）**
→ [[cosine-similarity\|余弦相似度]] / [[bm25\|BM25]] → [[retrieval-pipeline\|检索全链路]]

**我想搞懂 Agent 怎么实现的**
→ [[agent\|Agent]] → [[agent-paradigms\|智能体经典范式]] → [[tool-use\|Tool Use]] → [[reAct\|ReAct]] / [[plan-and-solve\|Plan-and-Solve]] / [[reflection\|Reflection]]

**指令与 prompt 怎么设计**
→ [[instruction-design\|指令设计]] → [[instruction-linguistics\|指令语言学]] → [[cross-lingual-instruction\|跨语言]] → [[context-engineering\|Context Engineering]]

**因果与对齐风险**
→ [[causal-chain\|因果链]] → [[rlhf\|RLHF]] → [[rlhf-bias\|RLHF 偏置]]

**渐进式披露怎么工作**
→ [[skill\|Skill]] → [[skill-loading-library\|Loading & Library]] → [[skill-scripts\|Scripts]]

**我想搞懂 Skill 生态**
→ [[skill\|Skill]] → [[skill-loading-library\|Loading & Library]] → [[skill-engineering\|Engineering]] → [[skill-governance\|Governance]]

**Skill 多了怎么办**
→ [[skill-loading-library\|加载与库演化]] → [[skill-governance\|Governance]]

**Agent 上下文资产分工**
→ [[context-window\|Context Window]] → [[agent-context-stack\|Context Stack]] → skill / rag / memory / rules / soul

**知识入库、融合与多源冲突**
→ [[knowledge-extraction\|Knowledge Extraction]] → [[knowledge-fusion\|Knowledge Fusion]] → [[conflict-resolution\|Conflict Resolution]] → [[knowledge-fusion-tools\|工具清单]]

**LLM Wiki / 三层文档工作流**
→ [[llm-wiki-overview\|LLM Wiki 模式]] → [[qmd\|规模化检索]]

**我想了解 Hermes / LangGraph / AgentMemory / … 等具体产品**
→ `docs/latest/`：[[hermes-agent\|Hermes]] / [[langgraph\|LangGraph]] / [[agentmemory\|AgentMemory]] / [[agent-zero\|Agent Zero]] / [[openclaw\|OpenClaw]] / [[claude-code\|Claude Code]] / [[memx\|memX]] / [[claude-managed-agents\|Managed Agents]] / [[memgpt\|MemGPT·Letta]] / [[mem0\|Mem0]] / [[honcho\|Honcho]]

**每天看 AI 动态**
→ [[AI 趋势洞察]] → 当日 `trends/YYYY-MM-DD/index.html`

**新文章该放哪**
→ [[STRUCTURE]] 决策树

**终端编码 Agent 怎么选**
→ [[claude-code]] → [[codex-cli]] → [[harness-engineering]]

**多模态与图文理解**
→ [[vlm]] → [[rag]] → [[chunking]]

**对齐数据从哪来、怎么复现**
→ [[data-annotation]] → [[rlhf]] / [[dpo]] → [[data-lineage]]

**我想按优先级补全知识库**
→ [[#待补充知识节点|待补充知识节点]] → Wave 1（resources 精读、workflow-patterns、agent-evaluation、chunking）

**Anthropic 工作流怎么选型**
→ [[workflow-patterns]] → [[workflow]] → [[agent]] → [[building-effective-agents]]

**RAG 入库与评测指标**
→ [[chunking]] → [[rag]] → [[triggering-retrieval]] → [[retrieval-pipeline]] → [[recall-at-k]] / [[precision-at-k]]

**检索错了怎么办（CRAG）**
→ [[rag]] → [[crag]] → [[query-transformation]]（低分 Fallback）→ [[langgraph]] §5.2

**Agent 怎么评测、怎么观测**
→ [[agent-evaluation]] → [[agent-observability]] → [[harness-engineering]]

---

## 这个地图怎么用

- **stability=permanent/long 的节点**：值得打开认真读，这些是判断框架的地基
- **stability=mid 的节点**：知道能干嘛、知道边界就够，不需要深挖操作细节
- **stability=short 的节点**：前沿产品/框架（如 `latest/`）与趋势日报，扫一眼边界与选型，API 随时变
- **悬空节点**（表格里没有 wikilink 的）：还没写；系统清单见 **[[#待补充知识节点|待补充知识节点]]**
- **节点总数**：`docs/` 下约 **134** 篇 wiki 正文
