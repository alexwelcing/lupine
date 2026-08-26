#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = path.relative(ROOT, fileURLToPath(import.meta.url)).split(path.sep).join('/');
const SKIP_ACTIVE_EXPORT = process.env.STALE_LEAN_SCAN_SKIP_ACTIVE_EXPORT === '1';
const STALE_NUMBER = /(?<![\d.])(?:77|190|262)(?![\d.])/;
const COUNT_CONTEXT = /theorems?|lemmas?|declarations?|build[- ]locked|proof layer|Lean 4 corpus|theorem[- ]inventory/i;
const TEXT_EXTENSIONS = new Set(['.html', '.json', '.js', '.md', '.mjs', '.txt', '.vtt']);
const HISTORICAL_PATH = /(?:^|\/)(?:CHANGELOG\.md|archive|exports|reviews)(?:\/|$)|ZENODO_DEPOSIT\.md$|\.zenodo\.json$/i;
const CODE_OR_TEST_PATH = /(?:^|\/)(?:tests?|testdata)(?:\/|$)|(?:^|\/)python\/tests\/|\.(?:lean|svg)$/i;

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8').split('\0').filter(Boolean);
const failures = [];
for (const relative of tracked) {
  const activeLatestExport = relative.startsWith('exports/library-content/latest/');
  const historicalCandidate = activeLatestExport
    ? relative.slice('exports/library-content/latest/'.length)
    : relative;
  if (relative === SELF || (activeLatestExport && SKIP_ACTIVE_EXPORT) || HISTORICAL_PATH.test(historicalCandidate) || CODE_OR_TEST_PATH.test(relative)) continue;
  if (!TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) continue;
  const lines = fs.readFileSync(path.join(ROOT, relative), 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const localContext = lines.slice(Math.max(0, index - 1), index + 2).join('\n');
    if (!STALE_NUMBER.test(line) || !COUNT_CONTEXT.test(localContext)) continue;
    const context = lines.slice(Math.max(0, index - 10), index + 1).join('\n');
    if (/frozen (?:PP-2|historical) snapshot/i.test(context)) continue;
    failures.push(`${relative}:${index + 1}: ${line.trim()}`);
  }
}
if (failures.length) {
  console.error('Refusing stale hand-typed Lean theorem totals outside labeled historical snapshots:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('check-stale-lean-counts: no active hand-typed 77/190/262 theorem totals');
