# Start a .NET consumer

For an **existing** .NET project that only needs AI skills, use the
[one-command quick start](../README.md#install-in-one-command). The steps below
cover creating a new application and the optional toolkit-managed installation.

Use [installation](INSTALLATION.md) for toolkit copy/update/uninstall/recovery; that
page owns those procedures. This page owns application setup and the optional full
consumer gate. Native skills use the consumer's existing validation commands.

## Obtain toolkit and prerequisites

Get a trusted reviewed source checkout/archive; no remote is created by the installer.
This is the repository's actual public source URL, not a claim that a version tag
or GitHub release already exists:

```sh
git clone https://github.com/Trinhduyet/dotnet-backend.git dotnet-backend-common
git -C dotnet-backend-common rev-parse HEAD
```

Review that commit and check out an approved immutable commit/tag before installation
into production projects; `main` can change and is not a version pin. The installer
does not fetch updates itself.

Node 22/24 and Python 3.11+/PyYAML run installer/policy. The isolated development
requirements also provide official specification validation. Install the SDK selected
by the consuming global.json/project, package feeds and local test dependencies;
check `dotnet --list-sdks`. Common selects none of those versions for an existing app.

## Create a new application (SDK 10 illustration)

```sh
mkdir my-api
cd my-api
dotnet new sln -n MyApi
dotnet new webapi --use-controllers -f net10.0 -n MyApi.Api -o backend/src/MyApi.Api
dotnet new xunit -f net10.0 -n MyApi.Tests -o backend/tests/MyApi.Tests
dotnet sln MyApi.slnx add backend/src/MyApi.Api/MyApi.Api.csproj backend/tests/MyApi.Tests/MyApi.Tests.csproj
node ../dotnet-backend-common/scripts/install.mjs --agent codex --target . --skills dotnet-development,dotnet-testing --dry-run
```

Use your SDK's framework/solution format. Review then apply without dry-run only
when the project authorizes adoption. Establish project/scoped instructions, local
dependencies, non-secret keys and meaningful tests; do not retain template assertions
as coverage evidence. The [complete CRUD exercise](development-guide.md) supplies
real copyable source and HTTP tests without adding a runtime framework to common.

## Optional full gate

Full-copy installation is optional and must not conflict with existing project
governance. It preserves existing project files and includes the old completion gate:

```sh
node ../dotnet-backend-common/scripts/install.mjs --target . --dry-run
node ../dotnet-backend-common/scripts/install.mjs --target .
node .backend-common/scripts/completion-gate.mjs --require-tests
```

Use Python/PyYAML in the caller's validation environment. Auto-discovery selects one
solution before projects and fails ambiguous targets; it ignores Git, common, .venv,
node_modules, bin, obj, TestResults and .vs. Project-owned config resolves ambiguity:

```json
{ "solution": "backend/MyApi.sln" }
```

Save it as `.backend-common.json` at consumer root. Only `solution` is supported.
Use a real relative .sln/.slnx/.csproj path with forward slashes. CLI `--solution path`
overrides for one run; target paths remain relative to consumer root from any cwd.

| Option | Meaning |
| --- | --- |
| `--solution path` | Explicit consumer build/test target |
| `--docs-only` | Deliberately omit .NET for docs-only changes |
| `--require-tests` | Fail zero executed VSTest TRX tests |
| `--base commit` | Check merge-base-to-HEAD whitespace in addition to local diffs |
| `--help` | Actual invocation help |

Order: policy → syntax → restore → format verify → Release build → tests → staged/
unstaged Git diff checks. Failed child exits propagate; missing executables use 127,
configuration errors 2, policy 1 and installer conflicts 3. Zero tests without the
require flag is explicitly SKIPPED, never a test pass. VSTest/TRX is the supported
standard profile; another test platform needs its consumer-owned adapter and evidence.
Provider/E2E/load coverage is separate. Default tests must remain local and isolated.

Stage intended new files before final diff validation; untracked files are not checked
by git diff. Source archives explicitly skip Git whitespace; clean CI uses --base for
already-committed changes. Toolkit source has no .NET application and runs script tests.

## Consumer GitLab example

For a provisioned shell runner with the selected SDK, Git, Node and Python/PyYAML:

```yaml
stages: [verify]
backend:verify:
  stage: verify
  script:
    - node .backend-common/scripts/completion-gate.mjs --require-tests
```

Native skill installation instead uses your existing job. Docker executors need your
approved toolchain image. Source toolkit CI validates the toolkit, not an application.
Do not set allow_failure or hide mandatory failure. GitLab server/runner readiness
requires execution there; local YAML parsing is not that proof. No deployment is added.

## Troubleshooting

Missing Python/YAML → activate validation venv. Missing SDK/feed → install/configure
the selected prerequisites securely and report BLOCKED. Ambiguous solution → configure
the actual path. Format failure → review the intended formatting diff. Zero tests →
check discovery/runner target. Interrupted install/collision → use the reviewed
procedure in [INSTALLATION](INSTALLATION.md), not a force overwrite. A consumer policy
conflict stops adoption until approved; documentation is not permission to modify it.
