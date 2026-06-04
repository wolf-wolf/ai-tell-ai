---
tags:
  - concept
aliases:
  - prompt engineering
  - 提示词工程
  - 提示工程
prerequisites:
  - "[[llm]]"
related:
  - "[[context-engineering]]"
  - "[[harness-engineering]]"
  - "[[agent]]"
stability: mid
layer: application
updated: 2026-05-26
---
# Prompt Engineering（提示词工程）

> [!tip] 核心本质
> Prompt Engineering 是在单次调用里把你的意图精确编码进 context window 的技巧体系——模型只能从你写的字里推断目标，问法差一两个约束，输出质量可以天差地别。若没有这套「怎么对模型说话」的基线，再复杂的 Agent、RAG 或 Harness 也会在第一步就传错信号，后续编排只是在放大初始误解。

## 生命周期与演进

**当前定位**：三代范式起点（Prompt → Context → Harness），仍是日常单次 LLM 调用的基本功。

**预期寿命**：长期存在；单独靠 prompt 解决多步、有状态、需工具的任务的空间在收缩。

**近期演进**：与 reasoning 模型、结构化输出、多模态指令深度融合；有效技巧 increasingly 模型/版本绑定。

**终极威胁**：被 Context Engineering 与 Harness Engineering 吸收为可配置子模块，人工「手写咒语」占比下降。

## 核心原理

### 为什么"怎么说"这么重要

[[llm|LLM]] 的本质是根据输入预测最可能的输出。你给的输入（prompt）就是它的全部上下文——它不知道你脑子里真正想要什么，只能从你写的字里推断。

同样是让模型写代码，"写一个排序函数"和"用 Python 写一个对整数列表做升序排序的函数，只用标准库，加类型注解，附上单元测试"，模型收到的信息量完全不同，输出质量自然也不同。

这不是在"骗"模型，而是在**把你的意图精确传达进 context window**。

### 核心技巧

几个经过大量实验验证、普遍有效的写法：

**给角色（Role）**
告诉模型它是谁，能激活相关的"知识分布"：
```
你是一位有10年经验的 Python 工程师，擅长写简洁可维护的代码。
```

**给示例（Few-shot）**
与其描述你想要什么格式，不如直接举例——模型非常擅长模式匹配：
```
输入：苹果
输出：水果

输入：狗
输出：动物

输入：北京
输出：
```

**让模型先思考（Chain of Thought）**
复杂推理任务加一句"请一步步思考"，能显著提升准确率——让模型把中间过程写出来，而不是直接跳结论：
```
请一步步推理，然后给出最终答案。
```

**给约束（Constraints）**
明确说不要什么，和说要什么同样重要：
```
不要使用第三方库；输出只包含代码，不要解释；每个函数不超过20行。
```

**结构化输出**
如果输出要被程序处理，直接要求 JSON 格式，避免解析不稳定：
```
以 JSON 格式返回，字段：name（字符串）、score（0-100整数）、reason（一句话）。
```

### Prompt Engineering 的局限

技巧再好，也有边界：

写好一条 prompt 只能解决**单次调用**的质量问题。如果任务需要多步执行、调用外部工具、跨轮次记住状态——prompt 本身解决不了，这是 [[context-engineering|Context Engineering]] 和 [[harness-engineering|Harness Engineering]] 要处理的问题。

另一个局限是**脆弱性**：同一个 prompt 换一个模型、换一个版本，效果可能大相径庭。Prompt Engineering 的成果往往是模型绑定的，移植成本高。

### 三代演进的位置

```
Prompt Engineering → Context Engineering → Harness Engineering
   怎么说话              给什么信息              搭什么系统
```

Prompt Engineering 是起点，也是基础——后两者都建立在"能写出好的 prompt"之上，只是把问题的范围扩大了。

---

## 实践与应用

同一个任务，三种写法的对比：

| 写法 | Prompt | 问题 |
|------|--------|------|
| 太模糊 | "帮我优化这段代码" | 不知道优化方向，可能乱改 |
| 稍好 | "帮我优化这段 Python 代码的性能" | 方向有了，但没有约束 |
| 清晰 | "优化以下 Python 函数的运行速度，只修改函数体，不改接口，不引入新依赖，给出修改后的代码和一句改了什么的说明" | 范围、约束、输出格式都定义清楚 |

第三种写法多了几十个字，但模型不需要猜你的意图，直接能给出可用的结果。

---

## 常见误区

Prompt 越长不一定越好——堆很多无关的背景信息会稀释真正重要的指令，模型反而抓不到重点。有效的 prompt 是精准的，不是冗长的。

另一个常见误区是把 Prompt Engineering 当成万能药。遇到模型输出不稳定、多步任务失控、跨轮次忘记上下文这类问题，根源往往不在 prompt 写得不够好，而是系统架构层面的问题。这时候该看的是 [[context-engineering|Context Engineering]] 和 [[harness-engineering|Harness Engineering]]。

## 进一步阅读

- [[context-engineering]] — 光会说话不够，还得管好模型能看到什么信息
- [[harness-engineering]] — 多步任务、工具调用、状态管理，这些 prompt 解决不了
- [[agent]] — Agent 系统里 prompt 只是一个环节
- [[llm]] — 理解模型怎么工作，才能写出更好的 prompt
