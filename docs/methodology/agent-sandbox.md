---
tags:
  - security
  - harness
aliases:
  - Agent 沙箱
  - Agent Sandbox
  - 代码沙箱
prerequisites:
  - "[[agent]]"
  - "[[tool-use]]"
  - "[[prompt-injection]]"
related:
  - "[[harness-engineering]]"
  - "[[mcp-code-execution]]"
  - "[[cursor-hooks]]"
  - "[[writing-tools-for-agents]]"
stability: mid
layer: methodology
updated: 2026-06-15
---

# Agent 沙箱（Agent Sandbox）

> [!tip] 核心本质
> **Agent 沙箱**是在与宿主隔离的环境中执行 Agent 生成代码或 shell 的 runtime——Firecracker microVM、容器+gVisor、或托管云沙箱（如 E2B）。没有隔离，[[tool-use]] 里一行 `rm -rf` 或 exfil API 调用直接打在开发者机器或生产 VPC 上；[[prompt-injection]] 成功即等于远程代码执行。沙箱与 [[prompt-injection#3 Agents Rule of Two|Rule of Two]] 并列：限制「不可信输入 × 敏感数据 × 外部写操作」的同时，仍要给 Agent **可验证的 compute**。

适合启用代码执行、Computer Use、[[mcp-code-execution]] 的团队。读完能选型隔离层级并与 Harness 权限对齐。

*检索说明：对照 [E2B 文档](https://e2b.dev/docs)、[amux Agent Sandboxing 2026](https://amux.io/guides/ai-agent-sandboxing/)、[Meta Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/)（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：Agent 工程 **P2→P1 上升**——OpenAI/Cursor/Claude 等默认强调 sandbox；E2B、Modal、Daytona 成托管选项。

**预期寿命**：中期。隔离技术与 API 变；「不可信代码必须出宿主」不变。

**近期演进**：sub-200ms Firecracker 启动；BYOC/自托管 E2B；OpenAI Agents SDK 内置 sandbox 集成（Blaxel、E2B、Modal 等）。

**终极威胁**：纯 API 工具无代码执行时沙箱需求降；但 MCP+代码编排仍要隔离。

## 1 威胁模型

| 来源 | 风险 |
| --- | --- |
| LLM 生成代码 | 任意 shell、读写文件、网络 |
| 被注入指令 | 读 `.env`、外传数据 |
| 供应链工具 | 恶意 MCP server 返回 |

沙箱目标：**即使 Agent 被劫持，爆炸半径限于 VM/容器生命周期**。

## 2 隔离技术谱系

| 技术 | 隔离 | 启动 | 典型用途 |
| --- | --- | --- | --- |
| **Firecracker microVM** | 独立 guest kernel | ~100–200ms | E2B、Lambda、Fly Machines |
| **Docker 容器** | 共享 kernel | 秒级 | 内网 dev；需加固 |
| **gVisor** | 用户态 kernel | ~1s | 强 syscall 拦截 |
| **WASM** | 语言沙箱 | 极快 | 窄能力、无完整 Linux |

生产 Agent **不可信代码**：优先 **microVM 托管**（E2B 等）或自托管 Firecracker；勿裸 Docker 跑用户会话。

## 3 E2B 模式（代表）

[E2B](https://github.com/e2b-dev/E2B)：API 创建 Sandbox → 上传文件 → `commands.run` / `runCode` → 销毁。每 session 一 VM，Manus/Perplexity 类 workload 可并行百万 session。

与 [[mcp-code-execution]]：MCP 编排逻辑可在沙箱内 import 工具 wrapper，中间结果不出 VM。

## 4 Harness 集成

1. **默认 deny**：无沙箱不开 shell 工具
2. **网络 egress 白名单**：沙箱内仅允许必要域名
3. **密钥**：永不进沙箱 FS；用短期 token 代理
4. **[[cursor-hooks]] / PreToolUse**：写操作二次确认
5. **生命周期**：session 结束销毁 VM；长会话注意 state 与成本

与 [[harness-engineering]] 四抉择：沙箱是**边界**的具体实现之一。

## 5 选型简表

| 场景 | 倾向 |
| --- | --- |
| 快速集成、多语言代码 | E2B / 同类托管 |
| 合规 BYOC | E2B self-host / 私有 Firecracker |
| 仅静态工具 API | 无沙箱 + 最小权限 API token |
| 桌面 Computer Use | 专用 Desktop Sandbox + 网络隔离 |

## 要点收束

- Agent 沙箱 = 不可信代码与宿主的硬件/VM 级隔离。
- Firecracker/E2B 是 2026 主流托管路径；裸容器不够强。
- 与 Rule of Two、最小权限、Hooks 组合，不单靠沙箱。
- [[mcp-code-execution]] 应默认假设代码在沙箱内跑。

## 进一步阅读

### 库内

- [[prompt-injection]] — Rule of Two
- [[harness-engineering]] — 边界与门禁
- [[mcp-code-execution]] — 沙箱内编排 MCP
- [[tool-use]] — 执行架构

### 外部

- [E2B](https://e2b.dev/docs)
- [AI Agent Sandboxing Compared 2026](https://amux.io/guides/ai-agent-sandboxing/)
