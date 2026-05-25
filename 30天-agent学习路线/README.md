# 30 天 AI Agent 学习路线

> **目标**：用 1 个月、每天 2–3 小时，系统学习 AI Agent 应用方向（Prompt / Context / Harness），模型原理（Transformer / 微调）后置；理论优先，实践放到第 2 个月。  
> **撰写日期**：2026-05-24  
> **预计总时长**：约 60–90 小时

---

## 1. 每天怎么学

| 时段 | 时长 | 内容 |
|------|------|------|
| 资讯 | **10 分钟** | 快扫 AI 新闻，深读 1 条，记 1 句「对我路径的影响」 |
| 主学习 | **2–2.5 小时** | 看课 / 读官方文档 + 手写笔记 |
| 缓冲 | **0–20 分钟** | 复习昨日笔记、补看未完成章节 |

### 每日最小产出

- [ ] 3 条「今天学到的可验证事实」（不是感受）
- [ ] 1 条「和昨天学的如何衔接」
- [ ] 1 条「若做 Agent，会用在哪一层：Prompt / Context / Harness / Model」

### 10 分钟资讯 SOP

1. 打开订阅（见 [§6 资讯源](#6-每日-10-分钟资讯源)）
2. 快扫标题，只深读 **1 条**
3. 写入当日笔记：`今日趋势 / 对我学习的影响`
4. 周末：删重复订阅，只留 1–2 个主源

---

## 2. 知识栈顺序

从下往上四层，越往上越接近「生产可用的 Agent」：

```
Model（Transformer、预训练、微调）
    ↑
Harness（循环、重试、护栏、评测、可观测性）
    ↑
Context（窗口里放什么、压缩、记忆、工具结果）
    ↑
Prompt（怎么下指令、结构、示例）
```

**第 1 个月重点**：Prompt → Context → Harness（理论）  
**第 4 周扫读**：Model 原理  
**第 2 个月**：动手实践（见 [§5](#5-第-2-个月实践规划)）

---

## 3. 30 天日历

> 每天主学习约 2–2.5h；标 ⭐ 为必做核心资源。

### 第 1 周：LLM 基础 + Prompt 工程（D1–D7）

| 天 | 主题 | 主资源 | 当日目标 |
|----|------|--------|----------|
| D1 | Agent 全景图 | ⭐ [Building Effective AI Agents](https://www.anthropic.com/research/building-effective-agents) | 区分 workflow vs agent；何时别上 agent |
| D2 | Prompt 原则 | ⭐ [Claude Prompting best practices](https://docs.anthropic.com/claude/docs/chain-prompts) | 清晰指令、示例、XML/分段结构 |
| D3 | Prompt 体系化 | ⭐ [Anthropic Prompt Eng Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial) Ch1–4 | 完成基础章节 + 记录 3 个失败模式 |
| D4 | Prompt 进阶 | 同上 Ch5–9（含 Complex Prompts） | 复杂 prompt 元素清单（角色/任务/规则/输出） |
| D5 | 入门课串联 | [DeepLearning.AI — Prompt Engineering](https://www.deeplearning.ai/courses/)（站内搜 Prompt） | 与 Anthropic 文档对照：哪些已过时 |
| D6 | Agent 设计模式 | ⭐ [DeepLearning.AI — Agentic AI](https://www.deeplearning.ai/courses/agentic-ai) Mod1–2（**只看不写代码**） | Reflection / Tool use / Planning / Multi-agent |
| D7 | **周复盘** | 复习 D1–D6 笔记 | 写 1 页「我想做的 Agent 类型 + 需要哪几层」 |

**D7 检查清单**

- [ ] 能解释 workflow 与 agent 的区别
- [ ] 能列出复杂 prompt 至少 5 个结构元素
- [ ] 能说出 Agentic AI 四个设计模式各解决什么问题

---

### 第 2 周：Context 工程 + RAG 理论（D8–D14）

| 天 | 主题 | 主资源 | 当日目标 |
|----|------|--------|----------|
| D8 | Context 是什么 | ⭐ [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 区分 prompt vs 全上下文状态 |
| D9 | 长程 Agent 的 context | ⭐ [Memory, compaction, tool clearing](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools) | 理解 compaction / memory / tool clearing |
| D10 | RAG 概念 | [Claude Cookbooks — RAG 章节](https://github.com/anthropics/anthropic-cookbook)（选读） | 检索何时有用、何时有害 |
| D11 | 工具与 MCP | ⭐ [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | 工具描述 = prompt；评测驱动迭代 |
| D12 | MCP 效率 | [Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) | 为何「代码调工具」省 token |
| D13 | 公开课深化 | [Berkeley LLM Agents MOOC F24](https://llmagents-learning.org/f24)（选 2–3 讲：ReAct、规划） | 对照 Anthropic：异同点 |
| D14 | **周复盘** | — | 画一张 context 流水线（输入→筛选→窗口→输出） |

**D14 检查清单**

- [ ] 能解释 context engineering 与 prompt engineering 的分工
- [ ] 能说出 compaction / memory / tool clearing 各解决什么问题
- [ ] 能画出自己的 context 组装流程图

---

### 第 3 周：Harness + 评测 + 多 Agent（D15–D21）

| 天 | 主题 | 主资源 | 当日目标 |
|----|------|--------|----------|
| D15 | Harness 定义 | ⭐ [Learn Harness Engineering](https://github.com/walkinglabs/learn-harness-engineering) 讲义 L1–L3 | Harness ≠ 更好的 prompt |
| D16 | 会话生命周期 | 同上 L4–L6：`AGENTS.md`、`init.sh`、状态恢复 | 无状态模型 + 有状态项目 怎么对齐 |
| D17 | 护栏与验证 | 同上 P04–P05 理论 + [DEV: Harness Engineering](https://dev.to/monuminu/harness-engineering-how-to-build-production-ready-llm-agents-that-actually-work-20kc)（选读） | 列出 5 类 harness 故障 |
| D18 | Evals | learn-harness 参考文献中的 Anthropic evals 文章 | 基准场景 > 单次 demo |
| D19 | 多 Agent | Agentic AI Mod5（理论）+ MOOC 多 agent 讲 | 何时多 agent，何时单 agent+工具 |
| D20 | 生产架构扫读 | [Real Developer's Guide](https://www.bestprompt.art/real-developers-guide/) | 识别未来项目要押在哪一层 |
| D21 | **周复盘** | — | 写「最小可上线 Harness 检查表」10 条 |

**D21 检查清单**

- [ ] 能解释 Harness 五要素（context 组装、工具执行、循环纪律、护栏、可观测性）中至少 3 项
- [ ] 能说明 `AGENTS.md` 在 coding agent 里的作用
- [ ] 能写出 10 条 Harness 上线前检查项

---

### 第 4 周：模型原理 + 微调理论（D22–D30）

| 天 | 主题 | 主资源 | 当日目标 |
|----|------|--------|----------|
| D22 | 神经网络直觉 | [Karpathy Zero to Hero](https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ) L1–L2 | 反向传播、loss 在干什么 |
| D23 | 语言建模框架 | 同上 L2–L3（makemore） | 下一个 token 预测 = LM 核心 |
| D24 | Attention / Transformer | ⭐ 同上 **L7 Let's build GPT** + [Attention Is All You Need](https://arxiv.org/abs/1706.03762)（读图解部分） | Q/K/V 直觉；为何需要位置信息 |
| D25 | GPT-2 规模 | Karpathy GPT-2 相关讲（[nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) 后续） | 参数量、上下文、训练数据角色 |
| D26 | 预训练 vs 微调 | [Hugging Face Fine-tuning 文档](https://huggingface.co/docs/transformers/training)（**只读概念**） | 何时微调、何时 RAG/提示就够 |
| D27 | 微调方法谱系 | [Fine-tuning foundation models](https://medium.com/emergent-intelligence/a-hands-on-guide-to-fine-tuning-foundation-models-b063f0cb9c8e)（Full FT vs LoRA） | LoRA 解决什么问题 |
| D28 | Agent 与模型边界 | [Advanced LLM Agents MOOC SP25](https://llmagents-learning.org/sp25) 选 1–2 讲 | 推理/规划 vs 换更大模型 |
| D29 | **总复盘** | 四周笔记 | 一张「Agent 技术栈」思维导图 |
| D30 | 下月实践规划 | — | 列出第 2 个月 3 个动手项目（见 §5） |

**D30 检查清单**

- [ ] 能口头解释 self-attention 在做什么
- [ ] 能对比 Full Fine-tuning 与 LoRA 的适用场景
- [ ] 完成 Agent 技术栈总导图
- [ ] 写下第 2 个月 3 个实践项目

---

## 4. 教程资源索引

### 4.1 Prompt / Context / Agent（优先）

| 类型 | 资源 | 链接 |
|------|------|------|
| 官方 Prompt | Claude Prompting best practices | https://docs.anthropic.com/claude/docs/chain-prompts |
| 交互教程 | Anthropic Prompt Eng Tutorial | https://github.com/anthropics/prompt-eng-interactive-tutorial |
| Context 官方 | Effective context engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| Context Cookbook | Memory / compaction / tool clearing | https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools |
| Agent 方法论 | Building Effective AI Agents | https://www.anthropic.com/research/building-effective-agents |
| 工具 / MCP | Writing effective tools for agents | https://www.anthropic.com/engineering/writing-tools-for-agents |
| 系统课 | DeepLearning.AI — Agentic AI (Andrew Ng) | https://www.deeplearning.ai/courses/agentic-ai |
| 大学 MOOC | Berkeley LLM Agents F24 / SP25 | https://llmagents-learning.org/f24 |
| Harness 系统课 | Learn Harness Engineering | https://github.com/walkinglabs/learn-harness-engineering |
| 长文导读 | Context engineering 2026 guide | https://tutorials.technology/tutorials/context-engineering-ai-agents-2026.html |

### 4.2 模型 / Transformer / 微调（第 4 周）

| 类型 | 资源 | 链接 |
|------|------|------|
| 从零实现 | Karpathy Zero to Hero 播放列表 | https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ |
| 配套代码 | karpathy/nn-zero-to-hero | https://github.com/karpathy/nn-zero-to-hero |
| GPT 单集 | Let's build GPT | https://www.youtube.com/watch?v=kCc8FmEb1nY |
| 微调官方 | Hugging Face Transformers Training | https://huggingface.co/docs/transformers/training |
| 微调概念 | Full FT vs LoRA 对比 | https://medium.com/emergent-intelligence/a-hands-on-guide-to-fine-tuning-foundation-models-b063f0cb9c8e |

---

## 5. 第 2 个月实践规划

理论月结束后，建议按此顺序动手（每项 1–2 周）：

### 项目 1：Prompt + Context 对比实验

- **做什么**：同一任务，对比「裸 prompt」vs「结构化 context（RAG 片段 + 工具说明）」
- **场景建议**：用 Cursor Agent / 本仓库 `AGENTS.md` 模式做一个小任务（如文档整理、代码审查清单）
- **验收**：同一输入跑 5 次，记录成功率与失败模式

### 项目 2：最小 Harness

- **做什么**：fork [learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering) 模板
- **核心文件**：`AGENTS.md` + `init.sh` + 状态恢复机制
- **验收**：模拟中断后 agent 能从上次状态继续，并能自验证输出

### 项目 3：微调入门（可选，需 GPU）

- **做什么**：按 [HF Fine-tuning 文档](https://huggingface.co/docs/transformers/training) 做小数据集 LoRA
- **无 GPU 替代**：只做数据格式设计 + Trainer 配置阅读 + 跑通 inference
- **验收**：能解释 learning rate、batch size、eval strategy 各影响什么

---

## 6. 每日 10 分钟资讯源

| 源 | 特点 | 链接 | 建议频率 |
|----|------|------|----------|
| TLDR AI | 技术向、短 | https://www.tldrnewsletter.com/ | 工作日主源 |
| The Rundown AI | 趋势 + 应用 | https://www.therundown.ai/ | 与 TLDR 轮换 |
| AI Chat Daily | 5 条高影响新闻 | https://www.aichatdaily.com/newsletter | 周末复盘 |
| AI News Daily 播客 | ~5 分钟，通勤听 | https://ai-news-daily.podigee.io/ | 可选 |

---

## 7. 笔记模板

每天可在本目录下 `notes/` 子文件夹新建 `D{天数}-{主题}.md`，复制以下模板：

```markdown
# D{天数} — {主题}

## 日期

## 今日资源

- 

## 3 条可验证事实

1. 
2. 
3. 

## 与昨日的衔接

- 

## 用在哪一层

- [ ] Prompt  [ ] Context  [ ] Harness  [ ] Model

## 今日趋势（10 分钟资讯）

- 标题：
- 一句话影响：

## 疑问 / 待查

- 
```

---

## 8. 时间不够时的裁剪方案

**每天只能 2h 时**，按优先级删减：

1. 砍掉 Berkeley MOOC 与 DEV 选读
2. Harness 只读 [learn-harness-engineering README](https://github.com/walkinglabs/learn-harness-engineering) + 前 6 讲
3. 第 4 周 Karpathy 只看 L7（GPT），跳过 GPT-2 深入

**想更偏 coding Agent 时**：

- 第 3 周理论不变
- 第 2 个月第 1 周直接做 learn-harness-engineering 的 6 个 Project

---

## 9. 进度追踪

在本文件顶部自行更新：

```
当前进度：D__ / 30
开始日期：____-__-__
预计结束：____-__-__
```

每周日复盘时在下方打勾：

| 周 | 复盘日 | 完成 |
|----|--------|------|
| W1 Prompt | D7 | [ ] |
| W2 Context | D14 | [ ] |
| W3 Harness | D21 | [ ] |
| W4 Model | D30 | [ ] |
