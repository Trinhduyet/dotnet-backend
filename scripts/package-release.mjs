#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { commonRoot, managedFiles, parseArgs } from './policy-check.mjs';

const args = parseArgs(process.argv.slice(2), ['--output', '--python']);
if (!args['--output']) { console.error('Usage: package-release.mjs --output new.zip [--python executable]'); process.exitCode = 2; }
else {
  try {
    const output = resolve(args['--output']);
    if (existsSync(output)) throw new Error('Output exists; no archive overwritten');
    const parent = realpathSync(dirname(output)), source = realpathSync(commonRoot);
    const rel = relative(source, parent);
    if (!rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))) throw new Error('Write release artifacts outside source');
    const verify = spawnSync(process.execPath, [resolve(commonRoot, 'scripts/verify-toolkit.mjs'), ...(args['--python'] ? ['--python', args['--python']] : [])], { cwd: commonRoot, stdio: 'inherit', shell: false });
    if (verify.error || verify.status !== 0) throw Object.assign(new Error('Verification failed; archive not written'), { exitCode: verify.status || 1 });
    const code = 'import json,sys,zipfile,pathlib,hashlib; root=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); names=json.loads(sys.argv[3]); z=zipfile.ZipFile(out,"x",compression=zipfile.ZIP_DEFLATED); [z.write(root/n,"dotnet-backend-common/"+n) for n in names]; z.close(); print("PASS: packaged "+str(len(names))+" tracked files; SHA256 "+hashlib.sha256(out.read_bytes()).hexdigest())';
    const result = spawnSync(args['--python'] ?? 'python', ['-c', code, commonRoot, output, JSON.stringify(managedFiles)], { stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) throw Object.assign(new Error('Packaging failed'), { exitCode: result.status || 1 });
  } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = error.exitCode ?? 2; }
}
