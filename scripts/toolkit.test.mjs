import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { commonRoot, hash, legacyManagedFiles, managedFiles, walk } from './policy-check.mjs';
import { checkText, validateSkills } from './validate-skills.mjs';
import { checkFixtures, gradeResponse, scenarios } from './evaluate-skills.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dotnet-toolkit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source'), target = join(root, 'consumer space'); mkdirSync(source); mkdirSync(target);
  for (const name of managedFiles) { const dest = join(source, name); mkdirSync(dirname(dest), { recursive: true }); copyFileSync(join(commonRoot, name), dest); }
  const call = (...args) => spawnSync(process.execPath, [join(source, 'scripts/install.mjs'), '--target', target, ...args], { cwd: tmpdir(), encoding: 'utf8' });
  return { root, source, target, call };
}
function snapshot(root) { return Object.fromEntries(walk(root).map(p => [relative(root, p), hash(readFileSync(p))])); }
function ok(r) { assert.equal(r.status, 0, r.stdout + r.stderr); }

for (const [agent, prefix] of [['codex', '.agents'], ['cursor', '.cursor'], ['claude', '.claude']]) {
  for (const scope of ['project', 'user']) test(`${agent}/${scope} selected installation, repeat, status and uninstall preserve project context`, t => {
    const f = fixture(t); writeFileSync(join(f.target, 'AGENTS.md'), 'Keep existing policy'); writeFileSync(join(f.target, 'CLAUDE.md'), 'Keep existing Claude policy');
    mkdirSync(join(f.target, prefix, 'skills/local-skill'), { recursive: true }); writeFileSync(join(f.target, prefix, 'skills/local-skill/SKILL.md'), 'Existing skill');
    const before = snapshot(f.target);
    const args = ['--agent', agent, '--scope', scope, '--skills', 'dotnet-development,dotnet-testing'];
    ok(f.call(...args, '--dry-run')); assert.deepEqual(snapshot(f.target), before);
    ok(f.call(...args)); assert.ok(!existsSync(join(f.target, '.backend-common')));
    assert.ok(existsSync(join(f.target, prefix, 'skills/dotnet-development/references/examples.md')));
    assert.ok(!existsSync(join(f.target, prefix, 'skills/dotnet-deployment/SKILL.md')));
    const installed = snapshot(f.target); ok(f.call(...args)); assert.deepEqual(snapshot(f.target), installed);
    ok(f.call('--agent', agent, '--scope', scope, '--status'));
    ok(f.call('--agent', agent, '--scope', scope, '--uninstall', '--dry-run')); assert.deepEqual(snapshot(f.target), installed);
    ok(f.call('--agent', agent, '--scope', scope, '--uninstall')); assert.deepEqual(snapshot(f.target), before);
    assert.equal(f.call('--agent', agent, '--scope', scope, '--status').status, 2);
  });
}

test('native collision and edited/unmanaged owned skill block update and uninstall', t => {
  const f = fixture(t), args = ['--agent', 'codex', '--skills', 'dotnet-testing'];
  mkdirSync(join(f.target, '.agents/skills/dotnet-testing'), { recursive: true });
  const file = join(f.target, '.agents/skills/dotnet-testing/SKILL.md'); writeFileSync(file, 'User skill');
  const before = snapshot(f.target); assert.equal(f.call(...args).status, 3); assert.deepEqual(snapshot(f.target), before);
  rmSync(file); ok(f.call(...args)); writeFileSync(file, 'Local change');
  const changed = snapshot(f.target); assert.equal(f.call(...args).status, 3); assert.equal(f.call('--agent', 'codex', '--uninstall').status, 3); assert.deepEqual(snapshot(f.target), changed);
});

test('native version update and selection change do not require full vendoring', t => {
  const f = fixture(t); ok(f.call('--agent', 'cursor', '--skills', 'dotnet-testing'));
  writeFileSync(join(f.source, 'VERSION'), '2.1.0\n');
  const before = snapshot(f.target); ok(f.call('--agent', 'cursor', '--skills', 'dotnet-testing,dotnet-debugging', '--dry-run')); assert.deepEqual(snapshot(f.target), before);
  ok(f.call('--agent', 'cursor', '--skills', 'dotnet-testing,dotnet-debugging'));
  const manifest = JSON.parse(readFileSync(join(f.target, '.cursor/dotnet-backend-common/manifest.json')));
  assert.equal(manifest.version, '2.1.0'); assert.deepEqual(manifest.skills, ['dotnet-testing', 'dotnet-debugging']);
  ok(f.call('--agent', 'cursor', '--skills', 'dotnet-debugging')); assert.ok(!existsSync(join(f.target, '.cursor/skills/dotnet-testing/SKILL.md')));
});

test('same-version native content change cannot bypass pinning by reordering selection', t => {
  const f = fixture(t); ok(f.call('--agent', 'codex', '--skills', 'dotnet-testing,dotnet-debugging'));
  const path = join(f.source, 'skills/dotnet-testing/SKILL.md'); writeFileSync(path, readFileSync(path, 'utf8') + '\nChanged source content.\n');
  const before = snapshot(f.target);
  assert.equal(f.call('--agent', 'codex', '--skills', 'dotnet-debugging,dotnet-testing').status, 3);
  assert.deepEqual(snapshot(f.target), before);
});

for (const mode of ['update', 'uninstall']) test(`interrupted native ${mode} rolls back the previous version`, t => {
  const f = fixture(t); ok(f.call('--agent', 'codex', '--skills', 'dotnet-testing'));
  const before = snapshot(f.target);
  writeFileSync(join(f.source, 'VERSION'), '2.1.0\n');
  const flags = mode === 'uninstall' ? 'uninstall:true' : "selected:['dotnet-testing','dotnet-debugging']";
  const code = `import {nativeInstall} from ${JSON.stringify(pathToFileURL(join(f.source, 'scripts/native-install.mjs')).href)};nativeInstall({target:${JSON.stringify(f.target)},agent:'codex',${flags},onStep:s=>{if(s==='skills/dotnet-testing/SKILL.md'||s==='dotnet-backend-common/manifest.json')process.exit(91)}});`;
  assert.equal(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).status, 91);
  ok(f.call('--agent', 'codex', '--recover')); assert.deepEqual(snapshot(f.target), before);
});

test('native changed work after interruption is preserved and blocks recovery', t => {
  const f = fixture(t);
  const code = `import {nativeInstall} from ${JSON.stringify(pathToFileURL(join(f.source, 'scripts/native-install.mjs')).href)};nativeInstall({target:${JSON.stringify(f.target)},agent:'claude',selected:['dotnet-testing'],onStep:s=>{if(s==='skills/dotnet-testing/SKILL.md')process.exit(91)}});`;
  assert.equal(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).status, 91);
  writeFileSync(join(f.target, '.claude/skills/dotnet-testing/SKILL.md'), 'Human work after crash');
  const before = snapshot(f.target); assert.equal(f.call('--agent', 'claude', '--recover').status, 2); assert.deepEqual(snapshot(f.target), before);
});

test('unknown skill/operation selections and unowned supporting files fail safely', t => {
  const f = fixture(t);
  assert.equal(f.call('--agent', 'codex', '--skills', 'unknown').status, 2);
  assert.deepEqual(snapshot(f.target), {});
  ok(f.call('--agent', 'codex', '--skills', 'dotnet-testing'));
  const file = join(f.target, '.agents/skills/dotnet-testing/custom.md'); writeFileSync(file, 'Keep custom');
  const before = snapshot(f.target); assert.equal(f.call('--agent', 'codex', '--uninstall').status, 3);
  assert.equal(f.call('--agent', 'codex', '--uninstall', '--skills', 'dotnet-testing').status, 2); assert.deepEqual(snapshot(f.target), before);
});

test('duplicate definitions, missing resources and malformed CI are rejected', t => {
  const f = fixture(t);
  mkdirSync(join(f.source, 'adapters/copy'), { recursive: true }); copyFileSync(join(f.source, 'skills/dotnet-testing/SKILL.md'), join(f.source, 'adapters/copy/SKILL.md'));
  assert.equal(f.call('--dry-run').status, 2);
  rmSync(join(f.source, 'adapters/copy/SKILL.md'));
  rmSync(join(f.source, 'skills/dotnet-development/references/examples.md'));
  assert.equal(f.call('--dry-run').status, 2);
  copyFileSync(join(commonRoot, 'skills/dotnet-development/references/examples.md'), join(f.source, 'skills/dotnet-development/references/examples.md'));
  writeFileSync(join(f.source, '.gitlab-ci.yml'), 'malformed: [');
  assert.equal(f.call('--dry-run').status, 2);
  assert.deepEqual(snapshot(f.target), {});
});

test('release packaging refuses existing and in-source destinations before mutation', t => {
  const f = fixture(t), file = join(f.root, 'existing.zip'); writeFileSync(file, 'Keep existing archive');
  const run = target => spawnSync(process.execPath, [join(f.source, 'scripts/package-release.mjs'), '--output', target], { encoding: 'utf8' });
  assert.equal(run(file).status, 2); assert.equal(readFileSync(file, 'utf8'), 'Keep existing archive');
  const path = join(f.source, 'nested'); mkdirSync(path);
  assert.equal(run(join(path, 'release.zip')).status, 2); assert.ok(!existsSync(join(path, 'release.zip')));
});

for (const phase of ['journal', 'skills/dotnet-testing/SKILL.md', 'committed']) test(`native interruption at ${phase} detected and recovered`, t => {
  const f = fixture(t);
  const code = `import { nativeInstall } from ${JSON.stringify(pathToFileURL(join(f.source, 'scripts/native-install.mjs')).href)}; nativeInstall({target:${JSON.stringify(f.target)},agent:'codex',selected:['dotnet-testing'],onStep:s=>{if(s===${JSON.stringify(phase)})process.exit(91)}});`;
  assert.equal(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).status, 91);
  assert.equal(f.call('--agent', 'codex', '--status').status, 2);
  ok(f.call('--agent', 'codex', '--recover'));
  if (phase !== 'committed') assert.deepEqual(snapshot(f.target), {});
  ok(f.call('--agent', 'codex', '--skills', 'dotnet-testing'));
});

test('full uninstall protects bootstrap files and rejects altered managed content', t => {
  const f = fixture(t); ok(f.call());
  const agents = readFileSync(join(f.target, 'AGENTS.md'));
  const before = snapshot(f.target); ok(f.call('--uninstall', '--dry-run')); assert.deepEqual(snapshot(f.target), before);
  const file = join(f.target, '.backend-common/rules/security.md'), original = readFileSync(file); writeFileSync(file, 'Edited');
  assert.equal(f.call('--uninstall').status, 3); writeFileSync(file, original);
  ok(f.call('--uninstall')); assert.ok(!existsSync(join(f.target, '.backend-common'))); assert.deepEqual(readFileSync(join(f.target, 'AGENTS.md')), agents);
});

test('major upgrade rollback accepts the legacy 1.x file inventory', t => {
  const f = fixture(t), legacy = join(f.target, '.backend-common'); mkdirSync(legacy);
  const files = {};
  for (const name of legacyManagedFiles) {
    const sourceName = name.replace('skills/development/', 'skills/dotnet-development/').replace('skills/code-review/', 'skills/dotnet-code-review/').replace('skills/testing/', 'skills/dotnet-testing/');
    const dest = join(legacy, name); mkdirSync(dirname(dest), { recursive: true });
    const content = name === 'VERSION' ? Buffer.from('1.0.2\n') : readFileSync(join(f.source, sourceName)); writeFileSync(dest, content); files[name] = hash(content);
  }
  writeFileSync(join(legacy, 'manifest.json'), JSON.stringify({ schemaVersion: 1, version: '1.0.2', files }));
  const before = snapshot(f.target);
  const code = `import {performInstall} from ${JSON.stringify(pathToFileURL(join(f.source, 'scripts/install.mjs')).href)};performInstall(${JSON.stringify(f.target)},{onStep:s=>{if(s==='activated')process.exit(91)}});`;
  assert.equal(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).status, 91);
  ok(f.call('--recover')); assert.deepEqual(snapshot(f.target), before);
  ok(f.call()); assert.ok(!existsSync(join(legacy, 'skills/development/SKILL.md'))); assert.ok(existsSync(join(legacy, 'skills/dotnet-development/SKILL.md')));
});

test('YAML parser accepts quoted/multiline metadata and rejects duplicate/unsafe YAML', t => {
  const f = fixture(t), dir = join(f.root, 'example-skill'); mkdirSync(dir);
  const file = join(dir, 'SKILL.md');
  writeFileSync(file, '---\nname: "example-skill"\ndescription: >-\n  Test a valid multiline description.\nmetadata:\n  owner: "test"\n---\nUseful instructions.\n');
  assert.equal(validateSkills([dir], { log: () => {} }), 0);
  writeFileSync(file, '---\nname: example-skill\nname: duplicate\ndescription: Test duplicate keys\n---\nInstructions');
  assert.equal(validateSkills([dir], { log: () => {} }), 1);
  writeFileSync(file, '---\nname: example-skill\ndescription: !!python/object:bad {}\n---\nInstructions');
  assert.equal(validateSkills([dir], { log: () => {} }), 1);
});

test('safety checks reject synthetic secrets, absolute project paths and unsafe execution', () => {
  assert.ok(checkText('A' + 'KIA' + 'A'.repeat(16), 'synthetic').length);
  assert.ok(checkText('Run git push --' + 'force', 'unsafe').length);
  assert.ok(checkText('E:' + '/Euroland/consumer/src', 'absolute').length);
  assert.equal(checkText('Never print secrets or use destructive operations.', 'safe').length, 0);
});

test('evaluation evidence lines are validated without YARP-specific keywords', () => {
  const cases = structuredClone(scenarios);
  const review = cases.cases.find(item => item.expect.file);
  review.files[review.expect.file] = review.files[review.expect.file].replace('Address', 'Endpoint');
  assert.equal(checkFixtures(cases), cases.cases.length);
  review.expect.line = 999;
  assert.throws(() => checkFixtures(cases), /invalid evidence line/);
});

test('evaluation grader rejects wrong activation, scope, semantics and unsupported PASS', t => {
  const f = fixture(t); assert.equal(checkFixtures(), scenarios.cases.length);
  assert.ok(scenarios.cases.length >= 19);
  const proof = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
  writeFileSync(join(f.root, 'executed-proof.json'), JSON.stringify({ command: 'node -e process.exit(0) (grader unit fixture, not model evidence)', exitCode: proof.status, executedTests: 1, failedTests: 0 }));
  for (const item of scenarios.cases) {
    const good = { selectedSkills: item.skills, changedFiles: [], observed: item.expect };
    if (item.requiresPatch) {
      good.changedFiles = [item.allowedChanges[0]];
      good.patchFile = `${item.id}.diff`; good.claimsTestsPassed = true; good.evidenceFile = 'executed-proof.json';
      writeFileSync(join(f.root, good.patchFile), `--- a/${good.changedFiles[0]}\n+++ b/${good.changedFiles[0]}\n@@ -1 +1 @@\n-old\n+new\n`);
    }
    assert.deepEqual(gradeResponse(item, good, f.root), []);
    assert.ok(gradeResponse(item, { ...good, selectedSkills: ['wrong-skill'] }, f.root).length);
    assert.ok(gradeResponse(item, { ...good, changedFiles: ['unrelated.cs'] }, f.root).length);
    assert.ok(gradeResponse(item, { ...good, observed: {} }, f.root).length);
    assert.ok(gradeResponse(item, { ...good, claimsTestsPassed: true, evidenceFile: 'absent.json' }, f.root).length);
  }
  const item = scenarios.cases[5];
  assert.deepEqual(gradeResponse(item, { selectedSkills: item.skills, observed: item.expect, claimsTestsPassed: true, evidenceFile: 'executed-proof.json' }, f.root), []);
});
