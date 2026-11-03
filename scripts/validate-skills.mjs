#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function checkText(text, label, { instructions = true } = {}) {
  const errors = [];
  // Narrow high-signal patterns, not a substitute for secret scanning/review.
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bsk-[A-Za-z0-9]{32,}\b/.test(text)) errors.push(`${label}: possible embedded secret (value redacted)`);
  if (/\b[A-Z]:[\\/](?:Users|Euroland|EuroLand|CommomBE)[\\/]|\/(?:home|Users)\/[^\s/]+\//i.test(text)) errors.push(`${label}: machine/project-specific absolute path`);
  for (const line of instructions ? text.split(/\r?\n/) : []) {
    if (/\b(?:never|do not|don't|avoid|forbid|reject)\b/i.test(line)) continue;
    if (/git\s+(?:reset\s+--hard|push\b[^\r\n]*--force)|(?:curl|wget)\b.*\|\s*(?:bash|sh|pwsh)|\brm\s+-[a-z]*r[a-z]*f\b|\b(?:print|echo)\s+(?:all\s+)?(?:secrets|tokens|passwords)\b/i.test(line)) errors.push(`${label}: unsafe executable instruction (review required)`);
  }
  return errors;
}

export function checkLinks(path, boundary) {
  const errors = [];
  const text = readFileSync(path, 'utf8').replace(/^(```|~~~)[\s\S]*?^\1[^\r\n]*$/gm, '');
  for (const match of text.matchAll(/!?\[[^\]\r\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1].replace(/^<|>$/g, '');
    if (/^(https?:|mailto:|#)/i.test(link)) continue;
    const name = decodeURIComponent(link.split(/[?#]/)[0]), target = resolve(dirname(path), name), rel = relative(boundary, target);
    if (isAbsolute(name) || rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(target)) errors.push(`${relative(boundary, path)}: missing/escaping reference ${link}`);
  }
  return errors;
}

export function validateSkills(directories, { python = 'python', reference = false, log = console.log } = {}) {
  const result = spawnSync(python, [join(root, 'scripts/skill-spec.py'), ...(reference ? ['--reference'] : []), ...directories], { encoding: 'utf8', windowsHide: true });
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { parsed = { errors: ['Python/YAML prerequisite failed; use validation venv (no skill contents echoed)'] }; }
  const errors = [...(parsed.errors ?? [])], names = new Set();
  if (result.error) errors.push(`Python unavailable: ${result.error.code}`);
  for (const skill of parsed.skills ?? []) {
    if (names.has(skill.name)) errors.push(`Duplicate definition: ${skill.name}`);
    names.add(skill.name);
  }
  for (const directory of directories) {
    const path = join(directory, 'SKILL.md');
    if (!existsSync(path)) { errors.push(`${directory}: SKILL.md missing`); continue; }
    errors.push(...checkLinks(path, directory), ...checkText(readFileSync(path, 'utf8'), `${directory}/SKILL.md`));
  }
  errors.forEach(error => log(`FAIL: ${error}`));
  log(`${errors.length || result.status !== 0 ? 'FAIL' : 'PASS'}: ${directories.length} skills${reference ? ' including official skills-ref' : ''}`);
  return errors.length || result.status !== 0 ? 1 : 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const index = args.indexOf('--python');
  const python = index >= 0 ? args[index + 1] : 'python';
  const remaining = index < 0 ? args : args.filter((arg, i) => i !== index && i !== index + 1);
  try {
    if (index >= 0 && !python) throw new Error('--python needs an executable path');
    if (remaining.some(arg => arg !== '--reference')) throw new Error('Usage: validate-skills.mjs [--reference] [--python executable]');
    const directories = readdirSync(join(root, 'skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(root, 'skills', entry.name));
    if (!directories.length) throw new Error('No canonical skills found');
    process.exitCode = validateSkills(directories, { python, reference: remaining.includes('--reference') });
  } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 2; }
}
