---
tags: [technique, agent-skills]
aliases: [Skill Scripts, 技能脚本, scripts 执行]
related: ["[[skill]]", "[[skill-engineering]]", "[[skill-loading-library]]", "[[tool-use]]", "[[tool-mcp]]", "[[cursor-hooks]]"]
prerequisites: ["[[skill]]"]
stability: mid
layer: application
updated: 2026-05-30
---

# Skill Scripts（技能脚本执行）

> [!tip] 核心本质
> Skill 的 `scripts/` 目录存放**确定性、可重复**的操作逻辑；Agent 在 Execution 阶段按 `SKILL.md` 的指令，通过 **Shell 工具**在子进程中运行这些脚本。参数由模型从任务上下文提取后拼进命令行，返回值经 **stdout / stderr / exit code** 回到对话上下文——没有独立于 Shell 的「Skill 脚本运行时」，模型同时扮演**参数解析器**与**命令组装器**。

## 生命周期与演进

**当前定位**：Execution 层的可选能力。开放标准 [agentskills.io](https://agentskills.io/specification) 约定 `scripts/` 可放 Python、Bash、JavaScript 等，但**如何调用、如何传参由各宿主实现**；Cursor 等主流 IDE Agent 走「SOP + Shell」，Microsoft Agent Framework 等则提供专用 `run_skill_script` 工具。

**预期寿命**：中长期。只要 Agent 仍需把「易漂移的生成」与「可重复的校验/转换」拆开，脚本就会留在 Skill 目录里；脚本本身不进上下文、只在需要时执行，与渐进式披露一致。

**近期演进**：部分宿主增加 frontmatter 占位符（如 `argument-hint`、`$ARGUMENTS`）、脚本执行前人工审批（sandbox + approval gate）；跨平台仍无统一的参数 schema，契约主要靠 `SKILL.md` 里的 CLI 约定。

**终极威胁**：宿主若内置强类型 Skill Tool（自动 JSON Schema 绑定、结构化返回值），手写「模型拼 CLI」的模式会弱化；或模型能力足够强时，简单脚本被内联生成代码替代——复杂、有副作用、需审计的流程仍会保留预置脚本。

## 在渐进式披露中的位置

[[skill]] 三阶段里，脚本只属于 **Execution**：

| 阶段 | 与 `scripts/` 的关系 |
| --- | --- |
| Discovery | 脚本**不**加载、**不**执行 |
| Activation | 模型读 `SKILL.md`，看到「何时跑哪个脚本」的规程 |
| Execution | 按需 Shell 执行；脚本源码默认**不**进上下文（除非模型主动 `Read`） |

```mermaid
flowchart LR
  A["用户任务 + 已激活 SKILL.md"] --> B["模型提取参数"]
  B --> C["拼 Shell 命令"]
  C --> D["子进程运行 scripts/"]
  D --> E["stdout / stderr / exit code"]
  E --> F["Tool result 进入上下文"]
  F --> G["模型按 SOP 继续或重试"]
```

设计动机：**把长文档和确定性逻辑挡在 Activation 之后**——脚本跑 PDF 解析、lint、批处理，比让模型现场写同样逻辑更省 token、更少幻觉。

## 执行机制：谁运行、用什么工具

### Cursor 等 IDE Agent 的典型路径

1. Skill 被激活 → `SKILL.md` 全文在上下文中。
2. 正文写明命令模板，例如：`python scripts/validate.py --path "<path>"`。
3. Agent 调用 **Shell 工具**（终端），在 workspace 或 skill 目录下执行。
4. 宿主捕获命令输出，作为 **tool result** 注入下一轮推理。

要点：

- **没有** Cursor 内置的、与 MCP 同级的 `run_skill_script` 专用工具。
- Skill **不替代** Read / Write / MCP；它规定**何时、为何**调用哪类工具。
- 脚本文件本身通常**不**自动加载——这与「脚本不进 context、只跑结果」一致。

### 与其他机制的对比

| 机制 | 调用方式 | 参数契约 | 返回值 |
| --- | --- | --- | --- |
| **Skill Script（Cursor）** | Shell 子进程 | Markdown + CLI 约定；模型拼参 | stdout / stderr / exit code → 文本进上下文 |
| **MCP Tool** | 宿主解析 schema 后调用 | JSON Schema，结构化 | 宿主序列化为 tool result |
| **Cursor Hooks** | 事件触发（如 `beforeShellExecution`） | JSON stdin/stdout 固定协议 | 可拦截/改写工具调用 |
| **MS Agent Framework** | `run_skill_script` | 可选 `args: dict`，由 `SkillScriptRunner` 转 CLI | Runner 定义（常为 stdout 字符串） |

Hooks 在 `.cursor/hooks/`，管 Agent **事件**；Skill 的 `scripts/` 管 **任务 SOP 里的步骤**——二者不要混为一谈。详见 [[cursor-hooks]]。

## 参数传递：模型提取后再注入

开放标准**未**规定统一的 Skill 入参对象；**可以且应当**让模型先理解任务、提取参数，再写入 Shell 命令。常见模式由简到稳：

### 1. 直接拼 CLI（参数少时）

`SKILL.md` 示例：

```markdown
执行校验：
python scripts/validate.py --path "<target_path>" --strict
```

模型从用户消息、当前打开文件或上一步 Write 结果得到 `target_path`，例如：

```bash
python scripts/validate.py --path "docs/generated/report.md" --strict
```

### 2. 先确认参数再执行（推荐）

在正文中要求**执行前列出**必填/可选字段，减少漏参：

```markdown
执行前确认：
- input：源 PDF 路径（必填）
- output：输出 JSON（默认 fields.json）
- ocr：true / false（扫描件为 true）

确认后执行：
python scripts/extract.py --input "<input>" --output "<output>" --ocr <true|false>
```

与 [[skill-engineering]] 中的 **Grounding（严格接地）** 一致：参数须来自真实上下文，禁止编造路径或 ID。

### 3. 结构化中间文件（参数多、嵌套时）

1. 模型用 Write 生成 `/tmp/batch-config.json` 或 workspace 内配置。
2. 脚本只接受 `--config`：

```bash
python scripts/run_batch.py --config .cursor/tmp/batch-config.json
```

**提取与执行解耦**，避免长命令行转义错误。

### 4. 环境变量与路径前缀

```bash
SKILL_DIR="$HOME/.cursor/skills/my-skill"
"$SKILL_DIR/scripts/helper.sh" deploy staging
```

适合 skill 不在当前 repo、或参数含空格/敏感信息（仍须注意 shell 历史与日志）。

### 5. 管道与重定向

```bash
python scripts/analyze_form.py input.pdf > fields.json
python scripts/validate.py fields.json
"$SKILL_DIR/scripts/api.sh" list | jq '.items[] | {id, status}'
```

上一步 stdout 或文件即下一步输入；模型负责串起管道。

### 参数传递方式速查

| 方式 | 适用 | 注意 |
| --- | --- | --- |
| positional | 单一路径、单一 ID | 顺序易错，优先命名 flag |
| `--flag value` | 多数场景 | 在 SKILL.md 写清每个 flag |
| 环境变量 | 路径前缀、密钥 | 不要假设跨 shell 会话持久 |
| JSON + `--config` | 多字段、嵌套 | 脚本内校验 schema |
| stdin | 小体积文本 | 需在 SOP 中说明如何 pipe |

部分平台（如 Claude Code）支持 frontmatter 占位符；**Cursor 侧以自然语言 SOP + 命令模板为主**，不依赖统一占位符语法。

## 返回值如何与模型对接

对接通道是 **Shell 工具的标准输出**，无单独的类型化绑定层：

```
scripts/*.py|sh
  ├─ stdout  ──→ tool result ──→ 进入对话上下文
  ├─ stderr  ──→ 通常作为错误信息一并可见
  └─ exit code ──→ 0 成功，非 0 失败
```

模型「看到」的可能是：

```text
Exit code: 0

Command output:
OK
```

或：

```text
Validation failed:
- missing section: References
- heading depth > 4 at line 42
```

随后按 `SKILL.md` 的闭环指令行动——典型 **Feedback Loop**：

1. 生成或修改产物  
2. **立即**运行 `python scripts/validate.py …`  
3. 若失败 → 读 stdout → 修正 → 再跑  
4. 通过后才交付用户  

复杂结果可：stdout 输出 JSON；或写文件后再 `Read`；或配合 `jq` 过滤。

### 脚本侧与 SOP 侧的写作建议

**脚本：**

- stdout 人类可读或稳定 JSON；避免仅有 exit code 无解释  
- 错误信息 **actionable**（指出字段、行号、缺什么）  
- 缺参/非法值：打印用法 + non-zero exit  

**SKILL.md：**

- 写清「Returns: …」语义（如 `OK` 或冲突列表）  
- 规定失败时是否允许重试、最多几次  
- 要求引用**上一步真实 tool output**，再决定下一步（防假装已跑脚本）

## 实践模式示例

### 校验闭环（document / config）

```text
my-skill/
├── SKILL.md
└── scripts/
    └── validate.py
```

`SKILL.md` 片段：

```markdown
1. 将草稿写入 `docs/out.md`
2. 运行：`python scripts/validate.py docs/out.md`
3. 若非 0：根据 stdout 修改 `docs/out.md`，回到步骤 2
4. 为 0 后，向用户交付
```

### 提取 + 转换 + 落盘

```markdown
1. 从用户指定路径读取 PDF（缺参则询问）
2. `python scripts/extract.py --input "<pdf>" --output "tmp/fields.json"`
3. 读 `tmp/fields.json`，按 reference.md 生成报告
```

### 封装 API（隐藏密钥与 curl 细节）

`scripts/deploy.sh` 内读 `.env` 或环境变量；SOP 只写：

```bash
./scripts/deploy.sh --env staging --version 1.2.0
```

模型只提取 `staging` 与 `1.2.0`，不碰 token 字面量。

## 常见误区

| 误区 | 事实 |
| --- | --- |
| 「Skill 会自动执行 scripts/」 | 需模型按 SOP 主动调 Shell；未写进 SKILL.md 的脚本不会被跑 |
| 「脚本会进模型上下文」 | 默认不读源码；只有执行结果回到上下文 |
| 「有统一的 Skill 参数 API」 | 无；靠 CLI 约定 + 模型拼命令（除非宿主提供专用 Tool） |
| 「和 MCP 重复了」 | MCP 供**实时外部系统**；脚本供**本地确定性步骤** |
| 「和 Hooks 一样」 | Hooks 是事件拦截；Skill scripts 是任务步骤 |

## 进一步阅读

- [[skill]] — Skill 总览与渐进式披露三阶段
- [[skill-engineering]] — Grounding、自检闭环、防御性指令
- [[skill-loading-library]] — Execution 与 Discovery / Activation 的边界
- [[tool-use]] — Agent 工具调用的一般机制
- [Agent Skills Specification — scripts/](https://agentskills.io/specification) — 开放标准对 `scripts/` 的约定
- [Microsoft Agent Framework — Script execution](https://devblogs.microsoft.com/agent-framework/whats-new-in-agent-skills-code-skills-script-execution-and-approval-for-python/) — 专用 `run_skill_script` 与 `SkillScriptRunner` 对照参考
