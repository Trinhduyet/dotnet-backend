# dotnet-backend-common

A reusable .NET AI coding toolkit for ASP.NET Core and other .NET projects using
Cursor, Claude Code or Codex. It provides focused task skills, mandatory engineering
rules, human guides, examples and verification tools. It adds no application runtime dependency and
does not select your architecture, SDK, identity provider, schema or cloud environment.

One canonical collection lives in `skills/`. Native installation copies selected
skills and their supporting files; it never installs another application framework
or replaces project AGENTS, CLAUDE, README, rules, business decisions or existing gates.

## Start here

The source currently identifies version `2.2.0`; use a trusted, reviewed checkout or
published archive. Installer/validators require
Node.js 22/24, Python 3.11+ and PyYAML. Installing skills does not require application
package changes. For full specification/release verification use the pinned development
requirements in an isolated venv:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-validation.txt
node scripts/verify-toolkit.mjs
node scripts/install.mjs --agent codex --target ..\my-api --skills dotnet-development,dotnet-code-review,dotnet-testing --dry-run
node scripts/install.mjs --agent codex --target ..\my-api --skills dotnet-development,dotnet-code-review,dotnet-testing
```

Linux/macOS, from the toolkit checkout:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-validation.txt
node scripts/verify-toolkit.mjs
node scripts/install.mjs --agent claude --target ../my-api --skills dotnet-development,dotnet-testing --dry-run
node scripts/install.mjs --agent claude --target ../my-api --skills dotnet-development,dotnet-testing
```

The consumer directory must already exist. Choose `--agent cursor`, `claude` or
`codex`. These are local-copy commands implemented here, not fictitious native CLI
or marketplace commands. [Installation](docs/INSTALLATION.md) explains scope, update,
recovery, status and removal. [Compatibility](docs/COMPATIBILITY.md) separates documented
paths, filesystem tests, named-agent discovery and unexecuted model/UI tests.

## Skills and when to use them

| Skill | Workflow |
| --- | --- |
| [dotnet-development](skills/dotnet-development/SKILL.md) | Scoped implementation, DTO/DI/options/HTTP/cancellation and verification |
| [dotnet-code-review](skills/dotnet-code-review/SKILL.md) | Concrete defects with severity, location, trigger, correction and evidence |
| [dotnet-testing](skills/dotnet-testing/SKILL.md) | Isolated unit/API/provider/auth/regression tests and honest outcomes |
| [dotnet-debugging](skills/dotnet-debugging/SKILL.md) | Reproduce, evidence, hypothesis, root cause, minimal regression fix |
| [dotnet-api-design](skills/dotnet-api-design/SKILL.md) | HTTP/DTO/ProblemDetails/validation/OpenAPI and optional proxy boundaries |
| [dotnet-database](skills/dotnet-database/SKILL.md) | SQL Server/EF mapping, database-first, concurrency and consumer FK policy |
| [dotnet-deployment](skills/dotnet-deployment/SKILL.md) | Docker/Compose/GitLab/Azure preparation, readiness and reviewed rollback |

Development, review, API and database skills include progressive references for
DTO placement, upload orchestration, route ownership, schema strategy and review
classifications. The [executable examples](examples/README.md) are not part of native
skill install.

The [architecture guide](docs/architecture.md) describes the small default shape and
when to follow an existing design; the rules carry mandatory conventions. A skill
does not authorize live mutations.

## Use in an existing or new project

After native installation restart/reload the agent and verify its discovered skill
list. Select the relevant skill explicitly first, then evaluate automatic activation
with your project's tasks. Do not assume a copied directory proves discovery.
For a change, read project instructions/contracts, inspect the owning source, make
the smallest coherent correction, test it, run the **project's existing gate** and
review the diff. Skills respect scoped instructions and approved architecture/security.
No forced CQRS, interfaces, repositories, Clean Architecture or folder counts.

For a new project, create your API/solution with the selected SDK, establish project
instructions and meaningful tests, then install the same selected skills. The retained
[getting started](docs/getting-started.md), [development guide](docs/development-guide.md),
[database guide](docs/database-guide.md) and executable samples show working workflows.
Database/auth/deployment implementation stays project-specific.

User-level installation is explicit: `--scope user --target <your-home-directory>`.
The script never guesses/writes to your actual home without that argument. Avoid
duplicate copies with the same skill name across scopes or libraries.

## Update, uninstall and legacy full mode

Use a separate reviewed release checkout, inspect changes and run the same native
command with `--dry-run`. Omitting `--skills` preserves the installed selection;
providing it deliberately replaces that selection. Modified owned files and unowned
collisions fail before writes. Move customization into project-owned instructions.
Native status and removal from the toolkit checkout:

```sh
node scripts/install.mjs --agent codex --target ../my-api --status
node scripts/install.mjs --agent codex --target ../my-api --uninstall --dry-run
node scripts/install.mjs --agent codex --target ../my-api --uninstall
```

Removal touches only hash-tracked toolkit files, preserving unrelated skills and
project context. Interrupted transactions are visible and recoverable; no force flag.

The existing full `.backend-common/` installation, hash manifest, dry-run and journal
recovery remain available by **omitting `--agent`**. This optional mode includes human
docs and a completion gate. It is not necessary for native skill discovery. A 1.x
consumer needs reviewed routing changes for renamed skills; see [release/migration](docs/RELEASE.md).

## Quality, CI and trust

`node scripts/validate-skills.mjs --reference` validates metadata with safe YAML and
the official Agent Skills reference library. `node scripts/verify-toolkit.mjs` also
checks source/reference integrity, script syntax, installer recovery/update/uninstall
tests, evaluation fixtures, anti-pattern guidance tests and (when the .NET SDK is
present) the executable examples. `evals/public-scenarios.json` covers
positive and negative activation, YARP/Docker review, missing-source failures,
EF precision, readiness and static Admin/DTO/upload/schema/configuration fixtures.
Response grading requires named-agent outputs; passing fixture/grader tests is not
a claim that a model performed the task. [Authoring/evaluations](docs/SKILL-AUTHORING.md)
defines the evidence procedure and limitations.

The existing [.gitlab-ci.yml](.gitlab-ci.yml) runs toolkit verification and builds/tests
the examples; it does not deploy. Consumer gates remain consumer-owned. Full-copy consumers can
optionally run `node .backend-common/scripts/completion-gate.mjs --require-tests`
with the prerequisite Python/YAML environment and their own .NET SDK.

Skills are trusted instructions, not a permission sandbox. Validation rejects narrow
secret/path/unsafe-command patterns, but does not prove a security audit. Review
source changes and release fingerprints; never print credentials, bypass auth, disable
tests or deploy without authorization. No vendor/marketplace approval is claimed.

Troubleshooting: missing Python/YAML → activate tooling venv; missing discovery →
check native location, agent version/session and trust settings; collision/drift →
preserve the file and review ownership; interrupted transaction → documented recovery;
consumer policy conflict → stop adoption until the project approves it.

## Documentation and contribution

- [INSTALLATION](docs/INSTALLATION.md): exact file ownership, project/user commands and recovery.
- [COMPATIBILITY](docs/COMPATIBILITY.md): official path sources, tested/blocked status.
- [SKILL-AUTHORING](docs/SKILL-AUTHORING.md): metadata, triggers and evidence-based evaluation.
- [RELEASE](docs/RELEASE.md) and [CHANGELOG](CHANGELOG.md): versioning, assets and 1.x migration.
- [Architecture](docs/architecture.md), [database](docs/database-guide.md),
  [development](docs/development-guide.md), [AI guide](docs/ai-coding-guide.md): retained human practices.
- [CONTRIBUTING](CONTRIBUTING.md) and [LICENSE](LICENSE): focused changes and MIT terms.

Adapters contain one verified directory map, never copies of canonical skill trees.
No automatic hook/plugin installation or marketplace publication is performed.
