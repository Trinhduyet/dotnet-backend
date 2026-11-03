#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkText, validateSkills } from './validate-skills.mjs';

export const commonRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const skills = ['dotnet-development', 'dotnet-code-review', 'dotnet-testing', 'dotnet-debugging', 'dotnet-api-design', 'dotnet-database', 'dotnet-deployment'];
export const rules = ['coding', 'architecture', 'security', 'testing', 'definition-of-done'];
const exampleFiles = [
  'Examples.slnx', 'README.md', 'NuGet.Config',
  'document-upload/DocumentUpload.slnx', 'document-upload/README.md',
  'document-upload/src/DocumentUpload.Api/appsettings.json',
  'document-upload/src/DocumentUpload.Api/Common/Errors/UploadExceptions.cs',
  'document-upload/src/DocumentUpload.Api/Configuration/UploadOptions.cs',
  'document-upload/src/DocumentUpload.Api/Configuration/UploadOptionsValidator.cs',
  'document-upload/src/DocumentUpload.Api/Controllers/DocumentsController.cs',
  'document-upload/src/DocumentUpload.Api/Controllers/HealthController.cs',
  'document-upload/src/DocumentUpload.Api/DocumentUpload.Api.csproj',
  'document-upload/src/DocumentUpload.Api/DTOs/Requests/UploadDocumentForm.cs',
  'document-upload/src/DocumentUpload.Api/DTOs/Responses/DocumentResponse.cs',
  'document-upload/src/DocumentUpload.Api/Infrastructure/ApiExceptionHandler.cs',
  'document-upload/src/DocumentUpload.Api/Infrastructure/Storage/IObjectStorage.cs',
  'document-upload/src/DocumentUpload.Api/Infrastructure/Storage/MemoryObjectStorage.cs',
  'document-upload/src/DocumentUpload.Api/Program.cs',
  'document-upload/src/DocumentUpload.Api/Services/CategoryKeys.cs',
  'document-upload/src/DocumentUpload.Api/Services/DocumentUploadService.cs',
  'document-upload/src/DocumentUpload.Api/Services/IDocumentUploadService.cs',
  'document-upload/tests/DocumentUpload.Tests/CategoryKeyTests.cs',
  'document-upload/tests/DocumentUpload.Tests/DocumentUpload.Tests.csproj',
  'document-upload/tests/DocumentUpload.Tests/UploadTests.cs',
  'simple-api/README.md', 'simple-api/database/schema.sql',
  'simple-api/src/SimpleApi/Program.cs', 'simple-api/src/SimpleApi/SimpleApi.csproj',
  'simple-api/src/SimpleApi/Controllers/ItemsController.cs',
  'simple-api/src/SimpleApi/DTOs/Requests/CreateItemRequest.cs',
  'simple-api/src/SimpleApi/DTOs/Responses/ItemResponse.cs',
  'simple-api/src/SimpleApi/Services/IItemsService.cs',
  'simple-api/src/SimpleApi/Services/ItemsService.cs',
  'simple-api/src/SimpleApi/Infrastructure/Database/ItemsDbContext.cs',
  'simple-api/src/SimpleApi/Infrastructure/Errors/ProblemExceptionHandler.cs',
  'simple-api/tests/SimpleApi.Tests/ItemsApiTests.cs',
  'simple-api/tests/SimpleApi.Tests/SimpleApi.Tests.csproj',
  'sqlserver-database-first/README.md', 'sqlserver-database-first/database/schema.sql',
  'sqlserver-database-first/src/DatabaseFirst/Program.cs',
  'sqlserver-database-first/src/DatabaseFirst/DatabaseFirst.csproj',
  'sqlserver-database-first/src/DatabaseFirst/Controllers/CatalogController.cs',
  'sqlserver-database-first/src/DatabaseFirst/DTOs/ProductResponse.cs',
  'sqlserver-database-first/src/DatabaseFirst/Services/ICatalogService.cs',
  'sqlserver-database-first/src/DatabaseFirst/Services/CatalogService.cs',
  'sqlserver-database-first/src/DatabaseFirst/Infrastructure/Database/CatalogDbContext.cs',
  'sqlserver-database-first/tests/DatabaseFirst.Tests/CatalogApiTests.cs',
  'sqlserver-database-first/tests/DatabaseFirst.Tests/DatabaseFirst.Tests.csproj',
].map(path => `examples/${path}`);
export const managedFiles = [
  'VERSION', 'README.md', 'AGENTS.md', '.gitlab-ci.yml', '.gitignore',
  ...['getting-started', 'architecture', 'development-guide', 'database-guide', 'ai-coding-guide'].map(n => `docs/${n}.md`),
  ...skills.map(n => `skills/${n}/SKILL.md`), ...rules.map(n => `rules/${n}.md`),
  'scripts/policy-check.mjs', 'scripts/completion-gate.mjs', 'scripts/install.mjs', 'scripts/harness.test.mjs',
  'templates/AGENTS.md', 'templates/README.md', 'templates/memory/PROJECT.md', 'templates/memory/DECISIONS.md',
  'skills/dotnet-development/references/examples.md',
  'skills/dotnet-development/references/anti-patterns.md',
  'skills/dotnet-code-review/references/classifications.md',
  'skills/dotnet-database/references/schema-strategies.md',
  'skills/dotnet-api-design/references/route-boundaries.md',
  'CONTRIBUTING.md', 'LICENSE', 'CHANGELOG.md', 'requirements-validation.txt',
  ...['INSTALLATION', 'COMPATIBILITY', 'SKILL-AUTHORING', 'RELEASE'].map(n => `docs/${n}.md`),
  'adapters/platforms.json', 'evals/public-scenarios.json', 'evals/README.md',
  'scripts/validate-skills.mjs', 'scripts/skill-spec.py', 'scripts/native-install.mjs',
  'scripts/verify-toolkit.mjs', 'scripts/evaluate-skills.mjs', 'scripts/toolkit.test.mjs',
  'scripts/review-guidance.test.mjs', 'scripts/package-release.mjs',
  ...exampleFiles,
];
export const legacyManagedFiles = [
  'VERSION', 'README.md', 'AGENTS.md', '.gitlab-ci.yml',
  ...['getting-started', 'architecture', 'development-guide', 'database-guide', 'ai-coding-guide'].map(n => `docs/${n}.md`),
  ...['development', 'code-review', 'testing'].map(n => `skills/${n}/SKILL.md`),
  ...['coding', 'security', 'definition-of-done'].map(n => `rules/${n}.md`),
  'scripts/policy-check.mjs', 'scripts/completion-gate.mjs', 'scripts/install.mjs', 'scripts/harness.test.mjs',
  'templates/AGENTS.md', 'templates/README.md', 'templates/memory/PROJECT.md', 'templates/memory/DECISIONS.md',
];
export const hash = data => createHash('sha256').update(data).digest('hex');
export const read = path => readFileSync(path, 'utf8');

// Reject traversal and links in managed paths, including Windows junctions.
export function safePath(root, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name) || name.includes('\\') || name.includes(':') || name.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(`Invalid relative path: ${name}`);
  }
  let current = resolve(root);
  if (lstatSync(current).isSymbolicLink()) throw new Error(`Linked root is not supported: ${root}`);
  for (const part of name.split('/')) {
    current = join(current, part);
    // lstat sees broken symlinks too; existsSync alone does not.
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat?.isSymbolicLink()) throw new Error(`Linked managed path is not supported: ${name}`);
  }
  return current;
}

export function parseArgs(args, allowedValues = [], allowedFlags = []) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (Object.hasOwn(result, key)) throw new Error(`Duplicate argument: ${key}`);
    if (allowedFlags.includes(key)) result[key] = true;
    else if (allowedValues.includes(key) && args[i + 1] && !args[i + 1].startsWith('--')) result[key] = args[++i];
    else throw new Error(`Unknown argument or missing value: ${key}`);
  }
  return result;
}

export function context(root = commonRoot) {
  const installed = basename(root) === '.backend-common';
  return { root, installed, projectRoot: installed ? dirname(root) : root };
}

export function projectConfig(projectRoot) {
  const path = safePath(projectRoot, '.backend-common.json');
  if (!existsSync(path)) return {};
  const config = JSON.parse(read(path));
  if (!config || Array.isArray(config) || typeof config !== 'object' || Object.keys(config).some(k => k !== 'solution')) {
    throw new Error('.backend-common.json supports only the optional solution string');
  }
  if (config.solution !== undefined) {
    const target = safePath(projectRoot, config.solution);
    if (!/\.(slnx?|csproj)$/.test(target) || !existsSync(target) || !lstatSync(target).isFile()) {
      throw new Error(`Configured solution/project does not exist: ${config.solution}`);
    }
  }
  return config;
}

export function manifest(root) {
  const data = JSON.parse(read(safePath(root, 'manifest.json')));
  if (data.schemaVersion !== 1 || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(data.version) || !data.files || Array.isArray(data.files) || typeof data.files !== 'object') {
    throw new Error('Invalid installation manifest');
  }
  for (const [name, digest] of Object.entries(data.files)) {
    safePath(root, name);
    if (name === 'manifest.json' || !/^[a-f0-9]{64}$/.test(digest)) throw new Error(`Invalid manifest entry: ${name}`);
  }
  if (!Object.hasOwn(data.files, 'VERSION')) throw new Error('Manifest must track VERSION');
  return data;
}

export function walk(root, skipped = new Set()) {
  const output = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skipped.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Linked path is not supported: ${path}`);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  visit(root);
  return output;
}

export function checkPolicy(root = commonRoot, log = console.log) {
  const failures = [], warnings = [];
  const fail = message => failures.push(message);
  const { installed, projectRoot } = context(root);
  try {
    for (const name of managedFiles) {
      const path = safePath(root, name);
      if (!existsSync(path) || !lstatSync(path).isFile() || !read(path).trim()) fail(`Missing or empty foundation file: ${name}`);
    }
    if (failures.length) throw new Error('Restore the missing foundation files before other checks');
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(read(join(root, 'VERSION')).trim())) fail('VERSION must be a semantic version');
    for (const [folder, expected] of [['skills', skills], ['rules', rules.map(n => `${n}.md`)]]) {
      const actual = readdirSync(join(root, folder)).sort();
      if (actual.join('|') !== [...expected].sort().join('|')) fail(`${folder}/ inventory differs from this toolkit release`);
    }
    if (validateSkills(skills.map(name => join(root, 'skills', name)), { log })) fail('Skill metadata/resources/safety validation failed');
    const definitions = walk(root, new Set(['.git', '.venv', 'node_modules', '__pycache__'])).filter(path => basename(path) === 'SKILL.md').map(path => relative(root, path).split(sep).join('/')).sort();
    if (definitions.join('|') !== skills.map(n => `skills/${n}/SKILL.md`).sort().join('|')) fail('Duplicated/noncanonical SKILL.md definition found');
    for (const name of managedFiles.filter(n => n.endsWith('.mjs'))) {
      const source = read(join(root, name));
      if (/\bshell\s*:\s*true\b|\bexec(?:Sync)?\s*\(/.test(source)) fail(`${name}: implicit/explicit shell execution is not permitted; use executable/argv`);
      for (const error of checkText(source, name, { instructions: false })) fail(error);
    }
    const ci = spawnSync('python', ['-c', 'import sys,yaml; d=yaml.safe_load(open(sys.argv[1],encoding="utf-8")); jobs=[d["common:verify"],d["examples:verify"]]; assert all(j["stage"] in d["stages"] and not j.get("allow_failure",False) for j in jobs); assert "node scripts/verify-toolkit.mjs" in jobs[0]["script"]; assert any("dotnet restore examples/Examples.slnx --configfile examples/NuGet.Config" in s for s in jobs[1]["script"]); assert any("dotnet test examples/Examples.slnx" in s and "--no-restore" in s for s in jobs[1]["script"]); assert any("dotnet format examples/Examples.slnx --verify-no-changes" in s for s in jobs[1]["script"])', join(root, '.gitlab-ci.yml')], { encoding: 'utf8', windowsHide: true });
    if (ci.error || ci.status !== 0) fail('Malformed/mismatched GitLab YAML or missing Python/YAML prerequisite (contents not echoed)');
    const platforms = JSON.parse(read(join(root, 'adapters/platforms.json')));
    const roots = { codex: '.agents', cursor: '.cursor', claude: '.claude' };
    if (platforms.schemaVersion !== 1 || Object.keys(platforms).sort().join('|') !== ['schemaVersion', ...Object.keys(roots)].sort().join('|')) fail('Invalid platform directory map');
    for (const [agent, expected] of Object.entries(roots)) if (platforms[agent]?.project !== expected || platforms[agent]?.user !== expected || platforms[agent]?.skills !== 'skills') fail(`Invalid ${agent} native adapter`);
    for (const name of managedFiles.filter(p => p.endsWith('.md'))) {
      const path = join(root, name);
      for (const error of checkText(read(path), name)) fail(error);
      const content = read(path).replace(/^(```|~~~)[\s\S]*?^\1[^\r\n]*$/gm, '');
      // Deliberately supports inline local links, not a full Markdown parser.
      for (const match of content.matchAll(/!?\[[^\]\r\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
        const link = match[1].replace(/^<|>$/g, '');
        if (/^(https?:|mailto:|#)/i.test(link)) continue;
        const target = decodeURIComponent(link.split(/[?#]/)[0]);
        const resolved = resolve(dirname(path), target);
        const rel = relative(root, resolved);
        if (isAbsolute(target) || rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(resolved)) fail(`${name}: broken or external local link ${link}`);
      }
      // Avoid copying local absolute paths, private IPv4 addresses, or named connection keys.
      if (/(?:\b[a-z]:[\\/](?:[^\\/\s]+[\\/]){2,}|\bConnectionStrings:(?!(?:AppDb|Catalog)\b)[A-Za-z][A-Za-z0-9_]*|\b10(?:\.\d{1,3}){3}\b)/i.test(read(path))) fail(`${name}: project-specific path/config copied into common`);
    }
    if (installed) {
      if (existsSync(safePath(projectRoot, '.backend-common-install.json'))
          || readdirSync(projectRoot).some(name => /^\.backend-common-(?:stage|backup)-/.test(name) || name === '.backend-common-install.json.next')) {
        fail('Incomplete installation/recovery files found; run installer --recover from a trusted release or inspect orphan backups');
      }
      const data = manifest(root);
      if (data.version !== read(join(root, 'VERSION')).trim()) fail('VERSION differs from manifest');
      if (Object.keys(data.files).sort().join('|') !== [...managedFiles].sort().join('|')) fail('Manifest file inventory differs from this release');
      for (const [name, digest] of Object.entries(data.files)) {
        const path = safePath(root, name);
        if (!existsSync(path) || hash(readFileSync(path)) !== digest) fail(`Managed file modified/missing: ${name}; move customization to project-owned files`);
      }
      const actualFiles = walk(root).map(path => relative(root, path).split(sep).join('/')).sort();
      if (actualFiles.join('|') !== [...managedFiles, 'manifest.json'].sort().join('|')) fail('Unmanaged file found inside installed common');
      projectConfig(projectRoot);
      const agentsPath = safePath(projectRoot, 'AGENTS.md');
      if (!existsSync(agentsPath)) fail('Project AGENTS.md is missing; merge the installed template');
      else if (!read(agentsPath).includes('.backend-common/')) warnings.push('Project AGENTS.md does not reference .backend-common; merge template routing manually');
      for (const name of ['memory/PROJECT.md', 'memory/DECISIONS.md']) if (!existsSync(safePath(projectRoot, name))) warnings.push(`Project context absent: ${name}`);
    }
  } catch (error) { fail(error.message); }
  warnings.forEach(message => log(`WARN: ${message}`));
  failures.forEach(message => log(`FAIL: ${message}`));
  log(`${failures.length ? 'FAIL' : 'PASS'}: policy (${failures.length} failures, ${warnings.length} warnings)`);
  return failures.length ? 1 : 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    parseArgs(process.argv.slice(2));
    process.exitCode = checkPolicy();
  } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 2; }
}
