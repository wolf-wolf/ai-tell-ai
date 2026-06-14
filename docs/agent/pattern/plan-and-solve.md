---
tags:
  - pattern
aliases:
  - Plan-and-Solve
  - Plan and Solve
  - PS Prompting
  - 先规划后执行
prerequisites:
  - "[[llm]]"
  - "[[chain-of-thought]]"
  - "[[agent]]"
related:
  - "[[planning]]"
  - "[[reAct]]"
  - "[[reflection]]"
  - "[[agent-paradigms]]"
  - "[[chain-of-thought]]"
  - "[[tool-use]]"
  - "[[multi-agent]]"
stability: long
layer: application
updated: 2026-06-14
---

# Plan-and-Solve（先规划后执行）

> [!tip] 核心本质
> Plan-and-Solve（PS）把任务明确拆成**两阶段**：先用一次（或少量）LLM 调用生成**完整行动计划**，再**按步执行**并把每步结果写入状态，供后续步骤使用。它针对 Zero-shot [[chain-of-thought|CoT]] 常见的**漏步**与推理链漂移——先画蓝图再施工，换的是执行中的**稳定性**与可审计性，牺牲的是 [[reAct|ReAct]] 那种「走一步看一步」的灵活性。若没有计划阶段，复杂多步题容易在中间跳步或算错；若计划一次写死却不允许修订，工具失败或新信息出现时又会卡死。

适合已读 [[agent-paradigms]]、要区分「静态两阶段」与「动态 ReAct」的读者。读完 [[#2 两阶段机制|§2]] 理解 Planner/Executor 分工；[[#4 动态重规划与分层规划|§4]] 说明如何补上灵活性缺口。

*检索说明：定义与 PS/PS+ 提示对照 [Wang et al. 2023](https://arxiv.org/abs/2305.04091)；Agent 类实现参考 [Hello Agents ch4](https://datawhalechina.github.io/hello-agents/#/./chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA)（观测 2026-06-14）。*

## 生命周期与演进

**当前定位**：Wang et al. 2023 提出的 **prompting / Agent 架构范式**；Hello Agents 等课程用 Planner + Executor 类落地。与广义的 [[planning]] 相比，本篇专指**一次性计划 + 顺序执行**这一命名范式。

**预期寿命**：长期。Cursor、Claude Code 等产品的「先列 plan 再执行」即其工程化形态；常与 ReAct 组合（计划定方向，执行用工具）。

**近期演进**：Reasoning 模型在单轮内生成更长计划，减少 Planner 调用；人机协同中「计划待用户批准」成为 Harness 标配。

**终极威胁**：全动态 ReAct 或强 Reasoning 一次搞定短链任务时，独立 Planner 步骤显得冗余；但合规场景仍需要可回放的计划 artifact。

## 1 与 Planning、ReAct 的边界

| | [[planning]]（泛） | **Plan-and-Solve** | [[reAct]] |
| --- | --- | --- | --- |
| **范围** | 一切「先分解再执行」 | 论文命名的两阶段静态计划 | 每步 Thought→Action→Observe |
| **计划何时定** | 静态或动态 | **执行前一次定稿**（默认） | 每步根据 Observation 更新 |
| **工具** | 可有可无 | 经典 PS 论文偏**纯推理**；Agent 课可不加工具 | 依赖工具 Observation |
| **类比** | 地图学 | 建筑师出蓝图再施工 | 侦探现场搜证 |

泛化规划能力见 [[planning]]；三范式选型见 [[agent-paradigms]]。

## 2 两阶段机制

论文将流程形式化为：规划模型 \(\pi_{\text{plan}}\) 根据问题 \(q\) 生成计划 \(P=(p_1,\ldots,p_n)\)；执行模型 \(\pi_{\text{solve}}\) 逐步求解 \(s_i\)，依赖 \(q\)、\(P\) 与已有 \((s_1,\ldots,s_{i-1})\)。

```mermaid
flowchart LR
  Q[问题 q] --> Plan["π_plan<br/>生成计划 P"]
  Plan --> E1["π_solve 步骤 1"]
  E1 --> E2["π_solve 步骤 2"]
  E2 --> En["…"]
  En --> Ans[最终答案]
```

**表 1 — 两角色分工（Agent 实现）**

| 角色 | 输入 | 输出 | Harness 职责 |
| --- | --- | --- | --- |
| **Planner** | 用户问题 | 有序子任务列表（宜结构化，如 JSON/Python list） | 解析计划；失败则重试或降级 |
| **Executor** | 问题 + 计划 + **history**（已完成步骤与结果） | 当前步答案 | 追加 history；驱动下一步 |

**状态传递**是执行阶段关键：第 \(i\) 步必须能看见 \(s_1,\ldots,s_{i-1}\)，否则多步数学题会重复或遗忘中间量（如「周二销量 30」）。

### 2.1 PS 与 PS+ 提示（论文）

针对 Zero-shot CoT 的「Let's think step by step」，Wang et al. 改为**先理解并制定计划，再逐步执行**：

- **PS**：*Let's first understand the problem and devise a plan to solve the problem. Then, let's carry out the plan and solve the problem step by step.*
- **PS+**：在 PS 上增加提取变量、注意数值计算与常识等约束，缓解**算错**与漏中间量。

Agent 课常把计划约束为 **Python list** 等可机器解析格式，比自然语言计划更稳。

## 3 适用与不适用

**更适合**：

- 多步数学/逻辑题（步骤可预先枚举）
- 报告/代码的**结构规划**（先目录/模块列表，再填充）
- 需要**人工审批计划**再执行的高风险任务

**慎用**：

- 强依赖实时搜索、API 试探（订机票+酒店+租车）——静态计划易过时；宜用 [[agent-paradigms#3 组合架构|Plan → ReAct]]
- 步骤本可由 [[workflow]] 代码写死——不必 LLM 每次重规划

**与 ReAct 的场景对比**（Hello Agents 习题）：「北京→上海商务旅行（机票、酒店、租车）」通常 **ReAct 或 Plan→ReAct** 优于一次性静态 PS——子任务间依赖外部查询结果，计划需在执行中修订。

## 4 动态重规划与分层规划

默认 PS **计划静态**：某步失败或结果异常时，应触发：

| 机制 | 做法 |
| --- | --- |
| **动态重规划** | 把失败 Observation 喂给 Planner，生成 \(P'\) 替换未完成后缀 |
| **分层规划** | 高层计划（3–5 步）→ 每步再展开子计划；适合 [[multi-agent]] 委派 |
| **Plan → ReAct** | 计划只定子目标；每子目标用 ReAct 带工具完成 |

重规划后仍属「规划范式家族」，但已偏离最简 PS；工程上在 [[harness-engineering]] 里用显式状态机表达（`PLANNED` → `EXECUTING` → `REPLAN`）。

## 5 与 Reflection 组合

Plan-and-Solve 解决「**做什么、什么顺序**」；[[reflection]] 解决「**做得好不好**」。常见流水线：

```
Planner → Executor（逐步）→ Reflect 终稿 → Revise
```

Reflection 不能替 Executor 补检索；若某步事实错误，应回到 ReAct/工具或重规划，而非只反思文本。

## 6 常见误区

- **Plan-and-Solve = 全部 Planning**：动态 ReAct 也是规划，只是计划内嵌在每轮 Thought。
- **计划越细越好**：过细计划在真实工具环境易全盘失效；保留可重规划粒度。
- **不需要 CoT**：分解与排序仍依赖显式推理，见 [[chain-of-thought]]。
- **PS 一定要工具**：论文场景多为推理；工具是 Agent 扩展，不是 PS 定义要件。

## 要点收束

- Plan-and-Solve：**先** \(\pi_{\text{plan}}\) 出计划，**再** \(\pi_{\text{solve}}\) 按步执行并维护 history。
- 优势是结构稳、可审计；弱点是静态计划怕意外——用重规划或 Plan→ReAct 补灵活。
- PS+ 强化变量与计算，针对 Zero-shot CoT 的漏步与算错。
- 选型与组合见 [[agent-paradigms]]；泛化规划见 [[planning]]。

## 进一步阅读

- [[agent-paradigms]] — 三范式对照与选型
- [[planning]] — 静态 vs 动态规划
- [[reAct]] — 逐步 Observation 驱动的执行
- [[reflection]] — 执行后的质量环
- [[chain-of-thought]] — Zero-shot CoT 与 PS 的对比起点
- [[harness-engineering]] — Planner/Executor 状态机与审批
- [Plan-and-Solve Prompting (Wang et al., 2023)](https://arxiv.org/abs/2305.04091) — PS / PS+ 与实验
- [Hello Agents 第四章](https://datawhalechina.github.io/hello-agents/#/./chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA) — Planner / Executor 参考实现
