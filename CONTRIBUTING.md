# Contributing

Read [AGENTS](AGENTS.md) and the relevant file owner. Explain
the observed gap before adding a skill, rule, script or dependency. Keep canonical
skills generic and individually portable; adapters own locations only. Preserve
consumer architecture/security and unrelated edits. Never copy business secrets/code.

Use the isolated validation venv and [authoring/evaluation procedure](docs/SKILL-AUTHORING.md).
Run `node scripts/verify-toolkit.mjs`, inspect the diff, and test a disposable consumer
for installer/gate changes. Regression tests must exercise behavior/failure states,
not merely mirror wording. Report executed, failed, blocked and skipped checks honestly.
Keep root CI in GitLab and publish nothing without authorization.

Update [CHANGELOG](CHANGELOG.md)/VERSION for a release and follow
[release migration](docs/RELEASE.md). Contribution descriptions explain the trigger,
result, smallest correction and evidence. MIT license applies to this toolkit's
authored content; references retain their own ownership and are not copied wholesale.
