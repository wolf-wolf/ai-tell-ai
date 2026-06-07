---
name: ai-tell-ai-knowledge-doc
description: >-
  Writes and revises ai-tell-ai knowledge nodes (docs/**/*.md) by merging project
  writing-rules.md (Obsidian frontmatter, 核心本质 callout, 生命周期, 进一步阅读) with
  reader-centric article craft from tech-topic-overview-doc (causal prose,
  numbered subsections, Mermaid, inline citations). Use when
  authoring concept docs, wiki nodes, updating docs/, normalizing articles to
  repo style, or when the user asks to write in ai-tell-ai / 知识节点 style.
---

# ai-tell-ai 知识节点写作

为 **本仓库** `docs/`（及根目录 `writing-rules.md` 管辖的知识文）产出可读、可链接、因果密度高的 Markdown。**始终写文件**，聊天只回报路径与一句 takeaway。

## 权威来源（先读再写）

| 文件 | 用途 |
| --- | --- |
| [writing-rules.md](../../../writing-rules.md) | **节序与硬性格式**（不可颠倒） |
| [docs/STRUCTURE.md](../../../docs/STRUCTURE.md) | 新文放哪、wikilink、稳定性标签 |
| [templates/knowledge-article.md](templates/knowledge-article.md) | 正文骨架 |
| [reference.md](reference.md) | 延伸阅读格式、读者体验细则 |

## 何时用本 skill

- 新建或重写 `docs/**/*.md` 知识节点
- 把零散笔记升格为符合仓库规范的文章
- 增补/扩写已有文章（遵守手术式修改）
- **不用**于：`trends/` 日报（用 `templates/template-trend-daily.md`）、纯代码、插件实现

## 文章节序（固定，不可颠倒）

1. **YAML Frontmatter**
2. **`#` 标题**（不加序号）
3. **`> [!tip] 核心本质`**
4. **`## 生命周期与演进`**（四标签格式，见下）
5. **正文 `##` 节**（标题按主题自定，通常含原理 + 实践；细节见 [reference.md](reference.md)）
6. **`## 进一步阅读`**（最后一节）

可选：核心本质后 **一行** 检索说明（检索跳过/失败时），规则见 [reference.md](reference.md)。

### Frontmatter（必填字段）

```yaml
---
tags: []
aliases: []
related: []
stability: short | mid | long | permanent
layer: model | methodology | application | …
updated: YYYY-MM-DD
---
```

可选：`prerequisites`、`difficulty`。

`related` / `prerequisites` 用 wikilink 字符串：`"[[skill]]"`。`updated` 为文档最后修订日期（`YYYY-MM-DD`）。

### 核心本质

```markdown
> [!tip] 核心本质
> …
```

- 只写**这个概念是什么** + **没有它系统在哪一环出问题**（反事实）。
- **禁止**目录式表述（「本篇讲…」「本文分三部分」）。

### 生命周期与演进

四段，**黑体标签 + 冒号**，段间空一行，**不用列表符**：

```markdown
**当前定位**：…

**预期寿命**：…

**近期演进**：…

**终极威胁**：…
```

## 正文写作（融合 tech-topic 能力）

在固定节序之内，采用下列 **质量规则**（详见 [reference.md](reference.md)）：

1. **读者契约前置**：在核心本质后或正文首个 `##` 首段，说明适合谁、读到哪可停。
2. **因果密度优先**：扩写写机制与因果链，不靠堆 bullet/表格行数充篇幅。
3. **节首路标**：每个正文 `##` 用 1–2 句说明本节交付什么（非重复标题）。
4. **过渡**：大节之间用上一段收尾或下一节路标衔接，避免纯目录式「下文将讲…」。
5. **`###` 拆分**：一个 `##` 超过 ~400 字或多机制时，拆成 2–4 个 `###`；长节内可用 **`### N.M` 小数序号**（N 为父 `##` 在正文中的顺序，从 1 起计，**生命周期与演进、进一步阅读不参与编号**）。
6. **强调节制**：每小节少量 `**关键术语**` / `*术语*`；标题不再套粗体。
7. **诚实边界**：写明非目标、易混淆点、产品差异（不能「因产品而异」一笔带过）。
8. **子主题拆分**：工程实践、选型指南、对比深潜等**独立成文**，本篇只链过去（`## 进一步阅读`），不与原理混写。

### 图示与表格

- Mermaid：优先 `flowchart LR`；单图 ≤ ~20 节点，否则拆图或合并步骤。
- 非平凡表/图可加 caption：`**图 1：** …` / `**表 1：** …`
- 图片：`![[filename.png]]`（vault 内 assets），不用相对路径。

### 引用与外链

- 正文定量陈述、版本敏感产品名、论文名 → 在 **`## 进一步阅读`** 有可追溯条目。
- 正文用 **reference link / 脚注 / [n]** 指向同一条目，避免同一 URL 维护两遍（规则见 [reference.md](reference.md)）。
- `latest/`、`stability: short|mid` 文：正文关键事实旁标注**观测日期**；延伸阅读须含官方文档或仓库链接。

## 新文放哪里

按 [docs/STRUCTURE.md](../../../docs/STRUCTURE.md) 决策树选目录；文件名 **kebab-case、全库唯一**（wikilink 只写 `[[filename]]`）。

| 场景 | 默认路径 |
| --- | --- |
| 用户指定 | 用指定路径 |
| 尚无 wiki 节点的模式速览 | `docs/topic-overviews/<slug>-overview.md`，并更新 `docs/topic-overviews/map.md` |
| 常规知识节点 | 决策树对应子目录下的 `<slug>.md` |

新建后：在 [map.md](../../../map.md) 相应章节补索引（若该层已在 map 中维护）。

## 工作流

### A. 新建全文

1. **检索**（默认）：版本敏感 / 产品 / 快变主题先 web search；稳定基础可跳过并加检索说明行。
2. **定语言**：跟用户会话语言（中文请求 → 中文正文）。
3. **定归属**：STRUCTURE 决策树 + 是否应拆独立子文。
4. **列提纲**：固定节序 + 正文 `##` 标题 + 各节 `###` 计划。
5. **起草**：按 [templates/knowledge-article.md](templates/knowledge-article.md)。
6. **自检**（下方清单）→ 写入路径 → 聊天简短确认。

### B. 增补 / 修订已有文

先读 [writing-rules.md](../../../writing-rules.md)「增补与修改规则」：

1. **归属判断**：补本篇 / wikilink 指向兄弟文 / 另起新文。
2. **去冗余**：同一事实只保留一处权威位置。
3. **手术式修改**：只动目标段落；不顺改相邻结构。
4. **同步引用**：改名/改锚点时批量更新 wikilink、`map.md`。
5. 若改动改变章节逻辑或叙事重心 → 先与用户确认再全文重组。

### C. 窄追问（聊天优先）

用户只要补充链接、对比、三个项目举例等，且未要求「更新文档」→ **聊天直接答**，不覆盖 `.md`。用户明确「同步到文件/重写」→ 回到模式 A/B。

## 自检清单（发布前必过）

- [ ] 节序：Frontmatter → `#` → 核心本质 → 生命周期 → 正文 → 进一步阅读
- [ ] 核心本质无目录/meta 废话；生命周期四标签格式正确
- [ ] wikilink 无路径前缀（`[[skill]]` 非 `[[agent/skill/skill]]`）
- [ ] 子主题未塞进原理篇；进一步阅读有对应链接
- [ ] 版本敏感声明有日期；外链在进一步阅读可溯源
- [ ] Mermaid 未超 ~20 节点；长 `##` 已拆 `###`
- [ ] frontmatter `updated` 与本次修订一致
- [ ] 文件末尾无 skill 名、无「本文依 xxx 流程撰写」类 footer

## 示例触发语

```text
按仓库规范写一篇 docs/agent/pattern/ 下的「规划校验」知识节点，含 Mermaid 与库内 wikilink。
```

```text
扩写 docs/model/concept/embedding.md 的「与稀疏检索分工」段，手术式修改，不碰其他节。
```

## 评分对抗进化（写完/改完后）

写/改完后调用 **[article-scoring-evolve](../article-scoring-evolve/SKILL.md)**：默认合规→突破至 `breakthrough_done=true`（四席 Task、落盘 `_meta/article-reviews/`）。子 agent 限流/失败 → `run_status=incomplete`，如实报失败，**勿问用户**配置，**勿在本 skill 内自评即停**。

## 配套文件

- 模板：[templates/knowledge-article.md](templates/knowledge-article.md)
- 细则：[reference.md](reference.md)
- 评分循环：[article-scoring-evolve](../article-scoring-evolve/SKILL.md)
