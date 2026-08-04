#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GALLERY_PATH = path.join(ROOT, 'packages/ui/src/gallery-data.json');
const NOMENCLATURE_PATH = path.join(ROOT, 'packages/ui/src/gallery-nomenclature.json');
const PUBLIC_DIR = path.join(ROOT, 'apps/web/public');
const DEFAULT_OUT_DIR = path.join(ROOT, '.verify-artifacts/gallery-reliability');

const argv = process.argv.slice(2);
const shouldWrite = argv.includes('--write') || argv.includes('--backup');
const shouldBackup = argv.includes('--backup');
const strict = argv.includes('--strict');
const outDir = valueAfter('--out') ?? DEFAULT_OUT_DIR;

function valueAfter(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function isRemote(file) {
  return /^https?:\/\//.test(file);
}

function publicPath(file) {
  return path.join(PUBLIC_DIR, file.replace(/^\/+/, ''));
}

async function sha256(filePath) {
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

function classifyGeometry(entry) {
  const text = [
    entry.file,
    entry.metadata?.method,
    entry.metadata?.potential,
    entry.metadata?.reference,
    entry.subtitle,
  ].filter(Boolean).join(' ');
  if (/PubChem 3D/i.test(text)) return 'pubchem-3d-conformer';
  if (/Atom QR|point-art|Image Frames to Atomic XYZ|QR Matrix/i.test(text)) return 'illustrative-atom-layout';
  if (/CHGNet|LAMMPS|AIMD|MACE|MD|Molecular dynamics|NIST|potential/i.test(text)) return 'simulation-or-benchmark';
  if (/Procedural|ASE Builder|Geometry Construction|Scale Test|builder/i.test(text)) return 'procedural-builder';
  if (entry.file === 'procedural') return 'runtime-procedural';
  return 'unspecified';
}

function issue(severity, code, message) {
  return { severity, code, message };
}

function hillFormula(counts) {
  const symbols = Object.keys(counts);
  const ordered = [];
  if (counts.C) ordered.push('C');
  if (counts.H) ordered.push('H');
  for (const symbol of symbols.sort()) {
    if (symbol !== 'C' && symbol !== 'H') ordered.push(symbol);
  }
  return ordered.map((symbol) => `${symbol}${counts[symbol] === 1 ? '' : counts[symbol]}`).join('');
}

function formulaFromXyz(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const natoms = Number.parseInt(lines[0], 10);
  if (!Number.isFinite(natoms) || natoms <= 0 || lines.length < natoms + 2) return null;
  const counts = {};
  for (const line of lines.slice(2, natoms + 2)) {
    const symbol = line.trim().split(/\s+/)[0];
    if (!/^[A-Z][a-z]?$/.test(symbol)) return null;
    counts[symbol] = (counts[symbol] ?? 0) + 1;
  }
  return hillFormula(counts);
}

function identityIssues(entry, identity, assetFormula) {
  const issues = [];
  const geometryClass = classifyGeometry(entry);

  if (geometryClass === 'pubchem-3d-conformer') {
    if (!identity) {
      issues.push(issue('error', 'missing-pubchem-identity', 'PubChem geometry entry has no nomenclature catalog record.'));
      return issues;
    }
    if (!identity.pubchemCid) issues.push(issue('error', 'missing-pubchem-cid', 'PubChem entry needs a PubChem CID.'));
    if (!identity.sourceUrl) issues.push(issue('error', 'missing-source-url', 'PubChem entry needs a source URL.'));
    if (!identity.molecularFormula) issues.push(issue('error', 'missing-formula', 'PubChem entry needs a molecular formula.'));
    if (!identity.systematicName) issues.push(issue('warn', 'missing-systematic-name', 'PubChem entry should carry an IUPAC/systematic name.'));
    if (assetFormula && identity.molecularFormula && assetFormula !== identity.molecularFormula) {
      issues.push(issue(
        'error',
        'formula-mismatch',
        `Coordinate formula ${assetFormula} does not match catalog formula ${identity.molecularFormula}.`,
      ));
    }
  }

  if (/^[A-Z0-9-]{2,}$/.test(entry.title) && !identity?.aliases?.length) {
    issues.push(issue('warn', 'abbreviation-without-aliases', 'Abbreviated title should have expanded aliases.'));
  }

  if (!entry.metadata?.reference && !entry.metadata?.doi && !identity?.sourceUrl) {
    issues.push(issue('warn', 'weak-provenance', 'Entry has no reference, DOI, or source URL.'));
  }

  if (geometryClass === 'unspecified') {
    issues.push(issue('warn', 'unspecified-geometry-source', 'Geometry source could not be classified from metadata.'));
  }

  return issues;
}

async function inspectAsset(entry, identity) {
  if (entry.file === 'procedural') {
    return { kind: 'procedural' };
  }
  if (isRemote(entry.file)) {
    return { kind: 'remote', url: entry.file };
  }
  const filePath = publicPath(entry.file);
  if (!existsSync(filePath)) {
    return { kind: 'missing', path: filePath };
  }
  const info = await stat(filePath);
  const hash = await sha256(filePath);
  let coordinateFormula = null;
  if (entry.file.endsWith('.xyz') && info.size < 5_000_000) {
    coordinateFormula = formulaFromXyz(await readFile(filePath, 'utf8'));
  }
  return {
    kind: 'local',
    path: path.relative(ROOT, filePath).replaceAll('\\', '/'),
    bytes: info.size,
    sha256: hash,
    coordinateFormula,
    backedUpName: `${entry.id}${path.extname(entry.file) || '.asset'}`,
  };
}

async function main() {
  const gallery = JSON.parse(await readFile(GALLERY_PATH, 'utf8'));
  const nomenclature = JSON.parse(await readFile(NOMENCLATURE_PATH, 'utf8')).entries ?? {};

  const manifestEntries = [];
  for (const entry of gallery) {
    const identity = nomenclature[entry.id];
    const asset = await inspectAsset(entry, identity);
    const issues = [
      ...(asset.kind === 'missing' ? [issue('error', 'missing-asset', `Missing local asset ${asset.path}.`)] : []),
      ...identityIssues(entry, identity, asset.coordinateFormula),
    ];

    manifestEntries.push({
      id: entry.id,
      title: entry.title,
      domain: entry.domain,
      file: entry.file,
      geometryClass: classifyGeometry(entry),
      identity: identity ?? null,
      asset,
      issues,
    });
  }

  const errorCount = manifestEntries.flatMap((entry) => entry.issues).filter((item) => item.severity === 'error').length;
  const warningCount = manifestEntries.flatMap((entry) => entry.issues).filter((item) => item.severity === 'warn').length;
  const summary = {
    generatedAt: new Date().toISOString(),
    galleryEntries: gallery.length,
    nomenclatureEntries: Object.keys(nomenclature).length,
    localAssets: manifestEntries.filter((entry) => entry.asset.kind === 'local').length,
    remoteAssets: manifestEntries.filter((entry) => entry.asset.kind === 'remote').length,
    errors: errorCount,
    warnings: warningCount,
  };
  const manifest = {
    schema: 'lupi.galleryReliabilityManifest.v1',
    source: path.relative(ROOT, GALLERY_PATH).replaceAll('\\', '/'),
    nomenclature: path.relative(ROOT, NOMENCLATURE_PATH).replaceAll('\\', '/'),
    summary,
    entries: manifestEntries,
  };

  if (shouldWrite) {
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (shouldBackup) {
    const assetDir = path.join(outDir, 'assets');
    await mkdir(assetDir, { recursive: true });
    for (const entry of manifestEntries) {
      if (entry.asset.kind !== 'local') continue;
      await copyFile(path.join(ROOT, entry.asset.path), path.join(assetDir, entry.asset.backedUpName));
    }
  }

  console.log(`[lupi:nomenclature] ${summary.galleryEntries} gallery entries, ${summary.nomenclatureEntries} nomenclature records`);
  console.log(`[lupi:nomenclature] ${summary.errors} errors, ${summary.warnings} warnings`);
  if (shouldWrite) console.log(`[lupi:nomenclature] wrote ${path.relative(process.cwd(), path.join(outDir, 'manifest.json'))}`);
  if (shouldBackup) console.log(`[lupi:nomenclature] backed up local assets under ${path.relative(process.cwd(), path.join(outDir, 'assets'))}`);

  for (const entry of manifestEntries) {
    for (const item of entry.issues) {
      console.log(`${item.severity.toUpperCase()} ${entry.id} ${item.code}: ${item.message}`);
    }
  }

  if (strict && errorCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
