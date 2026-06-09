# task-doc-codebase-mechanism-deep-dive reference

This companion file stores detail-heavy rules for source-grounded deep-dive writing.
`SKILL.md` remains the execution spine. This file elaborates retrieval, source mapping, composition, and validation details.

## Retrieval and source-mapping protocol

### Required retrieval layers

For non-trivial codebase deep dives, the minimum retrieval stack is:

1. **Intent layer:** official docs / README / architecture pages / release notes that explain what the system claims to do.
2. **Version layer:** package manifest, lockfile, release tag, pyproject/package files, or authoritative docs version markers.
3. **Structure layer:** repo tree, key directories, canonical entrypoints, and extension/plugin folders.
4. **Mechanism layer:** bounded set of source files that reconstruct main execution flow and responsibility boundaries.
5. **Reality-check layer:** issues, discussions, tests, or docs-vs-code divergence evidence when behavior is ambiguous.

Quality-first rule: do not inflate file counts. A smaller but causally central file set is better than shallowly scanning many files.

### Recommended execution order

1. Determine repo mode: upstream remote, local checkout, or mixed.
2. Align version/source snapshot before making version-sensitive claims.
3. Identify the main execution question set, for example:
   - what is the startup entrypoint?
   - where is the main orchestration loop?
   - where are tools/extensions/providers registered?
   - where is state persisted or restored?
   - what boundaries exist between CLI, runtime, and storage?
4. Build an initial file candidate list from docs/tree/layout.
5. Read the smallest set of files needed to confirm each question.
6. Produce a source map before drafting prose.

### Source-map contract

Before prose drafting, prepare an internal map with at least these columns:

| Question | Evidence file / doc | Why this source matters | Confidence | Notes |
| --- | --- | --- | --- | --- |
| startup entrypoint | `...` | confirms process bootstrap | high/med/low | ... |
| main loop | `...` | reconstructs control path | high/med/low | ... |
| state boundary | `...` | shows persistent vs transient state | high/med/low | ... |

This does not need to be fully exposed verbatim in the article, but the final handoff must summarize it via `source_map_evidence`.

## Composition rules

### Borrowed baseline from `task-doc-tech-topic-overview`

Unless the user explicitly wants a different style, inherit these patterns:

- metadata table immediately after title
- numbered spine and scan-friendly hierarchy
- paragraph-first writing with controlled list density
- visible bold emphasis across body sections
- at least one Mermaid and one table for non-trivial long-form outputs
- evidence-complete final handoff

### Deep-dive-specific structure guidance

A strong default spine is:

- `## 1.` Why this codebase/mechanism matters and what question the deep dive answers
- `## 2.` End-to-end execution path
- `## 3.` Responsibility split and persistent/runtime boundaries
- `## 4.` Engineering lessons / trade-offs / what to borrow
- `## References`

Optional extra sections may cover extension systems, failure handling, or docs-vs-code divergence if they materially help the reader.

### Mechanism-first writing rule

For each important `###` subsection, prefer the sequence:

1. the reader question,
2. the answer,
3. the file/module evidence,
4. the interpretation or engineering lesson.

Do not open a section with raw filenames alone. Files are evidence, not the narrative.

### Code-snippet policy

Use snippets sparingly and only when one of these is true:

- the dispatch or control decision is easier to understand from a short excerpt,
- a state schema / interface contract matters,
- a surprising invariant or guardrail would be too vague if paraphrased only.

Rules:

- prefer short excerpts over long blocks,
- summarize before and after the snippet,
- never rely on a raw snippet without explanation,
- if a snippet is omitted, still name the file/symbol that grounded the claim.

### Engineering-lesson rule

A deep dive is incomplete if it stops at “here is how it works.”
For each major mechanism cluster, ask:

- what design pressure likely created this structure?
- what trade-off is being paid for?
- what can another team borrow safely?
- what only makes sense in this project’s specific context?

## Visual rules

### Mermaid expectations

Use Mermaid to reconstruct at least one of:

- startup/control-flow path,
- runtime state transitions,
- module interaction boundaries,
- plugin/tool/provider decision path.

Prefer diagrams that help a reader understand causality, not folder listings.

### Table expectations

Useful tables include:

- module responsibility matrix,
- source map summary,
- runtime state category table,
- trade-off / boundary table.

Avoid tables that merely restate filenames without analytical value.

## Verification evidence requirements

### Minimum executable or explicit checks

Record concrete verification evidence for:

- Chinese net character count (for Chinese docs)
- section-level list density or equivalent readability scan
- presence of visible emphasis across body sections
- Mermaid count and table count
- source-map completeness: whether each primary mechanism question has at least one traceable source anchor

### Source-aware verification notes

Final `verification_evidence` should mention:

- how many key files/docs were actually inspected,
- whether startup path, main loop, extension boundary, and state boundary were all covered,
- whether any major claim remains inference rather than direct confirmation,
- whether docs-vs-code divergence was found.

## Failure and escalation conditions

Stop and narrow scope or ask for confirmation when:

- the repo is too large to excavate fully and the user did not prioritize questions,
- version cannot be aligned,
- the canonical upstream cannot be identified,
- key files are inaccessible,
- the article would otherwise overstate confidence.

## Suggested handoff evidence shape

```json
{
  "retrieval_evidence": ["official docs", "repo tree", "release/version file"],
  "version_evidence": "project version X aligned with source snapshot Y",
  "decision_evidence": "focused on files A/B/C because they sit on the main execution path",
  "verification_evidence": {
    "net_chars": 0,
    "mermaid_count": 1,
    "table_count": 1,
    "key_questions_covered": ["startup", "main_loop", "state_boundary"]
  },
  "source_map_evidence": [
    {"question": "startup", "source": "run_agent.py", "why": "bootstrap entry"}
  ]
}
```
