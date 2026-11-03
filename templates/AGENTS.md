# Project AI instructions

Read this file, `memory/PROJECT.md`, relevant ACTIVE entries in
`memory/DECISIONS.md`, then only the source and contracts needed for the task.

Use `.backend-common/skills/dotnet-development/SKILL.md` for implementation,
`.backend-common/skills/dotnet-code-review/SKILL.md` for review, and
`.backend-common/skills/dotnet-testing/SKILL.md` for tests.
Choose the installed debugging/API/database/deployment workflow only when its
specific task applies. Native installation uses the selected agent's skills root;
this template is only for optional full-copy mode.
Project-specific skills live in `skills/`; list relevant ones here when added.

Follow `.backend-common/rules/coding.md`, `.backend-common/rules/security.md`,
and `.backend-common/rules/definition-of-done.md`.
Architecture/testing defaults are under `.backend-common/rules/`; project policies win.
Precedence: explicit task instruction → ACTIVE project decisions → project rules
→ common defaults. Surface conflicts; mandatory security controls must not be
silently disabled. Current code is evidence, not automatic authority to erase a contract.

Run `node .backend-common/scripts/completion-gate.mjs` at project root; use
`--docs-only` only for documentation-only changes. Configure an ambiguous target
in `.backend-common.json` as described in `.backend-common/docs/getting-started.md`.
Standard tests must use local isolated dependencies; live runners stay opt-in.

Keep changes within the request. Do not edit managed `.backend-common/` files for
application work. Put local decisions here or in project memory; update common
from a separate release checkout using its installer and review the dry-run.
Report validation evidence and whether project memory changed. Memory means these
repository files, never the account/global AI memory store.
