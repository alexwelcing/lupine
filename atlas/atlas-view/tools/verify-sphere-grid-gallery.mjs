#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, '../apps/web/public/generated/lupine-wiki');
const CATALOG_SCHEMA = 'lupine.sphere-grid-gallery.v1';
const ARTIFACT_PATHS = {
  xyz: 'sphere-grid.xyz',
  data: 'sphere-grid.data',
  lammpstrj: 'sphere-grid.lammpstrj',
  molecule: 'sphere-grid.molecule.json',
  labels: 'sphere-grid.labels.json',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function verifyArtifact(name, record) {
  assert(record?.path === ARTIFACT_PATHS[name], `catalog artifact ${name} has a non-canonical path`);
  const filePath = path.join(OUTPUT, record.path);
  const bytes = await fs.readFile(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert(bytes.length === record.bytes, `${name} byte count mismatch`);
  assert(sha256 === record.sha256, `${name} SHA-256 mismatch`);
}

function assertPortableLabels(labels) {
  const absolutePath = /^(?:\/|[A-Za-z]:[\\/])/;
  const absoluteNodeUri = /^(?:node-)?[^:]+:\/\/[^/]+\/(?:\/|[A-Za-z]:[\\/])/;
  for (const label of labels) {
    for (const field of ['description', 'id', 'node_id']) {
      const value = label[field];
      assert(
        typeof value !== 'string' ||
          (!absolutePath.test(value) && !absoluteNodeUri.test(value)),
        `checkout-specific absolute path in label ${field}: ${value}`,
      );
    }
  }
}

async function main() {
  const catalog = await readJson(path.join(OUTPUT, 'catalog.json'));
  const meta = await readJson(path.join(OUTPUT, 'sphere-grid.molecule.json'));
  const labels = await readJson(path.join(OUTPUT, 'sphere-grid.labels.json'));
  const xyz = await fs.readFile(path.join(OUTPUT, 'sphere-grid.xyz'), 'utf8');
  const data = await fs.readFile(path.join(OUTPUT, 'sphere-grid.data'), 'utf8');
  const dump = await fs.readFile(path.join(OUTPUT, 'sphere-grid.lammpstrj'), 'utf8');

  assert(catalog.schema === CATALOG_SCHEMA, `unexpected catalog schema: ${catalog.schema}`);
  assert(catalog.graph.nodes === meta.node_count, 'catalog/meta node count mismatch');
  assert(catalog.graph.edges === meta.edge_count, 'catalog/meta edge count mismatch');
  assert(catalog.graph.spheres === meta.spheres.length, 'catalog/meta sphere count mismatch');
  assert(catalog.graph.labels === labels.labels.length, 'catalog/labels count mismatch');
  assertPortableLabels(labels.labels);
  assert(Number.parseInt(xyz.split('\n', 1)[0], 10) === meta.node_count, 'XYZ atom count mismatch');

  const dataAtomMatch = data.match(/^(\d+) atoms$/m);
  const dataBondMatch = data.match(/^(\d+) bonds$/m);
  assert(dataAtomMatch, 'LAMMPS data file is missing atom cardinality');
  assert(dataBondMatch, 'LAMMPS data file is missing bond cardinality');
  assert(Number.parseInt(dataAtomMatch[1], 10) === meta.node_count, 'LAMMPS data atom count mismatch');
  assert(Number.parseInt(dataBondMatch[1], 10) === meta.edge_count, 'LAMMPS data bond count mismatch');

  const dumpAtomMatch = dump.match(/ITEM: NUMBER OF ATOMS\n(\d+)/);
  assert(dumpAtomMatch, 'LAMMPS dump is missing atom cardinality');
  assert(Number.parseInt(dumpAtomMatch[1], 10) === meta.node_count, 'LAMMPS atom count mismatch');
  assert(!(meta.node_count === 635 && meta.edge_count === 1238), 'stale 635-node/1,238-edge graph');

  const rhizoLabel = labels.labels.find(
    (label) =>
      label.sphere_id === 'lupine-science' &&
      label.node_kind === 'repo' &&
      label.text === 'lupine-rhizo',
  );
  assert(rhizoLabel, 'active lupine-rhizo root is missing from the Lupine Science sphere');
  assert(
    catalog.required_sources.some(
      (source) =>
        source.sphere === 'lupine-science' && source.kind === 'repo' && source.root === 'lupine-rhizo',
    ),
    'catalog does not attest the active lupine-rhizo source',
  );

  const requiredArtifacts = Object.keys(ARTIFACT_PATHS);
  assert(
    requiredArtifacts.every((name) => catalog.artifacts[name]),
    'catalog is missing one or more required artifacts',
  );
  await Promise.all(Object.entries(catalog.artifacts).map(([name, record]) => verifyArtifact(name, record)));

  console.log(
    `[sphere-grid] Verified ${meta.node_count} nodes, ${meta.edge_count} edges, ` +
      `${labels.labels.length} labels, and ${requiredArtifacts.length} artifact checksums.`,
  );
}

main().catch((error) => {
  console.error('[sphere-grid]', error.message);
  process.exit(1);
});