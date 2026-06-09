# task-doc-codebase-mechanism-deep-dive checklists

## Hard-gate checklist

- [ ] Canonical repo / official source identified
- [ ] Version/source snapshot aligned or explicitly bounded
- [ ] Main execution questions defined before deep reading
- [ ] Startup path has at least one direct source anchor
- [ ] Main loop / orchestration path has at least one direct source anchor
- [ ] State boundary has at least one direct source anchor
- [ ] Extension/tool/provider boundary has at least one direct source anchor when relevant
- [ ] Major mechanism claims are not based on docs-only assumption when code was accessible
- [ ] No code-dump style sections
- [ ] Engineering lessons extracted, not omitted
- [ ] References is last section
- [ ] Final handoff includes `source_map_evidence`

## Composition checklist

- [ ] Metadata table immediately below title
- [ ] Numbered heading spine is contiguous
- [ ] Each main `##` opens paragraph-first
- [ ] Visible bold emphasis exists across body sections
- [ ] At least one Mermaid exists for non-trivial topics
- [ ] At least one analytical table exists for non-trivial topics
- [ ] Lists do not dominate the prose
- [ ] File names/modules are evidence, not the only narrative

## Verification checklist

- [ ] Net character count recorded (Chinese docs)
- [ ] Readability scan recorded
- [ ] Key files/docs inspected are listed
- [ ] Covered questions are listed
- [ ] Inference-only claims are marked or softened
- [ ] Any docs-vs-code divergence is captured
