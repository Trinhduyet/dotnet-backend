import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { checkPolicy, commonRoot, hash, parseArgs, read, rules, safePath, skills, walk } from './policy-check.mjs';

const stateName = 'dotnet-backend-common/.transaction';
const manifestName = 'dotnet-backend-common/manifest.json';

function allowed(name) {
  return name === manifestName || skills.includes(name.split('/')[1]) && /^skills\/dotnet-[a-z-]+\/(?:SKILL\.md|references\/[a-z.-]+\.md)$/.test(name)
    || /^dotnet-backend-common\/rules\/(?:coding|architecture|security|testing|definition-of-done)\.md$/.test(name);
}

function paths(target, agent, scope) {
  target = resolve(target);
  if (!existsSync(target) || !lstatSync(target).isDirectory()) throw new Error('Target must be an existing project directory or user home');
  const rel = relative(commonRoot, target);
  if (!rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))) throw new Error('Use a target outside the source checkout');
  const map = JSON.parse(read(join(commonRoot, 'adapters/platforms.json')));
  if (!['project', 'user'].includes(scope) || !['codex', 'claude', 'cursor'].includes(agent)) throw new Error('Use --agent codex|cursor|claude and --scope project|user');
  const prefix = map[agent][scope];
  return { target, prefix, root: safePath(target, prefix) };
}

function checkedManifest(root, agent, scope) {
  const path = safePath(root, manifestName);
  if (!existsSync(path)) return null;
  const data = JSON.parse(read(path));
  if (data.schemaVersion !== 1 || data.agent !== agent || data.scope !== scope || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(data.version)
      || !Array.isArray(data.skills) || data.skills.some(n => !skills.includes(n)) || !data.files || typeof data.files !== 'object' || Array.isArray(data.files)) throw new Error('Invalid native installation manifest');
  for (const [name, digest] of Object.entries(data.files)) {
    safePath(root, name);
    if (name === manifestName || !allowed(name) || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid native ownership entry');
  }
  return data;
}

function drift(root, data) {
  const errors = [];
  for (const [name, digest] of Object.entries(data.files)) {
    const path = safePath(root, name);
    if (!existsSync(path) || !lstatSync(path).isFile() || hash(readFileSync(path)) !== digest) errors.push(`Modified/missing owned file: ${name}`);
  }
  for (const skill of data.skills) {
    const dir = safePath(root, `skills/${skill}`);
    if (!existsSync(dir)) continue;
    for (const path of walk(dir)) {
      const name = relative(root, path).split(sep).join('/');
      if (!Object.hasOwn(data.files, name)) errors.push(`Unmanaged skill file: ${name}`);
    }
  }
  return errors;
}

export function recoverNative(target, agent, scope = 'project') {
  const { root } = paths(target, agent, scope);
  if (!existsSync(root)) throw new Error('Native installation root absent');
  const state = safePath(root, stateName), planPath = safePath(root, `${stateName}/plan.json`);
  if (!existsSync(planPath)) throw new Error('Missing/incomplete native journal; preserve it and inspect manually');
  const plan = JSON.parse(read(planPath));
  if (plan.schemaVersion !== 1 || plan.agent !== agent || plan.scope !== scope || typeof plan.committed !== 'boolean' || !Array.isArray(plan.entries)) throw new Error('Invalid native recovery journal');
  const names = new Set();
  for (const entry of plan.entries) {
    if (!entry || !allowed(entry.name) || names.has(entry.name) || ![entry.before, entry.after].every(h => h === null || /^[a-f0-9]{64}$/.test(h))) throw new Error('Invalid native recovery entry');
    names.add(entry.name);
    const path = safePath(root, entry.name);
    const current = existsSync(path) && lstatSync(path).isFile() ? hash(readFileSync(path)) : null;
    if (existsSync(path) && !lstatSync(path).isFile()) throw new Error(`Recovery conflict: ${entry.name}`);
    if (plan.committed ? current !== entry.after : current !== entry.before && current !== entry.after) throw new Error(`Recovery conflict: changed ${entry.name}; retained`);
    if (entry.before !== null) {
      const backup = safePath(root, `${stateName}/before/${entry.name}`);
      if (!existsSync(backup) || hash(readFileSync(backup)) !== entry.before) throw new Error('Recovery backup missing/changed; retained');
    }
  }
  if (!plan.committed) {
    for (const entry of plan.entries) {
      const path = safePath(root, entry.name);
      if (entry.before === null) { if (existsSync(path)) rmSync(path); }
      else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, readFileSync(safePath(root, `${stateName}/before/${entry.name}`))); }
    }
  }
  // State is a known journal island, not the agent's skills directory.
  walk(state);
  rmSync(state, { recursive: true });
  console.log(`PASS: native recovery ${plan.committed ? 'finished cleanup' : 'rolled back'}; project instructions preserved`);
}

export function nativeInstall({ target, agent, scope = 'project', selected = null, dryRun = false, uninstall = false, status = false, recover = false, onStep = () => {} }) {
  const { target: base, prefix, root } = paths(target, agent, scope);
  if (recover) { if (dryRun) throw new Error('--recover cannot be a dry-run'); return recoverNative(target, agent, scope); }
  const state = safePath(base, `${prefix}/${stateName}`);
  if (existsSync(state)) throw new Error('Incomplete native transaction; run --recover with the same agent/scope');
  const previous = existsSync(root) ? checkedManifest(root, agent, scope) : null;
  if (status) {
    if (!previous) throw new Error('Native installation absent');
    const errors = drift(root, previous);
    if (errors.length) throw new Error(errors.join('; '));
    console.log(`PASS: ${agent}/${scope} ${previous.version}; ${previous.skills.join(', ')}`);
    return;
  }
  if (uninstall && !previous) throw new Error('Native installation absent; nothing removed');
  if (!uninstall && checkPolicy(commonRoot)) throw new Error('Source release failed validation');
  const chosen = uninstall ? [] : selected ?? previous?.skills ?? skills;
  if (!Array.isArray(chosen) || (!uninstall && !chosen.length) || new Set(chosen).size !== chosen.length || chosen.some(n => !skills.includes(n))) throw new Error('Unknown/duplicate/empty skill selection');
  const incoming = {};
  for (const skill of chosen) {
    for (const path of walk(join(commonRoot, 'skills', skill))) incoming[relative(commonRoot, path).split(sep).join('/')] = readFileSync(path);
  }
  if (!uninstall) for (const rule of rules) incoming[`dotnet-backend-common/rules/${rule}.md`] = readFileSync(join(commonRoot, 'rules', `${rule}.md`));
  const next = uninstall ? null : { schemaVersion: 1, agent, scope, version: read(join(commonRoot, 'VERSION')).trim(), skills: chosen,
    files: Object.fromEntries(Object.entries(incoming).map(([name, data]) => [name, hash(data)])) };
  const errors = previous ? drift(root, previous) : [];
  if (previous && next?.version === previous.version
      && Object.entries(next.files).some(([name, digest]) => previous.files[name] && previous.files[name] !== digest)) errors.push('Same-version release content changed');
  for (const name of Object.keys(incoming)) {
    const path = safePath(base, `${prefix}/${name}`);
    if (existsSync(path) && !Object.hasOwn(previous?.files ?? {}, name)) errors.push(`Unowned collision: ${name}`);
  }
  errors.forEach(error => console.error(`CONFLICT: ${error}`));
  if (errors.length) { process.exitCode = 3; return; }
  const old = { ...(previous?.files ?? {}) };
  if (previous) old[manifestName] = hash(readFileSync(join(root, manifestName)));
  if (next) incoming[manifestName] = Buffer.from(`${JSON.stringify(next, null, 2)}\n`);
  const entries = [...new Set([...Object.keys(old), ...Object.keys(incoming)])].map(name => ({ name, before: old[name] ?? null, after: incoming[name] ? hash(incoming[name]) : null })).filter(e => e.before !== e.after);
  for (const entry of entries) console.log(`${entry.after === null ? 'REMOVE' : entry.before === null ? 'ADD' : 'UPDATE'} ${prefix}/${entry.name}`);
  if (dryRun) { console.log('PASS: native dry-run; no writes'); return; }
  if (!entries.length) { console.log('PASS: native installation already current'); return; }
  mkdirSync(dirname(state), { recursive: true });
  mkdirSync(state); // exclusive transaction lock; a concurrent installer must stop
  const plan = { schemaVersion: 1, agent, scope, committed: false, entries };
  try {
    for (const entry of entries) if (entry.before !== null) {
      const path = safePath(root, `${stateName}/before/${entry.name}`);
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, readFileSync(safePath(root, entry.name)), { flag: 'wx' });
    }
    writeFileSync(join(state, 'plan.json'), `${JSON.stringify(plan)}\n`, { flag: 'wx' });
    onStep('journal');
    for (const entry of entries) {
      const path = safePath(root, entry.name);
      if (entry.after === null) rmSync(path);
      else {
        mkdirSync(dirname(path), { recursive: true });
        const staged = safePath(root, `${stateName}/new-file`);
        writeFileSync(staged, incoming[entry.name], { flag: 'wx' }); renameSync(staged, path);
      }
      onStep(entry.name);
    }
    plan.committed = true;
    writeFileSync(join(state, 'plan.next'), JSON.stringify(plan), { flag: 'wx' });
    renameSync(join(state, 'plan.next'), join(state, 'plan.json'));
    onStep('committed');
    recoverNative(target, agent, scope);
    console.log(`PASS: native ${uninstall ? 'uninstall' : 'install/update'}; AGENTS/CLAUDE/README/project rules unchanged`);
  } catch (error) {
    try { recoverNative(target, agent, scope); } catch (recoveryError) { console.error(`BLOCKED: ${recoveryError.message}; journal retained`); }
    throw error;
  }
}

export function nativeFromArgs(args) {
  const parsed = parseArgs(args, ['--target', '--agent', '--scope', '--skills'], ['--dry-run', '--recover', '--uninstall', '--status']);
  if (!parsed['--target'] || !parsed['--agent']) throw new Error('--target and --agent are required');
  if ([parsed['--recover'], parsed['--uninstall'], parsed['--status']].filter(Boolean).length > 1 || parsed['--status'] && parsed['--dry-run']) throw new Error('Choose one operation');
  if (parsed['--skills'] && (parsed['--recover'] || parsed['--uninstall'] || parsed['--status'])) throw new Error('--skills is only for install/update; change selection using normal install');
  return nativeInstall({ target: parsed['--target'], agent: parsed['--agent'], scope: parsed['--scope'] ?? 'project',
    selected: parsed['--skills']?.split(','), dryRun: !!parsed['--dry-run'], recover: !!parsed['--recover'], uninstall: !!parsed['--uninstall'], status: !!parsed['--status'] });
}
