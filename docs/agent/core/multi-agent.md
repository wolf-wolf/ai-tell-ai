---
tags: [pattern]
aliases: [Multi-Agent, 多智能体, 多 Agent 协作]
related: ["[[agent]]", "[[planning]]", "[[tool-use]]", "[[context-window]]"]
stability: long
layer: application
updated: 2026-05-25
---

# Multi-Agent（多智能体协作）

## ⚡ 30 秒速览

Multi-Agent 是多个 Agent 各负责不同子任务、协作完成整体目标的架构，核心角色是 Orchestrator（协调者）和 Worker（执行者）。
它解决单 Agent 的两个瓶颈：context 窗口不够用、无法并行执行独立子任务。
记住：先问「任务能拆开吗、拆开后子任务独立吗」——都是才值得上 Multi-Agent。

---

## 🧠 深入理解

### 背景

单 Agent 的两个核心瓶颈：
1. **Context 窗口限制**：超长任务无法放入一个 context
2. **串行执行**：无法并行处理多个独立子任务

Multi-Agent 架构解决了这两个问题。

### 核心角色

```
Orchestrator（协调者）
  ├── 分解任务
  ├── 分配给 Worker Agent
  └── 汇总结果

Worker Agent（执行者）
  ├── 专注单一子任务
  ├── 有自己的工具集
  └── 结果返回给 Orchestrator
```

### 通信方式

1. **共享 context**：所有 Agent 读写同一个状态存储
2. **消息传递**：Agent 之间发送结构化消息
3. **工具调用**：Orchestrator 把其他 Agent 当作工具调用

### 何时用 Multi-Agent

适合：
- 任务可以清晰拆分为独立并行的子任务
- 不同子任务需要不同专业工具或 prompt 风格
- 单个任务超出 context 窗口

不适合：
- 子任务之间依赖关系复杂（通信成本超过收益）
- 任务本身简单，拆分只增加复杂度
- 需要高度一致的上下文（拆分后各 Agent 信息不同步）

---

## 💡 示例

**代码审查 Multi-Agent 架构**：

```
Orchestrator：接收 PR，分解任务

Worker A（安全审查 Agent）：
  - 工具：代码静态分析、CVE 数据库查询
  - 输出：安全问题列表

Worker B（性能审查 Agent）：
  - 工具：复杂度分析
  - 输出：性能问题列表

Worker C（风格审查 Agent）：
  - 工具：linter
  - 输出：风格问题列表

Orchestrator：汇总三份报告 → 生成最终审查意见
```

Worker A/B/C 并行执行，总时间约等于最慢的那个，而非三者之和。

---

## ⚠️ 常见误区

- **误区：Agent 越多越强大。** Agent 数量增加，协调成本指数级上升，错误传播路径也变多。
- **误区：Multi-Agent 一定需要复杂框架。** 最简单的 Multi-Agent 就是 Orchestrator 用工具调用的方式调另一个 LLM，不需要专门框架。
- **误区：各 Agent 可以完全独立。** 共享状态设计不好，容易出现信息不一致，导致汇总结果矛盾。

---

## 💬 我的理解

> Multi-Agent 是架构决策，不是技术炫耀。核心问题永远是：「这个任务能拆开吗？拆开后子任务互相独立吗？」只有答案都是「是」，才值得上 Multi-Agent。
> 和 Planning 的关系：Planning 是单 Agent 内部的任务分解，Multi-Agent 是跨 Agent 的任务分解，本质逻辑相同，规模不同。

---

## 🔗 关联概念

- [[agent]] — Multi-Agent 是多个 Agent 的组合
- [[planning]] — Orchestrator 的核心能力就是 Planning
- [[tool-use]] — 最简单的 Multi-Agent 实现：把 Agent 当作工具调用
- [[context-window]] — Multi-Agent 解决单 Agent context 不够的问题

---

## 📚 延伸阅读

- [[agentic-ai-deeplearning]] — DeepLearning.AI Agentic AI 课程 Mod5
- [[resource-berkeley-llm-agents]] — Berkeley MOOC：Multi-Agent 专讲
