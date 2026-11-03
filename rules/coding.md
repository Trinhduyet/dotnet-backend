# Coding rules

The human flat-API example is in the toolkit architecture guide. Existing explicit
project decisions take precedence over these defaults.

- Thin Controllers bind, authorize, call a Service and map HTTP results. Multipart
  parsing, file validation, storage writes and persistence orchestration belong in
  a Service (or cohesive upload owner), not in the Controller body.
- Services own business/application logic and may inject EF Core DbContext directly.
- Use constructor DI and built-in lifetimes. Do not inject a scoped DbContext into
  a singleton or share it across concurrent operations.
- Separate request/response DTOs from database entities and from service
  implementation files. Prefer the project's established contract folders (often
  `DTOs/Requests` and `DTOs/Responses`). Do not invent a folder rename when another
  consistent project convention already owns transport contracts. Map allowed input
  fields explicitly; never bind persistence models directly to public requests.
- Canonicalize business keys used for uniqueness (trim/case rules) at the
  validation/persistence boundary. Application-only uniqueness checks can race;
  prefer a unique index or equivalent constraint when the schema strategy allows it.
  Do not silently rewrite intentional display labels or case-sensitive identifiers.
- Use async/await for I/O and pass CancellationToken to EF and outbound calls.
  Avoid `.Result`, `.Wait()` and `Task.Run` around asynchronous I/O.
- Enable nullable reference types in consuming C# projects and handle missing data.
- Validate syntax/ranges at the HTTP boundary and business invariants in Services.
  Use consistent ProblemDetails; unexpected errors must not expose internal details.
- Use structured logging and trace/correlation identifiers. Follow
  [security](security.md) for sensitive data; avoid logging the same exception twice.
- Bound list sizes, project only needed fields, and use no-tracking reads when appropriate.
- Keep the diff focused. Preserve existing conventions and human changes. Do not
  alter scripts/rules or remove tests to disguise an implementation failure.
- Introduce interfaces, abstractions or folders only for a present need. Common
  does not introduce Clean Architecture, CQRS, MediatR, generic repositories or a
  Unit of Work over EF Core. There is no regex ban against existing project source.

Clean Code means cohesive components with one clear responsibility and domain-focused
names. Prefer direct code over speculative abstractions. Remove dead code within the
authorized change, not through unrelated cleanup. Validate required configuration
early. For exact financial values use decimal, explicit SQL precision and currency.
Consumer structure remains authoritative under [architecture rules](architecture.md).
