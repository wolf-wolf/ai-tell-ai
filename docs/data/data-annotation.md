---
tags:
  - data
  - alignment
  - rlhf
aliases:
  - Data Annotation
  - 偏好标注
  - Preference Data
prerequisites:
  - "[[rlhf]]"
  - "[[dpo]]"
  - "[[sft]]"
related:
  - "[[rlhf-bias]]"
  - "[[constitutional-ai]]"
  - "[[synthetic-data]]"
  - "[[corpus-cleaning]]"
  - "[[llm-as-judge]]"
stability: mid
layer: data
updated: 2026-06-15
---

# 标注与偏好数据规范（Data Annotation）

> [!tip] 核心本质
> **偏好标注**为 [[rlhf]]、[[dpo]] 等对齐提供「哪个回答更好」的监督信号——数据质量是**对齐天花板**：模糊 rubric、低一致率、长度/位置偏置会直接教坏策略。本篇定义工程侧**数据契约**：成对比较格式、多维 rubric、质控指标与常见偏置缓解；理论动机见 [[rlhf]]，合成扩增见 [[synthetic-data]]。

适合自建偏好集、外包标注 SOP 或审核 RM/DPO 训练数据的 ML 工程师。读完应能写一版标注指南、设 gold set 与 IAA 门槛，并知道何时用 pairwise 而非绝对打分。

*检索说明：实践要点对照 [RLHF Book ch.11 preference data](https://github.com/natolambert/rlhf-book/blob/main/book/chapters/11-preference-data.md)、[Anthropic 对齐数据文献脉络](https://mbrenndoerfer.com/writing/human-preference-data-collection-rlhf-alignment)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：`data/` 层 P2 节点；[[training-data]] 讲预训练语料，本篇讲**对齐阶段人类/模型反馈**。

**预期寿命**：mid–long。RLAIF、AI 反馈增多，但**可审计的人类规范**仍是争议仲裁基准。

**近期演进**：迭代 DPO 按「值得标」的 pair 筛选（EMNLP 2024）；on-policy 采样与当前 checkpoint 对齐；多语言偏好集。

**终极威胁**：全自动偏好与可验证环境奖励（[[rlvr]]）减少人类 pair 需求；安全与价值仍要人类 rubric 锚定。

## 1 数据形态

| 形态 | 说明 | 常用于 |
| --- | --- | --- |
| **Pairwise** | 同 prompt 两回复，选 better/worse/tie | RM、DPO、Bradley-Terry |
| **Ranking** | 多回复排序 | 部分 RM 训练 |
| **Absolute score** | 单回复打分 | 需校准；与 BT 损失未必一致 |

工业界偏好 **pairwise**：与 Bradley-Terry / DPO 目标一致，标注一致性通常高于绝对分。

**On-policy**：从**待对齐 checkpoint** 采样回复再标，分布与部署策略一致；纯 off-policy 旧模型回复易失效。

## 2 Rubric 设计

多维标准需**显式冲突优先级**，例如：

1. **安全 / 诚实** — 不捏造、承认不确定
2. **准确** — 事实与推理正确
3. **有用** — 完成任务
4. **简洁** — 独立维度，对抗长度偏置

每条附**正反例**与边界案例（calibration session）。与 [[constitutional-ai]] 原则可对齐，但标注界面要可执行。

## 3 质量控

| 机制 | 做法 |
| --- | --- |
| **IAA** | Cohen's κ / Krippendorff's α；生产宜 **80–90%** 一致 |
| **Gold set** | 预标题目测漂移、筛不合格标注员 |
| **Margin filter** | 两回复质量太近 → 低信号，丢弃 |
| **多标注** | 每 pair ≥2 人；分歧过大则丢弃或仲裁 |
| **Pilot** | 先 200–500 条 refine 指南再规模化 |

**质量 > 数量**：数千高一致 pair 常优于数万噪声（InstructGPT / Llama 2 经验）。

## 4 偏置缓解

| 偏置 | 缓解 |
| --- | --- |
| **长度** | rubric 单列简洁；normalize 长度 |
| **位置** | 随机 A/B 顺序 |
| **讨好/风格** | 多样化 prompt 域；含「应拒答」类 |
| **冗长获胜** | 明确「更短且同样正确」优先 |

[[rlhf-bias]] 讲奖励模型结构性偏置；本篇在**数据源头**止血。

## 5 与 DPO / RM 流水线

```mermaid
flowchart LR
  P[Prompt 集] --> S[策略采样 y1 y2]
  S --> H[人类/AI 标注]
  H --> Q[质控过滤]
  Q --> T[DPO / RM 训练]
```

- **DPO**：偏好直接进损失；chosen 质量权重高（文献强调 winning response）
- **迭代 DPO**：每轮选「最有学习价值」pair 再标，优于随机堆量
- **LLM-as-judge**：可扩量，须与 [[llm-as-judge]] rubric 和人工 gold 校准

## 6 与 [[corpus-cleaning]]

SFT 指令数据也要去模板重复、PII、benchmark 泄漏；偏好集另防 **prompt 泄漏** 与 **标注员可猜答案** 的 trivial pair。

## 要点收束

- 偏好数据格式首选 pairwise、on-policy、清晰 rubric 与优先级。
- IAA、gold set、margin filter 是标配质控；宁少勿滥。
- 长度与位置偏置要在指南与 UI 双侧处理。
- 对齐质量上限由标注决定；RM/DPO 只是拟合器。

## 进一步阅读

### 库内关联

- [[rlhf]] — RM + PPO 全流程
- [[dpo]] — 闭式偏好优化
- [[synthetic-data]] — 合成偏好与指令
- [[llm-as-judge]] — 模型辅助标注
- [[red-teaming]] — 安全探针数据

### 外部

- [RLHF Book — Preference Data](https://github.com/natolambert/rlhf-book/blob/main/book/chapters/11-preference-data.md)
- [Annotation-efficient iterative DPO (EMNLP 2024)](https://aclanthology.org/2024.findings-emnlp.382/)
