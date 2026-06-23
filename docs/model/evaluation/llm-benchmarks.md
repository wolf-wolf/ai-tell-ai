---
tags:
  - evaluation
  - benchmark
aliases:
  - LLM Benchmark
  - 基准测试地图
  - MMLU
  - HumanEval
prerequisites:
  - "[[llm]]"
  - "[[agent-evaluation]]"
related:
  - "[[llm-as-judge]]"
  - "[[agent-evaluation]]"
  - "[[langsmith]]"
  - "[[training-data]]"
stability: long
layer: application
updated: 2026-06-15
---

# LLM Benchmark 地图

> [!tip] 核心本质
> **公开 LLM Benchmark** 是标准化探针：MMLU 测广域知识、HumanEval 测函数级代码、MT-Bench 测多轮对话、SWE-bench 测真实修 bug——各测**不同能力切片**，分数不可横向比「谁更强」而不看测什么。2025–2026 前沿模型在 MMLU/HumanEval **饱和**（~90%+）， leaderboard 选模型只能作** sanity check**；生产必须叠 **domain golden set** 与 [[agent-evaluation]] 轨迹指标。HELM 等多维框架的价值是**可比 harness**，不是单一 headline 数字。

适合选型、写模型卡片、或设计 [[llm-as-judge]] / [[langsmith]] dataset 的读者。读完能按任务选 1–2 个公开基准 + 自建 eval 分工。

*检索说明：基准定义对照 [HELM](https://crfm.stanford.edu/helm/)、[HELM MMLU 标准化](https://crfm.stanford.edu/2024/05/01/helm-mmlu.html)、Chen et al. HumanEval、Zheng et al. MT-Bench；2026 饱和与 Agent 集对照 [Open LLM Leaderboard v3](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) 社区综述（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：模型层 **evaluation/** 索引；与 [[agent-evaluation]]（Agent 轨迹）和 [[llm-as-judge]]（评法）分工。

**预期寿命**：长期。具体榜单位次变；「公开探针 + 私有 golden」双轨不变。

**近期演进**：MMLU-Pro、GPQA Diamond、SWE-bench **Verified**、IFEval、Chatbot Arena Elo；污染与 harness 差异引发分数争议。

**终极威胁**：私有任务 eval 完全替代公开榜；公开榜仍留作粗筛与学术引用。

## 1 怎么用这张地图

1. **先问业务测什么** — 知识 / 代码 / 对话 / 工具 Agent / 推理
2. **选 1–2 个公开基准** — 粗筛候选模型
3. **必建私有 dataset** — 真实 prompt、 rubric、回归集（[[agent-evaluation]]）
4. **固定 harness** — prompt 模板、温度、pass@k；否则分数不可比（HELM MMLU 与厂商自报可差 ~5pt）

## 2 核心基准一览

| Benchmark | 测什么 | 格式 | 规模感 | 指标 | 2026 备注 |
| --- | --- | --- | --- | --- | --- |
| **MMLU** | 57 学科知识 | 4 选 1 | ~15.9k | Accuracy | 前沿饱和；用 MMLU-Pro 增难 |
| **HumanEval** | Python 函数补全 | 单函数 + unit test | 164 | pass@k | 饱和；无系统设计 |
| **SWE-bench Verified** | 真实 GitHub issue 修复 | Agent 改库 + test | 500 | Resolved % | **生产代码能力**首选信号之一 |
| **MT-Bench** | 多轮对话质量 | 2-turn × 8 类 | 80 | GPT-4 judge 1–10 | [[llm-as-judge]] 原型；题量少 |
| **GPQA Diamond** | 专家级推理 | 选择题 | ~198 | Accuracy | 硬推理；未饱和 |
| **GSM8K** | 小学数学 | 自由答案 | 8.5k | Accuracy | 推理链基础探针 |
| **IFEval** | 指令遵循 | 可验证约束 | — | Strict accuracy | 格式/长度等硬约束 |
| **HELM** | 多场景多维 | 混合 | 矩阵 | 准确/公平/毒性/效率等 | 研究级 holistic；慢 |
| **Chatbot Arena** | 人类偏好 |  pairwise | 动态 | Elo | 「用户喜不喜欢」；非能力上限 |

## 3 与 Agent 评测分工

| 层次 | 文档 | 内容 |
| --- | --- | --- |
| 模型能力探针 | **本文** | MMLU、HumanEval、SWE-bench… |
| Agent 任务/轨迹 | [[agent-evaluation]] | 完成率、tool P/R、路径 partial credit |
| 评法 | [[llm-as-judge]] | Rubric、偏差、与 deterministic 指标分工 |
| 平台 | [[langsmith]] | Dataset + evaluator 跑回归 |

**Agent 专用集**（选型时另查）：WebArena、AgentBench、τ-bench 等——测 tool 环与环境交互，不替代 MMLU。

## 4 公开榜的三类局限

1. **饱和** — MMLU/HumanEval 难区分 frontier；看 SWE-bench Verified、GPQA
2. **污染** — 训练语料含 benchmark 题；HumanEval+ 等去污染变体
3. **Harness 不一致** — 同模型不同 prompt/shot 差数 pt；HELM 强调标准化

因此：**公开分 = 粗筛；合并 = 私有 golden + 固定 harness**（[[harness-engineering]]）。

## 5 选型工作流（简）

```mermaid
flowchart LR
  NEED[业务需求] --> PICK[选 1–2 公开探针]
  PICK --> SHORT[短名单模型]
  SHORT --> GOLD[建 domain dataset]
  GOLD --> REG[回归 + 在线监控]
  REG --> SHIP[上线 / 换模型]
```

- 编码助手：SWE-bench Verified + 内部 repo 任务
- 客服/RAG：私有 QA golden + [[recall-at-k]] / 答案 rubric
- 通用 chat：Arena 偏好 + MT-Bench 仅作参考

## 6 与训练数据

Benchmark 高分 ≠ 你的域好用。[[training-data]] 分布与 [[corpus-cleaning]] 质量决定微调后私有 eval；公开榜不替代表域验证。

## 要点收束

- 各 benchmark 测不同切片；勿用一个总分选模型。
- MMLU/HumanEval 已饱和；看 SWE-bench Verified、GPQA、IFEval。
- 生产 = 公开 sanity check + 私有 golden + [[agent-evaluation]]。
- 比分时固定 harness；HELM 类框架价值在可比性。

## 进一步阅读

### 库内

- [[agent-evaluation]] — Agent 轨迹指标
- [[llm-as-judge]] — Judge 评法
- [[langsmith]] — Dataset 回归
- [[training-data]] — 数据与上限

### 外部

- [HELM](https://crfm.stanford.edu/helm/)
- [HELM MMLU leaderboard](https://crfm.stanford.edu/2024/05/01/helm-mmlu.html)
- [HumanEval (Chen et al.)](https://arxiv.org/abs/2107.03374)
- [MT-Bench (Zheng et al.)](https://arxiv.org/abs/2306.05685)
