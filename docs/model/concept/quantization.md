---
tags:
  - inference
  - deployment
aliases:
  - Quantization
  - 模型量化
  - GPTQ
  - AWQ
  - INT4
prerequisites:
  - "[[llm]]"
  - "[[transformer]]"
related:
  - "[[vllm]]"
  - "[[ollama]]"
  - "[[prefix-cache]]"
  - "[[lora-peft]]"
  - "[[huggingface-transformers]]"
stability: mid
layer: model
updated: 2026-06-15
---

# 模型量化（Quantization）

> [!tip] 核心本质
> **模型量化**把权重（有时含激活）从 FP16/BF16 **压到低比特**（INT8、INT4、FP8 等），换 **显存↓、吞吐↑**，代价是校准复杂度与可能的精度损失。部署侧常见 **W4A16**（4bit 权重、16bit 激活）：GPTQ、AWQ 等离线量化 + [[vllm]] / [[ollama]] GGUF 加载。不是 [[lora-peft|LoRA]] 那种「训适配器」——量化改的是**已训权重表示**，推理引擎要有对应 kernel（Marlin 等）。

选型要问：谁量化（离线 vs 在线）、什么 scheme（W4A16/W8A8）、校准数据是否像生产分布。

*检索说明：格式与 vLLM 支持对照 [vLLM Quantization](https://docs.vllm.ai/en/latest/features/quantization/)、[llm-compressor W4A16 示例](https://github.com/vllm-project/llm-compressor)；AutoAWQ 已迁入 llm-compressor（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：生产部署必备知识（mid）；与 [[vllm]]、[[ollama]] 绑定紧。

**预期寿命**：中期。新格式（FP8、NVFP4、MXFP4）迭代快；「大模型要压才能上卡」长期成立。

**近期演进**：**llm-compressor** 统一 GPTQ/AWQ/INT8/FP8；Marlin 内核加速 W4A16；量化 KV cache 独立话题。

**终极威胁**：原生 FP4 训练权重 + 硬件原生支持使「后量化」步骤变少；校准与格式兼容仍要工程。

## 1 常见 scheme

| Scheme | 含义 | 典型用途 |
| --- | --- | --- |
| **W4A16** | 4bit 权、16bit 激活 | 消费级 GPU 跑 7B–70B |
| **W8A8 / FP8** | 8bit 权+激活 | Hopper/Ada 高吞吐 |
| **GGUF Q4_K_M** | llama.cpp 系打包 | [[ollama]] `pull` |
| **GPTQ / AWQ** | 离线权重量化算法 | HF 上 `*-GPTQ`/`*-AWQ` 模型 |

**Activation quantization** 比权重量化更敏感；多数开源部署先 **W4A16**。

## 2 离线量化流程（GPTQ 例）

1. 选基座 HF 模型 + **校准集**（最好接近部署域；微调模型可用训练样本子集）
2. **llm-compressor** `oneshot` + `GPTQModifier(scheme="W4A16")`
3. `save_pretrained(..., save_compressed=True)`
4. [[vllm]] `LLM("./quantized-dir")` 或 `vllm serve`

```python
from llmcompressor import oneshot
from llmcompressor.modifiers.quantization import GPTQModifier

recipe = GPTQModifier(targets="Linear", scheme="W4A16", ignore=["lm_head"])
oneshot(model=model, dataset=calib_ds, recipe=recipe)
```

校准差 → 某任务掉点；应用 **lm_eval** 在目标 task 上回归（注意 `add_bos_token` 等细节）。

## 3 与 runtime 分工

| Runtime | 量化入口 |
| --- | --- |
| **[[vllm]]** | GPTQ/AWQ/GGUF/FP8/bitsandbytes；GPU 代际见官方兼容表 |
| **[[ollama]]** | Modelfile / 现成 GGUF；偏本地 Q4/Q8 |
| **Transformers** | `load_in_4bit` bitsandbytes；开发调试多 |

生产高 QPS：**离线 GPTQ/AWQ + vLLM Marlin** 常见组合。

## 4 何时量化 / 不量化

| 量化 | 不量化 |
| --- | --- |
| 显存不够 FP16 | 任务极敏感、无回归 budget |
| 要降 $/token | 有足量 H100 且延迟已达标 |
| 边缘/单卡部署 | 还在频繁改权重（用 [[lora-peft]] 先） |

量化与 **RAG/Agent** 正交：压模型不替 domain eval（[[llm-benchmarks]]）。

## 5 坑

| 坑 | 后果 |
| --- | --- |
| 校准集与生产脱节 | 特定任务崩 |
| 忽略 `lm_head` 等层 ignore 惯例 | 不必要的质量损失 |
| GPU SM < 8.0 跑 W4A16 Marlin | 不支持或慢 |
| 混用 AutoAWQ 旧库 | 应迁 **llm-compressor** |
| 只看体积不看吞吐 | Q4 不一定比 FP8 快 |

## 要点收束

- 量化 = 低比特权重/激活换显存与吞吐；GPTQ/AWQ + W4A16 是 2026 常见部署路径。
- 校准数据要贴近生产；用 task eval 验证。
- [[vllm]] Serving + llm-compressor 量化是配套栈。
- [[ollama]] 走 GGUF；训练适配见 [[lora-peft]]。

## 进一步阅读

### 库内

- [[vllm]] — Serving 与量化加载
- [[ollama]] — GGUF 本地
- [[prefix-cache]] — 与 KV 量化不同层
- [[lora-peft]] — 微调 vs 量化

### 外部

- [vLLM Quantization](https://docs.vllm.ai/en/latest/features/quantization/)
- [llm-compressor](https://github.com/vllm-project/llm-compressor)
