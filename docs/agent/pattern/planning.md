---
tags:
  - pattern
aliases:
  - Planning
  - 规划模式
  - 任务规划
prerequisites:
  - "[[llm]]"
  - "[[chain-of-thought]]"
related:
  - "[[agent]]"
  - "[[tool-use]]"
  - "[[reflection]]"
  - "[[multi-agent]]"
  - "[[chain-of-thought]]"
  - "[[reAct]]"
  - "[[plan-and-solve]]"
  - "[[agent-paradigms]]"
stability: long
layer: application
updated: 2026-06-14
---

# Planning（规划模式）

> [!tip] 核心本质
> Planning 让 [[agent|Agent]] 在执行复杂目标前先把任务拆解成有序子任务，再逐步执行并跟踪进度，而不是在单轮生成里「一口吞掉」整个目标。没有规划，LLM 容易遗漏步骤、前后脱节，或在某步卡住时失去全局视角；规划解决的是**方向与顺序**，与 [[reflection|Reflection]]（做得好不好）、[[tool-use|Tool Use]]（能不能做到）互补，三者组合才构成可落地的 Agent。显式推理依赖 [[chain-of-thought|Chain of Thought]]；最常见的动态实现是 [[reAct|ReAct]]——先画地图再出发，遇到岔路再更新地图。

## 生命周期与演进

**当前定位**：Agent 四大设计模式之一，已内置于 Cursor、Claude Code、LangGraph 等产品的「先 plan 再 act」流程；静态计划清单与 ReAct 式动态重规划并存，工程上按可审计性 vs 灵活性选型。

**预期寿命**：长期。只要复杂任务仍需要多步工具调用与中间状态，「先分解再执行」就不会被单次超长推理完全取代。

**近期演进**：Reasoning 模型减少无效规划轮次；人机协同里「计划待用户批准再执行」成为常见 Harness 模式；与 [[multi-agent|Multi-Agent]] 结合时，规划层负责子任务分配而非单 Agent 包办。

**终极威胁**：模型在一次调用内稳定完成更长工具链时，外显 Planning 步骤会变薄；但合规审计、成本上限与「计划可回放」仍要求 Runtime 保留可读的规划产物，不会归零。

## 规划在 Agent 循环中的位置

给 LLM 一个复杂目标（如「分析这份财报并给出投资建议」），直接执行容易：

- 遗漏重要步骤
- 前后逻辑不连贯
- 卡在某步时不知道整体进度

典型流水线：

```
接收目标
    ↓
规划阶段：LLM 输出子任务列表
  1. 读取财报数据
  2. 计算关键财务指标
  3. 对比行业基准
  4. 生成投资建议
    ↓
执行阶段：按计划逐步执行，每步可用 [[tool-use|工具]]
    ↓
（可选）[[reflection|反思]]：检查计划是否完成、输出是否达标
```

Planning 发生在**执行前**（做什么、什么顺序）；Reflection 发生在**执行后**（做得好不好）。二者不可混为一谈。

**命名范式**：[[plan-and-solve]]（Wang et al. 2023）是静态两阶段规划的论文化实现——Planner 一次出计划、Executor 按步执行并维护 history。三范式总览与选型见 [[agent-paradigms]]。

## 静态规划与动态规划

| 策略 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **静态规划** | 一次性生成完整计划，再按序执行 | 清晰、可审计、易做人工审批 | 执行中遇意外难以调整 |
| **动态规划** | 每步执行后根据观察重评下一步 | 灵活应对工具失败、新信息 | 更多 token，路径难预测 |

静态规划的论文级范例见 [[plan-and-solve]]（含动态重规划与 Plan→ReAct 组合）。

动态规划最常见的实现是 [[reAct|ReAct]]（Reason + Act + Observe 循环）。机制细节、prompt 结构与 Harness 分工见 [[reAct]]，本篇只保留与「规划」相关的摘要：

```
思考（Reason）：我现在需要做什么？
行动（Act）：调用工具 / 执行操作
观察（Observe）：看结果
思考（Reason）：结果说明了什么？下一步是？
行动（Act）：…
```

ReAct 把思考过程外化，便于调试——从 Reason 步骤即可定位规划在哪一步偏离预期。

## 实践与应用

**静态规划示例**：

```
目标：为新产品写一份上市方案

计划：
1. 分析目标用户群体
2. 研究竞品定位
3. 确定差异化卖点
4. 设计发布渠道策略
5. 制定时间表

执行 Step 1…
执行 Step 2…
```

**动态规划（ReAct）示例**：

```
思考：需要先了解用户群体，我应该搜索相关数据
行动：web_search("智能手环目标用户 2026 年数据")
观察：返回数据显示主要用户是 25-45 岁健身人群
思考：有了用户数据，下一步应该看竞品…
行动：…
```

复杂任务可把不同子任务交给不同 Agent，规划层负责拆分与委派，见 [[multi-agent]]。

## 常见误区

- **规划越详细越好**：过度细化的计划在真实执行中易失效；保留可调整的粒度更实用。
- **Planning 与 Reflection 是一回事**：Planning 定「做什么」；Reflection 评「做得好不好」。
- **有 Planning 就不需要 CoT**：规划依赖显式推理；[[chain-of-thought]] 是分解与排序的基础能力，不是可选项。
- **一切任务都先写长计划**：步骤本可由 [[workflow|Workflow]] 代码写死的任务，用 Planning 只会增加 token 与不确定性。

## 进一步阅读

- [[agent-paradigms]] — ReAct / Plan-and-Solve / Reflection 选型
- [[plan-and-solve]] — 两阶段 Planner + Executor
- [[agent]] — Planning 在 Agent 谱系与设计模式中的位置
- [[reAct]] — 动态规划的主流循环实现
- [[chain-of-thought]] — 显式推理，Planning 的认知基础
- [[reflection]] — 执行后的质量检查，常与 Planning 串联
- [[tool-use]] — 计划各步通常依赖工具落地
- [[multi-agent]] — 规划层上的子任务分配与协作
- [[workflow]] — 控制流由代码写死时的替代选型（可预测性更高）
- [ReAct: Synergizing Reasoning and Acting (Yao et al., 2022)](https://arxiv.org/abs/2210.03629) — Reason + Act 交替的原始论文
