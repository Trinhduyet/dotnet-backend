# Toolkit maintenance instructions

Read [README](README.md) and only affected source/contracts. Select [dotnet-development](skills/dotnet-development/SKILL.md),
[dotnet-code-review](skills/dotnet-code-review/SKILL.md), or
[dotnet-testing](skills/dotnet-testing/SKILL.md); the seven canonical skills and their
distinct triggers are listed in README. This task's explicit toolkit request supersedes
the old three-skill limit. Do not recreate generic-name aliases in the canonical tree.

Follow [coding](rules/coding.md), [architecture](rules/architecture.md),
[security](rules/security.md), [testing](rules/testing.md) and
[done](rules/definition-of-done.md). Consumers' scoped instructions, approved
architecture/business decisions and security constraints precede toolkit defaults.
Code is evidence; surface contract conflicts instead of silently erasing them.

Preserve full-copy installation/recovery and unrelated human changes. Native copies
are selected artifacts from one canonical source; no adapter may duplicate the tree.
No business schema, runtime application framework, vendor auth or live deployment here.
Reference repositories and business consumers are read-only unless the user explicitly
authorizes a consumer change. Use disposable projects for all write tests.

Activate the validation venv and run `node scripts/verify-toolkit.mjs`; optionally
select its Python with `--python <executable>`. The retained `completion-gate.mjs`
is the consumer .NET entrypoint and remains valid for full installation.
Run real consumer checks when changing copyable API examples or installed gate behavior.
Report exact outcomes and separate fixture checks, real discovery, live task-quality,
server CI and marketplace approval. Common has no account/global memory update workflow.
