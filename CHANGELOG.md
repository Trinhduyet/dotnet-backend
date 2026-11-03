# Changelog

## 2.2.2 — 2026-11-03

- Rewrite the human-first README in English and reduce the quick start to one
  tested `npx skills` command from an existing project.
- Document the third-party Skills CLI as the simple onboarding route, including
  its separate lifecycle, source-pinning trade-off and native-installer differences.
- Retain the hash-tracked native installer and full-copy recovery as advanced
  options; no runtime dependency or consumer architecture policy changes.

## 2.2.1 — 2026-11-03

- Seed database-first HTTP test data from the built application host instead of
  creating a second DI container; isolate the test database per factory.
- Test the SQLite simple API against an isolated SQLite in-memory database, not
  EF's non-relational InMemory provider. Keep SQL Server provider limitations explicit.
- Add a code-review evaluation for double-container test setup, strengthen evidence
  line checks and guard example fixtures against the regression.
- Point onboarding at the actual GitHub source and distinguish branch checkout from
  reviewed, version-pinned installation.

## 2.2.0 — 2026-11-03

- Add executable simple CRUD and SQL Server database-first examples, with an aggregate
  solution and GitLab SDK job that builds and tests all runnable examples.
- Refine multipart boundaries: HTTP form parsing and request limits stay at the edge;
  cross-resource workflows and compensation belong in a cohesive service operation.
- Expand static review fixtures with cancellation, DI lifetime, bounded queries, upload
  safety, YARP methods, service cohesion, generic repositories, auth/validation and
  exception mapping; require evidence, severity, correction and false-positive notes.
- Keep consumer-specific policies out of universal rules. Remove stale release pointers
  and align onboarding docs.

## 2.1.0 — 2026-10-20

- Add practical anti-pattern guidance: DTO placement, translation ownership,
  thick multipart controllers, Admin/Public boundaries, database-first versus
  Migrations, identity configuration, and business-key uniqueness.
- Add review classifications so lean architecture, intentional no-FK, and a single
  `/health` are not incorrectly flagged.
- Expand evaluation fixtures with ten static review scenarios (defect and
  non-finding). Fixture/static checks remain distinct from model-based grading.
- Add checkout companion `examples/document-upload` with executable upload,
  options and uniqueness tests.

## 2.0.0 — 2026-10-14

- Improve/namespace the three existing .NET workflows; add debugging, API design,
  database and deployment preparation with narrow triggers and consumer authority.
- Add selected project/user native installation for Codex/Cursor/Claude, status,
  hash-protected update/uninstall and recovery; retain full-copy mode/legacy rollback.
- Validate real YAML and official Agent Skills metadata, supporting references and
  narrow trust patterns. Add positive/negative evaluation fixtures and response grading.
- Add compatibility, installation, contribution, release and audit owners; MIT license.
- Patch the runnable CRUD example's vulnerable transitive PKCS dependency without
  suppressing NuGet audit; preserve the same API/service/database architecture.
- Breaking: old skill names change; Python/YAML validation prerequisites are explicit.
  Review consumer routing manually. No marketplace/host behavior approval is implied.

## 1.0.2 — 2026-10-12

Human-first foundation, three skills/rules, full installer journal/recovery, Node
gate, tested CRUD example and GitLab validation. Historical execution evidence is
kept outside the repository; future release checks must run against current files.
