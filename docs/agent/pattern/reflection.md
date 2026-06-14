---
tags:
  - pattern
aliases:
  - Reflection
  - 自我反思
  - 反思模式
prerequisites:
  - "[[llm]]"
  - "[[agent]]"
related:
  - "[[agent]]"
  - "[[tool-use]]"
  - "[[planning]]"
  - "[[plan-and-solve]]"
  - "[[agent-paradigms]]"
  - "[[chain-of-thought]]"
  - "[[reAct]]"
  - "[[skill-engineering]]"
  - "[[skill-scripts]]"
stability: long
layer: application
updated: 2026-06-14
---

# Reflection（反思模式）

> [!tip] 核心本质
> Reflection 让 [[agent|Agent]] 在生成初稿后，再调用 [[llm|LLM]]（或另一模型）审查输出中的错误、遗漏与可改进点，并据批评修订——相当于把人类的「草稿 → 审稿 → 修改」搬进自动化循环，用 **token 换准确率**。没有 Reflection，[[reAct|ReAct]] 循环里一步工具结果错了，后续轮次往往在错误前提上继续推进；Reflection 补的是**质量与自洽**，不能替代 [[planning|Planning]]（定做什么）或 [[tool-use|工具]]（获取新事实）。适合有明确评判标准的任务；无法凭空补全模型不知道的外部事实。

## 生命周期与演进

**当前定位**：Agent 四大设计模式之一；常作为 [[reAct]] 在 Observation 之后的可选节点，或独立的多轮 Generate→Reflect→Revise 流水线。Cursor / Claude Code 的「检查 diff」「运行测试后再改」是 Reflection + 工具验证的工程化形态。

**预期寿命**：长期。只要输出质量比单次生成更重要，且评判标准可表述，就会保留反思轮；与 Reasoning 模型结合后，单轮自检能力增强，但显式 Reflect 仍利于可审计与解耦角色。

**近期演进**：双模型 / 不同 system prompt 的「生成者与批评者」分离；用测试、linter、类型检查等**工具结果**作为 Reflect 的硬证据（而不仅是 LLM 自说自话）；与 [[skill-scripts]] 的 Grounding（必须引用 tool output）形成闭环。

**终极威胁**：更强模型一次生成即达标的任务上，额外 Reflect 轮成为纯成本；开放性创作若强加反思，可能压扁风格。Reflection 不会取代需要新信息的检索或人类审批。

## Generate → Reflect → Revise

人类写作时的审稿流程，在 Agent 里被拆成可重复的调用链：

```
生成（Generate）
    ↓
反思（Reflect）：「输出有什么问题？与目标/约束是否一致？」
    ↓
修改（Revise）：根据批评重新生成
    ↓
（可选）多轮，直到满足标准或达到轮次上限
```

常用 Reflect prompt 形态：

> 请检查上面的输出，指出其中的错误、遗漏或可以改进的地方。

Harness 负责：把初稿与原始任务约束一并传入 Reflect 轮；将批评结构化后触发 Revise；设 `max_reflect_rounds` 防止成本失控。

## 评审维度

批评者（Critic）宜按**可表述的检查项**扫描初稿，而非笼统「好不好」：

**表 — 常见 Reflect 评审维度**

| 维度 | 检查什么 | 例子 |
| --- | --- | --- |
| **事实性** | 与已知事实/工具结果是否矛盾 | 引用不存在的 API、错日期 |
| **逻辑** | 推理链是否自洽、有无跳步 | 摘要漏掉否定词 |
| **完整性** | 是否遗漏约束或子问题 | 退款政策未核对订单状态 |
| **效率/质量** | 有无更优算法或更短路径 | O(n²) 可改为筛法 |
| **格式** | schema、PEP8、引用规范 | JSON 缺字段 |

角色设定会改变批评重心（「严格性能评审」vs「可读性维护者」）——Harness 应用固定 rubric，避免漂移。

## 轨迹记忆（短期）

多轮 Reflect 需要记住「第几版代码 + 对应反馈」，与 [[memory]] 的跨任务长期记忆不同：

- 用列表记录 `execution` / `reflection` 条目
- `get_trajectory()` 序列化进后续 prompt，避免评审员看不到前轮尝试
- 反思输入宜**只给可核验产出**（代码、答案正文），少塞 hidden chain-of-thought，减轻自我确认偏差

Reflexion（Shinn et al.）进一步把反思轨迹用于**下一 episode** 的策略改进；本篇的 Generate→Reflect→Revise 多指**同一任务内**的迭代。

## 成本、收益与终止

Reflection 是典型的**以成本换质量**：

| 成本 | 收益 |
| --- | --- |
| 每轮至少 +2 次 LLM（Reflect + Revise） | 终稿逻辑更严、代码更优 |
| 串行延迟累加 | 降低「功能对但质量差」的交付风险 |

**终止条件**（可组合）：

- 批评含「无需改进」或 rubric 全通过
- 达到 `max_reflect_rounds`（通常 1–2 轮收益递减）
- **工具硬验证**：`pytest` / linter 全绿（优于纯 LLM 互评）
- 批评与上一轮 feedback 重复（无新信息）

实时客服、低延迟问答宜用轻量 [[reAct]] 或 [[plan-and-solve]]；代码、报告、决策支持宜用 Reflect。选型见 [[agent-paradigms]]。

## 单模型反思与双模型反思

| 方式 | 做法 | 优点 | 风险 |
| --- | --- | --- | --- |
| **单模型** | 同一 LLM 生成又批评 | 实现简单、延迟低 | 「自我确认」偏差——模型坚持初稿错误 |
| **双模型 / 双角色** | 生成者与批评者分离（可不同模型或不同 system prompt） | 批评更客观 | 成本约 2× 起，需协调上下文 |

降低自我确认偏差的工程手段：批评者 prompt 明确要求「假设初稿可能有错」；Reflect 输入中**不包含**生成者的 hidden reasoning，只给可核验的产出；用 [[tool-use]] 跑测试 / 静态检查，把失败栈 trace 作为 Observation 喂回 Revise。

## 何时有效、何时无效

**有效**：

- 有明确质量标准（代码正确性、逻辑自洽、格式约束）
- 初稿易犯**系统性**错误（漏 base case、漏边界、步骤跳跃）
- 批评所依信息已在 context 内（含 tool result）

**无效或慎用**：

- 需要**新事实**（最新新闻、实时库存）——应再调工具或检索，而非多一轮 Reflect
- 开放性创作（文风、幽默）——反思易过度「安全化」输出
- 无客观标准的主观题——模型互评仍可能一致幻觉

与 [[chain-of-thought]] 的关系：CoT 外化**推理过程**；Reflection 外化**对产出的批评**。可先 CoT 生成，再 Reflect 检查推理与结论是否一致。

与 [[planning]] 的关系：Planning 在执行前定路径；Reflection 在执行后（或每步后）评质量。二者正交，常串联。

与 [[reAct]] 的关系：在 Observe 之后插入 Reflect，可缓解「第 2 步错了、后面全错」的累积；见 [[agent]] 工程风险表中的错误累积对策。

## 实践与应用

**代码审查（纯 LLM 反思）**：

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

**工具增强反思**：Reflect 轮不只做文本批评，而是 `python_exec` / `pytest` / `read_lints`；Observation 为失败用例或报错，再 Revise——比纯自评更接近「可证伪」。

[[skill-engineering]] 中的 Grounding 要求输出引用 tool output，与「Reflect 必须可对照证据」同一原则；执行层细节见 [[skill-scripts]]。

## 常见误区

- **Reflection 总是有用**：缺新信息时多轮 Reflect 只会重复幻觉，应先 [[tool-use]] 或检索。
- **轮数越多越好**：通常 1–2 轮收益递减，成本近线性上升。
- **Reflection 能替代 Planning**：反思不帮你发现「还缺哪一步」，只评已有产出好不好。
- **批评者与生成者同一上下文无偏**：需刻意分离角色或引入外部验证信号。
- **Reflection 等于人工审批（HITL）**：人工审批是信任边界；Reflection 是自动化质量环，不能替代高风险写操作审批。

## 进一步阅读

- [[agent-paradigms]] — 何时叠加 Reflection
- [[plan-and-solve]] — 按计划执行后再 Reflect 润色
- [[agent]] — Reflection 在设计模式与错误累积对策中的位置
- [[planning]] — 执行前的路径分解，与 Reflection 正交
- [[reAct]] — Observe 后挂 Reflect 的常见增强
- [[tool-use]] — 用执行结果验证反思结论
- [[chain-of-thought]] — 推理外化 vs 产出批评
- [[skill-scripts]] — 执行层输出如何供验证与 Grounding
- [[skill-engineering]] — Skill 与反思闭环的工程约定
- [Reflexion: Language Agents with Verbal Reinforcement Learning (Shinn et al., 2023)](https://arxiv.org/abs/2303.11366) — 将反思轨迹用于改进后续尝试的代表工作
- [Building effective agents (Anthropic)](https://www.anthropic.com/engineering/building-effective-agents) — 何时用 Workflow / Agent 及质量与成本权衡（外部）
