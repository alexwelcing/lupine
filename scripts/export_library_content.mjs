#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

execFileSync(process.execPath, ['scripts/check-stale-lean-counts.mjs'], {
  cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  stdio: 'inherit',
});
import { CATALOG } from '../library-site/scripts/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(REPO_ROOT, 'exports', 'library-content', 'latest');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') {
      args.out = path.resolve(argv[++i]);
    } else if (arg.startsWith('--out=')) {
      args.out = path.resolve(arg.slice('--out='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function relToPosix(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

function normalizeSource(source) {
  return source.split(/[\\/]+/).filter(Boolean).join('/');
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

function gitValue(args) {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function copySource(source, outRoot, files, seen) {
  const normalized = normalizeSource(source);
  const sourcePath = path.resolve(REPO_ROOT, normalized);
  if (!sourcePath.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`Refusing to export outside repo: ${source}`);
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Catalog source not found: ${source}`);
  }

  const bundleSource = `articles/${normalized}`;
  const destPath = path.join(outRoot, ...bundleSource.split('/'));
  if (!seen.has(bundleSource)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
    const stats = hashFile(destPath);
    files.push({
      source: normalized,
      bundleSource,
      ...stats,
    });
    seen.add(bundleSource);
  }
  return bundleSource;
}

function buildBundleCatalog(outRoot) {
  const files = [];
  const seen = new Set();
  const entries = CATALOG.entries.map((entry) => {
    const next = cloneJson(entry);
    next.originalSource = normalizeSource(entry.source);
    next.source = copySource(entry.source, outRoot, files, seen);
    if (entry.i18n) {
      next.originalI18n = cloneJson(entry.i18n);
      next.i18n = {};
      for (const [lang, source] of Object.entries(entry.i18n)) {
        next.i18n[lang] = copySource(source, outRoot, files, seen);
      }
    }
    return next;
  });

  return {
    catalog: {
      statuses: cloneJson(CATALOG.statuses || {}),
      categories: cloneJson(CATALOG.categories || []),
      entries,
      languages: cloneJson(CATALOG.languages || {}),
    },
    files,
  };
}

function ensureSafeOut(outRoot) {
  const expectedRoot = path.join(REPO_ROOT, 'exports', 'library-content');
  const resolved = path.resolve(outRoot);
  if (!resolved.startsWith(expectedRoot + path.sep) && resolved !== expectedRoot) {
    throw new Error(`Refusing to clear output outside ${expectedRoot}: ${resolved}`);
  }
  return resolved;
}

function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const outRoot = ensureSafeOut(out);
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  const { catalog, files } = buildBundleCatalog(outRoot);
  const sourceCommit = gitValue(['rev-parse', 'HEAD']);
  const status = gitValue(['status', '--short']);
  const manifest = {
    schemaVersion: 'library-content.v1',
    generatedAt: new Date().toISOString(),
    source: {
      repo: 'lupine-science-control-plane',
      commit: sourceCommit,
      dirty: Boolean(status),
      generator: 'scripts/export_library_content.mjs',
    },
    catalog,
    files,
  };

  fs.writeFileSync(
    path.join(outRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const relativeOut = relToPosix(REPO_ROOT, outRoot);
  console.log(`Exported ${files.length} files for ${catalog.entries.length} catalog entries.`);
  console.log(`Output: ${relativeOut}`);
}

main();
