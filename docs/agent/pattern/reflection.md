---
tags: [pattern]
aliases: [Reflection, 自我反思, 反思模式]
related: ["[[agent]]", "[[tool-use]]", "[[planning]]", "[[chain-of-thought]]"]
stability: long
layer: application
updated: 2026-05-25
---

# Reflection（反思模式）

## ⚡ 30 秒速览

Reflection 是让 Agent 生成输出后，再调用一次 LLM 检查和批评自己的结果，然后根据反馈改进。
它在不依赖人类反馈的情况下提升输出质量，本质是用 token 换准确率。
记住：先做，再自我批评，再改——LLM 版的草稿审查。

---

## 🧠 深入理解

### 背景

人类写作时会草稿 → 检查 → 修改。Reflection 把这个过程搬给 LLM 做，让它充当自己的「审稿人」。

### 核心机制

```
生成（Generate）
    ↓
反思（Reflect）：「这个输出有什么问题？」
    ↓
修改（Revise）：根据批评重新生成
    ↓
（可多轮循环，直到质量满足标准）
```

反思步骤的 prompt 通常是：
> "请检查上面的输出，指出其中的错误、遗漏或可以改进的地方。"

### 两种实现方式

1. **单模型反思**：同一个 LLM 既生成又反思。简单，但容易陷入「自我确认」偏差。
2. **双模型反思**：一个 LLM 生成，另一个 LLM（或同模型不同 prompt）做批评。更客观，成本更高。

### 什么时候 Reflection 有效

- 任务有明确的质量标准（代码正确性、逻辑自洽）
- 第一次生成容易犯系统性错误（如遗漏边界条件）
- 任务不依赖外部事实（Reflection 不能创造新知识，只能改进已有输出）

---

## 💡 示例

**代码审查场景**：

```
Round 1 - 生成：
  输入：写一个计算斐波那契数列的函数
  输出：def fib(n): return fib(n-1) + fib(n-2)
  （问题：没有终止条件，会无限递归）

Round 2 - 反思：
  输入：检查上面的函数，有什么 bug？
  输出：缺少 base case，n=0 和 n=1 时会崩溃

Round 3 - 修改：
  输入：根据上面的批评修复函数
  输出：def fib(n): if n <= 1: return n; return fib(n-1) + fib(n-2)
```

---

## ⚠️ 常见误区

- **误区：Reflection 总是有用的。** 如果任务需要的是新信息（如最新新闻），Reflection 无法改善——LLM 无法凭空创造它不知道的事实。
- **误区：Reflection 轮数越多越好。** 通常 1-2 轮后收益递减，且成本线性增加。

---

## 💬 我的理解

> Reflection 本质是用 token 换质量。适合质量要求高且有明确判断标准的任务，不适合开放性创作。
> 和 Planning 的区别：Planning 是决定做什么，Reflection 是检查做得好不好。

---

## 🔗 关联概念

- [[agent]] — Reflection 是 Agent 四大设计模式之一
- [[planning]] — Planning 决定路径，Reflection 检查结果
- [[tool-use]] — 可以用工具来验证 Reflection 发现的问题（如运行代码）
- [[chain-of-thought]] — CoT 让 LLM 展示推理过程，Reflection 在此基础上做批评
- [[skill-engineering]] — Skill 脚本 Grounding：要求引用 tool output，与 Reflection 闭环

---

## 📚 延伸阅读

- [[skill-scripts]] — 执行层输出如何供 Reflection 验证

- [[agentic-ai-deeplearning]] — DeepLearning.AI Agentic AI 课程 Mod1-2
- [[building-effective-agents]] — Anthropic Agent 设计指南
