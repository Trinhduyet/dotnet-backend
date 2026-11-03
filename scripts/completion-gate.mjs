#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { checkPolicy, commonRoot, context, managedFiles, parseArgs, projectConfig, safePath, walk } from './policy-check.mjs';

function run(command, args, cwd) {
  console.log(`\nRUN: ${command} ${args.map(a => JSON.stringify(a)).join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error || result.signal || result.status !== 0) {
    const error = new Error(`${command}: ${result.error?.message ?? result.signal ?? `exit ${result.status}`}`);
    error.exitCode = result.error?.code === 'ENOENT' ? 127 : result.status || 1;
    throw error;
  }
  console.log(`PASS: ${command} ${args[0]}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2), ['--solution', '--base'], ['--docs-only', '--require-tests', '--help']);
  if (args['--help']) {
    console.log('node scripts/completion-gate.mjs [--solution relative/path.sln] [--docs-only] [--require-tests] [--base commit]');
    console.log('Paths are relative to the consuming project root, independent of working directory.');
    return;
  }
  if (args['--docs-only'] && args['--require-tests']) throw new Error('--docs-only cannot be combined with --require-tests');
  const { installed, projectRoot } = context();
  console.log(`Gate root: ${projectRoot}`);
  if (checkPolicy()) { process.exitCode = 1; return; }
  for (const name of managedFiles.filter(p => p.endsWith('.mjs'))) run(process.execPath, ['--check', join(commonRoot, name)], projectRoot);
  if (!installed) run(process.execPath, ['--test', join(commonRoot, 'scripts/harness.test.mjs'), join(commonRoot, 'scripts/toolkit.test.mjs')], projectRoot);

  if (args['--docs-only']) console.log('SKIPPED: .NET restore/format/build/test — explicit documentation-only run; no build/test claim');
  else {
    const config = projectConfig(projectRoot);
    const specified = args['--solution'] ?? config.solution;
    const candidates = specified ? [safePath(projectRoot, specified)] : walk(projectRoot,
      new Set(['.git', '.backend-common', 'node_modules', '.venv', 'bin', 'obj', 'TestResults', '.vs'])).filter(p => /\.(slnx?|csproj)$/.test(p));
    const solutions = candidates.filter(p => /\.slnx?$/.test(p));
    const choices = specified ? candidates : solutions.length ? solutions : candidates;
    if (choices.length > 1) throw new Error(`Multiple targets; set --solution or .backend-common.json: ${choices.map(p => relative(projectRoot, p)).join(', ')}`);
    if (!choices.length) {
      if (installed || args['--require-tests']) throw new Error('No .NET target found; set --solution. For a documentation-only change use --docs-only explicitly');
      console.log('SKIPPED: .NET checks — foundation contains no application; harness checks ran instead');
    } else {
      const target = choices[0];
      if (!existsSync(target) || !/\.(slnx?|csproj)$/.test(target)) throw new Error(`Invalid target: ${target}`);
      run('dotnet', ['restore', target, '--nologo'], projectRoot);
      run('dotnet', ['format', target, '--verify-no-changes', '--no-restore'], projectRoot);
      run('dotnet', ['build', target, '-c', 'Release', '--no-restore', '--nologo'], projectRoot);
      const results = mkdtempSync(join(tmpdir(), 'backend-common-tests-'));
      try {
        run('dotnet', ['test', target, '-c', 'Release', '--no-build', '--no-restore', '--nologo', '--logger', 'trx', '--results-directory', results], projectRoot);
        const reports = walk(results).filter(p => p.endsWith('.trx'));
        let executed = 0, skipped = 0;
        for (const report of reports) {
          const counters = readFileSync(report, 'utf8').match(/<Counters\b[^>]*>/)?.[0] ?? '';
          executed += Number(counters.match(/\bexecuted="(\d+)"/)?.[1] ?? 0);
          skipped += Number(counters.match(/\bnotExecuted="(\d+)"/)?.[1] ?? 0);
        }
        console.log(`Test evidence: ${executed} executed, ${skipped} not executed (VSTest TRX)`);
        if (!executed) {
          if (args['--require-tests']) throw new Error('No executed tests reported; --require-tests was requested');
          console.log('SKIPPED: no executed VSTest tests reported; test execution is not established');
        }
        if (skipped) console.log('WARN: skipped tests remain unverified; inspect runner output');
      } finally { rmSync(results, { recursive: true }); }
    }
  }

  const git = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: projectRoot, encoding: 'utf8' });
  if (git.error) throw Object.assign(new Error(`git unavailable: ${git.error.message}`), { exitCode: 127 });
  if (git.status !== 0) {
    if (args['--base']) throw new Error('--base requires a Git working tree');
    // Only skip the expected non-repository condition, not permissions or corrupt Git metadata.
    if (!git.stderr.includes('not a git repository')) throw new Error(`Git failed: ${git.stderr.trim()}`);
    console.log('SKIPPED: git diff --check — archive/new directory without Git metadata');
  } else {
    if (args['--base']) {
      run('git', ['rev-parse', '--verify', '--end-of-options', `${args['--base']}^{commit}`], projectRoot);
      run('git', ['diff', '--check', `${args['--base']}...HEAD`, '--', '.'], projectRoot);
    }
    run('git', ['diff', '--check', '--', '.'], projectRoot);
    run('git', ['diff', '--cached', '--check', '--', '.'], projectRoot);
    console.log('NOTE: git diff does not check untracked files; stage new files before merge validation');
  }
  console.log(`\nPASS: ${args['--docs-only'] ? 'documentation-only' : 'applicable'} gate checks; SKIPPED/WARN items above are not passing evidence`);
}

try { main(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = error.exitCode ?? 2; }
