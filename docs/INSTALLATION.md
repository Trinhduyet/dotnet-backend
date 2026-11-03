# Installation and ownership

Use a trusted version-pinned checkout/archive, Node 22/24 and Python 3.11+ with
PyYAML. For maintainers, activate a venv and install `requirements-validation.txt`;
this includes the official specification validator. The **agent reading installed
skills** needs no toolkit runtime dependency. Installer/verification prerequisites
remain in the toolkit environment, not in application package references.

## Selected native copies (default onboarding)

From the toolkit checkout, with an existing target directory:

```powershell
node scripts/install.mjs --agent cursor --target ..\my-api --skills dotnet-development,dotnet-debugging --dry-run
node scripts/install.mjs --agent cursor --target ..\my-api --skills dotnet-development,dotnet-debugging
```

```sh
node scripts/install.mjs --agent claude --target ../my-api --skills dotnet-development,dotnet-testing --dry-run
node scripts/install.mjs --agent claude --target ../my-api --skills dotnet-development,dotnet-testing
```

Codex uses `--agent codex`. Target is relative to shell cwd (or absolute); source
resolution is independent of cwd. Selection is comma-separated canonical names.
On first installation omitted selection means all seven; on update it preserves the
installed selection. An explicit selection intentionally adds/removes selected skills.

| Agent | Root under project or explicit user home |
| --- | --- |
| Codex | `.agents/` |
| Cursor | `.cursor/` |
| Claude Code | `.claude/` |

Each root contains `skills/<selected-name>/` and one shared
`dotnet-backend-common/rules/` copy plus `manifest.json`. No README/docs/scripts/full
framework is required in consumers. No AGENTS/CLAUDE/README/memory/project rules are
created or edited by native installation. Adapters only map verified directories;
they are not plugin marketplace manifests. See [official sources](COMPATIBILITY.md).

User-level installation requires explicit scope and home. These PowerShell/POSIX
examples intentionally target the caller's chosen home; do not run them in a task
that authorized only project/demo installation:

```powershell
node scripts/install.mjs --agent codex --scope user --target $env:USERPROFILE --skills dotnet-code-review --dry-run
```

```sh
node scripts/install.mjs --agent claude --scope user --target "$HOME" --skills dotnet-testing --dry-run
```

Review the plan and omit `--dry-run` to apply. No symlink/administrator setup is
required. Existing colliding unowned files are refused even if contents match.
Hashes detect drift, not release authenticity. Do not install duplicate copies of
the same named skill across scopes/libraries; verify the actual host's discovery list.

## Updates, diagnostics, removal

Use the next reviewed checkout and the same target/agent/scope. Run dry-run first.
Same-version owned content replacement is rejected. Preserve project customizations
outside owned files; no force overwrite. Inspect status:

```sh
node scripts/install.mjs --agent codex --target ../my-api --status
node scripts/install.mjs --agent codex --target ../my-api --uninstall --dry-run
node scripts/install.mjs --agent codex --target ../my-api --uninstall
```

Status fails for absence, drift or incomplete transactions. Uninstall checks all
owned hashes and unknown files inside owned skill folders; it removes only owned
files, preserving unrelated skills/project context. Empty directories may remain.
No settings/global hooks/plugins are changed. Reload the agent after removal.

Native mutation uses an exclusive `dotnet-backend-common/.transaction/` journal under
the chosen agent root. It backs up changed files before writes, atomically replaces
individual files and commits only after all changes. Exceptions attempt rollback;
killed processes leave visible state and block subsequent operations. Recover using
the trusted toolkit checkout with the same agent/scope:

```sh
node scripts/install.mjs --agent codex --target ../my-api --recover
```

Changed files after interruption stop recovery and preserve both work and evidence.
Incomplete/corrupt journal preparation needs manual comparison, not deletion to force
success. Stop concurrent edits/installers. This is process-failure recovery, not
catastrophic-disk-loss protection or a multi-process package manager.

## Retained full-copy mode

Omit `--agent` for the existing optional `.backend-common/` model. It copies the full
release and creates missing project templates only; existing project files stay intact.

```sh
node scripts/install.mjs --target ../my-api --dry-run
node scripts/install.mjs --target ../my-api
node scripts/install.mjs --target ../my-api --recover
node scripts/install.mjs --target ../my-api --uninstall --dry-run
node scripts/install.mjs --target ../my-api --uninstall
```

Recovery uses the original root journal/backups and supports the known 1.x inventory.
Full uninstall preserves project AGENTS/README/memory/configuration; review obsolete
references manually. Untracked or modified common files block removal/update.
Full-copy .NET gate requires Python/PyYAML plus the consuming SDK. Do not install this
mode where consumer governance forbids vendoring or another gate.

## Consumer adoption

Review the consuming project's policies before installation. A dry-run is read-only;
it does not approve adoption or prove compatibility. Retain the project's context
and existing validation gate.

All write demonstrations use disposable generic consumers. [Getting started](getting-started.md)
and the [development exercise](development-guide.md) retain practical .NET onboarding.
