---
name: task-doc-codebase-mechanism-deep-dive
description: >-
  Retrieval-first handbook for producing repo-backed mechanism deep-dive Markdown documents.
  Optimized for source-grounded explanations of execution paths, module boundaries, invariants,
  runtime trade-offs, and engineering lessons. Reuses the long-form composition discipline of
  task-doc-tech-topic-overview while adding explicit code-evidence gates.
---

# Codebase Mechanism Deep Dive Document

Write an article-style `.md` document that explains how a real codebase works at mechanism level, using repository/source evidence rather than concept-only summary.

## When to use

Use when:

- The user wants **source-level** explanation: execution paths, module boundaries, invariants, and trade-offs **backed by this repo’s code or config**.
- The deliverable is a **reader-facing mechanism article** (not just a one-line fix) that says how the system is actually wired.
- Official docs are insufficient and you must ground claims in **file:line**-style evidence per this skill’s gates.

Do not use when:

- The user only needs a **general-tech “what is X”** overview with no repository walk—use `task-doc-tech-topic-overview`.
- The primary output is a **future design** or **技术方案** for new work—use `task-doc-technical-solution-design` (optionally plus a small code cite), not a mechanism deep-dive.
- The task is **bugfix/patch only** with no article deliverable.

## Dependency skills

Recommended upstream skills:
- `prof-doc-document-baseline`
- `prof-gov-retrieval-first-reliability`

If these dependency skills are unavailable, still enforce the fallback rules below.

## Minimum fallback rules

- Output language follows explicit user override first, otherwise dominant session language.
- Retrieve authoritative/canonical sources before secondary commentary.
- Do not deliver final output when key claims lack traceable evidence.
- Final handoff must include artifact path, retrieval_evidence, version_evidence, decision_evidence, and verification_evidence.


## Mandatory borrowing rule

This skill should actively borrow the document-composition strengths of `task-doc-tech-topic-overview` before adding deep-dive-specific constraints.

- Reuse or mirror its strong patterns for metadata, spine, emphasis, readability, visual rhythm, and evidence-complete handoff.
- Add new constraints only where source-level excavation creates a genuinely different requirement shape.
- Do not regress into code-dump style or notebook-style rough notes merely because the topic is source-heavy.

## Reliability hard gates (must-pass)

- If repository access, canonical upstream source, or critical files/entrypoints cannot be retrieved with enough confidence, do not deliver a mechanism conclusion as settled fact.
- If the project/runtime version cannot be aligned with the cited source snapshot for version-sensitive claims, stop and ask for corrected scope or source.
- If key mechanism claims are not backed by file-level evidence, docs, or directly inspectable execution-path anchors, fail the draft and continue retrieval.
- If the same blocker repeats for 2 rounds, stop and escalate to the user.

## Evidence contract (required)

Final response must include:

- `artifact_path`
- `retrieval_evidence`
- `version_evidence`
- `decision_evidence`
- `verification_evidence`
- `source_map_evidence`

## Quick execution path (default)

1. Confirm target repo / canonical source and determine whether analysis is upstream-repo, local-repo, or mixed mode.
2. Run a pre-write reasoning loop: retrieve project/version baseline, borrow composition constraints from `task-doc-tech-topic-overview`, then form and refine a mechanism-analysis plan before drafting.
3. Retrieve documentation/context sources first: official docs, canonical repo structure, release/version files, maintainer notes.
4. Run source discovery to identify likely entrypoints, orchestrators, state holders, tool/extension registries, persistence boundaries, and CLI/runtime seams.
5. **Mandatory Deep-Read Gate**: Run focused code reading on a bounded file set. You MUST use terminal or read_file to inspect the actual source code of at least 3 critical files on the execution path (excluding configs/READMEs) before proceeding.
6. **Mandatory Source Map**: Build a strict source map mapping mechanism questions to specific `file:line` or module anchors. Decide the narrative spine: startup -> control loop -> state/data -> extension/tooling -> operational boundaries -> engineering lessons.
7. Draft article skeleton + visual plan.
8. Write the full `.md` document. To prevent LLM over-summarization, you must explain the control flow step-by-step in full paragraphs; every `###` section must cite a specific code file, variable, or architectural constraint.
9. Run executable/self checks for structure, depth (minimum length expectations), evidence completeness, source-map completeness, and overuse of raw code dumping.
10. Return artifact path with compact evidence report.

## Hard required

### Source-grounded document requirements

- **Deliverable:** write exactly one Markdown file in workspace.
- **Metadata table:** directly under `#` title with length/reading time/date/difficulty.
- **Headings:** depth <= `####`; numbered hierarchy required.
- **Spine:** must include source-backed sections for system framing, execution mechanism, module/responsibility split, and engineering lessons; `## References` is always last.
- **Phased authoring (STRICT):** `source map -> skeleton -> reflection -> prose -> mechanism challenge review`. You MUST NOT write the final prose without having first retrieved the source code and formed the skeleton.
- **Borrow-before-fork rule:** mirror effective long-form composition constraints from `task-doc-tech-topic-overview` unless the source-heavy task needs stricter rules.
- **Emphasis baseline:** use visible bold emphasis in body prose for key invariants, execution pivots, trade-offs, and adoption boundaries.
- **Code evidence baseline (MANDATORY):** every major `###` mechanism section MUST cite at least one concrete file / module / symbol / runtime path anchor. General architectural claims without source references are prohibited.
- **Source-map baseline:** the document must surface a compact mapping from “question” to “where in code/docs it was answered”.
- **No code-dump rule:** snippets are allowed only when they materially clarify an invariant, dispatch rule, interface, or surprising behavior. Do not turn the article into pasted source.
- **Repository-backed mechanism requirement:** explain actual control flow and responsibility boundaries, not just package taxonomy or feature list.
- **Engineering takeaway requirement:** extract explicit “what teams can borrow / where to be careful” conclusions from the observed implementation.
- **Visual baseline (non-trivial):** at least one Mermaid and one table unless the user explicitly asks for text-only.

### Source use rules

- Prefer canonical repo files or official docs over secondary walkthroughs.
- Use docs to frame intent; use code to confirm runtime reality.
- When docs and code diverge, state the divergence explicitly instead of smoothing it over.
- For large repos, breadth-first skim first, then deep-read only the files that sit on the main execution path.
- If a claim depends on behavior you did not inspect, label it as inference and narrow the wording.

### Handoff requirements

Final handoff must include:

- artifact path
- analyzed mode (`upstream-repo`, `local-repo`, or `mixed`)
- `retrieval_evidence`
- `version_evidence`
- `decision_evidence`
- `verification_evidence`
- `source_map_evidence` with the key files / docs / modules inspected and why they matter

## Deliverable path

- Default output path: `docs/topic-overviews/<slug>-mechanism-deep-dive.md`
- If user provides a path, follow user path.

## ai-tell-ai 仓库联动（本 vault 优先）

当产出落在 **`ai-tell-ai` 知识库**（`docs/latest/`、`docs/agent/` 等）时：

1. **仍执行本 skill 全文**：检索 → source map → 至少 3 个关键源文件深读 → 证据门控 → 机制叙事。
2. **落盘格式改跟** [ai-tell-ai-knowledge-doc](../ai-tell-ai-knowledge-doc/SKILL.md)：Obsidian frontmatter、核心本质、生命周期、**`## 进一步阅读`**（非 `## References`）；**不要**正文元数据表（字数/阅读时间）。
3. **结构映射**见 [ai-tell-ai-knowledge-doc/references/codebase-deep-dive-bridge.md](../ai-tell-ai-knowledge-doc/references/codebase-deep-dive-bridge.md)。
4. **默认路径**：`docs/latest/<slug>.md`（产品实现深潜）或 STRUCTURE 决策树；用户指定路径优先。
5. **聊天 handoff** 仍须 `source_map_evidence` 等证据块；**用户可见 `.md` 文件**不写 evidence JSON，证据体现在 `#L` 深链与 `### 源码与 Prompt 原文`。

上游源 skill 目录：`~/Desktop/资料整理/.cursor/skills/task-doc-codebase-mechanism-deep-dive`（与本目录内容应保持同步）。

## Reference file ownership

`SKILL.md` is the execution spine. Detail-heavy rules, template patterns, and checklists live in `references/` and `templates/`.

Read these companion files before finalizing:
- `references/reference.md`
- `references/checklists.md`
- `templates/article-template.md`

## Companion files

- Template: `templates/article-template.md`
- Detailed rules: `references/reference.md`
- Checklists: `references/checklists.md`
