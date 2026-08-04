#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createCanvas, loadImage } from 'canvas';
import jsQR from 'jsqr';

const execFileAsync = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools', 'atomize-media.mjs');

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'lupi-atomize-'));
  const payload = 'https://lupi.live/#/view/qr-molecule-smoke';
  const { stdout } = await execFileAsync(process.execPath, [
    tool,
    'qr',
    '--text',
    payload,
    '--name',
    'qr-smoke',
    '--out-dir',
    tmp,
    '--module-atoms',
    '3',
    '--light-mode',
    'corners',
  ], { cwd: root });

  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.ok(result.atoms > 0);
  assert.ok(result.bonds > 0);
  assert.match(result.matrix, /^\d+x\d+$/);

  const xyz = await fs.readFile(result.files.xyzFile, 'utf8');
  const xyzLines = xyz.trim().split(/\r?\n/);
  assert.equal(Number(xyzLines[0]), result.atoms);
  assert.match(xyzLines[1], /atomized_media=qr-smoke/);
  assert.match(xyz, /^C\s/m, 'dark modules should emit carbon atoms');
  assert.match(xyz, /^H\s/m, 'light backing modules should emit hydrogen atoms');

  const data = await fs.readFile(result.files.dataFile, 'utf8');
  assert.match(data, /Atoms # atomic/);
  assert.match(data, /Bonds/);
  assert.match(data, /\n\d+ 6 /, 'LAMMPS data should preserve carbon as numeric type 6');

  const png = await fs.readFile(result.files.pngFile);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(await decodeQrPng(result.files.pngFile), payload);

  const meta = JSON.parse(await fs.readFile(result.files.jsonFile, 'utf8'));
  assert.equal(meta.mode, 'qr');
  assert.equal(meta.recommendedViewerParams.camera, 'top');

  const publicQrPreview = path.join(root, 'apps/web/public/generated/atomized/lupi-live-qr-atomized.png');
  assert.equal(await decodeQrPng(publicQrPreview), 'https://lupi.live');

  const imageInput = path.join(tmp, 'tiny-mark.png');
  await writeTinyImage(imageInput);
  const imageRun = await execFileAsync(process.execPath, [
    tool,
    'image',
    '--input',
    imageInput,
    '--name',
    'image-smoke',
    '--out-dir',
    tmp,
    '--quiet-zone',
    '0',
    '--module-atoms',
    '2',
  ], { cwd: root });
  const imageResult = JSON.parse(imageRun.stdout);
  assert.equal(imageResult.ok, true);
  assert.ok(imageResult.atoms > 0);
  const imageXyz = await fs.readFile(imageResult.files.xyzFile, 'utf8');
  assert.match(imageXyz, /atomized_media=image-smoke/);
  const imageMeta = JSON.parse(await fs.readFile(imageResult.files.jsonFile, 'utf8'));
  assert.equal(imageMeta.mode, 'image');

  const framesDir = path.join(tmp, 'frames');
  await fs.mkdir(framesDir);
  await writeTinyImage(path.join(framesDir, 'frame-001.png'), 0);
  await writeTinyImage(path.join(framesDir, 'frame-002.png'), 1);
  await writeTinyImage(path.join(framesDir, 'frame-003.png'), 2);
  const framesRun = await execFileAsync(process.execPath, [
    tool,
    'frames',
    '--input-dir',
    framesDir,
    '--name',
    'frames-smoke',
    '--out-dir',
    tmp,
    '--quiet-zone',
    '0',
    '--module-atoms',
    '2',
  ], { cwd: root });
  const framesResult = JSON.parse(framesRun.stdout);
  assert.equal(framesResult.ok, true);
  assert.equal(framesResult.frames, 3);
  assert.ok(framesResult.atomsPerFrame > 0);
  assert.equal(countXyzFrames(await fs.readFile(framesResult.files.xyzFile, 'utf8')), 3);
  const dump = await fs.readFile(framesResult.files.dumpFile, 'utf8');
  assert.equal((dump.match(/ITEM: TIMESTEP/g) ?? []).length, 3);
  assert.match(dump, /ITEM: ATOMS id type x y z signal/);
  const framesMeta = JSON.parse(await fs.readFile(framesResult.files.jsonFile, 'utf8'));
  assert.equal(framesMeta.mode, 'frames');
  assert.equal(framesMeta.lightMode, 'filled');

  console.log(JSON.stringify({
    ok: true,
    atoms: result.atoms,
    bonds: result.bonds,
    matrix: result.matrix,
    imageAtoms: imageResult.atoms,
    frameAtoms: framesResult.atomsPerFrame,
  }, null, 2));
}

async function decodeQrPng(file) {
  const image = await loadImage(file);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height);
  const decoded = jsQR(pixels.data, image.width, image.height);
  assert.ok(decoded, 'generated QR preview should decode');
  return decoded.data;
}

function countXyzFrames(text) {
  const lines = text.trim().split(/\r?\n/);
  let cursor = 0;
  let frames = 0;
  while (cursor < lines.length) {
    const atoms = Number(lines[cursor]);
    assert.ok(Number.isInteger(atoms) && atoms > 0, `invalid XYZ atom count at line ${cursor + 1}`);
    cursor += atoms + 2;
    frames += 1;
  }
  return frames;
}

async function writeTinyImage(file, variant = 0) {
  const canvas = createCanvas(8, 8);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = '#000';
  ctx.fillRect(1, 1, 2, 2);
  ctx.fillRect(3 + variant, 2, 2, 3);
  ctx.fillRect(2, 5 + (variant % 2), 4, 1);
  await fs.writeFile(file, canvas.toBuffer('image/png'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
