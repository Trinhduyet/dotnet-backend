import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commonRoot } from './policy-check.mjs';
import { checkFixtures, scenarios } from './evaluate-skills.mjs';

const requiredReviewIds = [
  'review-yarp-docker',
  'review-dto-in-services',
  'review-translation-overmodel',
  'review-thick-upload-controller',
  'review-public-admin-leak',
  'review-migrations-vs-database-first',
  'review-hardcoded-environment-config',
  'review-category-case-uniqueness',
  'review-valid-lean-architecture',
  'review-valid-no-fk',
  'review-valid-single-health',
  'review-missing-cancellation',
  'review-di-lifetime',
  'review-unbounded-query',
  'review-unsafe-upload',
  'review-yarp-method-allowlist',
  'review-service-responsibility',
  'review-generic-repository',
  'review-catchall-503',
  'review-admin-missing-authorization',
  'review-request-validation-missing',
];

test('evaluation fixtures remain well-formed after anti-pattern expansion', () => {
  assert.equal(checkFixtures(), scenarios.cases.length);
  assert.ok(scenarios.cases.length >= 24);
  assert.equal(scenarios.cases.filter(item => item.kind === 'static-review-fixture').length, 21);
});

test('required anti-pattern and non-finding review fixtures exist with evidence', () => {
  const byId = Object.fromEntries(scenarios.cases.map(item => [item.id, item]));
  for (const id of requiredReviewIds) {
    const item = byId[id];
    assert.ok(item, `missing case ${id}`);
    assert.ok(item.prompt && item.expect, `${id} needs prompt/expect`);
    assert.ok(item.files && Object.keys(item.files).length >= 1, `${id} needs a source fixture`);
    assert.ok(Array.isArray(item.nonFindings) && item.nonFindings.length >= 1, `${id} needs nonFindings`);
    assert.ok(typeof item.validationCommand === 'string' && item.validationCommand.length > 0, `${id} needs validationCommand`);
    assert.equal(item.kind, 'static-review-fixture');
    assert.ok(['P0', 'P1', 'P2', 'P3', 'none'].includes(item.severity), `${id} needs severity`);
    assert.ok(Array.isArray(item.evidenceRequired) && item.evidenceRequired.length > 0, `${id} needs evidence requirements`);
    assert.ok(typeof item.recommendation === 'string' && item.recommendation.length > 0, `${id} needs a correction`);
    assert.ok(Array.isArray(item.falsePositiveConditions) && item.falsePositiveConditions.length > 0, `${id} needs false-positive conditions`);
  }
});

test('valid lean/no-fk/single-health cases must not expect defect issues', () => {
  for (const id of ['review-valid-lean-architecture', 'review-valid-no-fk', 'review-valid-single-health']) {
    const item = scenarios.cases.find(c => c.id === id);
    assert.equal(item.expect.issue, 'none');
    assert.equal(item.expect.severity, null);
  }
});

test('defect fixtures encode the incorrect pattern in source evidence', () => {
  const dto = scenarios.cases.find(c => c.id === 'review-dto-in-services');
  assert.match(dto.files['src/Services/CategoriesService.cs'], /record CreateCategoryRequest/);
  const upload = scenarios.cases.find(c => c.id === 'review-thick-upload-controller');
  assert.match(upload.files['src/Controllers/CategoryDocumentsController.cs'], /blob\.UploadAsync/);
  const leak = scenarios.cases.find(c => c.id === 'review-public-admin-leak');
  assert.match(leak.files['src/Controllers/Public/CategoriesController.cs'], /api\/public\/categories/);
  const migrations = scenarios.cases.find(c => c.id === 'review-migrations-vs-database-first');
  assert.match(migrations.files['src/Program.cs'], /Database\.Migrate/);
  const secrets = scenarios.cases.find(c => c.id === 'review-hardcoded-environment-config');
  assert.match(secrets.files['appsettings.Production.json'], /Password/);
});

test('guidance references and executable upload example are present', () => {
  for (const relative of [
    'skills/dotnet-development/references/anti-patterns.md',
    'skills/dotnet-code-review/references/classifications.md',
    'skills/dotnet-database/references/schema-strategies.md',
    'skills/dotnet-api-design/references/route-boundaries.md',
    'evals/public-scenarios.json',
    'examples/document-upload/DocumentUpload.slnx',
    'examples/document-upload/src/DocumentUpload.Api/Services/DocumentUploadService.cs',
    'examples/document-upload/tests/DocumentUpload.Tests/UploadTests.cs',
  ]) {
    assert.ok(existsSync(join(commonRoot, relative)), relative);
  }

  const classifications = readFileSync(join(commonRoot, 'skills/dotnet-code-review/references/classifications.md'), 'utf8');
  assert.match(classifications, /Do not incorrectly flag/);
  assert.match(classifications, /No MediatR/);
  assert.match(classifications, /single `GET \/health`/);
});

test('this suite is fixture/static guidance evidence, not an AI behavior measurement', () => {
  const readme = readFileSync(join(commonRoot, 'evals/README.md'), 'utf8');
  assert.match(readme, /do \*\*not\*\* measure AI behavior/i);
  assert.match(readme, /Model-based grading/);
});
