---
tags:
  - training
  - fine-tuning
aliases:
  - LoRA
  - QLoRA
  - PEFT
  - 参数高效微调
prerequisites:
  - "[[sft]]"
  - "[[llm]]"
  - "[[transformer]]"
related:
  - "[[rlhf]]"
  - "[[training-data]]"
  - "[[local-llama-pretrain]]"
stability: long
layer: model
updated: 2026-06-15
---

# LoRA / QLoRA / PEFT（参数高效微调）

> [!tip] 核心本质
> **PEFT**（Parameter-Efficient Fine-Tuning，参数高效微调）只训练原模型的一小部分参数（常见 **LoRA** 低秩适配器），冻结基座权重，在行为/风格/task 格式上对齐而避免全参更新的算力与**灾难性遗忘**风险。**QLoRA** 再把基座以 4-bit 载入，使 7B–70B 级模型可在单卡消费级 GPU 上 [[sft|SFT]]。若没有 PEFT，多数团队无法承担「为 JSON 输出格式 / 领域话术」单独全参微调。

适合已读 [[sft]]、在「prompt → RAG → 微调」决策链上考虑改**行为**而非注入**事实**的工程师。读完 [[#2 LoRA 机制|§2]] 理解秩与插入点；[[#3 QLoRA|§3]] 看显存；[[#4 何时用|§4]] 与 RAG 分工。

*检索说明：机制对照 [Hu et al., LoRA 2021](https://arxiv.org/abs/2106.09685)、[Dettmers et al., QLoRA 2023](https://arxiv.org/abs/2305.14314)；实践对照 [ecn-apps LoRA/QLoRA guide](https://ecn-apps.com/pages/articles/llm-fine-tuning-guide.html)、[Elysiate 2025 guide](https://www.elysiate.com/blog/llm-fine-tuning-complete-guide-lora-qlora-2025)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：开源与 enterprise 微调**默认路径**——全参仅研究或 unlimited budget；[[sft]] 正文已指向本篇。

**预期寿命**：长期。新变体（DoRA 等）出现，但「小 adapter + 冻结基座」范式稳定。

**近期演进**：多模态 LoRA；与 [[local-llama-pretrain]] 下游衔接；偏好阶段常用 [[dpo]]（待建）而非全参 RLHF。

**终极威胁**：更强 base + [[structured-json-output]] 约束解码使轻量格式任务不需微调；深领域仍要 adapter。

## 1 问题：全参微调为何太贵

| 维度 | 全参微调 | LoRA/QLoRA |
| --- | --- | --- |
| 可训练参数 | 100% | 常 0.1–1% |
| 显存 | 极高 | QLoRA 可单卡 7B–13B |
| 遗忘风险 | 高 | 较低（基座冻结） |
| 部署 | 整模型副本 | 基座 + 小 adapter 文件 |

微调改**行为**（格式、语气、推理模式），不 reliably 注入新事实——新事实用 [[rag]] / 工具。

## 2 LoRA 机制

LoRA 在选定线性层（常为 attention 的 Q/V 或 MLP）旁路加低秩分解 \(W + BA\)，\(B \in \mathbb{R}^{d \times r}\)，\(A \in \mathbb{R}^{r \times k}\)，**秩 r** 典型 8–64。

- **r 越大**：表达力↑，过拟合与显存↑
- **目标模块**：7B 常 `q_proj,v_proj` 或全 attention + MLP
- **合并**：推理可将 adapter 合并回权重或动态加载

与 [[transformer]]：在固定架构上挂 adapter，不改 [[token-prediction]] 目标（仍 CE on labels）。

## 3 QLoRA

**4-bit NormalFloat（NF4）** 量化基座 + LoRA 在 fp16/bf16 训练 adapter：

- 显存约为 fp16 全参的 **~1/3–1/4** 量级（视实现）
- 质量相对 fp16 LoRA 略降，多数任务可接受
- 2025–2026 社区默认：**先试 QLoRA SFT**，不够再 fp16 LoRA 或全参

## 4 何时用 PEFT（决策）

按社区决策链（见 [[sft]]）：

1. **好 prompt 够吗？** 够 → 不微调
2. **要新事实吗？** 是 → [[rag]]，非微调
3. **要稳定格式/领域话术/任务遵从？** 是 → **SFT + LoRA/QLoRA**
4. **要偏好对齐？** SFT 后 → [[rlhf]] 或专文 [[dpo]]（闭式偏好优化）

| 适合 LoRA SFT | 不适合 |
| --- | --- |
| 固定 JSON/临床模板/代码风格 | 纯知识问答（用 RAG） |
| 领域术语与推理套路 | base 已很强且 prompt 够 |
| 1000+ 高质量示范 | <100 脏样本（易过拟合） |

## 5 实践参数（起点，非 KPI）

| 超参 | 常见起点 | 说明 |
| --- | --- | --- |
| rank r | 16–32 | 小数据用 8–16 |
| alpha | 2×r | scaling |
| lr | 1e-4 ~ 3e-4 | 大于全参微调 |
| epochs | 1–3 | 多 epoch 易过拟合小集 |
| max seq len | 按任务 | 与 [[context-window]] 对齐 |

务必留** held-out 评测集**；与 [[agent-evaluation]] 无关但同属「改模型必回归」。

## 要点收束

- PEFT/LoRA：冻基座、训小 adapter；QLoRA 用 4-bit 省显存。
- 改行为不改知识库；事实靠 RAG/工具。
- 决策：prompt → RAG → LoRA SFT → 偏好（DPO/RLHF）。
- rank、目标层、学习率需绑任务评测，非照搬默认值。

## 进一步阅读

### 库内

- [[sft]] — 监督微调流程
- [[rlhf]] — 偏好对齐与 DPO 对比
- [[training-data]] — 数据从哪来
- [[rag]] — 知识注入路径

### 外部

- [LoRA (Hu et al., 2021)](https://arxiv.org/abs/2106.09685)
- [QLoRA (Dettmers et al., 2023)](https://arxiv.org/abs/2305.14314)
