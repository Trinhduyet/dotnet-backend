# Compatibility and evidence

Directory sources verified 2026-10-14:

| Host | Project | User | Primary source |
| --- | --- | --- | --- |
| Codex | `.agents/skills/` | `~/.agents/skills/` | [OpenAI skills documentation](https://developers.openai.com/codex/skills) |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` | [Cursor skills documentation](https://cursor.com/docs/skills) |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` | [Claude skills documentation](https://code.claude.com/docs/en/skills) |

Local native copies need no plugin manifest. Do not infer a marketplace import
schema from these directories. No official vendor review or marketplace publication
is claimed. Avoid multiple same-name installations; host precedence differs.

## Status meanings

- **Spec-compliant:** metadata passes the official Agent Skills reference validator.
- **Agent-compatible:** installed and observed on a named agent/version, with scope
  stated (discovery versus actual task execution). Filesystem layout alone is insufficient.
- **Marketplace-ready:** the chosen marketplace's packaging/review/assets are prepared;
  neither specification nor directory copying implies this or official approval.

The release verification report records exact final executions. Filesystem install,
update/removal and resource integrity are tested for all three adapters at project
and simulated user scope on Windows. Codex CLI available here is
`0.162.0-alpha.17.2`; its actual local app-server `skills/list` discovered all seven
enabled repository skills, and forceReload after uninstall discovered none. This is
**Agent-compatible for observed project discovery/removal**, not a model task-quality
claim. No LLM request was sent. Cursor CLI reports `3.12.17`, but version output does not prove IDE
Agent discovery/task behavior. Claude Code CLI is absent in this environment.
Until an actual observation is recorded, Cursor/Claude remain documentation-aligned,
not agent-execution-tested. Live model task-quality requires transcripts and artifacts.

Restart/reload the host, inspect its discovered skills and invoke a named skill first.
Codex scans relevant `.agents/skills` ancestors; user skills are global. Cursor can
also read compatible skill directories, so installing for several hosts may duplicate
names. Claude local personal skills are not automatically available in cloud sessions.
Project trust/admin policies may suppress local skills. Check the current official
docs for the particular deployed version/session; these limitations are not permissions
to change organization policy.

AGENTS context and skill discovery are separate. Consumer CLAUDE/configured Cursor
instructions remain intact; manually reference project context as the host supports.
No adapter rewrites them. Linux/macOS commands use portable Node filesystem/process
APIs, but execution evidence from this machine is Windows unless the report says otherwise.

## Verification checklist for an operator

1. Preview/apply a reviewed version in an authorized disposable project.
2. Record host version, target scope and selected skills; verify actual selector/list.
3. Explicitly invoke each relevant skill with the [evaluation cases](SKILL-AUTHORING.md).
4. Record actual tool actions, patch and test/provider evidence, not just a good reply.
5. Verify update/uninstall and reload. Compare negative activation cases.
6. Report unsupported/cloud/admin-policy cases rather than claiming universal support.
