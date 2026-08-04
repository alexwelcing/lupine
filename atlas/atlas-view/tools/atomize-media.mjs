#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

const DEFAULTS = {
  outDir: 'apps/web/public/generated/atomized',
  moduleAtoms: 4,
  atomSpacing: 0.32,
  moduleSpacing: 1.6,
  quietZone: 4,
  darkElement: 'C',
  lightElement: 'H',
  lightMode: 'corners',
  zDark: 0,
  zLight: -0.08,
  previewScale: 12,
  maxImageSize: 96,
  threshold: 0.52,
};

function usage() {
  return `Usage:
  node tools/atomize-media.mjs qr --text <url-or-text> --name <slug> [--out-dir <dir>]
  node tools/atomize-media.mjs image --input <png-jpg> --name <slug> [--out-dir <dir>]
  node tools/atomize-media.mjs frames --input-dir <dir> --name <slug> [--out-dir <dir>]
  node tools/atomize-media.mjs frames --input <frame1.png> --input <frame2.png> --name <slug>

Outputs:
  <name>.xyz        atomized molecular point-art structure or trajectory
  <name>.data       LAMMPS data file with dense in-module bonds for first frame
  <name>.lammpstrj  LAMMPS dump trajectory for frame sequences
  <name>.png        flat matrix preview from the same binary source
  <name>.json       metadata and recommended LUPI load URL
`;
}

function parseArgs(argv) {
  if (argv[0] === '--') argv = argv.slice(1);
  const [mode, ...rest] = argv;
  if (!mode || mode === '-h' || mode === '--help') return { help: true };
  const args = { mode, ...DEFAULTS };
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const name = key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) {
      args[name] = true;
      continue;
    }
    if (name === 'input' && args.input !== undefined) {
      args.input = Array.isArray(args.input) ? [...args.input, value] : [args.input, value];
    } else {
      args[name] = coerceValue(value);
    }
    i += 1;
  }
  return args;
}

function coerceValue(value) {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function slugify(value) {
  return String(value || 'atomized')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'atomized';
}

function qrMatrix(text, quietZone) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const raw = [];
  for (let y = 0; y < size; y += 1) {
    const row = [];
    for (let x = 0; x < size; x += 1) {
      row.push(Boolean(qr.modules.get(x, y)));
    }
    raw.push(row);
  }
  return addQuietZone(raw, quietZone);
}

function addQuietZone(matrix, quietZone) {
  if (quietZone <= 0) return matrix;
  const width = matrix[0]?.length ?? 0;
  const empty = () => Array.from({ length: width + quietZone * 2 }, () => false);
  const rows = [];
  for (let i = 0; i < quietZone; i += 1) rows.push(empty());
  for (const row of matrix) {
    rows.push([
      ...Array.from({ length: quietZone }, () => false),
      ...row,
      ...Array.from({ length: quietZone }, () => false),
    ]);
  }
  for (let i = 0; i < quietZone; i += 1) rows.push(empty());
  return rows;
}

async function imageMatrix(input, maxSize, threshold, invert, quietZone) {
  const img = await loadImage(input);
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const matrix = [];
  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] / 255;
      const luminance = ((0.2126 * data[i]) + (0.7152 * data[i + 1]) + (0.0722 * data[i + 2])) / 255;
      const dark = alpha > 0.08 && luminance < threshold;
      row.push(invert ? !dark : dark);
    }
    matrix.push(row);
  }
  return addQuietZone(matrix, quietZone);
}

async function frameInputs(args) {
  const inputs = [];
  if (args.input !== undefined) {
    inputs.push(...(Array.isArray(args.input) ? args.input : [args.input]));
  }
  if (args.inputDir) {
    const dir = path.resolve(String(args.inputDir));
    const entries = await fs.readdir(dir);
    const imageFiles = entries
      .filter((entry) => /\.(?:png|jpe?g|webp)$/i.test(entry))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((entry) => path.join(dir, entry));
    inputs.push(...imageFiles);
  }
  return inputs.map((input) => path.resolve(String(input)));
}

async function imageMatrices(inputs, args) {
  const matrices = [];
  for (const input of inputs) {
    matrices.push(await imageMatrix(input, Number(args.maxImageSize), Number(args.threshold), Boolean(args.invert), Number(args.quietZone)));
  }
  return normalizeMatrixSizes(matrices);
}

function normalizeMatrixSizes(matrices) {
  if (matrices.length === 0) return matrices;
  const width = Math.max(...matrices.map((matrix) => matrix[0]?.length ?? 0));
  const height = Math.max(...matrices.map((matrix) => matrix.length));
  return matrices.map((matrix) => {
    const sourceHeight = matrix.length;
    const sourceWidth = matrix[0]?.length ?? 0;
    const padLeft = Math.floor((width - sourceWidth) / 2);
    const padTop = Math.floor((height - sourceHeight) / 2);
    const rows = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) rows[y + padTop][x + padLeft] = matrix[y][x];
    }
    return rows;
  });
}

function atomizeMatrix(matrix, options) {
  const atoms = [];
  const bonds = [];
  const height = matrix.length;
  const width = matrix[0]?.length ?? 0;
  const halfX = ((width - 1) * options.moduleSpacing) / 2;
  const halfY = ((height - 1) * options.moduleSpacing) / 2;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const dark = Boolean(matrix[row][col]);
      if (dark) {
        addFilledModule(atoms, bonds, {
          col,
          row,
          halfX,
          halfY,
          element: options.darkElement,
          z: options.zDark,
          moduleAtoms: options.moduleAtoms,
          atomSpacing: options.atomSpacing,
          moduleSpacing: options.moduleSpacing,
          bondGrid: true,
        });
      } else if (options.lightMode !== 'none') {
        const lightOpts = {
          col,
          row,
          halfX,
          halfY,
          element: options.lightElement,
          z: options.zLight,
          moduleAtoms: options.moduleAtoms,
          atomSpacing: options.atomSpacing,
          moduleSpacing: options.moduleSpacing,
          mode: options.lightMode,
        };
        if (options.lightMode === 'filled') {
          addFilledModule(atoms, bonds, { ...lightOpts, bondGrid: false });
        } else {
          addLightModule(atoms, bonds, lightOpts);
        }
      }
    }
  }

  return { atoms, bonds, width, height };
}

function addFilledModule(atoms, bonds, opts) {
  const start = atoms.length + 1;
  const n = opts.moduleAtoms;
  const offset = ((n - 1) * opts.atomSpacing) / 2;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      atoms.push(atom(opts, x * opts.atomSpacing - offset, y * opts.atomSpacing - offset));
      if (opts.bondGrid) {
        const id = start + y * n + x;
        if (x > 0) bonds.push([id - 1, id]);
        if (y > 0) bonds.push([id - n, id]);
      }
    }
  }
}

function addLightModule(atoms, bonds, opts) {
  const n = opts.moduleAtoms;
  const offset = ((n - 1) * opts.atomSpacing) / 2;
  const points = opts.mode === 'center'
    ? [[(n - 1) / 2, (n - 1) / 2]]
    : [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1]];
  for (const [x, y] of points) {
    atoms.push(atom(opts, x * opts.atomSpacing - offset, y * opts.atomSpacing - offset));
  }
}

function atom(opts, dx, dy) {
  return {
    element: opts.element,
    x: opts.col * opts.moduleSpacing - opts.halfX + dx,
    y: -(opts.row * opts.moduleSpacing - opts.halfY + dy),
    z: opts.z,
  };
}

function xyzText(name, atoms, meta) {
  const comment = [
    `atomized_media=${name}`,
    `source=${meta.source}`,
    `matrix=${meta.width}x${meta.height}`,
    `dark=${meta.darkModules}`,
  ].join(' ');
  const lines = [String(atoms.length), comment];
  for (const a of atoms) lines.push(`${a.element} ${fmt(a.x)} ${fmt(a.y)} ${fmt(a.z)}`);
  return `${lines.join('\n')}\n`;
}

function xyzTrajectoryText(name, frames, meta) {
  return frames
    .map((frame, index) => {
      const comment = [
        `atomized_media=${name}`,
        `frame=${index}`,
        `source=${meta.source}`,
        `matrix=${meta.width}x${meta.height}`,
        `dark=${frame.darkModules}`,
      ].join(' ');
      const lines = [String(frame.atoms.length), comment];
      for (const a of frame.atoms) lines.push(`${a.element} ${fmt(a.x)} ${fmt(a.y)} ${fmt(a.z)}`);
      return lines.join('\n');
    })
    .join('\n');
}

function lammpsDataText(name, atoms, bonds) {
  const usedTypes = new Map();
  for (const atom of atoms) usedTypes.set(atomicNumberForElement(atom.element), atom.element);
  const maxType = Math.max(...usedTypes.keys());
  const xs = atoms.map((a) => a.x);
  const ys = atoms.map((a) => a.y);
  const zs = atoms.map((a) => a.z);
  const pad = 2;
  const lines = [
    `Atomized media ${name}`,
    '',
    `${atoms.length} atoms`,
    `${bonds.length} bonds`,
    `${maxType} atom types`,
    bonds.length ? '1 bond types' : '0 bond types',
    '',
    `${fmt(Math.min(...xs) - pad)} ${fmt(Math.max(...xs) + pad)} xlo xhi`,
    `${fmt(Math.min(...ys) - pad)} ${fmt(Math.max(...ys) + pad)} ylo yhi`,
    `${fmt(Math.min(...zs) - pad)} ${fmt(Math.max(...zs) + pad)} zlo zhi`,
    '',
    'Masses',
    '',
  ];
  for (let type = 1; type <= maxType; type += 1) {
    const element = usedTypes.get(type) ?? elementForAtomicNumber(type);
    lines.push(`${type} ${massForElement(element)} # ${element}`);
  }
  lines.push('', 'Atoms # atomic', '');
  atoms.forEach((a, index) => {
    lines.push(`${index + 1} ${atomicNumberForElement(a.element)} ${fmt(a.x)} ${fmt(a.y)} ${fmt(a.z)}`);
  });
  if (bonds.length) {
    lines.push('', 'Bonds', '');
    bonds.forEach(([a, b], index) => {
      lines.push(`${index + 1} 1 ${a} ${b}`);
    });
  }
  return `${lines.join('\n')}\n`;
}

function lammpsDumpText(frames, timestepStride = 1) {
  const lines = [];
  for (const [frameIndex, frame] of frames.entries()) {
    const bounds = boundsForAtoms(frame.atoms, 2);
    lines.push(
      'ITEM: TIMESTEP',
      String(frameIndex * timestepStride),
      'ITEM: NUMBER OF ATOMS',
      String(frame.atoms.length),
      'ITEM: BOX BOUNDS pp pp pp',
      `${fmt(bounds.xlo)} ${fmt(bounds.xhi)}`,
      `${fmt(bounds.ylo)} ${fmt(bounds.yhi)}`,
      `${fmt(bounds.zlo)} ${fmt(bounds.zhi)}`,
      'ITEM: ATOMS id type x y z signal',
    );
    frame.atoms.forEach((atom, index) => {
      lines.push(`${index + 1} ${atomicNumberForElement(atom.element)} ${fmt(atom.x)} ${fmt(atom.y)} ${fmt(atom.z)} ${atom.element === frame.darkElement ? 1 : 0}`);
    });
  }
  return `${lines.join('\n')}\n`;
}

function boundsForAtoms(atoms, pad) {
  const xs = atoms.map((a) => a.x);
  const ys = atoms.map((a) => a.y);
  const zs = atoms.map((a) => a.z);
  return {
    xlo: Math.min(...xs) - pad,
    xhi: Math.max(...xs) + pad,
    ylo: Math.min(...ys) - pad,
    yhi: Math.max(...ys) + pad,
    zlo: Math.min(...zs) - pad,
    zhi: Math.max(...zs) + pad,
  };
}

function massForElement(element) {
  const masses = { H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, Si: 28.085 };
  return masses[element] ?? 12.011;
}

function atomicNumberForElement(element) {
  const atomicNumbers = { H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, Si: 14 };
  return atomicNumbers[element] ?? 6;
}

function elementForAtomicNumber(type) {
  const elements = { 1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 14: 'Si' };
  return elements[type] ?? 'C';
}

async function writePreviewPng(file, matrix, scale) {
  const width = matrix[0]?.length ?? 0;
  const height = matrix.length;
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (matrix[y][x]) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  await fs.writeFile(file, canvas.toBuffer('image/png'));
}

function fmt(value) {
  return Number(value).toFixed(4).replace(/\.?0+$/, '');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const name = slugify(args.name || defaultName(args));
  const outDir = path.resolve(String(args.outDir));
  await fs.mkdir(outDir, { recursive: true });

  if (args.mode === 'frames') {
    const inputs = await frameInputs(args);
    if (inputs.length === 0) throw new Error('frames mode requires --input or --input-dir with at least one image');
    const matrices = await imageMatrices(inputs, args);
    const frameOptions = { ...args, lightMode: args.lightMode === DEFAULTS.lightMode ? 'filled' : args.lightMode };
    const frames = matrices.map((matrix) => {
      const atomized = atomizeMatrix(matrix, frameOptions);
      return {
        ...atomized,
        darkModules: matrix.flat().filter(Boolean).length,
        darkElement: frameOptions.darkElement,
      };
    });
    const meta = {
      name,
      mode: 'frames',
      source: inputs,
      width: frames[0]?.width ?? 0,
      height: frames[0]?.height ?? 0,
      frameCount: frames.length,
      atomsPerFrame: frames[0]?.atoms.length ?? 0,
      bondsFirstFrame: frames[0]?.bonds.length ?? 0,
      moduleAtoms: frameOptions.moduleAtoms,
      atomSpacing: frameOptions.atomSpacing,
      moduleSpacing: frameOptions.moduleSpacing,
      quietZone: frameOptions.quietZone,
      darkElement: frameOptions.darkElement,
      lightElement: frameOptions.lightElement,
      lightMode: frameOptions.lightMode,
      recommendedViewerParams: recommendedViewerParams(),
    };

    const xyzFile = path.join(outDir, `${name}.xyz`);
    const dataFile = path.join(outDir, `${name}.data`);
    const dumpFile = path.join(outDir, `${name}.lammpstrj`);
    const pngFile = path.join(outDir, `${name}.png`);
    const jsonFile = path.join(outDir, `${name}.json`);

    await fs.writeFile(xyzFile, xyzTrajectoryText(name, frames, meta), 'utf8');
    await fs.writeFile(dataFile, lammpsDataText(name, frames[0].atoms, frames[0].bonds), 'utf8');
    await fs.writeFile(dumpFile, lammpsDumpText(frames), 'utf8');
    await writePreviewPng(pngFile, matrices[0], Number(args.previewScale));
    await fs.writeFile(jsonFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

    console.log(JSON.stringify({
      ok: true,
      files: { xyzFile, dataFile, dumpFile, pngFile, jsonFile },
      frames: frames.length,
      atomsPerFrame: meta.atomsPerFrame,
      bondsFirstFrame: meta.bondsFirstFrame,
      matrix: `${meta.width}x${meta.height}`,
    }, null, 2));
    return;
  }

  let matrix;
  let source;
  if (args.mode === 'qr') {
    if (!args.text) throw new Error('qr mode requires --text');
    matrix = qrMatrix(String(args.text), Number(args.quietZone));
    source = String(args.text);
  } else if (args.mode === 'image') {
    if (!args.input) throw new Error('image mode requires --input');
    const input = Array.isArray(args.input) ? args.input[0] : args.input;
    matrix = await imageMatrix(String(input), Number(args.maxImageSize), Number(args.threshold), Boolean(args.invert), Number(args.quietZone));
    source = path.resolve(String(input));
  } else {
    throw new Error(`Unknown mode: ${args.mode}`);
  }

  const atomized = atomizeMatrix(matrix, args);
  const darkModules = matrix.flat().filter(Boolean).length;
  const meta = {
    name,
    mode: args.mode,
    source,
    width: atomized.width,
    height: atomized.height,
    darkModules,
    atoms: atomized.atoms.length,
    bonds: atomized.bonds.length,
    moduleAtoms: args.moduleAtoms,
    atomSpacing: args.atomSpacing,
    moduleSpacing: args.moduleSpacing,
    quietZone: args.quietZone,
    darkElement: args.darkElement,
    lightElement: args.lightElement,
    lightMode: args.lightMode,
    recommendedViewerParams: recommendedViewerParams(),
  };

  const xyzFile = path.join(outDir, `${name}.xyz`);
  const dataFile = path.join(outDir, `${name}.data`);
  const pngFile = path.join(outDir, `${name}.png`);
  const jsonFile = path.join(outDir, `${name}.json`);

  await fs.writeFile(xyzFile, xyzText(name, atomized.atoms, meta), 'utf8');
  await fs.writeFile(dataFile, lammpsDataText(name, atomized.atoms, atomized.bonds), 'utf8');
  await writePreviewPng(pngFile, matrix, Number(args.previewScale));
  await fs.writeFile(jsonFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    files: { xyzFile, dataFile, pngFile, jsonFile },
    atoms: atomized.atoms.length,
    bonds: atomized.bonds.length,
    matrix: `${atomized.width}x${atomized.height}`,
    darkModules,
  }, null, 2));
}

function defaultName(args) {
  if (args.mode === 'qr') return 'lupi-qr';
  if (args.mode === 'frames') return args.inputDir ? path.basename(String(args.inputDir)) : 'atomized-frames';
  const input = Array.isArray(args.input) ? args.input[0] : args.input;
  return input ? path.basename(String(input), path.extname(String(input))) : 'atomized-image';
}

function recommendedViewerParams() {
  return {
    camera: 'top',
    bonds: 'off',
    background: 'pub-figure-neutral',
    renderStyle: 'standard',
    colorScheme: 'element',
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage());
  process.exit(1);
});
