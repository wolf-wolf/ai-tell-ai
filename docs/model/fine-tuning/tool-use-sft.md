---
tags:
  - fine-tuning
  - tool
aliases:
  - Tool-use SFT
  - 工具调用微调
  - Function Calling SFT
prerequisites:
  - "[[sft]]"
  - "[[function-calling]]"
  - "[[tool-use]]"
  - "[[lora-peft]]"
related:
  - "[[writing-tools-for-agents]]"
  - "[[agent-evaluation]]"
  - "[[agentic-rl]]"
  - "[[structured-json-output]]"
stability: mid
layer: model
updated: 2026-06-15
---

# Tool-use SFT（工具调用微调）

> [!tip] 核心本质
> **Tool-use SFT** 在 [[sft]] 框架下，用「用户 query → **正确 tool call**（+ 可选 tool result → 最终回复）」多轮对话数据微调模型，使 [[function-calling]] **稳定、可解析**——不靠每次在 prompt 里堆长 few-shot。关键是 **loss masking**：只对 **assistant** 生成 token（含 tool_calls JSON）算 loss；user/system/**tool 输出** 标 `-100`，否则模型学「复述用户/抄 tool 返回」而非「何时调何工具」。

适合固定工具集、高 QPS、小模型要降延迟的场景。API 原生 tool 的 frontier 模型常可 prompt-only；开源 7B–32B 微调 ROI 高。

*检索说明：loss masking 与数据格式对照 [Microsoft SLM function-calling guide](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/fine-tuning-small-language-models-for-function-calling-a-comprehensive-guide/4362539)、TRL/SFTTrainer `assistant_only_loss` 实践、Berkeley Function Calling Leaderboard（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：[[function-calling]] 的工程延伸；与 [[agentic-rl]]（RL 优化轨迹）分工：SFT 先教会格式与常见模式。

**预期寿命**：mid。Tool schema 标准（OpenAI/Anthropic）变；「mask assistant only」不变。

**近期演进**：`apply_chat_template` + `return_assistant_tokens_mask`；glaive-function-calling 等公开数据集；[[lora-peft]] 降成本。

**终极威胁**：强 base 零样本 tool 足够；极复杂工具环仍要 RL 或 Agent 数据飞轮。

## 1 数据形态

每条样本典型结构（OpenAI chat 兼容）：

1. **system** — 角色 + tools JSON schema（或模板注入）
2. **user** — 任务
3. **assistant** — `tool_calls` 或 `<tool_call>` 块
4. **tool** — 执行结果（可选，多轮）
5. **assistant** — 最终自然语言答案

覆盖：

- 单工具 / 多工具 / 多轮
- **负样本**：不应调 tool 时直接回答
- 参数边界（enum、required、类型）

规模：**500+**  diverse 例常作起点；按 tool_eval 迭代增。

## 2 Loss masking（必做）

| Token 来源 | labels |
| --- | --- |
| system / user | **-100** |
| tool role 内容 | **-100**（外部事实，非生成目标） |
| assistant（含 tool_calls） | **正常 CE loss** |
| padding | **-100** |

TRL：`SFTTrainer(..., assistant_only_loss=True)` 或 `response_template` / chat template mask。

**不 mask 的后果**：loss 下降但 tool P/R 不涨——模型背 prompt 结构。

## 3 训练配置要点

| 项 | 建议 |
| --- | --- |
| 基座 | 已支持 chat + tools 的 instruct 模型 |
| 方法 | [[lora-peft]] / QLoRA 多数够用 |
| 模板 | 与**部署时同一** `chat_template` |
| Schema | 与生产 tools 定义 **字节级一致** |
| 长度 | 截断或 drop 超长；tool 定义占 token 大 |

数据可：人工 trace、强模型蒸馏、日志清洗（去 PII）。

## 4 评测（不止 perplexity）

| 指标 | 含义 |
| --- | --- |
| Tool **precision/recall** | 该调是否调、不该调是否不调 |
| **Argument** exact match | 参数 JSON 对不对 |
| Hallucination rate | 调不存在的 function |
| 端到端任务 | [[agent-evaluation]] |

Berkeley **BFCL** 等 leaderboard 作横向参考；**必须**有域内 holdout。

## 5 与 prompt / RL 分工

| 手段 | 何时 |
| --- | --- |
| Prompt + API tool | Frontier、工具少、迭代快 |
| **Tool-use SFT** | 小模型、固定 schema、要稳定 |
| [[agentic-rl]] | SFT 后仍策略/探索不足 |
| [[writing-tools-for-agents]] | schema 设计（训前） |

## 6 常见坑

| 坑 | 后果 |
| --- | --- |
| 全序列 loss | 假收敛 |
| 训练/推理 template 不一致 | 部署崩 |
| 只有正例 tool call | 过度调用 |
| tool 输出进 loss | 抄 JSON |
| 无「不调 tool」样本 | 万物皆 tool |

## 要点收束

- Tool-use SFT = 多轮 tool 对话 + **assistant-only loss**。
- 数据覆盖正负例与参数变体；500+ 起。
- 评 tool P/R 与参数 match，不只 loss。
- 后续可接 [[agentic-rl]]；schema 见 [[function-calling]]。

## 进一步阅读

### 库内

- [[function-calling]] — 协议与 schema
- [[sft]] — 监督微调基线
- [[lora-peft]] — 高效微调
- [[writing-tools-for-agents]] — 工具描述怎么写
- [[agent-evaluation]] — 轨迹指标

### 外部

- [Microsoft — SLM function-calling fine-tuning](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/fine-tuning-small-language-models-for-function-calling-a-comprehensive-guide/4362539)
- [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html)
