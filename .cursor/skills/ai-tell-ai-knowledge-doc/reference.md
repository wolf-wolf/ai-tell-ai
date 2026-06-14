# ai-tell-ai 知识节点 — 参考细则

本文件为 [SKILL.md](SKILL.md) 的展开说明；写作时按需阅读，不必全文背入上下文。

---

## 日期与难度（frontmatter，非正文表）

本仓库**不使用**正文元数据表（字数 / 阅读时间 / 难度表）。修订日期写在 frontmatter `updated`；需要标注难度时用可选字段 `difficulty`（如 `⭐⭐⭐` 或 `3/5`），与 [map.md](../../../map.md) 稳定性标签分工：`stability` 表时效，`difficulty` 表阅读门槛（可选）。

### 检索说明（正文一行，紧挨核心本质后）

**每篇必填**（与 [SKILL.md — 联网检索](SKILL.md#联网检索强制) 一致）。

| 情况 | 写法 |
| --- | --- |
| 正常完成检索 | `*检索说明：…（观测 YYYY-MM-DD）。*` — 列出 **1–3 个**主要来源（优先官方 / GitHub / 论文），勿堆长 URL 列表 |
| 用户明确禁止联网 | `*（应用户要求未使用网络检索；正文基于库内节点与训练记忆，未逐项核对外部变更。）*` |
| 检索受限 / 部分失败 | `*（检索受限：已核对 [来源A]；[主题B] 未逐页核对，表述已弱化。观测 YYYY-MM-DD。）*` |

**禁止**在无检索、无用户豁免时使用「稳定常识、未检索」类说明。

### Phase R — 检索记录（提纲内，新建/大改推荐）

写入 `_meta/outline/<slug>.md`：

```markdown
## Phase R — 检索记录

| 问句 | 来源 URL | 结论（一句） | 观测日期 |
| --- | --- | --- | --- |
| HNSW 默认 M、ef_search？ | https://github.com/nmslib/hnswlib/... | M 默认 16… | 2026-06-11 |
```

正文定量断言须能指回表中 URL 或 `## 进一步阅读` 同链。

---

## 正文 `##` 节（第 6 步）建议

`writing-rules.md` 不固定标题，但常见组合：

| 类型 | 常见 `##` 示例 |
| --- | --- |
| 概念 / core | 系统谱系、执行架构、核心机制 |
| 算法 | 定义与直觉、公式、复杂度、与相关算法对比 |
| 方法论 | 问题语境、操作框架、落地检查单 |
| 实践 | 设计要点、反模式、业内做法（须可溯源） |
| latest 产品 | 能力边界、与库内节点关系、观测日期 |

**框架 / 治理 / 工程类** 建议含一小节「最佳实践」或「落地要点」：至少 **3 条可执行做法**，每条能在 `## 进一步阅读` 找到来源（官方文档 > 官方仓库 > 高质量二手文）。

### `###` 小数序号（推荐，非强制）

仅用于**正文** `##` 之下（不含生命周期、进一步阅读）：

- 父节若是正文第 2 个 `##`，子节为 `### 2.1`、`### 2.2` …
- Rare `#### 2.1.1`：仅当单 `###` 过长且需扫描
- 编辑后重排序号，保持连续

**`###` 标题**：名词性短语，宜短；避免「适合谁、读到哪里」式多问句堆在一个标题里。

---

## 读者体验（来自 tech-topic-overview-doc）

1. **读者契约**：谁该读、读到哪够做决策——放在核心本质后 **3–4 句**（全篇一处即可，勿每节重复）。
2. **阅读梯**：每个关键 `###` 按 **场景→直觉→形式化→含义** 写（细则见 [writing-rules.md](../../../writing-rules.md)「人类阅读约束」）。
3. **术语预算**：每个 `###` 新术语 ≤ 3；表/图前后须有 prose 引入与结论。
4. **节首直入**：`##` / `###` 开篇写机制、矛盾或衔接；**禁止**「本节讲…」复述标题。
5. **过渡**：用机制/矛盾收尾上一节，而非罗列下一节目录。
6. **段落**：一段一主题，段首中心句；中文 **≤ 4 行**为佳、不超过 7 行。
7. **要点收束**：`## 进一步阅读` 前可选 3–5 条可复述结论。
8. **禁模糊指代**：「近期工作」「某框架」须命名并链到延伸阅读，或弱化表述。
9. **TL;DR（可选）**：极复杂主题可在正文首 `##` 下加 `### x.1 摘要`，3–5 bullet，然后删或保留视篇幅。

### 先提纲后写

新建或结构性改写须先写 `_meta/outline/<slug>.md`（Phase A–C），再起草（Phase D），验收（Phase E：标题测试 + 段首测试）。见 [writing-rules.md](../../../writing-rules.md)「先提纲，再写」。

### 强调与块引用

| 机制 | 用途 |
| --- | --- |
| `**…**` | 首次关键术语、一句 takeaway、警示 |
| `*…*` | 轻强调、论文名、外来词 |
| `>` blockquote | 短 caveat / 延伸（每大节至多 1 个） |
| `` `api` `` | 标识符、命令、配置键 |
| `---` | 仅长节内大逻辑块之间；勿紧贴 frontmatter |

**专有名词**：正文叙述禁止中英夹杂；术语写 **中文（English）**，如 检索增强生成（RAG）。代码/文件名仍用反引号。细则见 [writing-rules.md](../../../writing-rules.md)「专有名词：中文（英文）」。

---

## `## 进一步阅读`（最后一节）

**库内**与**外部**可混排，建议分组：

```markdown
## 进一步阅读

### 库内关联

- [[skill]] — 程序性 SOP 与 Skill 的关系
- [[skill-scripts]] — 脚本与校验闭环

### 外部参考

- [OpenAI Agents SDK](https://…) — 本文「工具循环」一节的产品对照
- [论文标题](https://arxiv.org/…) — 支撑「…」机制描述
```

规则：

- **不要**长段 meta（「以下条目用于…」）；直接列条目。
- 每条：**链接 + 一行**说明读者能得到什么 / 本文哪段依赖它；不写「边界 / 对齐 / 分歧对照」（见 [writing-rules.md](../../../writing-rules.md)「正文不以兄弟文为标尺」）。
- 正文「详见」指针须解析到此处同一 id 或编号。
- 纯 wikilink 短篇可只用 bullet 列表，不必强行分 `###`。

### 正文内联引用（推荐）

**Reference link（首选）**

```markdown
…梯度消失会削弱深层信号（[详见][vit-attn]）。

[vit-attn]: https://arxiv.org/abs/…
```

延伸阅读列表可重复标题 + 同一 URL，或复用 `[vit-attn]` 说明。

**脚注**：`[^id]` 定义放在进一步阅读末尾或文件末。

**编号**：`（见 [1]）` 与延伸阅读 `[1] …` 对应。

---

## 源码分析与实现深潜（写法）

适用于 `docs/latest/`、`stability: short|mid`、layer `application` 等**产品/实现深潜**文。`permanent` / 纯概念层通常只链官方文档，不必逐文件溯源。

**执行顺序**：先 [task-doc-codebase-mechanism-deep-dive](../task-doc-codebase-mechanism-deep-dive/SKILL.md)（source map、深读门控、证据合同），再按本节版式落盘；结构映射见 [codebase-deep-dive-bridge.md](codebase-deep-dive-bridge.md)。

**库内范例**：[docs/latest/hermes-agent-memory.md](../../../docs/latest/hermes-agent-memory.md)（三层架构 → 实现要点 → `5.3` Prompt 契约 → 延伸阅读源码组）。

### 从 deep-dive 继承、写入前须完成

- **Source map**（内部）：启动入口、主循环、状态/持久化边界、工具/扩展边界——每问 ≥1 个 `file:line` 锚点后再写正文。
- **深读门控**：主执行路径上 **≥3** 个关键源文件已读（非仅 README/配置）。
- **机制优先序**：读者问题 → 答案 → 证据锚点 → 工程解读（勿以文件名堆叠开节）。
- **docs vs code**：不一致处正文写明；禁止抹平。
- **工程借鉴**：除「怎么工作」外，须有可借鉴 / 不可照抄的 takeaway。

### 何时需要源码写法

| 写 | 不写 |
| --- | --- |
| 行为必须由仓库核对（阈值、状态机、工具白名单） | 只讲行业通用抽象、无具体实现主张 |
| Prompt / 常量契约要可审计 | 官方文档已足够且未声称「读码确认」 |
| 版本演进需对照 PR/Issue | 把 PR 描述当唯一信息源、未读机制正文 |

### 三层叙事（固定优先级）

1. **机制正文**（`##` / `###`）：因果链、数据流、与库内概念 wikilink——读者不打开 GitHub 也能懂「怎么工作」。
2. **契约/实现小节**（可选）：`### N.M … Prompt 契约`、`### N.M 实现要点`——从源码**提炼**规则，非逐行翻译。
3. **证据链**（`## 进一步阅读` → `### 源码与 Prompt 原文`）：文件深链、PR、Issue；正文已引用的 URL 在此**再列一行**说明用途即可。

正文**禁止**用 50+ 行代码块替代理清；**允许**短节选（Prompt 审计用 blockquote，英文原文可保留）。

### 检索说明（核心本质后一行）

```markdown
*检索说明：实现细节主要来自 [产品] 官方文档与 `org/repo` 源码（观测 YYYY-MM-DD，vX.Y 量级）；[独立仓库] 另述。*
```

- 写清**仓库全名**、**观测日期**、**版本/tag 量级**（不必伪精确到 commit，但要可复核）。
- 未读仓库就写实现细节 → 改写成「据官方文档」或补读后再写。

### 正文内源码引用格式

**文件 + 行号深链**（首选，可点击核对）：

```markdown
常量 `CURATOR_REVIEW_PROMPT`：[agent/curator.py#L357-L493](https://github.com/NousResearch/hermes-agent/blob/main/agent/curator.py#L357-L493)。
```

- 链接文字：`相对路径#L起始-L结束`；URL 用 `blob/<branch或tag>/path#Lstart-Lend`（与当前观测分支一致，在检索说明或延伸阅读注明）。
- **首次**断言某文件内行为时给行号；后文可写「见 `curator.py`」但关键数字（阈值、枚举）仍须可回溯。
- 符号名、配置键、工具名：`` `snake_case` `` / `` `memory` ``。

**术语对齐**（源码英文 ≠ 正文中文时，一处说明即可）：

```markdown
（Hermes 源码 prompt 里把这种总括 Skill 叫 *umbrella*，本文统一称 **大类 Skill**。）
```

### `### … Prompt 契约` 推荐结构

用于后台 Review、Curator、提取器等**长 Prompt 或常量表**：

```markdown
### 5.3 后台 Review Prompt 契约

三条 prompt 常量定义在 [agent/background_review.py#L34-L235](https://github.com/…/background_review.py#L34-L235)
（`_MEMORY_REVIEW_PROMPT` / `_SKILL_REVIEW_PROMPT` / `_COMBINED_REVIEW_PROMPT`）。fork 子 Agent 收到的是：**只读对话快照** + **下述指令之一**（观测 YYYY-MM-DD）。

| 触发 | 选用 prompt | 允许调用的工具 |
| --- | --- | --- |
| … | … | … |

#### 5.3.1 Memory Review：声明性事实

**Prompt 原文（节选）**

> Review the conversation above and consider saving to memory if appropriate.
> …

**逻辑怎么读**

| Prompt 在问什么 | 设计意图 |
| --- | --- |
| … | … |

**Prompt 没写、但工具层有的规则**：…（实现与 prompt 差距、已知 issue/PR）

完整 prompt 原文见 [background_review.py#L34-L235](https://github.com/…#L34-L235)。
```

规则：

- **硬规则摘要**：用表归纳「禁止 / 必须 / 边界」，不要复制整份 prompt。
- **原文节选**：只引与机制论证相关的句段；长列表用「① ② ③」分块 + 每块下「**逻辑**：」一句。
- **逻辑怎么读**：表两列「Prompt 在问什么 / 设计意图」或「维度 / 默认倾向」——把英文契约译成工程决策。
- **差距与风险**：`Prompt 没写，但工具层有的规则`、`已知风险` 可链 [PR](https://github.com/…/pull/n) / [Issue](https://github.com/…/issues/n)。
- 小节末**一次**指向完整原文深链；与延伸阅读条目可重复 URL，但职责不同（小节末 = 读本节后的跳转，延伸阅读 = 总索引）。

### 实现要点（非 Prompt）写法

无长 Prompt 时，用 `### N.M 实现要点` 或并入机制节：

- 状态机、阈值、工具白名单、线程/队列——**数字与枚举**须对应源码或官方文档。
- 可配小表（触发条件 | 执行者 | 工具）；复杂流用 Mermaid，节点标签用 `<br/>` 换行。
- 写「观测 YYYY-MM-DD」或「见 `hermes doctor`」提示复核方式。

### `## 进一步阅读` 中的源码组

在 `### 库内关联`、`### 官方文档` 之后（或并列）增加：

```markdown
### 源码与 Prompt 原文

- [background_review.py#L34-L235](https://github.com/…/background_review.py#L34-L235) — Review 三常量
- [curator.py#L357-L493](https://github.com/…/curator.py#L357-L493) — Curator 融合
- [memory_tool.py](https://github.com/…/memory_tool.py) — `memory` 工具实现
- [PR #2235](https://github.com/…/pull/2235) — 后台 Review 线程（与生命周期「近期演进」呼应）
```

- 每条：**深链 + 一行**说明「读者打开能看到什么」；勿写「与本文的边界」。
- 同一文件正文已详述的，延伸阅读仍保留索引行（便于从 Obsidian 尾部一键跳转）。
- PR/Issue 放源码组或官方组均可；**生命周期「近期演进」**可点名同一 PR，避免正文重复长段 PR 描述。

### 禁止与常见失误

| 禁止 | 应改为 |
| --- | --- |
| 「详见源码」「读代码可知」无路径 | `path#Lstart-Lend` 或官方开发者文档 |
| 正文贴完整 `.py` / 整份 prompt | 表 + 节选 + 延伸阅读深链 |
| 用 PR 标题堆叠当机制叙述 | 正文写机制；PR 只作演进注脚 |
| 未核对行号仍写死阈值 | 检索说明标注观测日期，或改模糊表述 |
| 把 Issue 传闻当现行行为 | 标为「已知风险 / 计划中的 PR #n」 |

### 源码文自检（追加）

- [ ] 检索说明：仓库 + 观测日期 + 版本量级
- [ ] 机制正文可独立阅读；关掉 GitHub 仍理解主流程
- [ ] 关键常量/阈值有 `#L` 深链或官方文档等价出处
- [ ] Prompt 契约为表 + 节选 + 逻辑怎么读，非全文粘贴
- [ ] `### 源码与 Prompt 原文` 已列；与正文引用不矛盾
- [ ] PR/Issue 仅作演进或风险，不替代机制段

---

## Wikilink 与资产

```markdown
✓ [[skill]]
✓ [[skill|显示名]]
✓ [[skill-loading-library#某节]]
✓ ![[agent-architecture-l1.png]]

✗ [[agent/skill/skill]]
✗ [[docs/agent/skill/skill]]
✗ ![](assets/foo.png)   # 优先 ![[foo.png]] 若已在 vault
```

`resources/` 下资源：链 **文件名**（如 `[[building-effective-agents]]`），非 `resources/…` 路径。

---

## 稳定性与 layer

| stability | 含义 | 写作侧重 |
| --- | --- | --- |
| `permanent` | 底层机制 | 深挖原理，少绑产品版本 |
| `long` | 设计理念 | 边界与演化，实现可过时 |
| `mid` | 当前最佳实践 | 场景与检查单，标注时效 |
| `short` | 快变 workaround | 短、观测日期醒目 |

`layer` 示例：`model`、`methodology`、`application`；与 STRUCTURE 目录一致即可。

---

## 与 tech-topic-overview-doc 的差异（勿混用）

| 项 | tech-topic-overview | ai-tell-ai 本 skill |
| --- | --- | --- |
|  spine | `## 1.–3.` 固定英文骨架 | 核心本质 + 生命周期 + 自定 `##` |
| 结尾 | `References` 必填最后一节 | `## 进一步阅读`（含库内 wikilink） |
| 正文元数据表 | 标题下四列表 | **不使用**；日期在 frontmatter `updated` |
| Frontmatter | 通常无 | Obsidian YAML 必填 |
| 默认路径 | `docs/topic-overviews/` | STRUCTURE 决策树 |

topic-overviews 文仍用**本 skill 节序**，只是目录与 map 登记方式不同。

---

## 扩写与修订（摘要）

- 先问归属：本篇 / 兄弟文 wikilink / 新文。
- 扩写 = 补为什么、反事实、机制差异、产品差异；**禁止**空增 bullet；**禁止**正文以兄弟文为标尺（边界 / 对齐 / 分歧）。
- 核心本质永远不写「本篇结构」。
- 手术式改动；重命名同步全库 wikilink + `map.md`。

完整条文见 [writing-rules.md](../../../writing-rules.md)。
