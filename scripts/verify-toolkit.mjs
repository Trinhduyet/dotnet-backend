#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { commonRoot, managedFiles, parseArgs } from './policy-check.mjs';

function run(command, args) {
  console.log(`RUN: ${command} ${args.map(a => JSON.stringify(a)).join(' ')}`);
  const result = spawnSync(command, args, { cwd: commonRoot, stdio: 'inherit', shell: false, windowsHide: true });
  if (result.error || result.signal || result.status !== 0) throw Object.assign(new Error(`${command} failed: ${result.error?.code ?? result.signal ?? result.status}`), { exitCode: result.error?.code === 'ENOENT' ? 127 : result.status || 1 });
}

try {
  const args = parseArgs(process.argv.slice(2), ['--python']);
  const python = args['--python'] ?? 'python';
  run(process.execPath, [join(commonRoot, 'scripts/policy-check.mjs')]);
  run(process.execPath, [join(commonRoot, 'scripts/validate-skills.mjs'), '--reference', '--python', python]);
  for (const path of managedFiles.filter(n => n.endsWith('.mjs'))) run(process.execPath, ['--check', join(commonRoot, path)]);
  run(python, ['-c', 'from pathlib import Path; compile(Path("scripts/skill-spec.py").read_text(encoding="utf-8"), "scripts/skill-spec.py", "exec")']);
  run(process.execPath, ['--test', join(commonRoot, 'scripts/harness.test.mjs'), join(commonRoot, 'scripts/toolkit.test.mjs'), join(commonRoot, 'scripts/review-guidance.test.mjs')]);
  run(process.execPath, [join(commonRoot, 'scripts/evaluate-skills.mjs'), '--check']);
  const dotnet = spawnSync('dotnet', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (!dotnet.error && dotnet.status === 0) {
    run('dotnet', ['restore', join(commonRoot, 'examples/Examples.slnx'), '--configfile', join(commonRoot, 'examples/NuGet.Config')]);
    run('dotnet', ['test', join(commonRoot, 'examples/Examples.slnx'), '--configuration', 'Release', '--nologo', '--no-restore']);
    run('dotnet', ['format', join(commonRoot, 'examples/Examples.slnx'), '--verify-no-changes', '--no-restore', '--verbosity', 'quiet']);
  } else {
    console.log('SKIPPED: executable examples — .NET SDK unavailable');
  }
  console.log('PASS: toolkit/specification/script/evaluation-fixture checks; live agent quality and marketplace approval are separate');
} catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = error.exitCode ?? 2; }
