---
tags: [technique]
aliases: [CoT, 思维链, 链式推理]
related: ["[[prompt-engineering]]", "[[planning]]", "[[reflection]]", "[[llm]]"]
stability: long
layer: application
updated: 2026-05-25
---

# Chain of Thought（思维链）

## ⚡ 30 秒速览

Chain of Thought（CoT）是让 LLM 在给出答案前先写出推理步骤的 prompting 技巧，能显著提升复杂推理的准确率。
LLM 直接跳答案容易出错，CoT 强制它把推理过程「外化」，相当于让它先打草稿再交卷。
记住：让 LLM 先打草稿再给答案，准确率就上去了。

---

## 🧠 深入理解

### 背景

2022 年 Wei et al. 发表论文《Chain-of-Thought Prompting Elicits Reasoning in Large Language Models》，发现：只要在 prompt 里加入展示推理过程的示例，模型在数学和逻辑题上的准确率大幅提升。这个发现简单得令人惊讶，但效果显著。

### 为什么展示推理过程能提升准确率

本质原因和 LLM 的 token 预测机制有关：

```
❌ 没有 CoT 的路径（一步跳到答案）：

问：小明有 5 个苹果，给了小红 2 个，又买了 3 个，还剩几个？
答：6 个   ← LLM 在一次 token 预测中「跳步」，中间运算在权重里压缩处理，容易出错

✅ 有 CoT 的路径（逐步推理）：

问：小明有 5 个苹果，给了小红 2 个，又买了 3 个，还剩几个？让我一步步思考。
答：
  步骤 1：小明初始有 5 个苹果
  步骤 2：给了小红 2 个，剩 5 - 2 = 3 个
  步骤 3：又买了 3 个，共 3 + 3 = 6 个
  所以还剩 6 个。 ✓
```

每一步推理都成为下一步 token 生成的 context，错误在中间就能被「纠正」，而不是在最终答案里才暴露。

### Zero-shot CoT vs Few-shot CoT

**Zero-shot CoT**：直接在 prompt 末尾加「让我一步步思考」

```
用法：在问题后加上魔法咒语
  - 「让我一步步思考。」
  - 「Let's think step by step.」
  - 「请展示你的推理过程。」

优点：简单，无需准备示例
缺点：推理格式不受控，步骤颗粒度可能不符合预期
适用：日常复杂问题，不需要严格输出格式的场景
```

**Few-shot CoT**：在 prompt 里提供几个「问题 + 完整推理链 + 答案」的示例

```
示例格式：

Q：一个班有 30 名学生，其中 2/3 是女生，女生中有 1/4 喜欢数学，
   喜欢数学的女生有多少人？

A：
  步骤 1：计算女生人数 → 30 × 2/3 = 20 人
  步骤 2：计算喜欢数学的女生 → 20 × 1/4 = 5 人
  答：5 人

（提供 2-3 个这样的示例后，再给出真正要回答的问题）
```

优点：推理风格和颗粒度可以通过示例精确控制
缺点：需要手工准备示例，占用 context

### CoT 的变体和发展

| 变体 | 做法 | 特点 |
|------|------|------|
| **Zero-shot CoT** | 加「一步步思考」 | 最简单 |
| **Few-shot CoT** | 提供推理链示例 | 可控性强 |
| **Self-consistency** | 多次采样取多数答案 | 提高稳定性 |
| **Tree of Thoughts (ToT)** | 生成多个推理路径并选优 | 复杂决策任务 |
| **ReAct** | 推理（Reason）+ 行动（Act）交替 | Agent 场景，结合工具调用 |

### 适用场景 vs 不适用场景

**适用：**
- 数学计算（多步运算，分步减少错误积累）
- 逻辑推理（条件判断、演绎推理）
- 代码 Debug（逐步分析错误原因）
- 复杂决策（多因素权衡）
- 阅读理解（逐步分析文本再回答）

**不适用（反而会变慢变差）：**
- 简单事实查询（「法国的首都是哪里？」直接回答更好）
- 创意写作（推理链干扰创意流动）
- 单步分类任务（「这句话是正面还是负面情绪？」不需要推理链）

---

## 💡 示例

**场景：用 CoT 解决逻辑题**

```
❌ 不用 CoT：

Q：所有 A 都是 B，所有 B 都是 C，有些 C 是 D。那么：有些 A 是 D 吗？

A：是的。  ← 错误！无法从已知条件推出

✅ 用 CoT：

Q：所有 A 都是 B，所有 B 都是 C，有些 C 是 D。那么：有些 A 是 D 吗？
   让我一步步推理。

A：
  步骤 1：所有 A 是 B，所有 B 是 C → 所以所有 A 也是 C（传递关系）
  步骤 2：有些 C 是 D → 但这些 D 所在的 C，不一定属于 A 的那部分 C
  步骤 3：因此，无法从已知条件推出「有些 A 是 D」
  结论：无法确定，答案为「不一定」。 ✓
```

**场景：在 Agent 中用 CoT 做规划**

```xml
<task>
用户要求：帮我分析竞争对手的产品，找出我们的差距和机会。

请先展示你的分析思路，再给出结论。
</task>
```

---

## ⚠️ 常见误区

- **误区 1：CoT 万能，所有任务都用它。** 简单任务加 CoT 是浪费 token，还可能让模型「想太多」反而出错。只在推理复杂度高时使用。
- **误区 2：推理链越长越好。** 冗长的推理链里也可能有错误，且会显著增加 token 消耗。关键是推理步骤要正确，不是要多。
- **误区 3：CoT 能解决幻觉问题。** CoT 减少的是推理跳步错误，不能解决 LLM 对事实的幻觉。如果前提知识就是错的，推理链再清晰也得出错误结论。
- **误区 4：只有「一步步思考」这一种触发方式。** 触发词多样：「请详细说明你的推理过程」「分析之前先列出已知条件」「让我们系统地分析这个问题」，效果相似。
- **误区 5：CoT 只适合数学题。** 代码调试、商业决策、法律分析等需要多步推理的任务都适用，不局限于数学。

---

## 💬 我的理解

> CoT 的本质洞察非常优雅：LLM 生成的每个 token 都是下一个 token 的 context。当你让它「先想再答」，中间过程就变成了显式的 context，每一步推理都能「站在前一步的肩膀上」，而不是在一次跳跃里把所有中间步骤压缩处理。
> 和 technique-prompt-engineering 的衔接：CoT 是提示工程里「控制推理过程」的核心技巧，本质上是在 prompt 结构里加入一个「先推理，后回答」的约束。
> 和 pattern-planning 的衔接：Agent 的规划（planning）能力很大程度依赖 CoT——让 LLM 先把任务分解成步骤，再逐步执行，就是 CoT 思想在 Agent 架构里的体现。

---

## 🔗 关联概念

- [[prompt-engineering]] — CoT 是提示工程的高级技巧，在 prompt 结构中通过示例或指令触发
- [[llm]] — CoT 利用的是 LLM token 预测的工作机制，理解机制才能理解为什么有效
- [[planning]] — Agent 的规划模式是 CoT 的延伸：先分解任务再执行
- [[reflection]] — Reflection 模式是 CoT 的变体：生成答案后再用 CoT 检验答案

---

## 📚 延伸阅读

- [Chain-of-Thought Prompting Elicits Reasoning (Wei et al., 2022)](https://arxiv.org/abs/2201.11903) — CoT 原始论文
- [Large Language Models are Zero-Shot Reasoners (Kojima et al., 2022)](https://arxiv.org/abs/2205.11916) — Zero-shot CoT「Let's think step by step」的来源
- [Tree of Thoughts (Yao et al., 2023)](https://arxiv.org/abs/2305.10601) — CoT 的进化：树状推理路径
- [ReAct: Synergizing Reasoning and Acting (2022)](https://arxiv.org/abs/2210.03629) — CoT + 工具调用在 Agent 中的应用
