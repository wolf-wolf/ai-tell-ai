# article-scoring-evolve — 四席 Prompt、落盘与失败契约

契约：[article-scoring.md](../../../article-scoring.md) §2.5、§5.4。

---

## Panel Brief（共用）

```markdown
目标：<ARTICLE_PATH>
全流程：合规 → 突破（自动，禁止问用户配置）
stretch_axes：由父 agent 按 article-scoring §2.4 算法自动计算
合规里程碑：done=true；全流程停止：breakthrough_done=true 且 run_status=ok
用户说「只合规」时：done=true 可停，跳过突破
执行：四席必须 Task 子 agent；失败则 run_status=incomplete，禁止父 agent 代打
```

---

## 落盘契约（硬门禁）

**路径**：`_meta/article-reviews/<slug>-r<round>.json`

```python
# slug 例：docs/methodology/harness-engineering.md → methodology-harness-engineering
slug = path.removeprefix("docs/").removesuffix(".md").replace("/", "-")
```

**文件内容**：合并当轮所有席 JSON + 父 agent 元数据：

```json
{
  "article": "docs/...",
  "round": 1,
  "phase": "compliance",
  "run_status": "ok",
  "incomplete_reason": null,
  "seats": {
    "scoring-adversary": "ok",
    "content-evolver": "ok",
    "breakthrough-challenger": "skipped",
    "breakthrough-explorer": "skipped"
  },
  "score_report": { },
  "gap_report": null,
  "evolver_report": null,
  "verification_log": []
}
```

**规则**：

- 父 agent **先 Write 落盘**，再允许改 `docs/` 文章  
- `run_status=incomplete` 时文件仍须落盘（记录失败席位与原因）  
- 目录不存在则创建

---

## 子 agent 失败处理（禁止假装成功）

父 agent 收到 Task 失败（含 **usage limit**、timeout、空返回）时：

```json
{
  "run_status": "incomplete",
  "incomplete_reason": "subagent_rate_limit",
  "seats": {
    "scoring-adversary": "failed",
    "content-evolver": "pending",
    "breakthrough-challenger": "skipped",
    "breakthrough-explorer": "skipped"
  },
  "action": "incomplete",
  "done": false,
  "breakthrough_done": false
}
```

**必须**：

1. 落盘上述 JSON  
2. **停止**本轮；不改被评文章  
3. 向用户说明：哪一席失败、原因、已落盘路径、建议稍后重试  

**禁止**：

- 父 agent 自行补打分、补改文后继续  
- 输出 `breakthrough_done=true` / `done=true` / tier A 终态  
- 写「3 轮已完成」类成功摘要  

`incomplete_reason` 枚举见 article-scoring §2.5。

---

## Phase 合规

### scoring-adversary（Task，只读）

```markdown
role_id: scoring-adversary
primary_question: "Per article-scoring.md, what blocks done=true or breakthrough_done?"
primary_lens: falsification + rubric enforcement — score harshly
must_answer: full score_report JSON per article-scoring §3; score_notes per Q
must_not: edit files; suggest rewrites (only majors/next_fixes); inflate scores
unique_failure_mode: passing tier A while conditional causality or visual_reading fail
```

**读取**：`article-scoring.md`、`<ARTICLE_PATH>`、当轮 `verification_log`（若有）。

**输出**：`score_report`  alone（`phase: "compliance"` 或 `"breakthrough"`），含 `run_status: "ok"`、`seats` 仅 adversary=`ok`。

### content-evolver（Task，可写）

```markdown
role_id: content-evolver
primary_question: "Given adversary majors/next_fixes, what minimal patches fix them?"
primary_lens: surgical patch — compliance ceiling only
must_answer: evolver_report with files_changed[]; list patches tied to major ids
must_not: add ### ; restructure sections; self-score; patch if adversary missing
```

**输入**：当轮 adversary `score_report`（落盘路径或内联）。

**输出 JSON**：

```json
{
  "role_id": "content-evolver",
  "phase": "compliance",
  "patches_applied": [
    {"major_type": "weak_visual_integration", "location": "表 1", "summary": "补读表 takeaway"}
  ],
  "files_changed": ["<ARTICLE_PATH>"]
}
```

---

## Phase 突破

### breakthrough-challenger（Task，只读）

```markdown
role_id: breakthrough-challenger
primary_question: "On stretch_axes_auto, what structural bet breaks the local optimum?"
primary_lens: inversion + second-order — hunt local optimum
must_answer: per-axis 2→3 gap; ≥1 structural_bet; auto-pick recommended_bet_id
must_not: ask user which bet; duplicate compliance majors; edit files
unique_failure_mode: recommending more adjectives instead of new mechanism layer
```

**输入**：父 agent 传入当轮 `stretch_axes_auto`（已计算，非用户指定）。

**Task 输出 JSON**：

```json
{
  "role_id": "breakthrough-challenger",
  "phase": "breakthrough",
  "gap_report": {
    "stretch_axes": ["Q1", "Q4"],
    "gaps": [
      {
        "axis": "Q1",
        "current_ceiling": "2",
        "missing_for_3": "无完整因果链含断点/反例；机制未覆盖主要失败模式",
        "evidence": "§核心设计问题 有四段抉择但无统一因果图串联"
      }
    ],
    "structural_bets": [
      {
        "id": "bet-1",
        "type": "补层",
        "target": "## 核心原理 · 核心设计问题",
        "hypothesis": "增加「四抉择联动」小节+失败模式表可抬 Q1→3",
        "risk": "篇幅变长需 Q4 同步",
        "falsifier": "读者仍说不出四抉择如何相互制约"
      }
    ],
    "recommended_bet_id": "bet-1"
  }
}
```

**`structural_bet.type` 定义**（须对应 article-scoring §2.4）：

| type | 做什么 |
| --- | --- |
| 重组 | 改 `###` 顺序或合并拆分 |
| 补层 | 新增反例/失败模式/walkthrough/差异段 |
| 抬天花板 | 因果链、图示叙事达到 Q3 锚定 |
| 删减 | 删重复或挡深度的段落 |

### breakthrough-explorer（Task，可写）

```markdown
role_id: breakthrough-explorer
primary_question: "Execute exactly ONE structural_bet this round — how?"
primary_lens: mechanism-first restructuring
must_answer: concrete diff; breakthrough_moves[]; which bet id
must_not: execute multiple bets; compliance-only patches; score self
```

**每轮只选 `recommended_bet_id`**，实施后可：

- 重写整段 `###` prose
- 新增一个 `###`（原理篇内）
- 移动段落跨 `###`
- 删节（须在 `breakthrough_moves` 说明删了什么壁垒）

若 bet 涉及外链/框架描述 → 父 agent 在 explorer 后执行 **WebFetch**，写入 `verification_log`（§5.4）。

**回报**：

```json
{
  "role_id": "breakthrough-explorer",
  "phase": "breakthrough",
  "bet_executed": "bet-1",
  "breakthrough_moves": [
    {"type": "补层", "location": "## 核心原理", "summary": "新增 ### 四抉择如何相互制约 + 失败模式表"}
  ],
  "files_changed": ["<ARTICLE_PATH>"]
}
```

### 突破后复评

**必须**再次 Task `scoring-adversary`（不可父 agent 自评）：

- `phase: "breakthrough"`
- 显式判 `stretch_axes` 各维是否 ≥3
- `checks.external_verification`（§5.4）
- 输出 `breakthrough_done` 按 §2.4（且 `run_status=ok`）

---

## verification_log（§5.4）

突破轮改动了外部框架/产品断言时，落盘 JSON 须含：

```json
{
  "verification_log": [
    {
      "url": "https://langchain-ai.github.io/langgraph/...",
      "fetched_at": "2026-06-05",
      "status": "ok",
      "claim_supported": "partial",
      "note": "durable execution 有原文；可视化非主卖点"
    }
  ]
}
```

`status=failed` 时：正文须降级断言或标「未逐页核对」，否则 `external_verification=fail`。

---

## 父 agent 决策树（默认，勿问用户）

```
if any_required_seat_task_failed:
  run_status=incomplete; artifact write; STOP (no doc edit)
elif user said "只合规" && done && run_status=ok:
  stop; report done only
elif !done:
  compliance round (adversary → artifact → evolver → adversary → artifact)
elif !breakthrough_done:
  if candidates empty:
    adversary confirms no gap → breakthrough_done (if run_status=ok)
  else:
    stretch_axes_auto = auto_derive(scores)
    breakthrough round (challenger → explorer → fetch? → adversary → artifact)
else:
  stop; report breakthrough_done
```

### stretch_axes_auto 伪码

```python
PRIORITY = ["Q1", "Q4", "Q5", "Q2", "Q3", "Q6"]
candidates = [q for q in PRIORITY if scores[q] == 2]
stretch_axes_auto = candidates[:2]
```

---

## `/loop` sentinel

```bash
echo 'AGENT_LOOP_TICK_article-scoring-evolve {"prompt":"article-scoring-evolve <PATH> 直到 breakthrough_done 且 run_status=ok"}'
```

上一轮 `run_status=incomplete` → **不得**挂下一 tick；向用户报失败。

---

## 合规 major 速查

（同 article-scoring 附录 C，含 `unverified_external_claim`）

---

## 突破 vs 合规 — 改动幅度对照

| | 合规 content-evolver | 突破 breakthrough-explorer |
| --- | --- | --- |
| 改句补条件 | ✅ | 仅当 bet 需要 |
| 补图题/路标 | ✅ | ✅ |
| 新增 `###` | ❌ | ✅ |
| 重写整节论证 | ❌ | ✅ |
| 删重复挡深度段 | ❌ | ✅ |
| 调整 `###` 顺序 | ❌ | ✅ |
| WebFetch 验真 | 可选 | 改外链断言时**必须** |
