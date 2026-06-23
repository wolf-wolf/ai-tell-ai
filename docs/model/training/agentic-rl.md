---
tags:
  - training
  - agent
  - rl
aliases:
  - Agentic RL
  - GRPO
  - Group Relative Policy Optimization
  - 工具轨迹强化学习
prerequisites:
  - "[[rlhf]]"
  - "[[rlvr]]"
  - "[[sft]]"
  - "[[agent]]"
  - "[[function-calling]]"
related:
  - "[[dpo]]"
  - "[[agent-evaluation]]"
  - "[[tool-use]]"
  - "[[lora-peft]]"
stability: mid
layer: model
updated: 2026-06-15
---

# Agentic RL 与 GRPO

> [!tip] 核心本质
> **Agentic RL** 用强化学习优化 **带 [[tool-use|工具]] 的多步轨迹**——奖励来自任务完成、单步工具正确性或 **可验证结果**（代码测例、数学题）。**GRPO**（Group Relative Policy Optimization）是 2024–2025 主流实现：对同一 prompt **采样一组 rollout**，用组内奖励的**相对排名**算 advantage，**去掉 PPO 的 Critic 网络**——DeepSeek-R1 等推理模型后训练的核心优化器之一。与 [[rlvr]] 重叠：数学/代码常共用「可验证奖励 + GRPO」；Agent 场景奖励变为 **tool 轨迹 + 环境反馈**。

适合理解 R1 类训练、Hello Agents ch11 工具 RL、或选型 GRPO vs PPO/DPO。

*检索说明：GRPO 定义对照 [Shao et al. DeepSeekMath/GRPO](https://arxiv.org/abs/2402.03300)、DeepSeek-R1 报告；Agentic RL survey [arXiv:2509.02547](https://arxiv.org/html/2509.02547v5)；实现见 [HuggingFace TRL GRPOTrainer](https://huggingface.co/docs/trl/grpo_trainer)、[verl](https://github.com/volcengine/verl)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：推理对齐（[[rlvr]]）与 **Agent 工具策略** 的后训练热点；开源 TRL/verl 降低门槛。

**预期寿命**：中期。GRPO 变体（DAPO、Dr.GRPO、off-policy GRPO）快速迭代；「组相对 advantage」思路会留。

**近期演进**：全负样本组（全错 rollout）学习改进（SGPO 等）；Training-Free GRPO（优化 context 而非权重）；多轮 tool 环境 RL。

**终极威胁**：强 base + SFT + 测试时搜索覆盖部分 RL 收益；开放域仍要 [[rlhf]]/[[dpo]]。

## 1 GRPO 机制（简）

对 prompt \(x\)：

1. 旧策略 \(\pi_{\theta_{old}}\) 采样 **G 条**完整响应/轨迹
2. 每条得奖励 \(r_i\)（规则、verifier、tool 成功）
3. **组内标准化**得 advantage \(\hat A_i\)（减均值、可选除 std）
4. 用 clipped surrogate + KL(π‖π_ref) 更新 \(\pi_\theta\)

**无 Critic** → 省显存与训练复杂度；依赖 **一组样本有方差** 才有梯度——全对/全错组是已知痛点。

## 2 与 PPO、[[dpo]]、[[rlvr]]

| | PPO + RM | **GRPO** | [[dpo]] |
| --- | --- | --- | --- |
| Critic | 要 | **不要** | 不要 |
| 奖励 | RM 连续分 | 组内相对 / 可验证 | 偏好对 |
| 典型域 | 通用 RLHF | 推理、Agent、[[rlvr]] | 偏好对齐 |
| 采样 | 单条或 batch | **每组 G 条** | 静态对 |

[[rlvr]] 强调奖励**可自动验真**；GRPO 强调**优化算法**。DeepSeek-R1：**SFT → RL（GRPO + 规则奖励）**。

## 3 Agentic RL 奖励设计

| 信号 | 例子 |
| --- | --- |
| **稀疏终局** | 任务完成 / 失败 |
| **轨迹 partial** | 期望 tool 序列匹配度（[[agent-evaluation]]） |
| **逐步** | 单步 tool 名/参数对错 |
| **Verifiable** | 代码 pytest、SQL 结果集 |

与 [[agent-evaluation]] 三维（final / trajectory / step）对齐——RL 奖励应可 **自动算**，否则回到 RM 老路。

环境：WebArena、τ-bench、自建 tool mock；**sandbox**（[[agent-sandbox]]）防 RL 探索破坏宿主。

## 4 工程栈

| 组件 | 选项 |
| --- | --- |
| 训练 | TRL `GRPOTrainer`、verl、OpenRLHF |
| Rollout | vLLM 批量采样 |
| 奖励 | 规则函数、单元测试、LLM judge（慎用） |
| 数据 | 工具任务 prompt 集 |

成本：**G × 序列长度 × 迭代**；Agent 多轮 tool 比单轮推理更贵。

## 5 何时用 / 不用

| 用 GRPO 类 Agentic RL | 不用 |
| --- | --- |
| 有清晰成功判据 + 可仿真环境 | 纯聊天偏好（用 [[dpo]]） |
| SFT 后仍 tool 格式/策略差 | 无 reward 工程 budget |
| 推理链可规则打分（[[rlvr]]） | 小模型、小数据硬上 RL |

## 6 坑

| 坑 | 后果 |
| --- | --- |
| 全负样本组 | 零梯度（SGPO 等缓解） |
| Reward hack | 模型钻 verifier 漏洞 |
| KL 过弱 | 偏离 base，通用能力掉 |
| Judge 奖励 | 继承 judge 偏差 |
| 无 [[agent-evaluation]] 基线 | 不知 RL 是否真提升 |

## 要点收束

- Agentic RL = 工具/多步轨迹 + RL；GRPO = 组相对 advantage、无 Critic。
- 与 [[rlvr]]、DeepSeek-R1 路线一体；Agent 奖励对齐轨迹评测。
- 实现 TRL/verl + vLLM rollout + 可验证 reward。
- 开放域偏好仍看 [[rlhf]]/[[dpo]]。

## 进一步阅读

### 库内

- [[rlvr]] — 可验证奖励
- [[rlhf]] — PPO/RM 对照
- [[agent-evaluation]] — 轨迹指标
- [[function-calling]] — tool 格式
- [[sft]] — RL 前 SFT 阶段

### 外部

- [DeepSeek-R1](https://arxiv.org/abs/2501.12948)
- [GRPO (DeepSeekMath)](https://arxiv.org/abs/2402.03300)
- [Agentic RL Survey](https://arxiv.org/html/2509.02547v5)
