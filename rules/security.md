# Security rules

- Never commit passwords, tokens, private keys or connection strings containing
  credentials. Use the consuming project's secret store; local user-secrets are
  for development. Examples contain configuration keys, never real secret values.
- Treat request bodies, files, query strings, external responses and stored user
  content as untrusted. Bound sizes, validate types/ranges and use allowlists where practical.
- For buffered `IFormFile` uploads, set the total HTTP body/form limits before model
  binding, validate the individual file contract, and account for concurrent buffering.
  Use direct streaming for larger files; enforce byte limits while reading. Generate
  storage keys server-side, keep files outside the web root, and plan cleanup or
  reconciliation for partial storage/database failures. Request cancellation must not
  silently skip required bounded compensation.
- Authenticate protected endpoints and authorize both actions and data ownership
  at the server boundary. UI visibility and a valid identity are not authorization.
  Test role-based and record-level restrictions; scope queries before pagination/counts.
  Do not assume every application uses Microsoft Entra ID (or any specific IdP).
- Keep identity and environment settings in environment-specific configuration or the
  project's approved secret/configuration management. Do not hardcode tenant/client
  identifiers as unexplained assumptions in committed defaults. Distinguish public
  application/client identifiers from client secrets and other credentials. Validate
  required settings on startup. Never invent real tenant IDs, client secrets or
  connection credentials in examples or tests.
- Return explicit DTOs containing only permitted data. Avoid overposting, enumeration
  leaks and sensitive details in errors. Preserve intentional 404/403 contract choices.
- Use parameterized SQL/EF queries. Allowlist dynamic identifiers; parameters do
  not protect concatenated table names, sort fields or SQL fragments.
- Encode output for its rendering context. Rich HTML requires the project's reviewed
  sanitization policy; do not blindly mutate all stored content or treat JSON escaping
  as HTML safety. Validate URLs and file paths for their actual consumers.
- Do not log secrets, full credentials, private payloads or unnecessary personal data.
  Log correlation IDs, safe error categories and useful operational context.
- Protect external integrations with TLS verification, least privilege, timeouts,
  cancellation, bounded retries and SSRF controls where destinations are user-influenced.
  Retry writes only with understood idempotency semantics.
- Keep database privileges minimal. Schema deployment credentials do not belong to
  the API account. Never enable automatic production schema mutation at startup.

These are review obligations, not claims that the policy script detects every
security issue. Mandatory checks cannot be silently disabled by a project override;
surface a conflict and require an explicit reviewed decision and adequate control.
