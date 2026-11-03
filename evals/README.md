# Evaluation suite

`public-scenarios.json` holds fixture prompts, minimal source evidence and expected
semantics for toolkit skills.

| Layer | What it proves | Command |
| --- | --- | --- |
| Fixture integrity | Cases are well-formed and linked | `node scripts/evaluate-skills.mjs --check` |
| Executable examples | Build and behavior tests for CRUD, database-first mapping and uploads | `dotnet test examples/Examples.slnx -c Release --nologo` |
| Static guidance tests | Required review cases have severity, evidence, correction and false-positive criteria | `node --test scripts/review-guidance.test.mjs` |
| Model-based grading | Named-agent responses against expectations | `node scripts/evaluate-skills.mjs --responses <artifact>` |

`--check` and ordinary tests do **not** measure AI behavior. Passing fixture or
grader unit tests is not a claim that a model performed the task. Live task quality
requires a named agent, recorded transcript and evidence; without `--responses` the
evaluator reports BLOCKED/SKIPPED for that layer.

Static review cases cover controller/service boundaries, DTO ownership, repositories,
database strategy, environment configuration, cancellation, DI lifetimes, EF query
bounds, upload safety, Public/Admin access, proxy methods, exception mapping, request
validation, test-host DI/container setup and intentional non-findings. Every case records severity, evidence needed,
the correction, and false-positive conditions. `validationCommand` documents a local
check; fixture integrity does not execute that command or prove semantic architecture
intent. Static validators can check shape and links; only review against the actual
contract can determine responsibility/cohesion, authorization ownership or whether an
abstraction is truly unnecessary.
