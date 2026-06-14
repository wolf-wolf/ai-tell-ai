---
tags:
  - technique
aliases:
  - Function Calling
  - 函数调用
  - tool calling
prerequisites:
  - "[[tool-use]]"
  - "[[llm]]"
related:
  - "[[agent]]"
  - "[[reAct]]"
  - "[[tool-use]]"
  - "[[tool-mcp]]"
  - "[[structured-json-output]]"
stability: long
layer: application
updated: 2026-06-14
---

# Function Calling（函数调用）

> [!tip] 核心本质
> 函数调用（Function Calling）是模型与外部工具之间的结构化协议：模型输出「调哪个函数、传什么参数」的 JSON，运行时（Runtime）负责真正执行并回传结果。模型本身不能发 HTTP 请求；若没有这层标准接口，工具使用（Tool Use）只能依赖脆弱的正则解析，多工具场景下几乎无法稳定落地。

适合已读 [[tool-use]] 与 [[llm]]、要**实现或调试** Agent 工具链的读者。读完 [[#2 工作机制|§2]] 能复述 schema → 意图 → 执行 → **按厂商格式回写**；[[#3.2 strict 与结构化参数|§3.2]] 与 [[#2.4 tool_choice 与并行调用|§2.4]] 覆盖生产可靠性；[[#6 实践：订票四轮|§6]] 够支撑首轮 schema 设计。

*（核对 [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling)、[OpenAI Tools](https://developers.openai.com/api/docs/guides/tools)、[Anthropic Tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)、[Strict tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/strict-tool-use)；观测日期 2026-06-14。）*

## 生命周期与演进

**当前定位**：工具使用 / Agent 循环的底层实现；OpenAI、Anthropic 等 API 的标配能力（OpenAI 文档中常称 **tool calling**，与 function calling 同指自定义工具）。

**预期寿命**：长期；schema 形态与并行调用语义会随厂商迭代。

**近期演进**：工具供给层与 [[tool-mcp]] 对齐（OpenAI Responses 可接托管 MCP server）；单轮多工具并行；**工具参数流式**（OpenAI 流式 `tool_calls` delta；Anthropic [fine-grained tool streaming](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/fine-grained-tool-streaming)）；OpenAI **`tool_search`**（**gpt-5.4 及更新**）按需加载工具定义；Claude **`strict: true`** 工具与 `output_config.format` 结构化输出 GA。

**终极威胁**：统一 Agent 协议吞没厂商差异后，Function Calling 退为传输层细节；但 schema 设计、Runtime 校验与消息回传格式仍属工程核心。

## 1 问题从哪来

[[tool-use|工具使用（Tool Use）]] 首先要回答：模型怎么告诉系统「我现在要用工具」？

最朴素的方案是让模型在文本里说——「我需要调用 search(query='今天天气')」，再用正则解析。这很脆弱：输出格式不稳定、解析易崩、各工具格式不统一，且模型未被专门训练做这件事。

可靠机制需要两件事：模型能精确表达「调用哪个函数、传什么参数」；外部系统能稳定解析该意图。定义结构化 JSON 输出，并在训练里教会模型何时、如何产出——这就是函数调用（Function Calling）的设计。

## 2 工作机制

### 2.1 三步流程

**图 1 — 函数调用：schema 定义 → 模型意图 → Runtime 执行**

```mermaid
flowchart LR
    A["开发者定义函数 schema<br/>（名称 / 参数 / 描述）"] -->|"随 prompt 传入"| B["LLM 决策<br/>是否调用、调用哪个、传参"]
    B -->|"输出结构化 JSON"| C["Runtime 执行函数<br/>拿到真实结果"]
    C -->|"按协议回写消息"| B
```

关键在第二步：模型不是「调用」函数，而是输出调用意图的 JSON。真正执行与**把结果按对话格式塞回**都属于 Runtime。

### 2.2 schema 与调用意图

OpenAI 自定义工具示例（`type: function`）：

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "获取指定城市的当前天气",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string",
          "description": "城市名称，如「北京」"
        }
      },
      "required": ["city"],
      "additionalProperties": false
    }
  }
}
```

模型决定调用时，OpenAI 在 `tool_calls[].function.arguments` 中返回 JSON 字符串，例如 `{"city":"北京"}`。Anthropic 则在 `tool_use` 块的 `input` 对象中返回同等语义的结构化字段。

**表 1 — 主流厂商 schema 字段对照（实现时要翻译）**

| 厂商 | 工具定义 | 模型侧调用块 | strict |
| --- | --- | --- | --- |
| OpenAI | `function.name` / `description` / `parameters` | `tool_calls[]`：`id`、`function.name`、`function.arguments` | `function.strict: true`（推荐） |
| Anthropic | `name` / `description` / `input_schema` | `tool_use`：`id`、`name`、`input` | 工具顶层的 `strict: true` |

同一业务工具若要多模型复用，通常维护一份 canonical schema，再在各 API 适配层映射——或经 [[tool-mcp]] server 统一暴露、宿主翻译为当前模型格式。

### 2.3 多轮消息回传

一轮调用结束后，必须把**完整对话历史 + 工具结果**再发给模型；各厂商对消息角色与块类型要求不同，但逻辑一致：**每个调用意图都有唯一 id，结果必须挂到该 id 上**。

**OpenAI（Chat Completions / Responses）**

1. 模型返回 `assistant` 消息，含 `tool_calls` 数组（每项有 `id`、函数名、参数 JSON 字符串）。
2. Runtime 执行后，为每个 `id` 追加一条 `role: tool` 消息，`tool_call_id` 对应、`content` 为结果字符串（失败时写可读错误，勿抛未捕获异常中断循环）。
3. 再次请求模型，直至不再返回 `tool_calls` 而只返回自然语言。

**Anthropic（Messages API）**

1. 模型返回 `stop_reason: tool_use`，`content` 含 `tool_use` 块（`id`、`name`、`input`）。
2. Runtime 执行后，发 **`role: user`** 消息，`content` 以 `tool_result` 块为主：每块含 `tool_use_id`、`content`；失败时设 `is_error: true`。
3. 格式约束：`tool_result` 须**紧接**对应 assistant 消息；同一 user 消息里 **`tool_result` 块须排在任何文本块之前**（见 [Handle tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use)）。

并行调用：一次响应可含多个 `tool_call` / `tool_use`；Runtime 可并发执行，回写时**逐个 id 对齐**。

### 2.4 tool_choice 与并行调用

OpenAI `tool_choice` 控制模型**本轮是否必须调用工具**（Anthropic 有等价控制，名称见各 SDK）：

**表 2 — tool_choice 常见模式（OpenAI）**

| 模式 | 行为 | 典型用途 |
| --- | --- | --- |
| `auto`（默认） | 0 次或多次调用 | 通用 Agent |
| `required` | 至少 1 次调用 | 强制 grounding（易过度调用） |
| `none` | 禁止工具 | 纯对话轮 |
| `{"type":"function","function":{"name":"…"}}` | 指定函数 | 调试、固定步骤 |

`parallel_tool_calls`（OpenAI，默认 `true`）：允许单轮多个工具；设为 `false` 则每轮 **0 或 1** 次。有依赖的工具链（先查 id 再下单）应拆轮、Runtime 串行，或显式关闭并行。

「零次 tool call = 任务完成」是正常退出信号；误设 `required` 会导致无法直接回复用户（见 [[#6 实践：订票四轮|§6]]）。

### 2.5 流式与 tool_search

**参数流式**：开启 API 流式时，工具参数常以 delta 到达（OpenAI `tool_calls` 片段；Anthropic `input_json_delta` / fine-grained streaming）。Runtime 需缓冲拼接后再 `JSON.parse`，或边收边展示；未收完前勿执行。

**tool_search（OpenAI）**：工具很多时，可在 `tools` 中加入内置 `tool_search`，让模型**先搜索再加载**相关 function 定义（仅 **gpt-5.4 及更新** 模型）。与 [[tool-mcp]] 动态 `tools/list`、按任务挂载子集是同一类「渐进暴露」策略。

## 3 与 Prompt 约束 JSON 的对比

直接在 prompt 里要求「输出 JSON 格式」可行，但不可靠。

### 3.1 对比表

**表 3 — 函数调用 vs Prompt 约束 JSON**

| 对比 | Function Calling | Prompt 要求输出 JSON |
| --- | --- | --- |
| 模型训练 | 专门训练过该任务 | 依赖通用指令跟随 |
| 格式稳定性 | 高；可叠加 strict | 低，易非法 JSON 或缺字段 |
| 多函数选择 | 模型可自主选择 | 需额外逻辑 |
| 不调用时的行为 | 知悉「本次不必调用」 | 易强行输出 JSON |

### 3.2 strict 与结构化参数

生产环境应对工具参数开启 **strict / 结构化输出（Structured Outputs）**——在解码阶段约束 token，使 `arguments` / `input` 符合 JSON Schema。

| 厂商 | 启用方式 | 常见 schema 要求 |
| --- | --- | --- |
| OpenAI | `function.strict: true` | 各层 object：`additionalProperties: false`；`properties` 全进 `required` |
| Anthropic | 工具定义顶层 `"strict": true` | 同上（见 [Strict tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/strict-tool-use)） |

OpenAI **Responses API** 对 tools 会尽量 normalize 为 strict；**Chat Completions** 默认 non-strict，需显式 `strict: true`。strict 与并行在部分旧文档/组合中曾建议互斥；**以当前模型 + API 文档为准**（gpt-5 系多数支持 strict 并行，见 [[structured-json-output]] 与官方 changelog）。

用户最终回复的 JSON（`output_config.format` / `response_format`）与工具参数 strict 是**两条通道**，可分别配置。

## 4 能力边界

能做的：可靠触发工具调用；单轮并行（API 允许时）；`auto` 下判断要不要调用；strict 提高参数**结构**合法率；通过 `tool_search` / MCP 渐进暴露大工具库。

做不到的：执行函数（Runtime 职责）；保证选对函数（schema 含糊则易错）；**语义正确**（JSON 合法但值错误）；失败后的重试规划（Agent 层，但 Runtime 须如实回传错误）。

**托管 / 内置工具**（OpenAI 网页搜索、代码执行等；Anthropic 部分 server-side tools）：由**平台**执行，响应里可能已是完整答案或 server 处理过的 tool 块——勿与「自定义 function + 自建 Runtime 回写」混用同一套循环逻辑。

**托管 MCP（OpenAI Tools）**：在 Responses 等 API 中配置远程 MCP server URL，平台参与连接与工具暴露；自定义函数仍走 schema → 本地/远程执行 → tool result。供给层见 [[tool-mcp]]。

## 5 工具面规模

函数定义占 prompt token，且工具越多选型越难。OpenAI 建议：**每轮 initially 暴露的工具宜约 20 个以内**（软建议，须在自己数据上评测）。更大库应：按任务挂载子集、分命名空间、`tool_search`（gpt-5.4+）或 MCP `tools/list` 动态发现——而非一次性塞满 schema。权限最小化见 [[tool-use]]。

## 6 实践：订票四轮

用户问「帮我订明天北京到上海最便宜的机票」，系统定义 `search_flights` 与 `book_ticket`。

**表 4 — 四轮函数调用示例（示意）**

| 轮次 | 模型输出 | Runtime 执行 | 结果 |
| --- | --- | --- | --- |
| 1 | 调用 `search_flights(...)` | 查询 API | 12 个航班 |
| 2 | 再调 `search_flights` 加 `sort_by='price'` | 再查询 | 最低价 420 元 |
| 3 | 调用 `book_ticket(flight_id='CA1234', ...)` | 下单 | 订单确认 |
| 4 | 直接回复「已订成功…」 | 无 tool call | 完成 |

第 4 轮在 `tool_choice: auto` 下不再发起调用。第 3 步若 API 失败，Runtime 须把错误写入 tool result（Anthropic `is_error: true`），供下一轮改参或告知用户。

## 7 常见误区

### 7.1 概念分层

函数调用 = 模型侧协议；工具使用 = 设计理念；MCP = server 侧供给。宿主把 MCP 工具**翻译**为当前模型的 function schema。详见 [[tool-mcp]]。

### 7.2 schema 与工程风险

**表 5 — 常见工程风险与应对**

| 风险 | 表现 | 应对 |
| --- | --- | --- |
| 函数描述歧义 | 调错函数 | description 写清何时用/不用 |
| 参数幻觉 | 非法 enum / 缺字段 | strict + Runtime 校验 |
| 并行顺序依赖 | 同时调有依赖的工具 | `parallel_tool_calls: false` 或拆轮 |
| id 对不上 | 结果挂错调用 | 严格对齐 `tool_call_id` / `tool_use_id` |
| 工具过多 | 选型差、token 涨 | 子集 / tool_search / MCP；见 [[#5 工具面规模|§5]] |
| 吞掉执行错误 | 模型胡编成功 | 错误进 tool result，不 silent fail |
| 无限循环 | 反复同一调用 | `max_steps`；检测重复 action |

## 要点收束

- 函数调用 = 意图 JSON；Runtime 执行并按 **id** 回写 tool result，再请求模型。
- OpenAI 与 Anthropic 消息格式不同；strict 强烈推荐；Responses 与 Chat Completions 默认值不同。
- `tool_choice` / `parallel_tool_calls` / 流式参数 / `tool_search` 直接影响可靠性与延迟。
- 大工具库渐进暴露；MCP 与 FC 分层见 [[tool-mcp]]。
- 零次 tool call 通常是正常完成，不是异常。

## 进一步阅读

### 库内关联

- [[tool-use]] — 工具使用设计、并行与权限
- [[tool-mcp]] — MCP 与函数调用的分层、托管 MCP
- [[structured-json-output]] — strict、schema 子集、API 差异
- [[agent]] — Agent 循环里工具调用如何嵌入 Runtime
- [[reAct]] — ReAct 中 Act 步骤的底层机制

### 外部参考

- [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling) — strict、parallel、`tool_choice`、tool_search
- [OpenAI Tools（含 MCP）](https://developers.openai.com/api/docs/guides/tools) — 内置工具与托管 MCP
- [Anthropic Tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) — 生命周期与 `input_schema`
- [Anthropic Strict tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/strict-tool-use) — `strict: true` 与 grammar 约束
- [Anthropic Fine-grained tool streaming](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/fine-grained-tool-streaming) — 参数流式
