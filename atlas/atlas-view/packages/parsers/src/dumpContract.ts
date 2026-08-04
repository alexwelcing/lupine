/**
 * The LAMMPS dump ↔ Lupi viewer compatibility contract, as code.
 *
 * One executable source of truth for "which files take which path",
 * consumed by the viewer's pre-flight gate (`canStreamDump` delegates
 * here), the `lupi-doctor` CLI, the simulation generator's verification
 * harness, and mirrored by docs/lammps-dump-contract.md.
 *
 * The streaming fast path covers the full common dump dialect:
 * orthogonal AND triclinic boxes, unscaled/scaled/unwrapped coordinates,
 * extra per-atom property columns, per-frame (NPT) boxes, variable atom
 * counts, and gzip (decompressed transparently by the ingest worker).
 * What remains on the standard WASM path is genuinely malformed or
 * non-dump content.
 *
 * Tiers:
 *   streamable  — worker fast path: progressive frame-0 paint, off-main-
 *                 thread multi-frame transcode to .glimbin, OPFS library.
 *   standard    — recognized dump but missing something essential
 *                 (e.g. no `type` column); parsed whole by the WASM path.
 *   not-a-dump  — not a LAMMPS dump at all (may still be XYZ/data/etc.).
 */

export type DumpTier = 'streamable' | 'standard' | 'not-a-dump';

export type DumpFindingCode =
  | 'gzip-compressed'
  | 'not-a-dump'
  | 'triclinic-box'
  | 'scaled-coords'
  | 'unwrapped-coords'
  | 'missing-coords'
  | 'missing-type'
  | 'missing-id'
  | 'extra-columns'
  | 'malformed-head';

export interface DumpFinding {
  code: DumpFindingCode;
  /** blocker → forces the standard path (or rejects); the rest are FYI. */
  severity: 'blocker' | 'warning' | 'info';
  message: string;
  /** Actionable change to the user's LAMMPS input, when there is one. */
  fix?: string;
}

export interface DumpCompatibility {
  tier: DumpTier;
  findings: DumpFinding[];
  /** Columns of the ATOMS section, when a dump header was found. */
  columns: string[] | null;
  /** Atom count from the first frame header, when present in the head. */
  natoms: number | null;
}

/** The simplest dump command for Lupi — but scaled/unwrapped coordinates,
 *  triclinic cells, and extra property columns all stream too. */
export const RECOMMENDED_DUMP_COMMAND =
  'dump lupi all custom 500 traj.lammpstrj id type x y z';

/**
 * Classify a dump file by its head (first few KB — one frame header is
 * plenty). Pure and synchronous so it can run anywhere: viewer
 * pre-flight, CLI, tests, a future server-side intake. For gzipped
 * files, decompress the head first (`readDumpHead` does this in the
 * browser; lupi-doctor uses zlib) — this function inspects text.
 */
export function analyzeDumpHead(head: string): DumpCompatibility {
  const findings: DumpFinding[] = [];

  // Gzip magic is 0x1f 0x8b; after a UTF-8 text decode (browser
  // blob.text(), Buffer.toString) the invalid byte 0x8b becomes U+FFFD.
  // The ingest worker decompresses gzip transparently, so this is only a
  // "couldn't inspect the inner dialect" note, not a blocker.
  if (
    head.length >= 2 &&
    head.charCodeAt(0) === 0x1f &&
    (head.charCodeAt(1) === 0x8b || head.charCodeAt(1) === 0xfffd)
  ) {
    findings.push({
      code: 'gzip-compressed',
      severity: 'info',
      message:
        'gzip-compressed — Lupi decompresses transparently while streaming. ' +
        '(Inner dialect not inspected here; pass a decompressed head for a full report.)',
    });
    return { tier: 'streamable', findings, columns: null, natoms: null };
  }

  const text = head.replace(/^﻿/, '').trimStart();
  if (!text.startsWith('ITEM: TIMESTEP')) {
    findings.push({
      code: 'not-a-dump',
      severity: 'blocker',
      message:
        'No "ITEM: TIMESTEP" header — this is not a LAMMPS dump. (XYZ, LAMMPS ' +
        'data files, and logs are handled by their own parsers.)',
    });
    return { tier: 'not-a-dump', findings, columns: null, natoms: null };
  }

  const natomsMatch = text.match(/ITEM:\s*NUMBER OF ATOMS\s*\n\s*(\d+)/);
  const natoms = natomsMatch ? parseInt(natomsMatch[1], 10) : null;

  const bbIdx = text.indexOf('ITEM: BOX BOUNDS');
  const bbEol = bbIdx >= 0 ? text.indexOf('\n', bbIdx) : -1;
  if (bbIdx < 0 || bbEol < 0) {
    findings.push({
      code: 'malformed-head',
      severity: 'blocker',
      message: 'No "ITEM: BOX BOUNDS" header in the file head — dump may be malformed or truncated.',
    });
  } else if (/\bxy\b|\bxz\b|\byz\b/.test(text.slice(bbIdx, bbEol))) {
    findings.push({
      code: 'triclinic-box',
      severity: 'info',
      message: 'Triclinic (tilted) box — streamed with tilt factors carried per frame.',
    });
  }

  const atIdx = text.indexOf('ITEM: ATOMS');
  const atEol = atIdx >= 0 ? text.indexOf('\n', atIdx) : -1;
  let columns: string[] | null = null;
  if (atIdx >= 0 && atEol > atIdx) {
    columns = text.slice(atIdx + 'ITEM: ATOMS'.length, atEol).trim().split(/\s+/);

    const has = (c: string) => columns!.includes(c);
    const coordSet = (base: string) => has(base) || has(`${base}u`) || has(`${base}s`) || has(`${base}su`);
    if (!(coordSet('x') && coordSet('y') && coordSet('z'))) {
      findings.push({
        code: 'missing-coords',
        severity: 'blocker',
        message: `No usable coordinate columns found (got: ${columns.join(' ')}).`,
        fix: 'Add coordinates to your dump: `' + RECOMMENDED_DUMP_COMMAND + '`',
      });
    } else if (has('xs') || has('ys') || has('zs') || has('xsu') || has('ysu') || has('zsu')) {
      findings.push({
        code: 'scaled-coords',
        severity: 'info',
        message: 'Scaled coordinates (xs ys zs) — converted to Cartesian on the fly while streaming.',
      });
    } else if (has('xu') || has('yu') || has('zu')) {
      findings.push({
        code: 'unwrapped-coords',
        severity: 'info',
        message:
          'Unwrapped coordinates (xu yu zu) — streamed as-is; atoms that have ' +
          'diffused far render outside the cell wireframe, which is usually what you want.',
      });
    }
    if (!has('type')) {
      findings.push({
        code: 'missing-type',
        severity: 'blocker',
        message: 'No `type` column — atoms cannot be colored or sized by species.',
        fix: 'Add `type` to your dump columns.',
      });
    }
    if (!has('id')) {
      findings.push({
        code: 'missing-id',
        severity: 'info',
        message:
          'No `id` column. The viewer renders fine, but per-atom tracking across ' +
          'frames (displacement coloring, annotations) loses identity.',
        fix: 'Add `id` to your dump columns.',
      });
    }
    const known = new Set([
      'id', 'type',
      'x', 'y', 'z', 'xu', 'yu', 'zu', 'xs', 'ys', 'zs', 'xsu', 'ysu', 'zsu',
    ]);
    const extras = columns.filter((c) => !known.has(c));
    if (extras.length > 0) {
      findings.push({
        code: 'extra-columns',
        severity: 'info',
        message:
          `Extra per-atom columns (${extras.join(' ')}) are parsed as named ` +
          'properties — available for property coloring on the streamed file.',
      });
    }
  } else {
    findings.push({
      code: 'malformed-head',
      severity: 'blocker',
      message: 'Head ends before the "ITEM: ATOMS" header — file may be truncated.',
    });
  }

  const tier: DumpTier = findings.some((f) => f.severity === 'blocker')
    ? 'standard'
    : 'streamable';
  return { tier, findings, columns, natoms };
}

/**
 * Read a file's head as text for `analyzeDumpHead`/`canStreamDump`,
 * transparently decompressing gzip (browser-side; uses
 * DecompressionStream). Reads at most `bytes` of decompressed text.
 */
export async function readDumpHead(file: Blob, bytes = 8192): Promise<string> {
  const magic = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (magic.length === 2 && magic[0] === 0x1f && magic[1] === 0x8b) {
    let text = '';
    try {
      const ds = new DecompressionStream('gzip');
      // Feed only a prefix — enough compressed bytes to yield the head.
      const reader = file.slice(0, 256 * 1024).stream().pipeThrough(ds).getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      while (text.length < bytes) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
    } catch {
      // Truncated-stream errors after we already have the head are fine;
      // a genuinely unreadable file falls through to the raw read below.
    }
    if (text.length > 0) return text.slice(0, bytes);
  }
  return file.slice(0, bytes).text();
}
