---
tags: [technique]
aliases: [Agent Skill, SKILL.md, 智能体技能]
related: ["[[skill-loading-library]]", "[[skill-scripts]]", "[[claude-code-skill-selection]]", "[[skill-engineering]]", "[[skill-governance]]", "[[tool-self-learning]]", "[[agent-context-stack]]", "[[agent-context-stack]]", "[[tool-mcp]]", "[[context-engineering]]"]
prerequisites: ["[[agent]]"]
stability: mid
layer: application
updated: 2026-05-30
---

# Skill（智能体技能）

> [!tip] 核心本质
> Skill 是将「怎么做某类任务」这一程序性知识，封装为 Agent 可按需加载的结构化单元。如果没有它，Agent 每次面对同类任务都必须从零开始推理——团队积累的流程经验、领域术语、输出标准，全部消散在一次性对话里，无法跨会话沉淀和复用。

## 生命周期与演进

**当前定位**：成长期。主流 AI 编程和协作工具（Cursor、Claude Code 等）已将 Skill 作为一等公民支持，Anthropic 于 2025 年底将 `SKILL.md` 格式推为开放标准，生态正在快速扩展，但工程化程度（版本管理、测试、发现机制）仍处于早期。

**预期寿命**：中长期。只要大模型仍依赖外部注入来获取组织私有流程与领域知识，Skill 机制就不会消失。即便底层形态演化，「把 SOP 包装成 Agent 可读的资产」这一范式会延续。

**近期演进**：向标准化和跨平台互操作方向推进——同一份 Skill 在 Cursor、Claude Code、Copilot、Codex 等工具中通用；同时与 MCP 形成分工协作：Skill 定义「怎么做」，MCP 提供「做时所需的实时数据」。

**终极威胁**：两个方向可能逐步压缩手写 Skill 的价值。一是模型能力持续提升，大量通用流程被内化进权重，不再需要外部 SOP；二是自学习 Agent 能从历史执行轨迹中自动提炼和更新 Skill，人类手写将退化为数据校验和兜底工作。

## 渐进式披露：Skill 的运行机制

Skill 最核心的设计约束是上下文窗口有限——不能把所有 Skill 的全文在会话启动时一次性塞进去。业界收敛到三阶段的**渐进式披露（Progressive Disclosure）**模型：

**发现（Discovery）**：Agent 先获得每个 Skill 的 **name + description** 级路由元数据（多数产品在会话启动或 prompt 稳定层注入；亦有纯工具按需 `list` / `search`、白名单挂载、远程索引安装后再暴露等变体，见 [[skill-loading-library]]）。摘要体量小，用于粗筛「有没有可能用得上的 Skill」——**不等于**磁盘上每一个 `SKILL.md` 都会出现在这份目录里。

**激活（Activation）**：当用户意图与某条 `description` 语义匹配，或用户显式 `@skill-name` 时，Agent 把对应 `SKILL.md` 整篇读入上下文。Discovery、Activation 与库演化见 [[skill-loading-library]]。

**执行（Execution）**：正式执行阶段才按需打开 `reference.md`、运行 `scripts/` 下的脚本、或加载模板文件。重材料被挡在激活之后，避免无关内容稀释注意力。脚本如何传参、返回值如何回到模型，见 [[skill-scripts]]。

这个机制的本质是：**用元数据做路由，用正文做规程，用附属文件承载深度**。

### 文件结构

一个 Skill 是一个目录，核心是 `SKILL.md`，其余文件按需添加：

```text
my-skill/
├── SKILL.md          # 必须：YAML 元数据 + 操作流程正文
├── reference.md      # 可选：详细规范、背景说明
├── examples.md       # 可选：输入输出样例
└── scripts/
    └── validate.py   # 可选：可重复执行的检查脚本
```

`SKILL.md` 的 frontmatter 至少需要 `name` 和 `description`。`description` 是触发路由的关键——它写给模型看，不是写给人看的，需要明确覆盖「什么场景下用」和「什么场景下不用」。

### 触发质量决定一切

`description` 的写法直接决定 Skill 是否被正确激活：

- **过宽**：「帮助用户写代码」——几乎所有任务都会命中，导致不相关 Skill 污染上下文。
- **过窄**：「用户说'写 ADR'时使用」——稍微换个说法就漏掉了。
- **合适**：「根据团队 ADR 模板撰写架构决策记录；当用户提到 ADR、架构决策、技术选型记录、设计决策文档时触发」——覆盖同义表达，并写清适用边界。

### 执行时 SKILL.md 的工作方式

激活后，`SKILL.md` 充当当前任务的**操作契约**，而不是建议：步骤顺序、输出格式、禁止事项都应写成指令而非参考，这样 Agent 才不会在执行过程中自我发挥。

## 工具链中的位置：Skill 和谁协作

Skill 并不孤立运行，理解它与周边机制的分工是用好它的前提：

**Skill vs Rules**：Rules 是全局常驻的底线约束（「始终用中文」「提交前必须跑测试」），体量小、永远生效。Skill 是任务级按需加载的流程，只在相关场景激活。详见 [[agent-context-stack]]。

**Skill vs MCP**：MCP 解决的是「能读写什么外部系统」，Skill 解决的是「做这类任务的 SOP 是什么」。二者互补——Skill 说「审核发布前检查这几项」，MCP 负责「拉取当前发布单的实时状态」。详见 [[tool-mcp]]。

**Skill vs 子代理**：子代理用于将一大块独立任务分叉到隔离的上下文中执行，适合全库探索、大规模重构等场景。Skill 是当前会话内的流程约束，不拆分上下文。详见 [[claude-code-skill-selection#context: fork 与子代理]]。

### 存放范围

| 范围 | 路径（以 Cursor 为例） | 适合放什么 |
| --- | --- | --- |
| 个人 | `~/.cursor/skills/` | 个人工作习惯、跨项目通用流程 |
| 项目 | `.cursor/skills/` | 团队规范、业务术语、发布流程 |

项目级 Skill 随代码库一起做 Code Review 和版本管理，是团队「组织记忆」的载体。

## 进一步阅读

- [Agent Skills 开放标准](https://agentskills.io/home) — `SKILL.md` 格式规范与跨平台兼容列表，写 Skill 前建议过一遍。
- [Anthropic — Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — 渐进式披露设计动机的第一手来源，讲清楚为什么不直接把 Skill 全文塞进 system prompt。
- [Cursor Docs — Skills](https://cursor.com/docs/context/skills) — 在 Cursor 中的具体使用方式，包括存放路径和触发配置。
- [[skill-loading-library]] — 加载、开放标准与库演化（Discovery / Activation / Library Drift）
- [[skill-scripts]] — `scripts/` 的执行机制：Shell 调用、模型提取参数、stdout 与闭环校验。
- [[claude-code-skill-selection]] — Claude Code 如何通过 listing、Skill 工具与 frontmatter 选择并加载 Skill。
- [[skill-engineering]] — 基于模型运行与三阶段加载的写法方法论、七大原则与坑点清单。
- [[skill-governance]] — 发布流程、测试金字塔、路由冲突与安全供应链。
- [[agent-context-stack]] — Skill 与 RAG / Memory / Rules 分工。
- [[tool-self-learning]] — LATM / Voyager 等「模型自学用 / 造工具」与 Skill 生态的对照。
