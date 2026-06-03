---
tags: [pattern]
aliases: [Planning, 规划模式, 任务规划]
related: ["[[agent]]", "[[tool-use]]", "[[reflection]]", "[[multi-agent]]", "[[chain-of-thought]]"]
stability: long
layer: application
updated: 2026-05-25
---

# Planning（规划模式）

## ⚡ 30 秒速览

Planning 让 Agent 在执行前先把复杂目标拆解成有序子任务，再逐步执行，避免走弯路或遗漏步骤。
最常见的实现是 ReAct 模式：思考→行动→观察结果→再思考，动态调整而不是死守初始计划。
记住：先画地图再出发，遇到岔路再更新地图。

---

## 🧠 深入理解

### 背景

给 LLM 一个复杂目标（如「帮我分析这份财报并给出投资建议」），直接执行容易：
- 遗漏重要步骤
- 前后逻辑不连贯
- 卡在某步骤时不知道整体进度

Planning 让 LLM 先输出一个执行计划，再按计划执行。

### 核心机制

```
接收目标
    ↓
规划阶段：LLM 输出子任务列表
  1. 读取财报数据
  2. 计算关键财务指标
  3. 对比行业基准
  4. 生成投资建议
    ↓
执行阶段：按计划逐步执行，每步可用工具
    ↓
（可选）反思阶段：检查计划是否完成
```

### 两种规划策略

**静态规划**：一次性生成完整计划，然后执行。
- 优点：清晰可审计
- 缺点：执行中遇到意外无法调整

**动态规划（ReAct 模式）**：每步执行后重新评估，决定下一步。
- 优点：灵活应对意外
- 缺点：耗费更多 token，路径不可预测

### ReAct 模式

ReAct = Reasoning + Acting，是最常见的动态规划实现：

```
思考（Reason）：我现在需要做什么？
行动（Act）：调用工具 / 执行操作
观察（Observe）：看结果
思考（Reason）：结果说明了什么？下一步是？
行动（Act）：...
```

---

## 💡 示例

**静态规划示例**：

```
目标：为新产品写一份上市方案

计划：
1. 分析目标用户群体
2. 研究竞品定位
3. 确定差异化卖点
4. 设计发布渠道策略
5. 制定时间表

执行 Step 1...
执行 Step 2...
...
```

**ReAct 示例**：

```
思考：需要先了解用户群体，我应该搜索相关数据
行动：web_search("智能手环目标用户 2026 年数据")
观察：返回数据显示主要用户是 25-45 岁健身人群
思考：有了用户数据，下一步应该看竞品...
行动：...
```

---

## ⚠️ 常见误区

- **误区：规划越详细越好。** 过度细化的计划在执行中容易失效，留一定灵活性更实用。
- **误区：Planning 和 Reflection 是同一回事。** Planning 在执行前发生（做什么），Reflection 在执行后发生（做得好不好）。

---

## 💬 我的理解

> Planning 解决的是「方向」问题，Reflection 解决的是「质量」问题，Tool Use 解决的是「能力」问题。三者组合才是完整的 Agent。
> ReAct 模式很优雅：把思考过程显式化，方便调试——看 LLM 的 Reason 步骤就能知道它在哪里出了问题。

---

## 🔗 关联概念

- [[agent]] — Planning 是 Agent 四大设计模式之一
- [[reflection]] — Reflection 是 Planning 的后置检查
- [[tool-use]] — 执行计划中的每一步通常需要工具
- [[multi-agent]] — 复杂规划可以把不同子任务分配给不同 Agent
- [[chain-of-thought]] — CoT 是 Planning 的基础能力：让 LLM 显式推理

---

## 📚 延伸阅读

- [[agentic-ai-deeplearning]] — DeepLearning.AI Agentic AI 课程
- [[resource-berkeley-llm-agents]] — Berkeley MOOC：ReAct 专讲
