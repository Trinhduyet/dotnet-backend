---
name: dotnet-deployment
description: Review or prepare .NET Docker, Compose, GitLab CI/CD or Azure rollout changes, environment configuration, readiness and rollback plans. Use for deployment work without implicitly authorizing live rollout or cloud mutations.
---

# Deployment preparation and review

Establish authorized scope, target, image/revision, existing deployment owner and
required approvals. Review/design prepares evidence; it does not authorize executing
a rollout, changing Azure infrastructure or editing unrelated services.

Inspect Dockerfile/Compose/CI and effective non-secret config. Verify context, published
files, bind address/port, health route, dependency network and immutable tags. In
Compose localhost is the current container; use approved service addresses. Separate
build/runtime configuration and deliver secrets through the approved target mechanism.

Preserve consumer GitLab/Azure choices. Commands must propagate failures and wait for
bounded application readiness, not only process creation/image pull. Verify revision
and relevant dependency health. Do not add `|| true`, `allow_failure` or superficial
200 checks to hide failures. Never claim deployment success without executed readiness.

Keep schema upgrades separate and define reviewed rollback/fail-forward with data/
compatibility implications. Rehearse on an isolated authorized target. Existing explicit
rollout authorization persists; do not repeatedly ask for approval. Stop before a
new unapproved irreversible action. Report preparation and live execution separately.
