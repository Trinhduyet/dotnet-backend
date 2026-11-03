import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { checkPolicy, commonRoot, hash, managedFiles, safePath, walk } from './policy-check.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'backend-common-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'release'), project = join(root, 'project with spaces');
  mkdirSync(source); mkdirSync(project);
  for (const name of managedFiles) {
    const dest = join(source, name);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(commonRoot, name), dest);
  }
  const call = (file, args = [], extra = {}) => spawnSync(process.execPath, [file, ...args], { cwd: tmpdir(), encoding: 'utf8', ...extra });
  const install = (...args) => call(join(source, 'scripts/install.mjs'), ['--target', project, ...args]);
  return { root, source, project, call, install };
}
function snapshot(root) {
  return Object.fromEntries(walk(root).map(p => [relative(root, p), hash(readFileSync(p))]));
}
function ok(result) { assert.equal(result.status, 0, result.stdout + result.stderr); }

test('source policy and canonical skill/rule inventory', () => assert.equal(checkPolicy(commonRoot, () => {}), 0));
test('dry-run is read-only and installation works from unrelated cwd', t => {
  const f = fixture(t);
  ok(f.install('--dry-run')); assert.deepEqual(snapshot(f.project), {});
  ok(f.install());
  assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 0);
  const before = snapshot(f.project); ok(f.install()); assert.deepEqual(snapshot(f.project), before);
});
test('existing project instructions, README and memory are preserved', t => {
  const f = fixture(t);
  mkdirSync(join(f.project, 'memory'));
  for (const name of ['AGENTS.md', 'README.md', 'memory/PROJECT.md', 'memory/DECISIONS.md']) writeFileSync(join(f.project, name), `Custom ${name}\n`);
  ok(f.install());
  for (const name of ['AGENTS.md', 'README.md', 'memory/PROJECT.md', 'memory/DECISIONS.md']) assert.equal(readFileSync(join(f.project, name), 'utf8'), `Custom ${name}\n`);
});
test('versioned update dry-run then apply preserves custom project context', t => {
  const f = fixture(t); ok(f.install());
  writeFileSync(join(f.project, 'memory/PROJECT.md'), 'My application\n');
  writeFileSync(join(f.source, 'VERSION'), '1.1.0\n');
  writeFileSync(join(f.source, 'rules/coding.md'), readFileSync(join(f.source, 'rules/coding.md'), 'utf8') + '\nA reviewed clarification.\n');
  const before = snapshot(f.project);
  ok(f.install('--dry-run')); assert.deepEqual(snapshot(f.project), before);
  ok(f.install());
  assert.equal(readFileSync(join(f.project, '.backend-common/VERSION'), 'utf8'), '1.1.0\n');
  assert.equal(readFileSync(join(f.project, 'memory/PROJECT.md'), 'utf8'), 'My application\n');
  assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 0);
});
test('modified managed file blocks dry-run and update without partial changes', t => {
  const f = fixture(t); ok(f.install());
  writeFileSync(join(f.project, '.backend-common/rules/security.md'), 'My edits\n');
  writeFileSync(join(f.source, 'VERSION'), '1.1.0\n');
  const before = snapshot(f.project);
  assert.equal(f.install('--dry-run').status, 3);
  assert.equal(f.install().status, 3);
  assert.deepEqual(snapshot(f.project), before);
  assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 1);
});
test('same-version content replacement is a conflict', t => {
  const f = fixture(t); ok(f.install());
  writeFileSync(join(f.source, 'README.md'), readFileSync(join(f.source, 'README.md'), 'utf8') + '\nChanged release.\n');
  assert.equal(f.install().status, 3);
});
test('unmanaged files inside common block update; project skills remain independent', t => {
  const f = fixture(t); ok(f.install());
  mkdirSync(join(f.project, 'skills/team'), { recursive: true });
  writeFileSync(join(f.project, 'skills/team/SKILL.md'), 'Project-owned');
  ok(f.install());
  writeFileSync(join(f.project, '.backend-common/custom.txt'), 'Keep this');
  assert.equal(f.install().status, 3);
  assert.equal(readFileSync(join(f.project, '.backend-common/custom.txt'), 'utf8'), 'Keep this');
});
test('unmanaged existing directory is never overwritten', t => {
  const f = fixture(t); mkdirSync(join(f.project, '.backend-common'));
  assert.equal(f.install().status, 2);
});
test('missing files, broken links and invalid frontmatter fail policy', t => {
  const f = fixture(t);
  writeFileSync(join(f.source, 'README.md'), '[broken](missing.md)\n');
  assert.equal(checkPolicy(f.source, () => {}), 1);
  copyFileSync(join(commonRoot, 'README.md'), join(f.source, 'README.md'));
  writeFileSync(join(f.source, 'skills/dotnet-testing/SKILL.md'), '# No metadata\n');
  assert.equal(checkPolicy(f.source, () => {}), 1);
  rmSync(join(f.source, 'rules/security.md'));
  assert.equal(checkPolicy(f.source, () => {}), 1);
});
test('unknown arguments fail without mutation', t => {
  const f = fixture(t);
  assert.equal(f.install('--force').status, 2);
  assert.deepEqual(snapshot(f.project), {});
});
test('traversal, absolute paths and symlink destinations are rejected', t => {
  const f = fixture(t);
  for (const name of ['../outside', '/tmp/a', 'C:/a', 'memory/../a', 'memory\\a']) assert.throws(() => safePath(f.project, name));
  const external = join(f.root, 'external'); mkdirSync(external);
  symlinkSync(external, join(f.project, '.backend-common'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(f.install().status, 2);
  assert.deepEqual(snapshot(external), {});
});
test('malicious manifest path fails before changing the target', t => {
  const f = fixture(t); ok(f.install());
  const path = join(f.project, '.backend-common/manifest.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.files['../README.md'] = '0'.repeat(64); writeFileSync(path, JSON.stringify(data));
  const before = snapshot(f.project);
  assert.equal(f.install().status, 2);
  assert.deepEqual(snapshot(f.project), before);
});
test('configuration validates referenced targets without policing architecture', t => {
  const f = fixture(t); ok(f.install());
  mkdirSync(join(f.project, 'Application')); mkdirSync(join(f.project, 'Features'));
  writeFileSync(join(f.project, 'custom.csproj'), '<Project Sdk="Microsoft.NET.Sdk"/>');
  writeFileSync(join(f.project, '.backend-common.json'), JSON.stringify({ solution: 'custom.csproj' }));
  assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 0);
  writeFileSync(join(f.project, '.backend-common.json'), JSON.stringify({ solution: '../escape.sln' }));
  assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 1);
});
test('installed gate reports docs-only explicitly and fails missing/ambiguous targets', t => {
  const f = fixture(t); ok(f.install());
  const gate = join(f.project, '.backend-common/scripts/completion-gate.mjs');
  const docs = f.call(gate, ['--docs-only']); ok(docs); assert.match(docs.stdout, /SKIPPED: .NET/);
  assert.notEqual(f.call(gate).status, 0);
  writeFileSync(join(f.project, 'one.sln'), ''); writeFileSync(join(f.project, 'two.slnx'), '');
  const ambiguous = f.call(gate); assert.notEqual(ambiguous.status, 0); assert.match(ambiguous.stderr, /Multiple targets/);
  assert.equal(f.call(gate, ['--docs-only', '--require-tests']).status, 2);
});
test('child exit code is preserved and dependent checks stop after restore failure', t => {
  const f = fixture(t); ok(f.install());
  const fakeBin = join(f.root, 'fake-bin'); mkdirSync(fakeBin);
  // A disposable Node executable behaves as a failing dotnet; no shell interpolation.
  copyFileSync(process.execPath, join(fakeBin, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet'));
  writeFileSync(join(f.project, 'restore'), 'process.exit(7);\n');
  writeFileSync(join(f.project, 'sample.csproj'), '<Project Sdk="Microsoft.NET.Sdk"/>');
  const env = { ...process.env };
  const pathKey = Object.keys(env).find(k => k.toUpperCase() === 'PATH') ?? 'PATH';
  env[pathKey] = `${fakeBin}${delimiter}${env[pathKey] ?? ''}`;
  const result = f.call(join(f.project, '.backend-common/scripts/completion-gate.mjs'), [], { env });
  assert.equal(result.status, 7, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /RUN: dotnet "(?:format|build|test)"/);
});
test('Git staged whitespace and invalid comparison base fail the gate', t => {
  const f = fixture(t); ok(f.install());
  const git = args => spawnSync('git', args, { cwd: f.project, encoding: 'utf8' });
  ok(git(['init', '--quiet']));
  writeFileSync(join(f.project, 'bad.txt'), 'trailing spaces  \n'); ok(git(['add', 'bad.txt']));
  const gate = join(f.project, '.backend-common/scripts/completion-gate.mjs');
  assert.notEqual(f.call(gate, ['--docs-only']).status, 0);
  assert.notEqual(f.call(gate, ['--docs-only', '--base', 'missing-ref']).status, 0);
});

function crashInstall(f, phase) {
  const code = `import { performInstall } from ${JSON.stringify(pathToFileURL(join(f.source, 'scripts/install.mjs')).href)};
    performInstall(${JSON.stringify(f.project)}, { onStep: step => { if (step === ${JSON.stringify(phase)}) process.exit(91); } });`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: tmpdir(), encoding: 'utf8' });
}

for (const phase of ['journal', 'staged', 'backup', 'activated', 'bootstrap:AGENTS.md', 'bootstrap:memory/PROJECT.md', 'committed']) {
  test(`interrupted initial installation at ${phase} is visible and recoverable`, t => {
    const f = fixture(t);
    assert.equal(crashInstall(f, phase).status, 91);
    assert.ok(existsSync(join(f.project, '.backend-common-install.json')));
    assert.equal(f.install().status, 2);
    if (existsSync(join(f.project, '.backend-common'))) assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 1);
    ok(f.install('--recover'));
    assert.ok(!existsSync(join(f.project, '.backend-common-install.json')));
    if (phase !== 'committed') assert.deepEqual(snapshot(f.project), {});
    ok(f.install());
    assert.equal(checkPolicy(join(f.project, '.backend-common'), () => {}), 0);
  });
}

for (const phase of ['backup', 'activated', 'committed']) {
  test(`interrupted version update at ${phase} preserves project and correct release`, t => {
    const f = fixture(t); ok(f.install());
    const before = snapshot(f.project);
    writeFileSync(join(f.source, 'VERSION'), '1.1.0\n');
    assert.equal(crashInstall(f, phase).status, 91);
    ok(f.install('--recover'));
    if (phase !== 'committed') assert.deepEqual(snapshot(f.project), before);
    else assert.equal(readFileSync(join(f.project, '.backend-common/VERSION'), 'utf8'), '1.1.0\n');
    ok(f.install());
  });
}

test('normal failure after activation rolls back all created content', async t => {
  const f = fixture(t);
  const { performInstall } = await import('./install.mjs');
  assert.throws(() => performInstall(f.project, { onStep(step) { if (step === 'bootstrap:AGENTS.md') throw new Error('injected disk failure'); } }), /injected disk failure/);
  assert.deepEqual(snapshot(f.project), {});
});

test('changed bootstrap after interruption blocks recovery without deleting user work', t => {
  const f = fixture(t);
  assert.equal(crashInstall(f, 'bootstrap:AGENTS.md').status, 91);
  writeFileSync(join(f.project, 'AGENTS.md'), 'Human edit after crash\n');
  const before = snapshot(f.project);
  assert.equal(f.install('--recover').status, 2);
  assert.deepEqual(snapshot(f.project), before);
  // Operator has saved the custom instructions outside recovery's owned path.
  copyFileSync(join(f.project, 'AGENTS.md'), join(f.root, 'saved-agents.md'));
  rmSync(join(f.project, 'AGENTS.md'));
  ok(f.install('--recover'));
  copyFileSync(join(f.root, 'saved-agents.md'), join(f.project, 'AGENTS.md'));
  ok(f.install());
  assert.equal(readFileSync(join(f.project, 'AGENTS.md'), 'utf8'), 'Human edit after crash\n');
});

test('invalid bootstrap shape and orphan recovery files fail before mutation', t => {
  const f = fixture(t); writeFileSync(join(f.project, 'memory'), 'Not a directory\n');
  const before = snapshot(f.project);
  assert.equal(f.install().status, 2); assert.deepEqual(snapshot(f.project), before);
  rmSync(join(f.project, 'memory'));
  mkdirSync(join(f.project, '.backend-common-backup-orphan'));
  assert.equal(f.install().status, 2);
  assert.ok(!existsSync(join(f.project, '.backend-common')));
});

test('corrupt journal cannot be used for arbitrary recovery deletion', t => {
  const f = fixture(t); writeFileSync(join(f.project, '.backend-common-install.json'), '{"schemaVersion":1,"stage":"../outside"}');
  const before = snapshot(f.project);
  assert.equal(f.install('--recover').status, 2); assert.deepEqual(snapshot(f.project), before);
});
