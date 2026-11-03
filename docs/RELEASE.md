# Release and migration

One toolkit VERSION uses SemVer. Major releases cover skill-name/installation/
prerequisite incompatibilities; minor adds compatible workflows; patch corrects
content or scripts. Never change an already published version's managed bytes.
Release notes live in [CHANGELOG](../CHANGELOG.md). No marketplace is published by scripts.

## 1.0.2 → 2.0.0

- Generic skills `development`, `code-review`, `testing` move to canonical
  `dotnet-development`, `dotnet-code-review`, `dotnet-testing`. Review project routing
  manually; the installer never overwrites existing AGENTS/CLAUDE instructions.
- Add debugging, API-design, database and deployment-preparation skills for real gaps.
- Native selected installation is recommended; full vendoring is retained as opt-in.
  Existing full manifests/dry-run/protected files and interruption recovery persist,
  including the legacy inventory during a major update/rollback.
- Metadata validation uses Python 3.11+/PyYAML instead of the old regex. For complete
  specification verification install the pinned development requirements, including
  official skills-ref. This tooling does not alter application NuGet packages.
- Foreign keys and architecture are consumer decisions, not universal prohibitions.

Preview from a separate reviewed checkout; apply only to an authorized target. For
full mode run the installed gate, then update renamed routes in project-owned context.
For native mode inspect actual host discovery and remove old duplicate skill copies
only if you own them. Full uninstall preserves project context/config; clean obsolete
references manually. Retain a previous reviewed commit/release for rollback.

## Maintainer verification and assets

```sh
node scripts/verify-toolkit.mjs
node scripts/completion-gate.mjs
```

Verify a disposable real .NET consumer when changing executable human examples or
the installed gate. Test selection, user/project layouts, repeat/update/conflict/
recovery/uninstall, legacy migration and actual supported host discovery. Record
BLOCKED live-agent/UI/provider/server checks separately. Do not infer vendor approval.

Package only the `managedFiles` inventory into a versioned source ZIP with a single
root folder. Exclude .venv, .git, caches, credentials, node_modules and validation
fixtures/logs. Record SHA-256, extract into a clean directory, compare every file and
run verify-toolkit there with the validation environment. This avoids stale/missing docs.
The delivery report owns concrete executed release evidence and fingerprints.

The implemented packaging command verifies first and refuses to overwrite an existing
archive. Use a destination outside the source checkout:

```sh
node scripts/package-release.mjs --output ../dotnet-backend-common-2.0.0.zip
```

Python uses only its standard ZIP library for packaging; verification uses the pinned
validation environment. Extract with a normal ZIP tool and run verify-toolkit in the
extracted root before distribution. No dependency download or marketplace publication
occurs in this command.

GitLab CI has one verify job, no deployment/marketplace automation. Publisher creates
the authorized GitLab repository/tag and pushes only after review; the task does not
claim a remote exists. A registry is not required for native artifact copies.
Marketplace-ready additionally requires that chosen host's current packaging/review
requirements. Native-copy assets alone are not a marketplace submission.
