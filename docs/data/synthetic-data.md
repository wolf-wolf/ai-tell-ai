---
tags:
  - data
  - training
aliases:
  - Synthetic Data
  - 合成数据
  - Self-Instruct
  - 蒸馏数据
prerequisites:
  - "[[training-data]]"
  - "[[sft]]"
related:
  - "[[corpus-cleaning]]"
  - "[[lora-peft]]"
  - "[[dpo]]"
  - "[[llm-as-judge]]"
  - "[[rlhf]]"
stability: mid
layer: data
updated: 2026-06-15
---

# 合成数据（Synthetic Data）

> [!tip] 核心本质
> **合成数据**用 LLM（teacher）或规则**生成训练样本**，补 [[training-data]] 里拿不到或标不起的 instruction/偏好对——**Self-Instruct** 从少量 seed 自举扩指令；**蒸馏**用强模型产输出训小模型。不是 [[corpus-cleaning|语料清洗]] 的 dedup，而是**主动造标签**。收益是成本与覆盖（含 edge case）；风险是 **model collapse**（递归合成退化）、teacher 偏见放大、安全对齐被「洗」掉、以及 API/合规（用 GPT 数据训竞品）。

适合 SFT/[[lora-peft]] 缺标注、要扩 domain 指令的场景。读完能选 distillation vs self-improvement 并设验证门禁。

*检索说明：Self-Instruct / 蒸馏对照 [Wang et al. Self-Instruct](https://arxiv.org/abs/2212.10560)、[Eugene Yan synthetic finetuning](https://eugeneyan.com/writing/synthetic/)、[Scale Labs augmentation strategies](https://labs.scale.com/papers/balancing-cost-and-effectiveness-of-synthetic-data-generation-strategies-for-fine-tuning-llms)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：`data/` 层 P2；与 [[sft]] 强绑定；DPO/偏好对也可用 synthetic preference。

**预期寿命**：中期。Teacher 变强、合成策略变；「纯合成预训练」有 collapse 争议，**SFT 增广**仍普遍。

**近期演进**：Answer Augmentation vs New Question 策略随 seed/预算比切换（Scale Labs）；质量过滤用 [[llm-as-judge]]；与 [[corpus-cleaning]] 结合去合成重复。

**终极威胁**：高质量人类数据便宜到不值得冒 collapse 风险时，合成占比下降。

## 1 两条主路径

| 路径 | 做法 | 优点 | 风险 |
| --- | --- | --- | --- |
| **蒸馏（Distillation）** | 强 **teacher** 生成 I/O | 质量上限高 | ToS/泄露、成本高 |
| **Self-improvement** | 模型自生成→自滤→再训 | 无外部依赖 | 能力天花板、偏见放大 |

Self-Instruct（2022）：175 条 seed → 模型生成新 instruction + 实例 → 启发式过滤（长度、ROUGE 与 seed 过近等）。

## 2 生成策略（Scale Labs 三分法）

| 策略 | 何时有效 |
| --- | --- |
| **Answer Augmentation** | 有问题、换答案；teacher 预算 **低** |
| **Question Rephrase** | 扩写法多样性 |
| **New Question** | seed 少、query 预算 **高** |

低数据 regime 下**策略选择**比「多造一点」更影响效果。

## 3 质量门禁

1. **启发式** — 过短、复制 instruction 到 output、与 seed 近重复
2. **Judge / 人工** — [[llm-as-judge]] 或人抽检 difficult 子集
3. **Task eval** — 合成 SFT 后在**真实** holdout 上测，非只看 train loss
4. **混合比例** — 保留一定**人类**或真实日志，防分布窄化
5. **[[corpus-cleaning]]** — 合成集 dedup，防模板重复过拟合

## 4 何时用 / 不用

| 用 | 不用 |
| --- | --- |
| 标注贵、domain 指令缺 | 有足量高质量人类偏好 |
| 要覆盖 rare edge case | 递归「合成训合成」无真人锚 |
| Teacher 明显强于 student | 安全/医疗等不容 teacher 幻觉 |
| 扩写已有 seed | 未验证就全量替代真实数据 |

## 5 与 SFT / DPO / RAG

- **[[sft]]**：合成 (instruction, response) 最常见
- **[[dpo]]**：teacher 产 chosen/rejected 对（需更严 QC）
- **RAG**：合成 **query–doc** 对 augment 检索评测，非替真实文档
- **[[rlhf]]**：合成 preference 可起步 RM，但易继承 teacher 偏差

## 6 风险详解

| 风险 | 缓解 |
| --- | --- |
| **Model collapse** | 混合真实数据；限制递归代数 |
| **Teacher 偏见** | 多样 prompt、多 teacher、人工审计 |
| **安全退化** | 红队回归 [[red-teaming]]；保留安全 seed |
| **Memorization 泄露** | 勿用含 PII 的 teacher 输出 blindly |
| **法律/ToS** | 读 API 条款；自托管 teacher |

## 要点收束

- 合成数据 = teacher/自举造 SFT（或 preference）样本，补标注缺口。
- 蒸馏 vs self-improvement；策略随 seed/预算切换。
- 必须：过滤 + task eval + 与人混训 + dedup。
- 与 [[corpus-cleaning]]、[[red-teaming]]、[[sft]] 组合，不单点依赖合成。

## 进一步阅读

### 库内

- [[training-data]] — 数据第一因
- [[sft]] — 监督微调
- [[corpus-cleaning]] — 去重与质量
- [[red-teaming]] — 合成后安全回归
- [[llm-as-judge]] — 合成质量过滤

### 外部

- [Self-Instruct paper](https://arxiv.org/abs/2212.10560)
- [Eugene Yan — Synthetic data for finetuning](https://eugeneyan.com/writing/synthetic/)
