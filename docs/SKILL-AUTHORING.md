# Author skills and evaluate them

Use [Agent Skills specification](https://agentskills.io/specification). Add
`skills/<name>/SKILL.md`, matching lowercase name/directory, a precise description
(what and when), and focused instructions. Names are at most 64 characters,
descriptions 1024. Optional specification fields include license, compatibility,
metadata and allowed-tools; do not insert vendor fields into canonical metadata.
YAML is parsed safely with unique keys; executable tags and aliases are rejected.

Keep one canonical definition; adapters never contain copies. A skill must work
individually: supporting resources stay inside its folder and links resolve there.
Use progressive disclosure and one-level references. Do not require another skill
or a missing repo-root checklist. Explain a real gap before adding a workflow;
prefer improving an existing owner. No large copied manuals or implicit write/deploy
permissions. Respect consumer instructions and approved security/business decisions.

Add the canonical inventory entry and required resources in policy-check, then test
installation/reference closure, trigger boundaries and failure cases. Development
examples illustrate existing owners rather than scaffolding a framework.

```sh
node scripts/validate-skills.mjs --reference
node scripts/verify-toolkit.mjs
```

The first runs safe YAML checks and the **official skills-ref** library. Trust/path/
resource checks add narrow safeguards; they are not a comprehensive security audit.
Pinned development requirements belong to the validation environment, not the API.

## Evaluations

`evals/public-scenarios.json` is the generic benchmark owner: positive workflows, negative
activation cases and static anti-pattern review fixtures. It contains small
source/config/contract evidence and semantic expectations, with no business
credentials. The YARP case identifies an exact destination line using
[Microsoft's config contract](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/config-files).
See [evals README](../evals/README.md) for fixture versus model-based layers.

```sh
node scripts/evaluate-skills.mjs --check
node --test scripts/review-guidance.test.mjs
dotnet test examples/document-upload/DocumentUpload.slnx -c Release
node scripts/evaluate-skills.mjs --responses ../evaluation-run/responses.json
```

`--check` and `review-guidance` tests validate fixtures/static guidance only. They
do not measure AI behavior. No supplied responses means live task-quality is
BLOCKED/SKIPPED, never PASS. To evaluate a real host, install selected skills into an
authorized disposable project, give the case prompt/raw files, record the named
agent/version, actual selector/activation, changes and tool evidence. Do not provide
the expected solution to the agent. Repeat negative cases where nothing should activate.

Response artifact shape:

```json
{
  "agent": { "name": "your-tested-agent", "version": "actual-version" },
  "results": [
    {
      "id": "negative-translation",
      "selectedSkills": [],
      "changedFiles": [],
      "observed": { "engineeringSkillActivated": false },
      "claimsTestsPassed": false
    }
  ]
}
```

Supply exactly one result for every case. `observed` is derived from the actual
patch/HTTP/config evidence and the case expectations, not from model self-rating.
For claimed tests, `evidenceFile` is a relative JSON tool record with `command`,
`exitCode: 0`, `executedTests > 0`, and `failedTests: 0`; retain the raw test log.
Review/code-only cases must not invent executed tests. The grader rejects wrong
activation, out-of-scope changes, incorrect semantics and unsupported passing claims.
Implementation cases also require a relative `patchFile` containing a scoped unified
diff whose changed file names match `changedFiles`, plus regression execution evidence.

Structured response grading cannot independently prove who produced a transcript,
that a patch really builds, or every aspect of task quality. Review the actual patch
and rerun its relevant tests. CI checks fixture/grader correctness, not costly live
LLM performance. Record model/host/skill version and environment before comparing
runs. Do not present synthetic grader tests as agent behavior or reproduce another
project's benchmark percentages without running its experiment.
