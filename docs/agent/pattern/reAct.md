---
tags: [pattern]
aliases: [ReAct, Reason and Act, 推理与行动]
related: ["[[concept-agent]]", "[[tool-use]]", "[[planning]]", "[[reflection]]"]
stability: long
layer: application
updated: 2026-05-26
---

# ReAct（推理与行动）

## ⚡ 30 秒速览

ReAct 是 Agent 最常用的循环模式：LLM 交替进行**推理**（Reason，决定下一步）和**行动**（Act，调用工具），再根据工具返回的观察（Observe）进入下一轮。
名字来自 Reason + Act；和 [[concept-agent|Agent]] 文档里的「思考 → 行动 → 观察」是同一套结构。
记住：ReAct 是模式，Harness 是实现这个模式的运行时。

---

## 🧠 深入理解

（待补充：与 Chain-of-Thought 的关系、prompt 结构、典型实现。）

---

## 🔗 关联概念

- [[concept-agent]] — ReAct 是 Agent 核心循环的具体模式
- [[tool-use]] — Act 阶段依赖工具调用
- [[reflection]] — 在 Observe 之后加入自检，是 ReAct 的常见增强
