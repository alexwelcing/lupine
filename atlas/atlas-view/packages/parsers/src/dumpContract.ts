/**
 * The LAMMPS dump ↔ Lupi viewer compatibility contract, as code.
 *
 * Everything the product knows about "which files work well" used to be
 * implicit in parser internals (`canStreamDump`, worker scope checks,
 * WASM fallbacks). This module makes that knowledge explicit, executable,
 * and reusable — one source of truth consumed by:
 *
 *   - the viewer's pre-flight gate (`canStreamDump` delegates here),
 *   - the `lupi-doctor` CLI that tells a real LAMMPS user *why* their
 *     file takes a slower path and exactly what to change in their
 *     `dump` command,
 *   - the simulation generator's verification harness,
 *   - docs (docs/lammps-dump-contract.md mirrors these findings).
 *
 * Tiers:
 *   streamable  — worker fast path: progressive frame-0 paint, off-main-
 *                 thread multi-frame transcode to .glimbin, OPFS library.
 *   standard    — recognized dump, parsed whole by the WASM path (slower,
 *                 all-in-memory, but supports triclinic / scaled coords /
 *                 per-atom properties).
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
  | 'extra-columns';

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

/** The dump command that hits the fast path exactly. Quoted everywhere we
 *  talk to users, so keep it in one place. */
export const RECOMMENDED_DUMP_COMMAND =
  'dump lupi all custom 500 traj.lammpstrj id type x y z';

/**
 * Classify a dump file by its head (first few KB — one frame header is
 * plenty). Pure and synchronous so it can run anywhere: viewer pre-flight,
 * CLI, tests, a future server-side intake.
 */
export function analyzeDumpHead(head: string): DumpCompatibility {
  const findings: DumpFinding[] = [];

  // Gzip magic is 0x1f 0x8b. Heads usually arrive here after a UTF-8 text
  // decode (browser `blob.text()`, Buffer.toString) which preserves 0x1f
  // but replaces the invalid byte 0x8b with U+FFFD — accept both forms.
  if (
    head.length >= 2 &&
    head.charCodeAt(0) === 0x1f &&
    (head.charCodeAt(1) === 0x8b || head.charCodeAt(1) === 0xfffd)
  ) {
    findings.push({
      code: 'gzip-compressed',
      severity: 'blocker',
      message:
        'File is gzip-compressed. The standard path decompresses it in the parse ' +
        'worker, but the streaming fast path reads raw text.',
      fix: 'gunzip the file before dropping it (or dump uncompressed).',
    });
    return { tier: 'standard', findings, columns: null, natoms: null };
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

  // Atom count, if the head reaches it.
  const natomsMatch = text.match(/ITEM:\s*NUMBER OF ATOMS\s*\n\s*(\d+)/);
  const natoms = natomsMatch ? parseInt(natomsMatch[1], 10) : null;

  // Box style. Tilt-factor tokens in the BOX BOUNDS header mean triclinic.
  const bbIdx = text.indexOf('ITEM: BOX BOUNDS');
  const bbEol = bbIdx >= 0 ? text.indexOf('\n', bbIdx) : -1;
  if (bbIdx < 0 || bbEol < 0) {
    findings.push({
      code: 'missing-coords',
      severity: 'blocker',
      message: 'No "ITEM: BOX BOUNDS" header in the file head — dump may be malformed or truncated.',
    });
  } else {
    const bbHeader = text.slice(bbIdx, bbEol);
    if (/\bxy\b|\bxz\b|\byz\b/.test(bbHeader)) {
      findings.push({
        code: 'triclinic-box',
        severity: 'blocker',
        message:
          'Triclinic (tilted) box. The streaming fast path handles orthogonal ' +
          'cells only; triclinic dumps parse on the standard path.',
        fix: 'If your system permits, run with an orthogonal cell ("box tilt" of zero).',
      });
    }
  }

  // Columns of the ATOMS section.
  const atIdx = text.indexOf('ITEM: ATOMS');
  const atEol = atIdx >= 0 ? text.indexOf('\n', atIdx) : -1;
  let columns: string[] | null = null;
  if (atIdx >= 0 && atEol > atIdx) {
    columns = text.slice(atIdx + 'ITEM: ATOMS'.length, atEol).trim().split(/\s+/);

    const has = (c: string) => columns!.includes(c);
    if (!(has('x') && has('y') && has('z'))) {
      if (has('xs') || has('ys') || has('zs')) {
        findings.push({
          code: 'scaled-coords',
          severity: 'blocker',
          message:
            'Coordinates are box-scaled (xs ys zs). The streaming fast path reads ' +
            'unscaled x y z; scaled dumps parse on the standard path.',
          fix: 'Dump unscaled coordinates: `' + RECOMMENDED_DUMP_COMMAND + '`',
        });
      } else if (has('xu') || has('yu') || has('zu')) {
        findings.push({
          code: 'unwrapped-coords',
          severity: 'blocker',
          message:
            'Coordinates are unwrapped (xu yu zu). The streaming fast path reads ' +
            'wrapped x y z; unwrapped dumps parse on the standard path.',
          fix: 'Dump wrapped coordinates: `' + RECOMMENDED_DUMP_COMMAND + '`',
        });
      } else {
        findings.push({
          code: 'missing-coords',
          severity: 'blocker',
          message: `No x/y/z columns found (got: ${columns.join(' ')}).`,
          fix: 'Add coordinates to your dump: `' + RECOMMENDED_DUMP_COMMAND + '`',
        });
      }
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
    const known = new Set(['id', 'type', 'x', 'y', 'z']);
    const extras = columns.filter((c) => !known.has(c));
    if (extras.length > 0 && findings.every((f) => f.severity !== 'blocker')) {
      findings.push({
        code: 'extra-columns',
        severity: 'warning',
        message:
          `Extra per-atom columns (${extras.join(' ')}) are ignored by the ` +
          'streaming fast path. To color by a computed property, the standard ' +
          'path (smaller files) carries them through.',
      });
    }
  } else {
    findings.push({
      code: 'missing-coords',
      severity: 'blocker',
      message: 'Head ends before the "ITEM: ATOMS" header — file may be truncated.',
    });
  }

  const tier: DumpTier = findings.some((f) => f.severity === 'blocker')
    ? 'standard'
    : 'streamable';
  return { tier, findings, columns, natoms };
}
