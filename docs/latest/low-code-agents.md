---
tags:
  - platform
  - workflow
aliases:
  - 低代码 Agent 平台
  - Low-Code Agents
  - Dify
  - Coze
  - n8n AI
prerequisites:
  - "[[workflow]]"
  - "[[agent]]"
  - "[[rag]]"
related:
  - "[[langgraph]]"
  - "[[langchain]]"
  - "[[openclaw]]"
  - "[[harness-engineering]]"
stability: short
layer: application
updated: 2026-06-15
---

# 低代码 Agent 平台

> [!tip] 核心本质
> **低代码 Agent 平台**用可视化画布 + 预置节点，把 [[rag|RAG]]、模型调用、工具/API 编排成可部署应用——降低从 demo 到上线的胶水代码量。与 [[langgraph]] 等「代码 编排」不同，平台封装了模型管理、观测、渠道发布；与纯 [[workflow]] 自动化不同，原生节点面向 **LLM/Agent**。选型核心不是「谁功能多」，而是**主 workload**：知识库 Q&A → Dify 系；SaaS 集成自动化 → n8n；对外聊天机器人 → Coze 系。

`short` 稳定性：产品 API 与定价变得快，本文记**架构分工**与选型树，细节以各官网为准。

*检索说明：Dify/n8n/Coze 分工对照 [Dify 文档](https://docs.dify.ai/)、[n8n AI 文档](https://docs.n8n.io/advanced-ai/)、[Coze 开放平台](https://www.coze.com/open/docs/guides)；对比综述见 Meterra/SurferCloud 2025–2026 评测（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：Hello Agents 等课程 ch5 类「快速搭 Agent」路径；企业常见 **Dify 内网 RAG + n8n 集成 + Coze 对外 bot** 组合。

**预期寿命**：短。平台合并、开源版（Dify、Coze Studio）与 SaaS 双轨并行。

**近期演进**：Dify Agent/Workflow 合一；n8n queue mode 高吞吐；Coze 多渠道（IM、Web）；与 MCP 集成仍平台各异。

**终极威胁**：IDE Agent（[[claude-code]]）吞掉「个人搭 bot」；复杂生产仍回落代码 Harness（[[harness-engineering]]）。

## 1 三平台分工

| 平台 | 本质 | 强项 | 弱项 |
| --- | --- | --- | --- |
| **Dify** | LLM 应用 / LLMOps | [[rag]]、Prompt IDE、评测、可自托管 | 通用 ETL 非核心 |
| **n8n** | 工作流自动化 + AI 节点 | 400+ 集成、定时、queue 扩展 | RAG/Agent 需自己拼 |
| **Coze** | 对话 bot 平台 | 低门槛、多通道发布 | 深度定制、私有化 |

开源相关：**Dify**（LangGenius）、**n8n**（fair-code）、**Coze Studio**（字节开源版）——许可证与 SaaS 限制部署前必读。

## 2 选型决策树

```mermaid
flowchart TD
  Q[主需求?]
  Q -->|文档/RAG 问答| D[Dify / RAGFlow 类]
  Q -->|CRM/工单/API 编排| N[n8n 类]
  Q -->|客服/助手多渠道| C[Coze 类]
  Q -->|可编程 Agent 环| L[[langgraph]] / 代码]
```

- **内网知识库** → Dify：ingest、chunk、检索、对话 UI 一体
- **「LLM 只是自动化一步」** → n8n：Webhook → DB → 条件 → OpenAI 节点
- **对外 IM bot** → Coze：渠道、人设、插件市场
- **复杂 tool 环、可测试 Harness** → 别强上低代码，用 [[langgraph]] + [[agent-evaluation]]

## 3 与库内范式

| 平台能力 | 对应 wiki 概念 |
| --- | --- |
| 工作流画布 | [[workflow]]、[[workflow-patterns]] |
| Agent 节点 | [[agent]]、[[reAct]] |
| 知识库 | [[rag]]、[[chunking]]、[[retrieval-pipeline]] |
| 评测 | [[agent-evaluation]]、[[langsmith]] |

低代码 **不替** [[prompt-injection]] / 权限设计——RAG 与工具仍要 Rule of Two。

## 4 生产注意

1. **自托管 vs SaaS** — 数据合规、密钥存放
2. **模型路由** — 多模型 API 密钥与 [[prefix-cache]] 无关，但成本要监控
3. **版本与导出** — 画布 JSON 进 Git；避免 vendor lock 无导出
4. **观测** — 平台内置 trace 是否够；不够接 [[langsmith]] / OTEL
5. **与 MCP** — [[openclaw]]、[[claude-code]] 走 Skill/MCP；Dify 等多为内置工具

## 5 何时不用低代码

| 场景 | 倾向 |
| --- | --- |
| 复杂 Agent 轨迹、自定义 state | [[langgraph]] |
| 深度 Harness、Hooks | [[claude-code]] / 自研 |
| 超高 QPS 推理 | [[vllm]] + 自研 API |
| 研究/可复现 pipeline | 代码 + [[modular-rag]] |

## 要点收束

- 低代码 = 可视化 LLM/RAG/集成；Dify / n8n / Coze 主 workload 不同。
- RAG 内网 → Dify；集成自动化 → n8n；对外 bot → Coze。
- 复杂 Agent 与合规 Harness 仍要代码层 wiki 节点。
- `short` 节点：部署前核对官网与许可证。

## 进一步阅读

### 库内

- [[rag]] — 检索增强
- [[workflow]] — 编排 vs Agent
- [[langgraph]] — 代码编排替代
- [[openclaw]] — 个人助手 + ClawHub 生态

### 外部

- [Dify Docs](https://docs.dify.ai/)
- [n8n Advanced AI](https://docs.n8n.io/advanced-ai/)
