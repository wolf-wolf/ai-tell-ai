---
name: ai-tell-ai-knowledge-doc
description: >-
  Writes and revises ai-tell-ai knowledge nodes (docs/**/*.md) by merging project
  writing-rules.md (Obsidian frontmatter, 核心本质 callout, 生命周期, 进一步阅读) with
  reader-centric article craft from tech-topic-overview-doc (causal prose,
  numbered subsections, Mermaid, inline citations). **Mandatory web retrieval**
  (GitHub, official docs, papers) before drafting or updating. Use when
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
- **源码机制深潜**（读仓库、写执行路径/Prompt 契约）：**先** [task-doc-codebase-mechanism-deep-dive](../task-doc-codebase-mechanism-deep-dive/SKILL.md)，**再**本 skill 落盘；联动见 [references/codebase-deep-dive-bridge.md](references/codebase-deep-dive-bridge.md)
- **不用**于：`trends/` 日报（用 `templates/template-trend-daily.md`）、纯代码、插件实现

## 联网检索（强制）

**新建全文**与**更新已有文**（含增补事实、改版本/参数/产品能力、结构性改写）动笔前，**必须**执行联网检索，**禁止**仅凭训练记忆写可证伪断言。

### 何时必须检索

| 场景 | 要求 |
| --- | --- |
| 新建 `docs/**/*.md` | 动笔前完成检索计划并执行 |
| 增补 / 修订（模式 B） | 至少核对**本次改动涉及**的事实；若动到机制/参数/产品名，扩展核对相邻断言 |
| 源码深潜 | 除 GitHub 读码外，仍须核对官方文档、Release/Issue（与 deep-dive skill 并行，不替代） |
| 窄追问（模式 C，仅聊天） | 不强制写文件；若用户要求同步落盘 → 回到 A/B 并检索 |

**唯一豁免**：用户在同一会话**明确**写「禁止联网 / 仅用仓库与常识」。仍须在 *检索说明* 标注豁免。

### 来源优先级（按序选用）

1. **官方**：产品文档、规范站点（如 agentskills.io）、论文原文（arXiv / 会议 PDF）
2. **GitHub**：上游仓库 `README`、官方文档目录、`releases`、`blob/...#L` 源码、相关 **PR / Issue**（行为变更时）
3. **权威二手**：官方博客、维护者文档、标准 benchmark（BEIR、ann-benchmarks 等）
4. **库内**：`docs/` 已有节点仅作 wikilink，**不能**替代对外部事实的联网核对

禁止：无 URL 的「据说」、过期教程当现行行为、把 Issue 传闻当已发布能力（须标「计划中 / PR #n」）。

### 执行方式（agent 必做）

1. **列检索问句**（3–8 条）：定义、默认参数、版本差异、官方推荐做法、常见误解。
2. **调用工具**：`WebSearch` 定位；`WebFetch` 读官方页 / GitHub raw / README。**产品实现文优先打开 GitHub 仓库**核对，不只搜摘要。
3. **落盘检索记录**（二选一，新建/大改必选 a）：
   - a) `_meta/outline/<slug>.md` 增 **Phase R — 检索记录**（问句、URL、一句话结论、观测日期）
   - b) 小改：在编辑会话内保留同等信息，*检索说明* 一行概括来源
4. **冲突处理**：联网结果 vs 库内旧文 vs 记忆不一致 → 正文以**可核对来源**为准，必要时改旧文并更新 `updated`。
5. **检索失败**：换 query / 换 URL（如 GitHub raw）重试 ≥1 次；仍失败则 *检索说明* 写「检索受限…」，**删除或弱化**无法核对的版本/数值断言，**不得**假装已核对。

### 检索说明（正文一行，紧挨核心本质后）

**每篇必有**，格式见 [reference.md — 检索说明](reference.md#检索说明正文一行)。

示例：

```markdown
*检索说明：HNSW 机制与默认参数对照 [hnswlib README](https://github.com/nmslib/hnswlib)、Malkov & Yashunin (2016) 与 Milvus 文档（观测 2026-06-11）。*
```

## 文章节序（固定，不可颠倒）

1. **YAML Frontmatter**
2. **`#` 标题**（不加序号）
3. **`> [!tip] 核心本质`**
4. **`## 生命周期与演进`**（四标签格式，见下）
5. **正文 `##` 节**（标题按主题自定，通常含原理 + 实践；细节见 [reference.md](reference.md)）
6. **`## 进一步阅读`**（最后一节）

*检索说明* 紧挨核心本质后，**必填**（见上文「联网检索」）。

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

1. **读者契约前置**：在核心本质后 **3–4 句**：适合谁、读完能复述/决策什么、读到哪可停。
2. **阅读梯**：每个关键 `###` 按 **场景→直觉→形式化→含义** 写（见 [writing-rules.md](../../../writing-rules.md)「人类阅读约束」）。
3. **术语预算**：每个 `###` 新术语 ≤ 3；表图前后 prose 引入与结论。
4. **因果密度优先**：扩写写机制与因果链，不靠堆 bullet/表格行数充篇幅。
5. **节首直入正文**：正文 `##` / `###` 首段写机制、问题或衔接，**禁止**「本节讲…」「本节说明…」等目录复述（标题已在目录中；细则见 [writing-rules.md](../../../writing-rules.md)「正文节首」）。
6. **过渡**：大节之间用机制/矛盾收尾上一节衔接下一节，避免「下文将讲…」式预告目录。
7. **`###` 拆分**：一个 `##` 超过 ~400 字或多机制时，拆成 2–4 个 `###`；长节内可用 **`### N.M` 小数序号**（N 为父 `##` 在正文中的顺序，从 1 起计，**生命周期与演进、进一步阅读不参与编号**）。
8. **强调节制**：每小节少量 `**关键术语**` / `*术语*`；标题不再套粗体。
9. **专有名词**：正文叙述写 **中文（English）**（如 检索增强生成（RAG）），禁止非代码场景句中裸夹英文术语；细则见 [writing-rules.md](../../../writing-rules.md)「专有名词：中文（英文）」。
10. **诚实边界**：写明非目标、易混淆点、产品差异（不能「因产品而异」一笔带过）；机制差异写事实，**禁止**正文以兄弟文为标尺（边界 / 对齐 / 分歧 / 同构——见 [writing-rules.md](../../../writing-rules.md)「正文不以兄弟文为标尺」）。
11. **子主题拆分**：工程实践、选型指南、对比深潜等**独立成文**，本篇只链过去（`## 进一步阅读`），不与原理混写。
12. **要点收束**：`## 进一步阅读` 前可选 3–5 条可复述结论。

### 图示与表格

- Mermaid：优先 `flowchart LR`；单图 ≤ ~20 节点，否则拆图或合并步骤。
- 非平凡表/图可加 caption：`**图 1：** …` / `**表 1：** …`
- 图片：`![[filename.png]]`（vault 内 assets），不用相对路径。

### 引用与外链

- 正文定量陈述、版本敏感产品名、论文名 → 在 **`## 进一步阅读`** 有可追溯条目。
- 正文用 **reference link / 脚注 / [n]** 指向同一条目，避免同一 URL 维护两遍（规则见 [reference.md](reference.md)）。
- `latest/`、`stability: short|mid` 文：正文关键事实旁标注**观测日期**；延伸阅读须含官方文档或仓库链接。

### 源码分析与实现深潜（`latest/` / 产品实现文）

**流程**：先执行 [task-doc-codebase-mechanism-deep-dive](../task-doc-codebase-mechanism-deep-dive/SKILL.md)（source map、≥3 文件深读、证据门控），再按本 skill 写成 Obsidian 知识节点。结构映射见 [codebase-deep-dive-bridge.md](references/codebase-deep-dive-bridge.md)；版式细则见 [reference.md — 源码分析与实现深潜](reference.md#源码分析与实现深潜写法)。

落盘要点：

1. **正文先讲机制与因果**；源码/Prompt 作**可核对证据**，不用大段代码替代理清。
2. **关键断言旁给深链**：`[path#L34-L235](https://github.com/org/repo/blob/<ref>/path#L34-L235)`；常量名用 `` `SNAKE_CASE` ``。
3. **复杂 Prompt** → `### N.M … Prompt 契约`：硬规则表 + 节选 +「逻辑怎么读」；完整原文进延伸阅读。
4. **`## 进一步阅读`** → `### 源码与 Prompt 原文`（非 deep-dive 的 `## References`）。
5. **检索说明** 写仓库、观测日期、版本量级；docs vs code 分歧须写明。

范例：`docs/latest/hermes-agent-memory.md`。

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

1. **联网检索（强制）**：按上文「联网检索」列问句 → WebSearch / WebFetch（**含 GitHub**）→ 落盘 Phase R 或会话记录 → 再写 *检索说明* 草稿。
2. **Phase A–C 提纲**：落盘 `_meta/outline/<slug>.md`（阅读契约 + 论证线 + 术语预算 + **Phase R 检索记录**）；见 [writing-rules.md](../../../writing-rules.md)「先提纲，再写」。
3. **若源码深潜**：走 [task-doc-codebase-mechanism-deep-dive](../task-doc-codebase-mechanism-deep-dive/SKILL.md) 至 source map + 深读完成，再映射到 [bridge](references/codebase-deep-dive-bridge.md) 提纲。
4. **定语言**：跟用户会话语言（中文请求 → 中文正文）。
5. **定归属**：STRUCTURE 决策树 + 是否应拆独立子文。
6. **Phase D 起草**：按提纲与 [templates/knowledge-article.md](templates/knowledge-article.md) 写正文（阅读梯顺序）；定量/版本句须能指回 Phase R 或延伸阅读 URL。
7. **Phase E 自检**（检索 + 标题测试 + 段首测试 + 下方清单）→ 写入路径 → 聊天简短确认。

### B. 增补 / 修订已有文

先读 [writing-rules.md](../../../writing-rules.md)「增补与修改规则」：

1. **联网检索（强制）**：核对本次改动涉及的事实；版本/参数/产品/论文句须 WebFetch 官方或 GitHub；更新 *检索说明* 中的观测日期与来源。
2. **归属判断**：补本篇 / wikilink 指向兄弟文 / 另起新文。
3. **结构性改写**（重排 `##`、换论证顺序、全文可读性翻新）：先更新 `_meta/outline/<slug>.md`（含 Phase R），再 Phase D 改文。
4. **去冗余**：同一事实只保留一处权威位置。
5. **手术式修改**：只动目标段落；不顺改相邻结构（但若相邻段含未核对断言且已触达，须一并核对或弱化）。
6. **同步引用**：改名/改锚点时批量更新 wikilink、`map.md`。
7. 若改动改变章节逻辑或叙事重心 → 先与用户确认再全文重组。

### C. 窄追问（聊天优先）

用户只要补充链接、对比、三个项目举例等，且未要求「更新文档」→ **聊天直接答**，不覆盖 `.md`。用户明确「同步到文件/重写」→ 回到模式 A/B。

## 自检清单（发布前必过）

- [ ] **联网检索**：已 WebSearch/WebFetch；GitHub 或官方文档至少 1 处；Phase R 或 *检索说明* 可追溯
- [ ] *检索说明* 一行在核心本质后（含观测日期与主要来源，非「未检索」除非用户豁免）
- [ ] 节序：Frontmatter → `#` → 核心本质 → 生命周期 → 正文 → 进一步阅读
- [ ] 核心本质无目录/meta 废话；生命周期四标签格式正确
- [ ] wikilink 无路径前缀（`[[skill]]` 非 `[[agent/skill/skill]]`）
- [ ] 子主题未塞进原理篇；进一步阅读有对应链接
- [ ] 正文无「与 [[兄弟文]] 的边界 / 对齐 / 分歧 / 同构」式 meta；易混淆处只写机制本身
- [ ] 版本敏感声明有日期；外链在进一步阅读可溯源
- [ ] Mermaid 未超 ~20 节点；长 `##` 已拆 `###`
- [ ] 若依赖源码：检索说明含仓库与观测日期；关键实现有 `#L` 深链；`### 源码与 Prompt 原文` 已列
- [ ] Prompt 契约节为「表 + 节选 + 逻辑怎么读」，非整文件粘贴
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
- 源码深潜联动：[references/codebase-deep-dive-bridge.md](references/codebase-deep-dive-bridge.md)
- 源码深潜执行：[task-doc-codebase-mechanism-deep-dive](../task-doc-codebase-mechanism-deep-dive/SKILL.md)
- 评分循环：[article-scoring-evolve](../article-scoring-evolve/SKILL.md)
