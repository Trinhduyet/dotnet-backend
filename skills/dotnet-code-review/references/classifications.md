# Review classifications

Use these distinctions during read-only reviews. Prefer consumer ACTIVE decisions
and contracts over toolkit defaults. Do not invent defects.

## Flag these (when evidence exists)

| Topic | Typical severity | Trigger |
| --- | --- | --- |
| Transport DTOs defined inside `Services/*` when the project already uses `DTOs/Requests` and `DTOs/Responses` | P2 | Contract types mixed into implementation; harder reuse/testing |
| Multipart validation, storage and persistence orchestration in a Controller | P1–P2 | Thick controller; hard to unit-test and reuse |
| Admin-only schema/management data exposed on Public routes | P0–P1 | Unauthorized disclosure; route name is not authz |
| EF Migrations introduced as schema source of truth in an approved database-first project | P1 | Diverges from reviewed SQL ownership; startup auto-migrate risk |
| Hardcoded identity-provider tenant/client values as unexplained committed defaults | P1–P2 | Environment coupling; secret confusion if secrets are also hardcoded |
| Case-variant bypass of uniqueness for canonical business keys | P1–P2 | Duplicate keys under concurrent or mixed-case input |
| Unnecessary translation ownership/reference tables without demonstrated need | P2–P3 | Speculative normalization beyond lean entity-owned content |

## Do not incorrectly flag

| Observation | Why it is not a defect by itself |
| --- | --- |
| `Controllers.AdminApi` namespace while files live under an `Admin` folder | Prefer consistency, but low priority unless tooling/discovery suffers |
| No MediatR, generic repository or Unit of Work | Valid lean Controller → Service → DbContext |
| No physical foreign keys with explicit existence checks in services | Valid when required by the consumer database convention; still verify concurrency consistency |
| A single `GET /health` endpoint | Valid when that is the approved foundation; do not demand `/health/live` or `/health/ready` without a requirement |
| Concrete services without an interface-per-class | Interfaces only for a present boundary need |
| A consistent non-`DTOs/` contract location | Folder names are project convention, not a universal .NET law |
| Code-first EF Migrations in a project that deliberately chose them | Respect the approved schema strategy |

## Evidence required

Findings need file/line, failure trigger, impact, minimal correction and a test or
config proof where practical. Label uncertainty. Style-only comments without impact
are out of scope for this skill.
