# 源码机制深潜 × ai-tell-ai 知识节点 — 联动说明

本文件说明如何把 **[task-doc-codebase-mechanism-deep-dive](../../task-doc-codebase-mechanism-deep-dive/SKILL.md)**（检索优先、证据门控、source map）与 **[ai-tell-ai-knowledge-doc](../SKILL.md)**（Obsidian 节序、wikilink、进一步阅读）合成一条工作流。

**分工**

| 能力 | 负责 skill |
| --- | --- |
| 读哪几个文件、证据是否够、source map、禁止 code-dump | `task-doc-codebase-mechanism-deep-dive` |
| 写成什么样、放哪、frontmatter、核心本质、延伸阅读版式 | `ai-tell-ai-knowledge-doc` |
| Prompt 常量审计、`#L` 深链、`### 源码与 Prompt 原文` | 两 skill 交集；版式细则见 [reference.md — 源码分析与实现深潜](reference.md#源码分析与实现深潜写法) |

---

## 何时双 skill 联用

- 用户要写 **仓库支撑的机制文**（执行路径、模块边界、Prompt 契约、docs vs code）。
- 落盘目标为 **`docs/latest/`** 或 `stability: short|mid` 的实现深潜。
- **不要**双 skill：纯 `permanent` 概念、无 repo 主张、或用户只要聊天答复不落 `.md`。

---

## 推荐执行顺序

1. **读** `task-doc-codebase-mechanism-deep-dive/SKILL.md` → 确认 repo 模式与 hard gates。
2. **检索 + source map**（动笔前）：启动入口、主循环、状态边界、扩展/工具边界——每问至少一个 `file:line` 锚点。
3. **Mandatory Deep-Read**：终端或 `read_file` 深读主路径上 **≥3 个**关键源文件（非 README/配置堆砌）。
4. **定 ai-tell-ai 提纲**：固定节序 + 正文 `##` 标题（见下表映射）；Prompt 重节可预留 `### N.M … Prompt 契约`。
5. **写 `.md`**：机制正文优先；源码作证据；按 [reference.md 源码节](reference.md#源码分析与实现深潜写法) 排版。
6. **自检**：deep-dive [checklists.md](../../task-doc-codebase-mechanism-deep-dive/references/checklists.md) + knowledge-doc 发布清单。
7. **聊天 handoff**（仅对话，不写进文章）：`artifact_path`、`source_map_evidence`、`version_evidence` 等（见 deep-dive skill）。

---

## 结构映射（deep-dive 脊柱 → ai-tell-ai 节序）

| deep-dive 默认脊柱 | ai-tell-ai 落点 |
| --- | --- |
| Metadata 表（字数/阅读时间） | **省略**；日期 → frontmatter `updated`；难度 → 可选 `difficulty` |
| Lead / 读者先抓什么 | 核心本质后 **读者契约** 1–2 段 + 可选 *检索说明* 一行 |
| `## 1.` 解决什么问题 / 证据边界 | 正文首 `##`（如三层架构、系统谱系）+ 生命周期「当前定位」已覆盖部分上帝视角 |
| `## 2.` 主执行路径 | 正文 `##` + Mermaid；`###` 写入口、主循环、分支守卫 |
| `## 3.` 模块职责 / 状态边界 | 正文 `###` + **表**（模块 \| 责任 \| 证据文件） |
| 文档 vs 源码分歧 | 正文机制段内 explicit 写出，或 `**Prompt 没写、但工具层有的规则**` |
| `## 4.` 工程借鉴 | 正文末 `##` 或「落地要点」；lifecycle **终极威胁** 可呼应 |
| `## References` | **`## 进一步阅读`**：`### 库内关联` / `### 官方文档` / **`### 源码与 Prompt 原文`** |
| source map（内部） | 不整表贴进正文；浓缩为延伸阅读条目 + 正文 `#L` 深链 |

**范例成品**：[docs/latest/hermes-agent-memory.md](../../../docs/latest/hermes-agent-memory.md)。

---

## 从 deep-dive 继承的硬规则（写入 knowledge-doc 时仍有效）

- 每个主要机制 `###` **至少一处**可核对锚点（文件 / 符号 / `#L` 深链）。
- **禁止**用长代码块替代理清；Prompt 用表 + blockquote 节选（见 reference.md）。
- 文档与代码不一致时 **写明**，不抹平。
- 未读到的行为标为 **推断** 或收窄表述。
- 须有 **工程 takeaway**（可借鉴 / 不可照抄），不只功能清单。
- 非平凡主题：**至少 1 张 Mermaid + 1 张分析表**（与 knowledge-doc 图示规则一致）。

---

## 默认产出路径（ai-tell-ai）

| 场景 | 路径 |
| --- | --- |
| 产品 / 上游 repo 实现深潜 | `docs/latest/<slug>.md` |
| 通用机制（非 latest） | [STRUCTURE.md](../../../docs/STRUCTURE.md) 决策树 |
| 用户指定 | 用户路径优先 |

写完同步 [map.md](../../../map.md)（若该层有索引）。

---

## 配套文件索引

| 文件 | 用途 |
| --- | --- |
| [task-doc-codebase-mechanism-deep-dive/SKILL.md](../../task-doc-codebase-mechanism-deep-dive/SKILL.md) | 执行脊柱、证据合同、深读门控 |
| [task-doc-codebase-mechanism-deep-dive/references/reference.md](../../task-doc-codebase-mechanism-deep-dive/references/reference.md) | 检索层、snippet 策略、验证证据 |
| [task-doc-codebase-mechanism-deep-dive/references/checklists.md](../../task-doc-codebase-mechanism-deep-dive/references/checklists.md) | 硬门控自检 |
| [ai-tell-ai-knowledge-doc/reference.md](reference.md) | Obsidian 版式、Prompt 契约、延伸阅读 |
| [templates/knowledge-article.md](../templates/knowledge-article.md) | 落盘骨架 |

上游维护副本：`~/Desktop/资料整理/.cursor/skills/task-doc-codebase-mechanism-deep-dive`。
