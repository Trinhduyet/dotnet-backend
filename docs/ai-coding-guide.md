# AI coding workflow

AGENTS is the project context entrypoint where supported; native skills are discovered
separately. Claude's CLAUDE instructions and Cursor's configured project rules also
remain authoritative. Do not assume AGENTS alone configures every host. See
[compatibility](COMPATIBILITY.md) for verified sources and session limitations.

Select by requested work, not by a keyword alone: implementation, review, testing,
debugging, API contract, database or deployment preparation. The canonical namespace
is `dotnet-*`. Each skill is self-contained; development's optional examples live
inside its folder. Rules are installed once, are not auto-promoted to project policy,
and never replace existing contracts or the consumer's test/deploy gate.

Precedence: direct task → applicable consumer/scoped instructions and approved
decisions/security/business contracts → real source/test evidence → toolkit defaults.
If code and contract disagree, report the difference. Stop the affected action when
a conflict cannot be reconciled safely. Do not ask repeatedly for an action already
authorized, but do not infer deployment/destructive permissions from a skill selection.

Repository PROJECT memory owns verified current state; DECISIONS owns approved
durable choices and supersession history. The [templates](../templates/memory/PROJECT.md)
are optional consumer starting points. Do not rewrite memory for typos/test logs or
store credentials. Never update account/global AI memory without explicit user request.

Read relevant context → inspect implementation → minimal coherent change → meaningful
verification → diff review → owning docs/authorized memory → honest report. Use only
the workflow needed; no mandatory subagents, global lifecycle hook or test orchestrator.
The host's permission checks remain in force.

Validation ownership: policy checks inventory/links/install state; skill validation
checks YAML/spec/resource references and narrow trust patterns; verify-toolkit sequences
tests/spec/eval-fixture checks. The .NET completion gate belongs to optional full mode.
None of these prove all security, live provider readiness or model task quality.
Run checks manually/CI; host hooks require separately verified configuration.

[Authoring](SKILL-AUTHORING.md) documents evaluation transcripts, negative activation,
and limitations.
[Installation](INSTALLATION.md) owns copy/update/removal.
