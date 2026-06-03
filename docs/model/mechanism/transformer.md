---
tags: [principle]
aliases: [Transformer, 变换器]
related: ["[[principle-attention]]", "[[llm]]", "[[token-prediction]]"]
stability: permanent
layer: model
updated: 2026-05-25
---

# Transformer（变换器架构）

## ⚡ 30 秒速览

Transformer 是 2017 年提出的神经网络架构，核心是 Self-Attention——让序列中每个 token 都能直接关注所有其他 token。
它替代了 RNN 的顺序处理方式，实现训练并行化，彻底解决了长距离依赖问题，成为所有现代 LLM 的基础。
记住：Transformer 的革命是用「所有人同时互看」替代了「一个人依次传话」。

---

## 🧠 深入理解

### 背景：RNN 的两个死穴

在 Transformer 之前，序列数据（文本、语音）主要用 RNN（循环神经网络）处理。RNN 的工作方式像一条流水线：从左到右，每个词处理完再处理下一个词，同时把「记忆」传递给下一步。

这带来两个根本性问题：

**问题 1：无法并行化**
RNN 必须按顺序处理，第 N 步必须等第 N-1 步完成。在 GPU 并行计算时代，这是巨大浪费。训练速度极慢，无法扩展到大规模数据。

**问题 2：长距离依赖消失**
「The cat that sat on the mat was hungry.」——「cat」和「was」相距 7 个词，但 RNN 传递的「记忆」在经过多步后会衰减，模型难以维持这种远距离关联。

Transformer 用 Self-Attention 同时解决了这两个问题。

### 核心机制一：Self-Attention

Self-Attention 的直觉：**序列中的每个 token，都能直接「看到」并「询问」所有其他 token，权衡它们的相关性，综合出自己的新表示。**

用一个例子来理解：
```
句子：「银行[bank]在河边[river]」

处理「bank」这个词时：
- 它「询问」所有其他词：「谁和我最相关？」
- 「river」回应：「我很相关！」（river → bank = 河岸 语境）
- 「在」回应：「我一般相关」
- Self-Attention 机制计算出权重：river 0.6，在 0.2，银行 0.2
- 「bank」的新表示 = 所有词的加权组合，偏向「河岸」含义
```

关键点：
- 所有 token 的 Attention 计算**同时进行**，天然并行
- 任意两个 token 之间的距离对 Attention 计算没有影响，长距离依赖不再是问题
- 多头注意力（Multi-Head Attention）让模型同时关注不同维度的关系（语法关系、语义关系等）

### 核心机制二：Feed-Forward 层

每个 Transformer Block 里，Self-Attention 之后还有一个 Feed-Forward（前馈）网络层。

直觉上：
- **Self-Attention 负责「信息交换」**——token 们互相交流，整合上下文
- **Feed-Forward 负责「信息加工」**——对每个 token 独立进行非线性变换，提取更高层次的特征

研究表明，Feed-Forward 层存储了大量的「事实知识」（如「巴黎是法国首都」这类知识可能编码在 FFN 权重中）。它通常比 Attention 层宽得多（4 倍），是参数量的主要来源。

### 架构变体：Encoder-Decoder vs Decoder-only

**原始 Transformer（Encoder-Decoder）：**
```
输入序列 → [Encoder：双向理解整个输入] → [Decoder：逐步生成输出]
```
适合：机器翻译、摘要（需要充分理解输入再生成）
代表：T5、BART

**Decoder-only（GPT 系列）：**
```
输入序列 → [Decoder：从左到右，每步只看之前的 token，预测下一个]
```
适合：文本生成、语言建模
代表：GPT-4、Claude、Llama
- 更简洁：只需一种架构
- 训练目标统一：永远是「预测下一个 token」
- **几乎所有现代 LLM 都是 Decoder-only**

**为什么 Decoder-only 赢了？**
实验发现，在足够大的规模下，Decoder-only 的统一训练目标（next token prediction）能涌现出理解、推理、总结等一切能力，不需要 Encoder 的双向理解专门设计。规模 + 简单目标 = 强大能力。

### 为什么 Transformer 成为 LLM 的基础

1. **可扩展性**：层数、宽度、头数都可以无限堆叠，性能随规模单调提升（scaling law）
2. **并行训练**：充分利用 GPU 集群，能在超大数据集上训练
3. **通用性**：同一架构能处理文本、图像、音频、代码，只需改变 tokenization 方式

---

## 💡 示例

**直觉感受 Self-Attention 的作用：**

```
句子 A：「我把苹果放进了篮子，因为它太重了。」
句子 B：「我把苹果放进了篮子，因为它太满了。」

「它」指代什么？
- 句子 A：「篮子」太重 → Self-Attention 让「它」更多关注「篮子」
- 句子 B：「苹果」太满无意义，「篮子」太满合理 → 「它」关注「篮子」

RNN 处理这类消歧需要靠长距离记忆传递，经常失败。
Transformer 的 Self-Attention 直接把「它」和所有候选词关联，轻松解决。
```

**Transformer Block 的数据流：**
```
输入 token 向量
  ↓
[Multi-Head Self-Attention] ← 所有 token 互相交流
  ↓
[Add & LayerNorm]           ← 残差连接，防止梯度消失
  ↓
[Feed-Forward Network]      ← 每个 token 独立加工
  ↓
[Add & LayerNorm]
  ↓
输出 token 向量（含有丰富的上下文信息）
```
GPT-4 这样的模型有 ~96 层这样的 Block 堆叠。

---

## ⚠️ 常见误区

- **误区 1：Transformer = GPT = ChatGPT。** Transformer 是架构，GPT 是基于它的预训练模型系列，ChatGPT 是再经过 RLHF 对齐后的对话产品。三个层次不同。

- **误区 2：Self-Attention 让模型「理解」了语言。** Self-Attention 是统计关联机制，不是真正的语义理解。它学会的是词之间共现和关联的模式，「理解」是工程上的拟人说法。

- **误区 3：Transformer 没有位置感，顺序对它无所谓。** 错。Self-Attention 本身不感知位置，所以需要额外注入位置编码（Positional Encoding）。没有它，「猫追狗」和「狗追猫」对模型一样。

- **误区 4：Encoder-Decoder 比 Decoder-only 更强（因为有双向理解）。** 在现代 LLM 规模下，实验证明 Decoder-only 的性能不逊于 Encoder-Decoder，且架构更简洁。

---

## 💬 我的理解

> 在我理解 Transformer 之前，总觉得神经网络是个黑盒魔法。理解 Self-Attention 之后发现它的核心思路其实很直觉：给每个词一个机会「参考」所有其他词来更新自己的含义。这和人类读句子时会根据上下文理解词义的方式很像。
> 和 token prediction 的衔接：Transformer 是执行「预测下一个 token」这个任务的引擎。理解了 Transformer 的架构，才能理解为什么这个引擎能从简单的预测任务中涌现出如此复杂的能力。

---

## 🔗 关联概念

- [[principle-attention]] — Self-Attention 机制的详细展开，Transformer 的核心组件
- [[llm]] — Transformer 架构的最大应用，大语言模型
- [[token-prediction]] — Transformer 执行的训练任务，两者结合产生了 LLM
- [[context-window]] — Transformer 的 Self-Attention 覆盖范围就是 context 窗口

---

## 📚 延伸阅读

- Vaswani et al. 2017, "Attention Is All You Need" — Transformer 原始论文
- Jay Alammar, "The Illustrated Transformer" — 最清晰的图解 Transformer 教程（强烈推荐）
- Andrej Karpathy, "Let's build GPT from scratch" — 从零实现 GPT，深入理解架构细节
