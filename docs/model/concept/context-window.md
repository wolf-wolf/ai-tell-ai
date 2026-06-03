---
tags: [concept]
aliases: [上下文窗口, context length]
related: ["[[agent]]", "[[llm]]", "[[rag]]", "[[context-engineering]]"]
stability: permanent
layer: model
updated: 2026-05-25
---

# Context Window（上下文窗口）

## 🤔 想一想

**你跟朋友聊了一晚上，第二天他什么都不记得了——每次见面对他来说都是第一次。**

*LLM 就是这样：没有记忆，每次调用都是全新的。它唯一能"看到"的，就是你这次塞给它的那段文字。*

这段文字的长度上限，就叫 Context Window。窗口外的一切，对它来说不存在。

---

## 🧠 深入理解

### 什么是 Token

Token 不等于字符或词语，是 LLM 分词器（tokenizer）切分文本的最小单元：

```
英文：「hello world」 → [「hello」, 「 world」] = 2 tokens
中文：「你好世界」 → [「你」, 「好」, 「世」, 「界」] ≈ 4 tokens（每个汉字约 1-2 token）
代码：「def foo():」 → [「def」, 「 foo」, 「():」] = 3 tokens

粗略估算：
  英文 → 1 token ≈ 0.75 个单词 ≈ 4 个字符
  中文 → 1 token ≈ 0.5-1 个汉字
  1000 token ≈ 750 英文词 ≈ 500-700 汉字
```

### 为什么有长度限制

根本原因是 **Transformer 的注意力机制（Self-Attention）**：

- 每个 token 需要和窗口内所有其他 token 计算注意力权重
- 计算量是 O(n²)，n 是 token 数量
- 窗口翻倍 → 计算量翻 4 倍 → 显存、推理延迟、成本都翻倍

无限长的 context 在现有架构下是不可能的，只能在「窗口大小 vs 成本/速度」之间权衡。

### Context 里放什么：优先级层次

一个典型 Agent 的 context 构成（从高优先级到低）：

```
┌─────────────────────────────────────────────────────┐
│  系统提示（System Prompt）                           │  ← 最高优先级，定义角色/规则
│  ─────────────────────────────────────────────────  │
│  当前任务 / 用户当前输入                             │  ← 必须保留
│  ─────────────────────────────────────────────────  │
│  工具调用结果（Tool Results）                        │  ← 最新行动的反馈
│  ─────────────────────────────────────────────────  │
│  近期对话历史（Recent History）                      │  ← 越近越重要
│  ─────────────────────────────────────────────────  │
│  RAG 检索结果 / 背景文档                             │  ← 按需动态注入
│  ─────────────────────────────────────────────────  │
│  早期对话历史                                        │  ← 最先被压缩/截断
└─────────────────────────────────────────────────────┘
```

### Context 满了怎么办

| 策略 | 做法 | 适用场景 |
|------|------|---------|
| **截断（Truncation）** | 直接丢掉最早的历史 | 对话历史，早期内容不重要 |
| **摘要压缩（Summarization）** | 用 LLM 把早期历史压缩成摘要 | 需要保留上下文语义的长对话 |
| **RAG** | 不放全文，只检索相关片段注入 | 大型文档库、知识库 |
| **外部记忆（External Memory）** | 关键信息存到数据库，需要时检索 | 长期运行的 Agent |
| **分块处理（Chunking）** | 把任务拆成多个子任务，各自独立处理 | 处理超长文档 |

### 「Lost in the Middle」现象

实验研究发现：LLM 对 context **开头和结尾**的内容注意力最高，**中间部分**容易被忽略。

实践建议：
- 最重要的指令放在 system prompt（开头）
- 最重要的背景/文档放在 context 末尾（靠近当前任务）
- 避免把关键信息埋在超长 context 的中间

---

## 💡 示例

**场景：用 GPT-4o（128K context）处理一份 50 页 PDF**

```
50 页 PDF ≈ 25,000 汉字 ≈ 30,000-40,000 tokens

可以直接塞进 context？ → 技术上可以，但：
  1. 成本：每次调用都要处理全部 40K token，费用高
  2. 质量：lost in the middle，中间内容可能被忽略
  3. 更好的方案：RAG，每次只检索最相关的 3-5 段（约 2K token）
```

**场景：Agent 长时间运行，context 快满了**

```python
# 检测 context 使用量
if current_tokens > max_tokens * 0.8:  # 超过 80% 警戒线
    # 策略 1：压缩早期历史
    old_history = context[:early_cutoff]
    summary = llm.summarize(old_history)  # 压缩成摘要
    context = [system_prompt, summary] + context[recent_cutoff:]
```

---

## ⚠️ 常见误区

- **误区 1：Context window 越大越好，直接塞所有内容。** 大 context 成本高、速度慢，且存在 lost in the middle 问题。精心选择放入 context 的内容比堆砌更重要。
- **误区 2：LLM 会记住之前的对话。** 不会。每次 API 调用都是全新的，「记忆」是靠应用层把历史对话手动塞回 context 实现的。
- **误区 3：Context window = 模型记忆。** Context 是工作记忆（随用随丢），不是长期记忆。关闭会话后一切消失。
- **误区 4：Token 数量 = 字符数量。** 中文约 2 字/token，英文约 4 字符/token，代码更节省，估算时要分语言。

---

## 💬 我的理解

> 把 context window 想象成一张固定大小的桌子——你只能在桌子上操作能放上去的东西，东西太多就得决定扔掉什么。
> 和 concept-agent 的衔接：Agent 每次循环都要往 context 里写入新的工具结果和观察，管理 context 是 Agent Harness 最核心的工程问题之一。理解了 context window 的限制，就能理解为什么 RAG、摘要压缩是必须的——不是可选的优化，而是长期运行 Agent 的基础设施。

---

## 🔗 关联概念

- [[llm]] — context window 是 LLM 底层架构决定的固有限制
- [[agent]] — Agent 每次循环都在读写 context，管理 context 是 Agent 工程的核心
- [[rag]] — 解决 context 放不下大量文档的最主流方案
- [[context-engineering]] — 系统性管理 context 内容和结构的技术

---

## 📚 延伸阅读

- [Lost in the Middle (2023)](https://arxiv.org/abs/2307.03172) — 证明 LLM 对 context 中间内容注意力下降的研究
- [Anthropic: Context Window Best Practices](https://docs.anthropic.com/claude/docs/context-windows) — 官方 context 管理指南
- [[rag]] — RAG 的完整原理和实现
- [[context-engineering]] — context 工程化管理的系统方法
