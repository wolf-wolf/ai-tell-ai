# 知识文章评分标准（Agent 自检契约）

**用途**：code agent 写完 / 改完 `docs/` 知识节点后按本文自检；**`done = true` 时停止循环**。  
**范围**：`docs/` 及 `writing-rules.md` 管辖正文。跳过 `trends/`、纯代码、配置。  
**性质**：评判规则文档，**不适用**知识节点写作模板。

格式权威：`writing-rules.md`。本文只定义 **好坏判据、打分、停不停、输出什么**。

---

## 一、好坏怎么说清（阅此节即可认可）

### 1.1 好文 vs 坏文（机制层）

| 坏文（不得停） | 好文（可停） | 判定落在 |
| --- | --- | --- |
| 节序错、缺核心本质/生命周期 | 结构合规 | G1–G4、Q2 |
| 概念边界错、相关当因果 | 概念正确、因果有适用范围 | G6、Q1 |
| 把「A 必然导致 B」写死，无条件 | 主要因果声明带**成立条件/适用范围** | **Q1（强制）** |
| 与兄弟文大段重复 | 一处权威 + wikilink | G5、Q3 |
| 名词罗列、bullet 堆砌、说不清为什么 | 原理透彻，机制能答「为什么」 | Q1 |
| 难读、无读者契约、目录式过渡 | 顺畅 prose、可扫描、知止 | Q4 |
| 大纲乱、原理节内部层次不清 | **标题树可扫出论证线**；原理按问题→机制→抉择展开 | Q2、§5.3 |
| 图文脱节、图无题无上下文 | **图文互证**：图前有引入、图后有结论、图题可独立读 | Q4、§5.3 |
| 无 non-goals、叙事框架误导优先级 | 边界与易混概念写清 | Q5 |
| 断言无出处、死链 | 关键事实可追溯 | Q6 |
| 靠加表/图/Mermaid 不提机制 | 表图服务于机制，且有 prose 支撑 | §五.2 反 gaming |

**一句话好文**：读者能建立**正确且不过度简化**的心智模型——知道是什么、没有它哪环断掉、机制在什么条件下成立、读到哪可停、边界在哪、关键说法能追溯。

### 1.2 评分模型

```
Layer 1 — G（7 项 pass/fail）     任一 fail → blocker
Layer 2 — Q（6 维 × 0–3）         单维满分 3，加总满分 18
档位 tier — A / B / C / D         由 G、Q、blocker 推导
target_tier — 默认 A              停止所需最低档位
done — 布尔                       见第二节公式
```

| 概念 | 值 |
| --- | --- |
| 不采用 | 0–100 总分、字数、阅读时间 |
| 深度 | Q1（透彻 + **条件性因果**） |
| 组织与呈现 | Q2（大纲 + 原理层次）+ Q4（易读 + **图文阅读标准**） |
| **默认停止** | **`target_tier = A`** 且 `done = true` |
| 降级停止 | 仅当用户会话显式指定 `target_tier: B` |

### 1.3 六维速览

| 维 | 名称 | ≥2 的含义 |
| --- | --- | --- |
| Q1 | 概念交付 | 定义 + 反事实 + 原理透彻 + **因果带条件** |
| Q2 | 结构与大纲 | writing-rules + **原理篇层次清晰、标题树可扫出论证线** |
| Q3 | 图谱冗余 | 不重复权威；链接闭合 |
| Q4 | 呈现与阅读 | 易读、读者契约 + **图文结合符合人类阅读顺序** |
| Q5 | 边界诚实 | non-goals + 叙事/易混边界 |
| Q6 | 可验证性 | 断言可追溯 |

### 1.4 档位

| tier | 条件 |
| --- | --- |
| **D** | 有 blocker，或 ≥2 维 = 0 |
| **C** | 无 blocker，且存在 1 维 = 1 |
| **B** | 无 blocker，六维均 ≥ 2 |
| **A** | 无 blocker，六维均 ≥ 2，且 **≥ 2 维 = 3** |

---

## 二、停止契约（核心）

### 2.1 `done` 公式

```text
done = true  当且仅当：

  (1) blockers.length === 0
  (2) G1..G7 全部 pass
  (3) min(Q1..Q6) >= 2
  (4) Q1 >= 2 且 Q2 >= 2 且 Q4 >= 2       // 概念 + 大纲 + 阅读呈现
  (5) Q1_conditional_causality === pass    // 强制，见 §五.1
  (6) outline_principle === pass           // 强制，见 §五.3
  (7) visual_reading === pass              // 强制，见 §五.3
  (8) tier >= target_tier                  // 默认 target_tier = A
  (9) majors_open === 0
  (10) anti_gaming === pass                // 见 §五.2
  (11) run_status === "ok"                 // 仅 article-scoring-evolve 对抗轮，见 §2.5
  (12) 当轮 scoring-adversary 席位 === "ok" // 同上；单轮自检可省略 (11)(12)
```

- `done = false` → `action: continue`，`next_fixes` ≤ 5 条（blocker → major → 未过的强制项）
- `done = true` 且（无 `run_status` 或 `run_status=ok`）→ `action: stop`
- `run_status=incomplete` → `action: incomplete`；`done` / `breakthrough_done` 均保持 false

### 2.2 强制项失败时的处理

| 强制项 | 未 pass 时 |
| --- | --- |
| Q1 条件性因果（§五.1） | Q1 最高 **1**；记 major `unconditioned_causality` |
| 大纲与原理层次（§五.3） | Q2 最高 **2**；记 major `weak_principle_outline` |
| 图文阅读标准（§五.3） | Q4 最高 **2**；记 major `weak_visual_integration` |
| 反 gaming（§五.2） | 记 major `format_without_mechanism`；Q2/Q4 相关项最高 **2** |
| `tier < target_tier` | 不记 major；`next_fixes` 指明需拉升的维 |

### 2.3 防无限打磨

连续 **2 轮** `scores` 与 `tier` 完全相同，且仅剩 minors → `action: stop_forced`，输出 minor backlog（`done` 仍为 false）。

禁止提分手段：加 bullet 不补因果、堆表/图替代 prose、重复兄弟文、核心本质写目录、无条件因果写死。

### 2.4 合规天花板 vs 突破（两阶段）

| 阶段 | 问什么 | 停不停 |
| --- | --- | --- |
| **合规**（§2.1 `done`） | 文章是否**达标、可入库** | `done=true` 停合规循环 |
| **突破**（§2.4 `breakthrough_done`） | 能否抬高读者心智模型上限（**默认自动进入**，无需用户指定） | `breakthrough_done=true` |

**问题**：仅有合规循环时，优化只在**现有壁垒内**修 majors（补条件、补图题、补路标），不会主动**重组原理篇、补缺失机制层、加反例/算例**。已有基础内容易陷入**局部最优**。

**突破**不要求再改 G/Q 下限，但要求每轮至少一项**结构级或机制级**变动（见 article-scoring-evolve skill §突破阶段）。

#### 默认进化路径（无需用户配置）

调用 **article-scoring-evolve** 时，父 agent **必须**走完整路径：

```text
合规循环 → done=true → 突破循环（自动） → breakthrough_done=true → 全流程停止
```

用户**不必**指定 `stretch_axes`、`evolution_mode`、突破轮数。仅当用户显式说「只合规 / 不要突破」时，才停在 `done=true`。

#### `stretch_axes` 自动派生（每轮突破前计算）

```text
candidates = { Qx | scores[Qx] == 2 }     // 有空间拉到 3 的维
priority   = Q1 > Q4 > Q5 > Q2 > Q3 > Q6
stretch_axes = candidates 按 priority 取前 2 项（不足则全取）
若 candidates 为空 → 视为内容维已顶格，进入 breakthrough_done 判定
```

**breakthrough-challenger** 根据当轮 `stretch_axes` 自动产出 `structural_bets` 并指定 `recommended_bet_id`；**breakthrough-explorer** 自动执行该 bet，无需用户选。

#### `breakthrough_done`

```text
breakthrough_done = true  当且仅当：

  (1) done === true
  (2) 当轮及上一轮 run_status === "ok"          // §2.5；子 agent 失败不得标完成
  (3) 当轮 scoring-adversary 席位 === "ok"      // 独立复评，非父 agent 自评
  (4) ∀Q ∈ {Q1..Q6}: scores[Q] >= 3          // 六维全达典范线；或
      candidates 为空且 challenger 无结构级 gap  // 已无 2 分维可抬
  (5) 最近一轮 breakthrough 有 §2.4 变动类型之一（若本轮刚从合规切入则豁免）
  (6) checks.external_verification === pass   // 见 §5.4（Q6=3 时）
```

**全流程停止**：`breakthrough_done=true`（不是仅 `done=true`）。`run_status=incomplete` 时 `breakthrough_done` 必须为 `false`。

| 变动类型（每轮 breakthrough 至少 1 项） | 例 |
| --- | --- |
| **重组** | 拆分/合并 `###`；原理节换论证顺序 |
| **补层** | 新增机制层：反例、失败模式、算例 walkthrough、与兄弟文差异段 |
| **抬天花板** | 某维从 2→3：完整因果链、深内容仍好读的图示叙事 |
| **删减壁垒** | 删掉重复/挡深度的段落，把篇幅让给机制 |

突破轮**允许**改动大于合规轮的 patch 范围；仍禁止重复兄弟文、无条件因果、堆格式。

**突破早停**：`candidates` 为空且独立 `scoring-adversary` 无结构级 gap → 可直接 `breakthrough_done=true`，**不必**硬凑 `max_breakthrough_rounds`。

### 2.5 执行契约（对抗进化专用）

评分契约除内容好坏外，还要求 **跑法可信**。由 [article-scoring-evolve](.cursor/skills/article-scoring-evolve/SKILL.md) 强制执行。

#### 角色与评改分离

| 规则 | 说明 |
| --- | --- |
| **评** | 仅 `scoring-adversary`（Task 子 agent）可产出当轮 `score_report` 用于判定 `done` / `breakthrough_done` |
| **改（合规）** | 仅 `content-evolver` 可在有当轮 adversary JSON 后 patch |
| **改（突破）** | 仅 `breakthrough-explorer` 可在有当轮 challenger JSON 后改文 |
| **父 agent 禁止** | 不得自评自改后报 `action: stop`；不得代打四席 |

#### 子 agent 失败 = 本轮失败（禁止假装成功）

以下任一发生 → 当轮 `run_status: "incomplete"`，`action: "incomplete"`，**不得**改文、**不得**报 `done=true` 或 `breakthrough_done=true`：

| `incomplete_reason` | 触发 |
| --- | --- |
| `subagent_rate_limit` | Task 返回 usage limit / quota / 席位未启动 |
| `subagent_error` | Task 异常、超时、无 JSON 回报 |
| `missing_adversary_report` | 无当轮 `scoring-adversary` 落盘 JSON 即尝试 patch 或停 |
| `missing_challenger_report` | 突破轮无 `breakthrough-challenger` JSON 即 explorer patch |
| `missing_evolver_report` | 合规轮 adversary 后无 `content-evolver` 回报即进入复评 |
| `parent_substitution` | 父 agent 承认代打评分席/优化席 |

**对用户回报**：明确写「本轮未完成」，附 `incomplete_reason` 与失败席位；**禁止**用自评分数冒充对抗结果。

#### 每轮落盘（硬门禁）

父 agent 每轮先将完整 JSON 写入：

```text
_meta/article-reviews/<slug>-r<round>.json
```

`<slug>` = 文章路径去 `docs/`、去 `.md`、`-` 代 `/`。  
**无落盘文件 → 禁止** `StrReplace` / `Write` 被评文章。

---

## 三、JSON 输出（每轮必返）

```json
{
  "article": "docs/...",
  "target_tier": "A",
  "done": false,
  "gates": {
    "G1": true, "G2": true, "G3": true, "G4": true,
    "G5": true, "G6": true, "G7": true
  },
  "scores": {
    "Q1": 1, "Q2": 2, "Q3": 2, "Q4": 2, "Q5": 2, "Q6": 2
  },
  "sum": 13,
  "tier": "B",
  "run_status": "ok",
  "incomplete_reason": null,
  "seats": {
    "scoring-adversary": "ok",
    "content-evolver": "ok",
    "breakthrough-challenger": "skipped",
    "breakthrough-explorer": "skipped"
  },
  "checks": {
    "Q1_conditional_causality": "pass",
    "outline_principle": "fail",
    "visual_reading": "pass",
    "anti_gaming": "pass",
    "external_verification": "pass"
  },
  "blockers": [],
  "majors": [
    {
      "type": "weak_principle_outline",
      "location": "## 核心原理",
      "issue": "扫标题无法看出问题→机制→设计抉择的论证线",
      "fix": "重排 ### 顺序并补节首路标（本节回答什么问题）"
    }
  ],
  "minors": [],
  "majors_open": 1,
  "action": "continue",
  "next_fixes": ["重排 ## 核心原理 下 ### 层次并补节首路标"],
  "score_notes": {
    "Q2": "格式合规但原理篇大纲扫不出论证线 → 封顶 2"
  },
  "phase": "compliance",
  "stretch_axes_auto": ["Q1", "Q4"],
  "stretch_axes_source": "auto",
  "breakthrough_done": false,
  "breakthrough_moves": [],
  "verification_log": []
}
```

| 字段 | 说明 |
| --- | --- |
| `run_status` | `ok` \| `incomplete`；`incomplete` 时禁止 `stop` / `breakthrough_done` |
| `incomplete_reason` | §2.5 枚举；仅 `run_status=incomplete` 时非 null |
| `seats` | 四席当轮状态：`ok` \| `failed` \| `skipped` \| `pending` |
| `action` | `continue` \| `stop` \| `stop_forced` \| **`incomplete`** |
| `target_tier` | 默认 `"A"`；用户显式 `"B"` 时可降低停止线 |
| `phase` | `compliance` \| `breakthrough` |
| `stretch_axes_auto` | 当轮自动派生的突破维（§2.4 算法） |
| `stretch_axes_source` | 固定 `"auto"`；用户显式覆盖时 `"override"` |
| `breakthrough_done` | 全流程停止条件（§2.4） |
| `breakthrough_moves` | 突破轮结构/机制级变动清单 |
| `checks` | 强制校验项 pass/fail |
| `score_notes` | 每维一句依据，防随意打分 |
| `verification_log` | §5.4 外链抓取记录（突破轮改断言时必填） |
| `majors[].type` | `unconditioned_causality` \| `weak_principle_outline` \| `weak_visual_integration` \| `format_without_mechanism` \| `unverified_external_claim` \| `other` |

**禁止**把 `tier` / `done` 写入被评文章。

---

## 四、评判流水线

```
1. 读 target_tier（默认 A）
2. 判 G1–G7 → gates；fail → blockers
3. 扫描机制段因果声明 → Q1_conditional_causality
4. 扫原理篇标题树与 ### 层次 → outline_principle
5. 扫图/表/Mermaid 前后文与图题 → visual_reading
6. 扫表/图 vs prose → anti_gaming
7. 扫外链/框架断言 vs verification_log → external_verification（§5.4）
8. 打 Q1–Q6（强制项 fail 则按 §2.2 封顶）→ sum
9. 列 blockers / majors / minors
10. 算 tier
11. 算 done、action、next_fixes、score_notes、run_status
```

---

## 五、强制规则与反 gaming

### 5.1 条件性因果（Q1 强制）

**范围**：正文机制段（含 `###` 原理小节）中所有**主要因果声明**——用「因为 / 导致 / 越高 / 越低 / 必须 / 无法」等表达 A→B 关系的句子。

**pass**：每条主要因果声明附带至少一项——**成立条件**（何时成立）、**适用范围**（对谁/哪类系统）、或**反例边界**（何时不成立）。

**fail**（任一即 fail）：
- 无条件写「A 导致 B」而实为概率性或情境依赖规律
- 线性叙事（如「一代→二代→三代」）未说明**并列/层级**关系，易误导优先级

**处理**：`checks.Q1_conditional_causality = fail` → Q1 ≤ 1 → major `unconditioned_causality`。

**不算 fail**：核心本质中一句反事实（「没有它会断在哪」）；明确标注为直觉或经验规则的句子。

### 5.2 反 gaming

**pass**（同时满足）：
- 除「进一步阅读」外，至少 **2 个** `###` 小节以 **prose 段落**（非纯列表）讲解机制，每段 ≥ 2 句
- 若 Q2 ≥ 3 或文内有 Mermaid/表：须有 **图题/表题**，且相邻 prose 说明「图/表论证什么」
- tier 目标为 **A** 时：Q1、Q4、Q5 中至少 **2 维** = 3（与 tier A 定义一致，双重校验）

**fail**：新增表/图/Mermaid 但相邻无机制 prose；或全文合格机制 prose 小节不足 2 个。

**处理**：`checks.anti_gaming = fail` → 记 major `format_without_mechanism`；Q2 若有图无题 cap 2。

### 5.3 大纲与图文（强制）

两项独立校验，均须 pass 方可 `done`（与 Q1 条件性因果同级）。

#### A. 大纲与原理层次 — `outline_principle`

**对象**：以「原理 / 机制」为主的大节（通常 `## 核心原理` 或等价节）及其 `###` 子节。

**pass**（同时满足）：

1. **标题树可扫**：只读 `##` / `###` 标题，能猜出论证顺序（问题/鸿沟 → 是什么 → 关系/边界 → 机制或设计抉择 → 典型实现/应用），而非名词随机排列
2. **原理节有内在弧线**：每个关键 `###` 至少满足其一——节首 **1–2 句路标**（本节回答什么问题）；或节内顺序为 **现象/问题 → 原因/机制 → 后果/设计含义**
3. **粒度合理**：单 `###` 下 prose 过长（约 **>400 字** 且无下级标题）须拆分；禁止把多个独立子主题塞进同一 `###` 仅用 bullet 区分

**fail 例**：标题只有「概述」「细节」「其他」；原理节先讲实现再讲定义；扫标题看不出「为什么需要 Harness」落在哪一节。

**处理**：`checks.outline_principle = fail` → Q2 ≤ 2 → major `weak_principle_outline`。

#### B. 图文阅读标准 — `visual_reading`

**对象**：正文内所有 **表、Mermaid、示意图**（不含 frontmatter）。

**pass**（每张表/每幅图同时满足）：

| 人类阅读要求 | 判定 |
| --- | --- |
| **图题/表题** | 独立可读，说明「展示什么」而非「表 1」 |
| **引入** | 图/表**前**有 prose：为何需要此图/表 |
| **读出** | 图/表**后**有 prose：读者应带走什么结论/决策 |
| **位置** | 不插在 bullet 清单中间；不连续堆多张图无 prose 间隔 |
| **负荷** | Mermaid 单图节点 ≤ 20；表列数 ≤ 6（超出须拆表或改 prose） |

**fail 例**：Mermaid 孤悬无图题；表只有名词无表头语义；图后直接进入下一节无解释。

**处理**：`checks.visual_reading = fail` → Q4 ≤ 2 → major `weak_visual_integration`。

**与 §5.2 关系**：§5.2 防「有图无机制」；§5.3.B 防「有图但不符合人类扫读顺序」。可同时 fail。

### 5.4 外链与框架断言验真（Q6 强制，突破轮）

**对象**：正文中用于支撑**选型、机制、产品能力**断言的 `http(s)` 链接，以及带「观测/发布」日期的框架描述句。

**pass**（同时满足）：

1. 每个此类链接在当轮或上一轮进化中有一条 `verification_log` 记录：`url`、`fetched_at`、`status: ok|failed`、`claim_supported: yes|partial|no|unverified`
2. `status=ok` 的条目数 ≥ 文内外链事实断言数的 **50%**，或文中显式标注「未逐页核对」的限定句（如 LlamaIndex API 细节）
3. 教学 walkthrough / 合成示例须标 **性质**（见 [[tool-use]] / 库内节点），不得伪装成 incident 实录
4. 无法抓取时：`status=failed` 须写入 log，正文降级为库内 wikilink 或删除可证伪断言——**不得**仅凭日期脚注给 Q6=3

**fail**：无 `verification_log`；或给外链断言标了日期但未抓取且无限定句。

**处理**：`checks.external_verification = fail` → Q6 ≤ 2 → major `unverified_external_claim`。

**Q6 锚定补充**：**3 分**须 `external_verification=pass` 且版本敏感处有日期；仅有日期无验真日志最高 **2**。

---

## 附录 A — 硬门槛 G1–G7

| ID | pass 条件 |
| --- | --- |
| G1 | Frontmatter → 标题 → 核心本质 → 生命周期 → 正文 `##`… → 进一步阅读（末节） |
| G2 | 核心本质 = 是什么 + 无它哪环出问题；非目录开篇 |
| G3 | 生命周期四标签齐全 |
| G4 | frontmatter 必填合法 |
| G5 | 无兄弟文大段重复；有库内 wikilink |
| G6 | 无概念边界错误；**无相关当因果**；无误导选型/排障断言（不含 §5.1 灰度，灰度走 Q1 强制项） |
| G7 | wikilink 无 `docs/` 前缀；关键外链可访问 |

---

## 附录 B — 六维 0–3 锚定

### Q1 概念交付

| 分 | 锚定 |
| --- | --- |
| 0 | 目录式核心本质；无反事实；边界错误 |
| 1 | 有定义但机制浅；或 **§5.1 fail**（无条件因果） |
| 2 | 定义 + 反事实清楚；原理透彻；**主要因果均有条件/范围**；能答「为什么」 |
| 3 | 易混概念辨析；关键机制有完整因果链（含条件、环节、断点） |

### Q2 结构与大纲

| 分 | 锚定 |
| --- | --- |
| 0 | 节序错或缺固定节 |
| 1 | 骨架在，格式错；或原理篇标题树混乱 |
| 2 | 符合 writing-rules；原理 **###** 层次可扫；**§5.3.A pass** |
| 3 | 论证线一眼可扫；各原理节路标清晰；长节已按机制拆分 |

### Q3 图谱冗余

| 分 | 锚定 |
| --- | --- |
| 0 | 大段重复；无链 |
| 1 | 重复叙述；该拆未拆 |
| 2 | 一处权威；延伸阅读闭合 |
| 3 | 与 map 分层一致；可作引用锚点 |

### Q4 呈现与阅读

| 分 | 锚定 |
| --- | --- |
| 0 | 难读；无契约；纯 bullet |
| 1 | 晦涩；目录式过渡；图/表孤悬 |
| 2 | 易读；顺畅读完原理段；可扫描、知止；**§5.3.B pass** |
| 3 | 深内容仍好跟；节间机制衔接；图文前后文完整、图题自解释 |

### Q5 边界诚实

| 分 | 锚定 |
| --- | --- |
| 0 | 无边界；相关当因果 |
| 1 | 边界模糊；叙事框架易误导优先级 |
| 2 | non-goals 明确；`stability` 与语气一致 |
| 3 | 易混概念对照表；**核心叙事并列/层级关系**写清 |

### Q6 可验证性

| 分 | 锚定 |
| --- | --- |
| 0 | 无出处或死链 |
| 1 | 有链未对应段落 |
| 2 | 延伸阅读分库内/外 |
| 3 | 版本敏感处有日期；**§5.4 pass**（验真日志或诚实限定） |

---

## 附录 C — major 类型

| type | 触发 | fix 方向 |
| --- | --- | --- |
| `unconditioned_causality` | §5.1 fail | 为因果句补条件/范围/反例 |
| `weak_principle_outline` | §5.3.A fail | 重排 ###、补节首路标、按问题→机制→抉择组织 |
| `weak_visual_integration` | §5.3.B fail | 补图题、图前引入、图后结论；拆表或降负荷 |
| `format_without_mechanism` | §5.2 fail | 补机制 prose，非加表 |
| `unverified_external_claim` | §5.4 fail | WebFetch 或删/降级断言；补 verification_log |
| `other` | blocker 以外显著缺陷 | 具体可验证修改 |

---

## 关联

| 文件 | 关系 |
| --- | --- |
| `writing-rules.md` | G / Q2 |
| `docs/STRUCTURE.md` | G5 / Q3 |
| `.cursor/skills/ai-tell-ai-knowledge-doc` | 写作产出 |
| `.cursor/skills/article-scoring-evolve` | **对抗进化循环**（四席分离、§2.5 执行契约、落盘 `_meta/article-reviews/`） |
