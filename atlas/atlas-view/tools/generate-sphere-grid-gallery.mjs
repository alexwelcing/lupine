#!/usr/bin/env node
/**
 * generate-sphere-grid-gallery.mjs
 *
 * Build-time step that turns the live Lupine wiki graph into a first-class
 * lupi gallery entry:
 *  1. Runs lupine-wiki export-molecule.
 *  2. Copies the best-format trajectory into apps/web/public/generated/lupine-wiki/.
 *  3. Renders a gallery snapshot (640x280 JPG) via Playwright + Chrome.
 *  4. Inserts/updates the entry in packages/ui/src/gallery-data.json.
 */

import { chromium } from 'playwright';
import { createCanvas, loadImage } from 'canvas';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LUPINE_WIKI_DIR = path.resolve(
  process.env.LUPINE_WIKI_DIR ?? path.resolve(REPO_ROOT, '../../lupine-wiki'),
);
const LUPINE_WIKI_BIN = path.join(LUPINE_WIKI_DIR, 'target/release/lupine-wiki');
const PUBLIC_OUT = path.join(REPO_ROOT, 'apps/web/public/generated/lupine-wiki');
const SNAPSHOT_DIR = path.join(REPO_ROOT, 'apps/web/public/gallery/snapshots');
const GALLERY_DATA = path.join(REPO_ROOT, 'packages/ui/src/gallery-data.json');
const CHROME_BIN = path.join(REPO_ROOT, '.chromium/chrome-linux64/chrome');
const DEV_SERVER = 'http://localhost:3000';

const EXAMPLE_ID = 'lupine_sphere_grid';
const EXAMPLE_TITLE = 'Lupine Sphere Grid';
const EXAMPLE_SUBTITLE_BASE = 'Live knowledge graph of the Lupine ecosystem';
const CATALOG_SCHEMA = 'lupine.sphere-grid-gallery.v1';
const STALE_GRAPH = { nodeCount: 635, edgeCount: 1238 };

function exec(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

async function ensureWikiBuilt() {
  if (await fileExists(LUPINE_WIKI_BIN)) return;
  if (!(await fileExists(LUPINE_WIKI_DIR))) {
    throw new Error(`lupine-wiki directory not found: ${LUPINE_WIKI_DIR}`);
  }
  console.log('[sphere-grid] Building lupine-wiki...');
  exec('cargo build --release', { cwd: LUPINE_WIKI_DIR });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function assertCurrentGraph(meta, labels) {
  const nodeCount = meta.node_count ?? 0;
  const edgeCount = meta.edge_count ?? 0;
  if (nodeCount === STALE_GRAPH.nodeCount && edgeCount === STALE_GRAPH.edgeCount) {
    throw new Error(`refusing stale ${nodeCount}-node/${edgeCount}-edge sphere-grid export`);
  }

  const rhizoRoot = labels.labels?.find(
    (label) =>
      label.sphere_id === 'lupine-science' &&
      label.node_kind === 'repo' &&
      label.text === 'lupine-rhizo',
  );
  if (!rhizoRoot) {
    throw new Error('lupine-science sphere does not contain the active lupine-rhizo root');
  }
  return rhizoRoot;
}

async function copyArtifact(source, destination) {
  if (path.resolve(source) !== path.resolve(destination)) {
    await fs.copyFile(source, destination);
    console.log('[sphere-grid] Copied artifact:', destination);
  }
}

async function artifactRecord(filePath) {
  const bytes = await fs.readFile(filePath);
  return {
    path: path.basename(filePath),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

async function writeCatalog(meta, labels, rhizoRoot, artifacts) {
  const catalog = {
    schema: CATALOG_SCHEMA,
    graph: {
      spheres: meta.spheres?.length ?? 0,
      nodes: meta.node_count ?? 0,
      edges: meta.edge_count ?? 0,
      labels: labels.labels?.length ?? 0,
    },
    required_sources: [
      {
        sphere: rhizoRoot.sphere_id,
        kind: rhizoRoot.node_kind,
        root: rhizoRoot.text,
      },
    ],
    artifacts: Object.fromEntries(
      await Promise.all(
        Object.entries(artifacts).map(async ([name, filePath]) => [name, await artifactRecord(filePath)]),
      ),
    ),
  };
  const catalogPath = path.join(PUBLIC_OUT, 'catalog.json');
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log('[sphere-grid] Wrote integrity catalog:', catalogPath);
  return catalogPath;
}

async function exportMolecule(tempDir) {
  console.log('[sphere-grid] Exporting molecule from wiki...');
  exec(`"${LUPINE_WIKI_BIN}" export-molecule --output "${tempDir}" --quiet`, { cwd: LUPINE_WIKI_DIR });
  return {
    xyz: path.join(tempDir, 'sphere-grid.xyz'),
    data: path.join(tempDir, 'sphere-grid.data'),
    dump: path.join(tempDir, 'sphere-grid.lammpstrj'),
    meta: path.join(tempDir, 'sphere-grid.molecule.json'),
    labels: path.join(tempDir, 'sphere-grid.labels.json'),
  };
}

async function useExistingAssets() {
  console.log('[sphere-grid] Falling back to committed assets in', PUBLIC_OUT);
  return {
    xyz: path.join(PUBLIC_OUT, 'sphere-grid.xyz'),
    data: path.join(PUBLIC_OUT, 'sphere-grid.data'),
    dump: path.join(PUBLIC_OUT, 'sphere-grid.lammpstrj'),
    meta: path.join(PUBLIC_OUT, 'sphere-grid.molecule.json'),
    labels: path.join(PUBLIC_OUT, 'sphere-grid.labels.json'),
  };
}

async function ensureChrome() {
  if (await fileExists(CHROME_BIN)) return;
  throw new Error(`Chrome for Testing not found at ${CHROME_BIN}. Run the setup step first.`);
}

async function generateSnapshot(trajectoryUrl) {
  console.log('[sphere-grid] Rendering gallery snapshot...');
  const browser = await chromium.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const browserCtx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await browserCtx.newPage();

  const url = `${DEV_SERVER}/?load=${encodeURIComponent(trajectoryUrl)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window?.__atlas?.getState !== undefined, null, { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const s = window.__atlas.getState();
      return s.file != null || s.error != null;
    },
    null,
    { timeout: 30000 },
  );
  // Force a readable knowledge-graph look: large atoms, dark background, no bonds.
  await page.evaluate(() => {
    const store = window.__atlas.store;
    store.setState({ atomScale: 5, backgroundPreset: 'deep', showBonds: false });
  });
  await page.waitForTimeout(3000);

  const screenshotPath = path.join(REPO_ROOT, '.verify-artifacts', 'sphere-grid-gallery-source.png');
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  // Crop and resize to the standard gallery card aspect ratio (640x280).
  const img = await loadImage(screenshotPath);
  const canvas = createCanvas(640, 280);
  const ctx = canvas.getContext('2d');
  const sourceAspect = img.width / img.height;
  const targetAspect = 640 / 280;
  let sx, sy, sw, sh;
  if (sourceAspect > targetAspect) {
    sh = img.height;
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / targetAspect;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 640, 280);

  const snapshotPath = path.join(SNAPSHOT_DIR, `${EXAMPLE_ID}.jpg`);
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.92 });
  await fs.writeFile(snapshotPath, buffer);
  console.log('[sphere-grid] Snapshot saved:', snapshotPath);
  return snapshotPath;
}

async function updateGalleryData(trajectoryFile, metaFile) {
  console.log('[sphere-grid] Updating gallery catalog...');
  const raw = await fs.readFile(GALLERY_DATA, 'utf8');
  const examples = JSON.parse(raw);

  const metaRaw = await fs.readFile(metaFile, 'utf8');
  const meta = JSON.parse(metaRaw);
  const nodeCount = meta.node_count ?? 0;
  const edgeCount = meta.edge_count ?? 0;
  const sphereCount = meta.spheres?.length ?? 0;

  const existingIndex = examples.findIndex((e) => e.id === EXAMPLE_ID);
  const entry = {
    id: EXAMPLE_ID,
    title: EXAMPLE_TITLE,
    subtitle: `${EXAMPLE_SUBTITLE_BASE} — ${sphereCount} spheres, ${nodeCount} nodes, ${edgeCount} edges — rendered as a molecule. Sphere colors the cluster; node kind scales the atom.`,
    domain: 'Atomized Media',
    atoms: String(nodeCount),
    frames: '1',
    file: `generated/lupine-wiki/${path.basename(trajectoryFile)}`,
    available: true,
    colors: ['#ff9f43', '#5f27cd', '#10ac84'],
    metadata: {
      method: 'Lupine Wiki Knowledge Graph → Molecular Structure',
      source: 'lupine-wiki export-molecule',
      spheres: String(sphereCount),
      nodes: String(nodeCount),
      edges: String(edgeCount),
      color_by: 'sphere (element type)',
      size_by: 'kind (radius property)',
    },
    featured: true,
    initialAtomScale: 5,
    initialBackgroundPreset: 'deep',
    labelsUrl: 'generated/lupine-wiki/sphere-grid.labels.json',
  };

  if (existingIndex >= 0) {
    examples[existingIndex] = entry;
  } else {
    // Insert after the other atomized media entries for cohesion.
    const insertAfter = examples.findIndex((e) => e.id === 'pulse_grid_atomized');
    if (insertAfter >= 0) {
      examples.splice(insertAfter + 1, 0, entry);
    } else {
      examples.unshift(entry);
    }
  }

  await fs.writeFile(GALLERY_DATA, `${JSON.stringify(examples, null, 2)}\n`, 'utf8');
  console.log('[sphere-grid] Gallery catalog updated:', GALLERY_DATA);
}

async function main() {
  const withSnapshot = !process.argv.includes('--no-snapshot');
  const useExisting = process.argv.includes('--use-existing');
  const tempDir = path.join(REPO_ROOT, '.tmp-sphere-grid');
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(PUBLIC_OUT, { recursive: true });
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });

  let files;
  if (useExisting) {
    files = await useExistingAssets();
  } else {
    try {
      await ensureWikiBuilt();
      files = await exportMolecule(tempDir);
    } catch (err) {
      throw new Error(`Wiki export failed; refusing committed-asset fallback: ${err.message}`);
    }
  }

  const meta = await readJson(files.meta);
  const labels = await readJson(files.labels);
  const rhizoRoot = assertCurrentGraph(meta, labels);
  const destinations = {
    xyz: path.join(PUBLIC_OUT, 'sphere-grid.xyz'),
    data: path.join(PUBLIC_OUT, 'sphere-grid.data'),
    lammpstrj: path.join(PUBLIC_OUT, 'sphere-grid.lammpstrj'),
    molecule: path.join(PUBLIC_OUT, 'sphere-grid.molecule.json'),
    labels: path.join(PUBLIC_OUT, 'sphere-grid.labels.json'),
  };
  await Promise.all([
    copyArtifact(files.xyz, destinations.xyz),
    copyArtifact(files.data, destinations.data),
    copyArtifact(files.dump, destinations.lammpstrj),
    copyArtifact(files.meta, destinations.molecule),
    copyArtifact(files.labels, destinations.labels),
  ]);

  // Use the LAMMPS dump as the canonical gallery format (fastest lupi path).
  const destTrajectory = destinations.lammpstrj;
  const catalogPath = await writeCatalog(meta, labels, rhizoRoot, destinations);

  // Update the catalog first so the ?sim= load path can read initialAtomScale
  // and other gallery-specific overrides during snapshot rendering.
  await updateGalleryData(destTrajectory, files.meta);

  let snapshotPath = null;
  if (withSnapshot) {
    await ensureChrome();
    snapshotPath = await generateSnapshot('/generated/lupine-wiki/sphere-grid.lammpstrj');
  }

  // Clean up temp dir.
  await fs.rm(tempDir, { recursive: true, force: true });

  console.log('[sphere-grid] Done.');
  console.log(JSON.stringify({
    ok: true,
    trajectory: destTrajectory,
    snapshot: snapshotPath,
    galleryData: GALLERY_DATA,
    catalog: catalogPath,
  }, null, 2));
}

main().catch((err) => {
  console.error('[sphere-grid]', err);
  process.exit(1);
});
