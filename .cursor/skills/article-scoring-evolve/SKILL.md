---
name: article-scoring-evolve
description: >-
  Default full co-evolution on docs/ articles: compliance until done=true, then
  automatic breakthrough until breakthrough_done=true. Enforces four-seat
  separation, per-round JSON artifacts, and run_status=incomplete on subagent
  failure—never fake success. Use for 评分循环、对抗进化、article-scoring、/loop optimize wiki nodes.
---

# 知识文章评分对抗进化

[article-scoring.md](../../../article-scoring.md) 驱动 **默认全流程**：**合规 → 突破 → 停**。用户**无需**指定突破轴、模式或轮数。

| 阶段 | 自动触发 | 停止 |
| --- | --- | --- |
| 合规 | 打开 skill 即开始 | `done=true` 且 `run_status=ok` |
| 突破 | `done=true` 后**自动**进入 | `breakthrough_done=true` 且 `run_status=ok` |

**全流程唯一停止条件**：`breakthrough_done=true` **且** `run_status=ok`。  
仅当用户显式「只合规 / 不要突破」时，可在 `done=true` 停止。

**写作**：[ai-tell-ai-knowledge-doc](../ai-tell-ai-knowledge-doc/SKILL.md)。**本 skill**：评、改、自动进化。

## 父 agent 硬规则（不可问用户）

1. **禁止**向用户索要 `stretch_axes`、`evolution_mode`、突破轮数  
2. `done=true` 后**必须**进入突破，不得默认收工  
3. 每轮突破前用 §2.4 算法计算 `stretch_axes_auto`  
4. **四席必须用 Task 子 agent**；父 agent **不得**代评、代改后报成功  
5. **子 agent 限流/失败** → `run_status=incomplete`，`action=incomplete`，**立即停止改文**，向用户如实报失败  
6. **无当轮 adversary JSON 落盘** → 禁止 patch 被评文章  
7. `/loop` 的停止条件是 `breakthrough_done` **且** `run_status=ok`，不是 `done`

## 执行门禁（§2.5）

每轮顺序**不可跳过**：

```text
1. Task → scoring-adversary（或 breakthrough 链中的 challenger）
2. 落盘 _meta/article-reviews/<slug>-r<N>.json
3. 若 run_status=ok → Task → evolver / explorer
4. Task → scoring-adversary 复评
5. 落盘 r<N>-post.json（或合并为一步 post 段）
6. 判 done / breakthrough_done / incomplete
```

| 违规 | 后果 |
| --- | --- |
| Task 返回 usage limit / 错误 / 无 JSON | `incomplete_reason=subagent_rate_limit` 或 `subagent_error` |
| 父 agent 自己打分并改文 | `incomplete_reason=parent_substitution` |
| 无落盘就改 `docs/` 文章 | `incomplete_reason=missing_adversary_report` |
| 报 `breakthrough_done` 但 seats.adversary≠ok | **假装成功 — 禁止** |

**对用户**：`incomplete` 时只报失败原因、已完成轮次、落盘路径；**禁止**附自评满分 JSON 充当结果。

## 流程

```
合规: adversary(Task) → 落盘 → evolver(Task) → adversary 复评(Task) → … → done=true
        ↓（自动，无需用户确认）
突破: stretch_axes_auto → challenger(Task) → explorer(Task) → adversary 复评(Task) → …
```

### Phase 1 — 合规

`scoring-adversary`（只评）→ `content-evolver`（只 patch majors）。上限 `max_rounds=5`。

### Phase 2 — 突破（默认必有）

**`stretch_axes_auto`**（article-scoring §2.4）：

```text
candidates = { Qx | scores[Qx] == 2 }
priority = Q1 > Q4 > Q5 > Q2 > Q3 > Q6
stretch_axes_auto = top-2(candidates by priority)
candidates 为空 → 可 breakthrough_done（须 adversary 确认无 gap）
```

每轮：

1. 计算 `stretch_axes_auto`  
2. **breakthrough-challenger**（Task）：`gap_report` + `structural_bets` + `recommended_bet_id`  
3. **breakthrough-explorer**（Task）：执行该 bet（每轮 1 个结构变动）  
4. 若改动了外链/框架断言 → **WebFetch** 并写入 `verification_log`（§5.4）  
5. **scoring-adversary**（Task）复评  
6. 判 `breakthrough_done` / `incomplete` / 继续（上限 `max_breakthrough_rounds=3`）

突破授权：重组 `###`、补机制层、删挡深度段、重写论证——合规 evolver **不能做**。

## 角色隔离

| 角色 | 合规 | 突破 | 失败时 |
| --- | --- | --- | --- |
| scoring-adversary | 只评 | 复评 | 本轮 `incomplete`，不改文 |
| content-evolver | patch majors | — | 本轮 `incomplete`，不进入复评 |
| breakthrough-challenger | — | gap + bet | 本轮 `incomplete`，explorer 不得启动 |
| breakthrough-explorer | — | 执行 bet | 本轮 `incomplete`，不进入复评 |

## 参数（内置默认，用户不传）

| 内置 | 值 | 用户可覆盖 |
| --- | --- | --- |
| 全流程 | 合规→突破 | 仅「只合规」可截断 |
| `target_tier` | A | 显式 B |
| `max_rounds` | 5 | 极少需要 |
| `max_breakthrough_rounds` | 3 | 极少需要 |
| `stretch_axes` | **auto** | 不建议 override |
| `artifact_dir` | `_meta/article-reviews/` | — |

## 每轮回报

```text
phase=… | round=N | run_status= | done= | breakthrough_done= | stretch_axes_auto=[…] | action= | 摘要
```

- `run_status=ok`：附 `score_report`；突破轮附 `gap_report`、`breakthrough_moves`  
- `run_status=incomplete`：附 `incomplete_reason`、`seats`、落盘路径；**无**虚假终态分

## `/loop`

- 停止：`breakthrough_done=true` **且** `run_status=ok`  
- `incomplete` → **停止 loop**，不挂下一轮 sentinel，等用户重试  
- `done=true` 后 loop **继续**突破，不退出（除非 `incomplete`）

## 自检

- [ ] 未向用户询问突破配置  
- [ ] 每轮有四席 Task 或明确 `incomplete`  
- [ ] 子 agent 失败时未假装成功  
- [ ] `_meta/article-reviews/<slug>-r*.json` 已落盘  
- [ ] `done=true` 后进入了突破（除非用户只要合规）  
- [ ] `stretch_axes_auto` 按优先级算法计算  
- [ ] 突破轮有 §2.4 结构变动，非纯措辞  
- [ ] 外链断言有 `verification_log` 或诚实限定（§5.4）

## 示例（用户只说路径即可）

```text
用 article-scoring-evolve 优化 docs/algorithms/ann.md
```

```text
/loop 15m article-scoring-evolve docs/methodology/foo.md
```

## 配套

[reference.md](reference.md)
