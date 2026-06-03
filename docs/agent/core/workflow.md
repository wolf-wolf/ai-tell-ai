---
tags: [concept]
aliases: [工作流, 流水线]
related: ["[[agent]]", "[[prompt-engineering]]"]
stability: long
layer: application
updated: 2026-05-25
---

# Workflow（工作流）

## 🤔 想一想

**每天早上磨咖啡豆、烧水、冲泡——你需要每次都想"下一步做什么"吗？**

*不需要，步骤是固定的，照着来就行。*

Workflow 就是这个：把流程提前定好，代码控制每一步的顺序，LLM 只负责每步的内容，不做决策。用不着 Agent 的时候，别用 Agent。

---

## 🧠 深入理解

### 背景

不是所有任务都需要 Agent 的自主性。如果任务流程是固定的（如：摘要 → 翻译 → 格式化），用 workflow 就够了，且更可控。

### 核心机制

Workflow 的控制流由**代码**决定，而不是由 LLM 决定：

```
Step 1（固定）：调用 LLM 做摘要
    ↓
Step 2（固定）：调用 LLM 做翻译
    ↓
Step 3（固定）：调用 LLM 格式化输出
```

LLM 只负责每一步的内容生成，不决定走哪条路。

### Workflow vs Agent 的核心区别

| | Workflow | Agent |
|--|----------|-------|
| 控制流 | 代码决定 | LLM 决定 |
| 步骤 | 固定 | 动态 |
| 可预测性 | 高 | 低 |
| 适合任务 | 流程明确 | 需要规划/纠错 |
| 成本 | 低 | 高 |

### 何时选 Workflow，何时选 Agent

选 Workflow：
- 任务流程可以提前完全定义
- 需要高可靠性、可审计性
- 成本敏感

选 Agent：
- 任务需要根据中间结果动态调整路径
- 需要使用多种工具且顺序不固定
- 任务目标模糊，需要 LLM 自主规划

---

## 💡 示例

**Workflow 示例**：文章处理流水线

```
输入：一篇英文文章

Step 1 → LLM 提取关键点（固定）
Step 2 → LLM 翻译成中文（固定）
Step 3 → LLM 生成社交媒体帖子（固定）

输出：中文社媒帖子
```

代码控制每一步，LLM 不能跳过或改变顺序。

---

## ⚠️ 常见误区

- **误区：workflow 能处理的任务上 Agent 更好。** 不对，workflow 的可预测性是优点，不是缺点。
- **误区：workflow 就是 pipeline，只能顺序执行。** workflow 也可以有条件分支，只要分支逻辑由代码决定而非 LLM。

---

## 💬 我的理解

> Workflow 和 Agent 不是好坏之分，是复杂度匹配的问题。先想「这个任务的步骤能提前定义吗」，能就用 workflow。
> 和 Agent 的衔接：两者共享同一套底层（LLM + 工具），区别只在谁来决定控制流。

---

## 🔗 关联概念

- [[agent]] — Agent 是 workflow 的自主化升级版
- [[technique-prompt-chaining]] — workflow 中每个步骤之间传递 prompt 的技巧

---

## 📚 延伸阅读

- [[building-effective-agents]] — Anthropic 对 workflow vs agent 的权威区分
