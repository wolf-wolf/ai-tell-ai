# latest/ — 前沿 Agent 技术与产品

本目录收录**具体产品、框架与运行时**（演化快、版本敏感），与 `agent/` 下的**模式与范式**区分开。

| 放这里 | 不放这里 |
| --- | --- |
| Hermes、LangGraph、AgentMemory 等可点名选型 | 通用 Memory / ReAct / RAG 原理 → `agent/pattern/`、`agent/retrieval/` |
| CLI、MCP 宿主、编排库的当前能力与边界 | LLM 机制与训练 → `model/` |
| 与某产品绑定的集成笔记（Skill 发现、MCP 配置） | 范式级思维 → `methodology/` |

## 稳定性约定

- 默认 `stability: short` 或 `mid`；正文须写清「当前版本 / 观测日期」。
- 当某主题沉淀为稳定范式（≥3 篇且边界清晰），可上移到 `agent/` 子域，并在本目录留 stub 重定向说明。

## 当前节点

| 文件 | 主题 |
| --- | --- |
| [[hermes-agent]] | Hermes CLI 编码 Agent（Skill、工具、本地执行） |
| [[langgraph]] | LangGraph 状态图编排与 CRAG 等生产模式 |
| [[agentmemory]] | AgentMemory 持久记忆层（MCP、iii、混合检索） |
| [[agent-zero]] | Agent Zero / Agent0（Docker Linux Agent 工作台、A0 CLI） |
| [[openclaw]] | OpenClaw 个人助手 Gateway（多 IM 通道、ClawHub、workspace 记忆） |
| [[claude-code]] | Anthropic Claude Code（终端/IDE Agent、CLAUDE.md、Skills、Hooks） |
| [[memx]] | memX 本地记忆插件（Claude Code/Codex/OpenClaw hooks、三层溯源存储） |
| [[claude-managed-agents]] | Anthropic Claude Managed Agents（托管 Harness + 沙箱 REST API） |
| [[memgpt]] | MemGPT / Letta（OS 式分页记忆 + 有状态 Agent Runtime） |
| [[mem0]] | Mem0 可插拔记忆层（Library / 自托管 / Cloud，V3 hybrid 检索） |
| [[honcho]] | Honcho 推理优先 peer 记忆（representation、Neuromancer、Dreaming） |
| [[huggingface-transformers]] | Transformers：Hub 加载、Auto/Pipeline、训练与 vLLM 等推理栈 |

## 待补充（占位，达阈值后建文）

- Codex CLI 宿主对比
- LangSmith / LangChain Agent 栈选型

新建文章：复制 `templates/template-knowledge-node.md` 或参照同目录已有节点的 frontmatter；文件名全库唯一。
