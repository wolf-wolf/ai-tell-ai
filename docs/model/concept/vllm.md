---
tags:
  - inference
  - serving
aliases:
  - vLLM
  - PagedAttention
prerequisites:
  - "[[llm]]"
  - "[[prefix-cache]]"
  - "[[attention]]"
related:
  - "[[ollama]]"
  - "[[quantization]]"
  - "[[huggingface-transformers]]"
  - "[[prefix-cache]]"
  - "[[agent]]"
stability: mid
layer: model
updated: 2026-06-15
---

# vLLM

> [!tip] 核心本质
> **vLLM**（[vllm-project/vllm](https://github.com/vllm-project/vllm)）是开源 **LLM 高吞吐推理引擎**：**PagedAttention** 把 KV cache 切成块、像 OS 虚拟内存一样按需分配，消除碎片；**continuous batching** 在 iteration 级把新请求塞进已释放的 batch 槽位。没有这两层，多并发 serving 会在 KV 显存上浪费、或等整批完成才接新请求——吞吐上不去。与 [[ollama]] 分工：Ollama 重本机易用；vLLM 重**多卡/高 QPS 生产 serving**，OpenAI 兼容 API，原生吃 [[quantization]] 权重。

适合要把 HuggingFace 权重部署成内网 API、或理解 [[prefix-cache]] 在引擎侧如何实现的读者。

*检索说明：机制对照 [PagedAttention 论文](https://arxiv.org/abs/2309.06180)、[vLLM README](https://github.com/vllm-project/vllm)、[Quantization docs](https://docs.vllm.ai/en/latest/features/quantization/)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：开源 serving 事实标准之一（mid）；与 TGI、SGLang、TensorRT-LLM 并列选型。

**预期寿命**：中期。内核与量化格式快变；PagedAttention + continuous batching 思路会留。

**近期演进**：chunked prefill、prefix caching（对接 [[prefix-cache]]）、speculative decoding、disaggregated prefill/decode、FP8/INT4 多格式。

**终极威胁**：云厂商托管 API 足够便宜；边缘单用户仍用 [[ollama]]。

## 1 核心机制

| 机制 | 解决什么 |
| --- | --- |
| **PagedAttention** | KV cache 非连续块分配 → 更高显存利用率、更大 batch |
| **Continuous batching** | 某请求 decode 结束即换入新请求，不等整批 |
| **Prefix caching** | 跨请求复用相同 prompt 前缀 KV（块级） |
| **Tensor parallel** | 多 GPU 切模型 |

论文报告相对当时 SOTA **2–4× 吞吐**；高并发下 GPU 利用率显著高于静态 batch。

## 2 与 [[prefix-cache]]、[[ollama]]

- **Decode KV**（单请求内）与 **跨请求 prefix cache** 见 [[prefix-cache]]；vLLM Automatic Prefix Caching 实现后者。
- **[[ollama]]**：单用户/小团队、GGUF、`pull` 即用；**vLLM**：HF 权重、集群、高并发 Agent 后端。
- **[[huggingface-transformers]]**：定义模型；vLLM 是**推理 runtime**，非训练。

## 3 使用方式

**离线**：

```python
from vllm import LLM
llm = LLM("meta-llama/Meta-Llama-3-8B-Instruct")
outputs = llm.generate(["Hello"], sampling_params=...)
```

**OpenAI 兼容服务**：

```bash
vllm serve meta-llama/Meta-Llama-3-8B-Instruct --host 0.0.0.0 --port 8000
```

客户端指 `base_url=http://localhost:8000/v1`。与 [[langchain]] / [[langgraph]] 集成常见。

## 4 与 [[quantization]]

vLLM 原生加载 GPTQ/AWQ/GGUF/FP8 等（见 [[quantization]]）；`--quantization awq` 或模型目录内 `config.json` 自动识别。量化 + PagedAttention 是「省显存 + 提吞吐」组合。

## 5 选型简表

| 场景 | 倾向 |
| --- | --- |
| 笔记本试模型 | [[ollama]] |
| 生产多并发 API | **vLLM** / SGLang |
| 最低延迟单用户 | 专用 runtime / 小 batch |
| Agent 高 QPS tool 环 | vLLM + prefix 稳定 system prompt |

## 6 坑

| 坑 | 后果 |
| --- | --- |
| 无 continuous batching 对比 | 低估 vLLM 价值 |
| prefix 每轮变字节 | 缓存不打中 |
| 量化格式与 GPU 代际不匹配 | 内核 fallback 或失败 |
| 与训练框架混用 | vLLM 不训练 |

## 要点收束

- vLLM = PagedAttention + continuous batching 的高吞吐 serving。
- OpenAI 兼容；吃 HF 与量化权重。
- 本机易用 → [[ollama]]；生产并发 → vLLM。
- Prefix 工程见 [[prefix-cache]]；量化见 [[quantization]]。

## 进一步阅读

### 库内

- [[prefix-cache]] — 前缀 KV 复用
- [[quantization]] — INT4/FP8 部署
- [[ollama]] — 本地运行时对比
- [[huggingface-transformers]] — 模型加载层

### 外部

- [vLLM GitHub](https://github.com/vllm-project/vllm)
- [PagedAttention (Kwon et al., 2023)](https://arxiv.org/abs/2309.06180)
