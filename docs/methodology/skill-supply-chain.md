---
tags:
  - security
  - skill
  - mcp
aliases:
  - Skill 供应链安全
  - Skill Supply Chain
  - ClawHub 安全
  - MCP 供应链
prerequisites:
  - "[[skill]]"
  - "[[skill-governance]]"
  - "[[prompt-injection]]"
  - "[[tool-mcp]]"
related:
  - "[[openclaw]]"
  - "[[cursor-hooks]]"
  - "[[agent-sandbox]]"
  - "[[red-teaming]]"
  - "[[harness-engineering]]"
stability: mid
layer: methodology
updated: 2026-06-15
---

# Skill / MCP 供应链安全

> [!tip] 核心本质
> **Skill 与 MCP 供应链攻击**把恶意能力包成「有用插件」——`SKILL.md`、MCP server、ClawHub 技能在 **Discovery 时进入 Agent 上下文**，可夹带**间接 [[prompt-injection]]**、文档内嵌 `curl|bash`、或改 registry 指向恶意 npm 源。不是传统 PyPI 依赖声明，而是 **「Markdown 即安装说明 + 语义文档」** 双用：人信文档、Agent 也读。2026 ClawHub 事件（数百至千级恶意 skill）说明：**开放市场 + 自动加载 = 软件供应链 2.0**。

与 [[skill-governance]] 分工：治理讲团队发布流程；本篇讲**第三方/市场威胁模型与防线**。

*检索说明：ClawHub/ClawHavoc 对照 [Acronis/JustAppSec 2026-04](https://justappsec.com/news/2026-04-ai-platforms-indirect-prompt-injection-malware)、[Trail of Bits marketplace bypass](https://cyberpress.org/malicious-skill-detector-bypassed/)、[Cisco skill-scanner](https://github.com/cisco-ai-defense/skill-scanner)；与 [[prompt-injection]] 交叉核对（观测 2026-06-15）。*

## 生命周期与演进

**当前定位**：Agent Skills 开放标准（agentskills.io）与 [[openclaw]] ClawHub 爆发后的 **P2 必修**；MCP 同理（暴露无鉴权 server、投毒 repo config）。

**预期寿命**：中期。市场扫描、签名、组织私有 registry 会成熟；零信任「外来 skill = 外来代码」长期成立。

**近期演进**：VirusTotal/Cisco/Vercel skills.sh 扫描器；攻击者 bypass（文件 truncation、企业话术包裹 `.npmrc`）；NIST CAISI agent hijacking 研究。

**终极威胁**：平台强制签名 + 仅组织内源；个人仍 sideload。

## 1 攻击面

| 向量 | 机制 |
| --- | --- |
| **SKILL.md 注入** | 隐藏指令进 agent context →  exfil、越权 tool |
| **文档内安装步骤** | 「运行 setup.sh」→ 二阶段 payload |
| **恶意 scripts/** | [[skill-scripts]] 直接执行 |
| **MCP server 投毒** | 恶意 tool 定义、回传数据 |
| **Repo 配置投毒** | `.claude/settings`、MCP json 诱导 Agent |
| **Typosquat** | 仿 popular skill 名 |

与 [[prompt-injection]]：**注入是机制，供应链是分发**。

## 2 ClawHub 类事件（代表）

2026 初：**ClawHub**（[[openclaw]] skill 市场）审计发现大量恶意 skill — 比例可达 marketplace 显著份额；手法含编码命令、密码压缩包、HF 作 staging。Scanner（ClawHub GPT guard、Cisco skill-scanner）可被 **truncation、prompt 型 social engineering** bypass。

教训：**扫描 ≠ 安全**；生产环境勿默认信任公共市场。

## 3 防御分层

```mermaid
flowchart TB
  SRC[来源] --> PIN[Pin 版本 + 哈希]
  PIN --> SCAN[静态/LLM 扫描]
  SCAN --> GOV[[skill-governance]] 审批
  GOV --> RUN[最小权限运行]
  RUN --> HOOK[[cursor-hooks]] 门禁]
```

1. **Treat as untrusted code** — 公共 market = 不可信；仅组织 curated 列表
2. **Pin & provenance** — 锁定 commit/版本；记录来源与审计人
3. **扫描** — Cisco skill-scanner、ClawSec 等；知悉 bypass 限界
4. **[[skill-governance]]** — PR 审查 scripts、frontmatter、`disable-model-invocation`
5. **[[cursor-hooks]] / PreToolUse** — 写/网络/secret 二次确认
6. **[[agent-sandbox]]** — 不可信 skill 脚本不进宿主
7. **[[red-teaming]]** — skill 加载场景纳入探针
8. **Rule of Two** — 见 [[prompt-injection]]；外来 skill + 敏感数据 + 外部写 → 禁

## 4 MCP 并列风险

- 公网 **无鉴权 MCP** 暴露（Trend Micro 等 2026 报告）
- 本地 `mcp.json` 被 repo 投毒 → [[claude-code]] RCE 类路径
- 与 [[tool-mcp]]：协议本身中立，**server 供应链**要 vet

## 5 团队策略

| 级别 | 做法 |
| --- | --- |
| 个人实验 | 仅官方/自写 skill；不跑 market 一键 install |
| 团队 | 私有 registry；fork 后审计；CI 跑 scanner |
| 生产 | 无 public market；组织插件；[[harness-engineering]] 四抉择 |

## 6 与 Skill 生态节点

| 节点 | 关系 |
| --- | --- |
| [[skill-governance]] | 发布门槛 |
| [[skill-engineering]] | 安全写法 |
| [[skill-loading-library]] | Discovery 截断与误激活 |
| [[openclaw]] | ClawHub 宿主 |

## 要点收束

- Skill/MCP 供应链 = 恶意能力包 + 注入 + 社会工程安装。
- 公共市场不可信；pin、治理、Hooks、沙箱分层。
- 扫描器有用但可 bypass；生产用 curated 源。
- 与 [[prompt-injection]]、[[red-teaming]]、[[skill-governance]] 组合。

## 进一步阅读

### 库内

- [[skill-governance]] — 团队发布流程
- [[prompt-injection]] — 间接注入
- [[tool-mcp]] — MCP 协议
- [[openclaw]] — ClawHub 语境
- [[red-teaming]] — 对抗评测

### 外部

- [Cisco skill-scanner](https://github.com/cisco-ai-defense/skill-scanner)
- [Agent Skills 开放标准](https://agentskills.io/)
