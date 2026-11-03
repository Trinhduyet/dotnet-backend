#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, safePath, skills } from './policy-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const scenarios = JSON.parse(readFileSync(join(root, 'evals/public-scenarios.json'), 'utf8'));

export function checkFixtures(data = scenarios) {
  if (data.schemaVersion !== 1 || !Array.isArray(data.cases) || data.cases.length < 7) throw new Error('Invalid evaluation suite');
  const ids = new Set();
  for (const item of data.cases) {
    if (!item.id || ids.has(item.id) || !item.prompt || !item.expect || !item.files || !Array.isArray(item.allowedChanges) || item.skills.some(n => !skills.includes(n))) throw new Error('Invalid/duplicate evaluation case');
    if (item.kind === 'static-review-fixture' && (!['P0', 'P1', 'P2', 'P3', 'none'].includes(item.severity) || !Array.isArray(item.evidenceRequired) || !item.evidenceRequired.length || !item.recommendation || !Array.isArray(item.falsePositiveConditions) || !item.falsePositiveConditions.length)) throw new Error(`Static review fixture lacks severity/evidence/recommendation/false-positive conditions: ${item.id}`);
    ids.add(item.id);
    for (const name of [...Object.keys(item.files), ...item.allowedChanges]) safePath(root, name);
    if (item.expect.file && !item.files[item.expect.file]?.split('\n')[item.expect.line - 1]?.includes('Address')) throw new Error('Review oracle has an invalid evidence line');
  }
  return data.cases.length;
}

// Structured human/agent response grading: scope, exact scenario semantics and evidence.
// This does not simulate an LLM or prove an agent ran merely because text matches.
export function gradeResponse(item, response, evidenceRoot) {
  const failures = [];
  if (JSON.stringify([...response.selectedSkills ?? []].sort()) !== JSON.stringify([...item.skills].sort())) failures.push('Wrong activation');
  if ((response.changedFiles ?? []).some(n => !item.allowedChanges.includes(n))) failures.push('Changes exceed requested scope');
  for (const [key, expected] of Object.entries(item.expect)) if (response.observed?.[key] !== expected) failures.push(`Incorrect scenario behavior: ${key}`);
  if (item.requiresPatch) {
    try {
      const patch = readFileSync(safePath(evidenceRoot, response.patchFile), 'utf8');
      const touched = [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m => m[1]).sort();
      if (!touched.length || JSON.stringify(touched) !== JSON.stringify([...response.changedFiles ?? []].sort())
          || touched.some(n => !item.allowedChanges.includes(n)) || !response.claimsTestsPassed) failures.push('Implementation needs scoped patch and executed regression evidence');
    } catch { failures.push('Implementation patch evidence missing'); }
  }
  if (response.claimsTestsPassed) {
    try {
      const path = safePath(evidenceRoot, response.evidenceFile);
      const proof = JSON.parse(readFileSync(path, 'utf8'));
      if (proof.exitCode !== 0 || !(proof.executedTests > 0) || proof.failedTests !== 0 || !proof.command) failures.push('Test claim lacks execution evidence');
    } catch { failures.push('Test claim lacks readable execution evidence'); }
  }
  return failures;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const args = parseArgs(process.argv.slice(2), ['--responses'], ['--check']);
    console.log(`PASS: ${checkFixtures()} generic evaluation fixtures, including negative activation cases`);
    if (args['--responses']) {
      const path = resolve(args['--responses']), input = JSON.parse(readFileSync(path, 'utf8'));
      if (!input.agent?.name || !input.agent?.version || !Array.isArray(input.results)) throw new Error('Responses need named agent/version and results');
      let failed = false;
      for (const item of scenarios.cases) {
        const responses = input.results.filter(r => r.id === item.id);
        const errors = responses.length === 1 ? gradeResponse(item, responses[0], dirname(path)) : ['Missing/duplicate response'];
        console.log(`${errors.length ? 'FAIL' : 'PASS'}: ${item.id}${errors.length ? ': ' + errors.join('; ') : ''}`);
        failed ||= errors.length > 0;
      }
      process.exitCode = failed ? 1 : 0;
      console.log('NOTE: graded supplied responses; retain actual agent transcript and patch/test evidence for a behavioral claim');
    } else if (!args['--check']) {
      console.error('BLOCKED: live agent task-quality evaluation needs --responses from a named agent and execution evidence');
      process.exitCode = 2;
    } else console.log('SKIPPED: live model activation/task quality — fixtures/grader only, no agent responses supplied');
  } catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 2; }
}
