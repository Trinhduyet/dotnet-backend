#!/usr/bin/env node
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { checkPolicy, commonRoot, hash, legacyManagedFiles, managedFiles, manifest, parseArgs, read, safePath, walk } from './policy-check.mjs';

const journalName = '.backend-common-install.json';
const bootstrap = [
  ['templates/AGENTS.md', 'AGENTS.md'], ['templates/README.md', 'README.md'],
  ['templates/memory/PROJECT.md', 'memory/PROJECT.md'], ['templates/memory/DECISIONS.md', 'memory/DECISIONS.md'],
];

function writeJournal(target, data, initial = false) {
  const path = safePath(target, journalName + (initial ? '' : '.next'));
  const fd = openSync(path, 'wx');
  try { writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`); fsyncSync(fd); }
  finally { closeSync(fd); }
  if (!initial) renameSync(path, safePath(target, journalName));
}

function sameFiles(root, expected) {
  if (!existsSync(root) || !lstatSync(root).isDirectory()) return false;
  const names = walk(root).map(path => relative(root, path).split(sep).join('/')).sort();
  if (names.join('|') !== [...Object.keys(expected.files), 'manifest.json'].sort().join('|')) return false;
  const actual = manifest(root);
  return actual.version === expected.version
    && JSON.stringify(Object.entries(actual.files).sort()) === JSON.stringify(Object.entries(expected.files).sort())
    && Object.entries(expected.files).every(([name, digest]) => hash(readFileSync(safePath(root, name))) === digest);
}

// Recovery is explicit after process interruption; ordinary exceptions call it automatically.
// Validate all preservation conditions before removing any tree or bootstrap file.
export function recoverInstallation(target) {
  target = resolve(target);
  const path = safePath(target, journalName);
  if (!existsSync(path)) throw new Error('No installation journal exists; nothing to recover');
  const data = JSON.parse(read(path));
  if (data.schemaVersion !== 1 || data.mode !== undefined && data.mode !== 'uninstall' || !/^[a-f0-9-]{36}$/.test(data.id)
      || typeof data.committed !== 'boolean' || !Array.isArray(data.additions)
      || data.stage !== `.backend-common-stage-${data.id}` || data.backup !== `.backend-common-backup-${data.id}`) {
    throw new Error('Invalid recovery journal; retain it and inspect backups manually');
  }
  for (const release of [data.next, data.previous].filter(Boolean)) {
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(release.version) || !release.files || Array.isArray(release.files)
        || !Object.hasOwn(release.files, 'VERSION')) throw new Error('Invalid recovery release metadata');
    for (const [name, digest] of Object.entries(release.files)) {
      safePath(target, name);
      if (![...managedFiles, ...legacyManagedFiles].includes(name) || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid recovery file entry');
    }
  }
  if (!data.next) throw new Error('Missing recovery release metadata');
  const dest = safePath(target, '.backend-common'), stage = safePath(target, data.stage), backup = safePath(target, data.backup);
  const added = [];
  for (const entry of data.additions) {
    if (!entry || !bootstrap.some(([, name]) => name === entry.name) || !/^[a-f0-9]{64}$/.test(entry.digest)) throw new Error('Invalid recovery bootstrap entry');
    const file = safePath(target, entry.name);
    if (!data.committed && existsSync(file)) {
      if (!lstatSync(file).isFile() || hash(readFileSync(file)) !== entry.digest) throw new Error(`Recovery conflict: preserve changed project file ${entry.name}; journal retained`);
      added.push(file);
    }
  }
  if (existsSync(backup) && (!data.previous || !sameFiles(backup, data.previous))) throw new Error('Recovery conflict: previous backup changed; retained');
  if (data.committed) {
    if (data.mode === 'uninstall' ? existsSync(dest) : !sameFiles(dest, data.next)) throw new Error('Recovery conflict: committed common tree changed; retained');
  } else if (existsSync(backup) || !data.previous) {
    if (existsSync(dest) && !sameFiles(dest, data.next)) throw new Error('Recovery conflict: activated common tree changed; retained');
  } else if (!sameFiles(dest, data.previous)) {
    throw new Error('Recovery conflict: prior installation/backup unavailable; inspect journal manually');
  }
  // walk rejects any linked contents before recursive removal of a managed staging tree.
  if (existsSync(stage)) walk(stage);
  if (!data.committed) {
    added.forEach(file => rmSync(file));
    if (existsSync(backup) || !data.previous) {
      if (existsSync(dest)) rmSync(dest, { recursive: true });
      if (existsSync(backup)) renameSync(backup, dest);
    }
  }
  if (existsSync(stage)) rmSync(stage, { recursive: true });
  if (existsSync(backup)) rmSync(backup, { recursive: true });
  const pending = safePath(target, `${journalName}.next`);
  if (existsSync(pending)) rmSync(pending);
  rmSync(path);
  console.log(`PASS: recovery ${data.committed ? 'finished committed cleanup' : 'rolled back incomplete installation'}; review project and retry`);
}

export function uninstallFull(target, { dryRun = false, onStep = () => {} } = {}) {
  target = resolve(target);
  const dest = safePath(target, '.backend-common');
  if (existsSync(safePath(target, journalName))) throw new Error('Incomplete transaction; recover first');
  if (!existsSync(dest)) throw new Error('Full installation absent');
  const previous = manifest(dest);
  if (!sameFiles(dest, previous)) { console.error('CONFLICT: modified/unmanaged full installation; no files removed'); process.exitCode = 3; return; }
  console.log('REMOVE .backend-common only; preserve AGENTS/README/memory/project config');
  if (dryRun) return;
  const id = randomUUID(), data = { schemaVersion: 1, id, mode: 'uninstall', committed: false,
    stage: `.backend-common-stage-${id}`, backup: `.backend-common-backup-${id}`, next: previous, previous, additions: [] };
  writeJournal(target, data, true);
  try {
    renameSync(dest, safePath(target, data.backup)); onStep('backup');
    data.committed = true; writeJournal(target, data); onStep('committed');
    recoverInstallation(target);
    console.log('PASS: full uninstall; review obsolete project routing manually');
  } catch (error) {
    try { recoverInstallation(target); } catch (recoveryError) { console.error(`BLOCKED: ${recoveryError.message}`); }
    throw error;
  }
}

export function performInstall(target, { dryRun = false, onStep = () => {} } = {}) {
  target = resolve(target);
  if (!existsSync(target) || !lstatSync(target).isDirectory()) throw new Error('Target must be an existing project directory');
  const relativeTarget = relative(commonRoot, target);
  if (!relativeTarget || (!isAbsolute(relativeTarget) && relativeTarget !== '..' && !relativeTarget.startsWith(`..${sep}`))) {
    throw new Error('Install into a separate consuming project, outside this common checkout');
  }
  const dest = safePath(target, '.backend-common');
  if (resolve(dest) === resolve(commonRoot)) throw new Error('Update using a separate release checkout');
  if (existsSync(safePath(target, journalName))) throw new Error('Incomplete installation journal found; run installer --recover from a trusted release first');
  if (readdirSync(target).some(name => /^\.backend-common-(?:stage|backup)-/.test(name) || name === `${journalName}.next`)) {
    throw new Error('Orphan staging/backup files found without a journal; preserve and inspect them before installation');
  }
  if (checkPolicy(commonRoot)) throw new Error('Source release failed policy');
  const version = read(join(commonRoot, 'VERSION')).trim();
  const incoming = Object.fromEntries(managedFiles.map(name => [name, readFileSync(join(commonRoot, name))]));
  const next = { schemaVersion: 1, version, files: Object.fromEntries(Object.entries(incoming).map(([name, data]) => [name, hash(data)])) };
  const conflicts = [], actions = [];
  let previous;
  if (existsSync(dest)) {
    if (!existsSync(safePath(dest, 'manifest.json'))) throw new Error('Existing .backend-common has no manifest; nothing will be overwritten');
    previous = manifest(dest);
    for (const [name, digest] of Object.entries(previous.files)) {
      const path = safePath(dest, name);
      if (!existsSync(path) || hash(readFileSync(path)) !== digest) conflicts.push(`Locally modified or deleted: ${name}`);
    }
    for (const path of walk(dest)) {
      const name = relative(dest, path).split(sep).join('/');
      if (name !== 'manifest.json' && !Object.hasOwn(previous.files, name)) conflicts.push(`Unmanaged file inside .backend-common: ${name}`);
    }
    if (previous.version === version && JSON.stringify(Object.entries(previous.files).sort()) !== JSON.stringify(Object.entries(next.files).sort())) {
      conflicts.push(`Release content changed without changing VERSION ${version}`);
    }
  }
  for (const name of managedFiles) {
    if (!previous?.files[name]) actions.push(`ADD .backend-common/${name}`);
    else if (previous.files[name] !== next.files[name]) actions.push(`UPDATE .backend-common/${name}`);
  }
  for (const name of Object.keys(previous?.files ?? {})) if (!Object.hasOwn(next.files, name)) actions.push(`REMOVE .backend-common/${name}`);
  const additions = [];
  for (const [source, name] of bootstrap) {
    const path = safePath(target, name);
    if (existsSync(path)) {
      if (!lstatSync(path).isFile()) throw new Error(`Project-owned path must be a regular file: ${name}`);
      console.log(`KEEP project-owned ${name}${name === 'AGENTS.md' ? ' (review template routing manually)' : ''}`);
    } else { actions.push(`ADD project-owned ${name}`); additions.push({ name, path, data: incoming[source] }); }
  }
  console.log(`${previous ? `UPDATE ${previous.version}` : 'INSTALL'} -> ${version}`);
  actions.forEach(action => console.log(action));
  conflicts.forEach(message => console.error(`CONFLICT: ${message}`));
  if (conflicts.length) { process.exitCode = 3; return; }
  if (dryRun) { console.log('PASS: dry-run; no files written'); return; }
  if (!actions.length) { console.log('PASS: already current'); return; }
  const id = randomUUID();
  const journal = { schemaVersion: 1, id, stage: `.backend-common-stage-${id}`, backup: `.backend-common-backup-${id}`,
    committed: false, next, previous: previous ?? null, additions: additions.map(({ name, data }) => ({ name, digest: hash(data) })) };
  const stage = safePath(target, journal.stage), backup = safePath(target, journal.backup);
  // Exclusive creation is also the installation lock. A crash leaves an observable journal.
  writeJournal(target, journal, true);
  try {
    onStep('journal');
    mkdirSync(stage);
    for (const [name, data] of Object.entries(incoming)) {
      const path = safePath(stage, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, data, { flag: 'wx' });
    }
    writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx' });
    onStep('staged');
    if (existsSync(dest)) renameSync(dest, backup);
    onStep('backup');
    renameSync(stage, dest);
    onStep('activated');
    for (const { name, path, data } of additions) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, data, { flag: 'wx' });
      onStep(`bootstrap:${name}`);
    }
    journal.committed = true;
    writeJournal(target, journal);
    onStep('committed');
    // Cleanup is recoverable too; never declare success while the journal remains.
    recoverInstallation(target);
    console.log('PASS: installed; review project instructions and run the installed gate');
  } catch (error) {
    try { if (existsSync(safePath(target, journalName))) recoverInstallation(target); }
    catch (recoveryError) { console.error(`BLOCKED: ${recoveryError.message}; journal and backups retained; use --recover after review`); }
    throw error;
  }
}

function main() {
  if (process.argv.includes('--agent')) {
    return import('./native-install.mjs').then(({ nativeFromArgs }) => nativeFromArgs(process.argv.slice(2)));
  }
  const args = parseArgs(process.argv.slice(2), ['--target'], ['--dry-run', '--recover', '--uninstall', '--help']);
  if (args['--help']) { console.log('node scripts/install.mjs --target <root> [--dry-run | --recover | --uninstall]\nNative: add --agent codex|cursor|claude [--scope project|user] [--skills comma-separated] [--status]'); return; }
  if (!args['--target']) throw new Error('--target is required');
  if (args['--recover'] && args['--dry-run']) throw new Error('--recover and --dry-run cannot be combined');
  if (args['--recover'] && args['--uninstall']) throw new Error('Choose one operation');
  if (args['--recover']) recoverInstallation(args['--target']);
  else if (args['--uninstall']) uninstallFull(args['--target'], { dryRun: !!args['--dry-run'] });
  else performInstall(args['--target'], { dryRun: !!args['--dry-run'] });
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { await main(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 2; }
}
