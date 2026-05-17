/**
 * Potential file type detection for NIST IPR parameter files.
 *
 * Covers the 35 pair styles present in the NIST mirror:
 *   eam, eam/alloy, eam/fs, eam/cd, eam/he, adp, meam, meam/spline,
 *   tersoff, tersoff/mod, tersoff/mod/c, tersoff/zbl, sw, reax/c,
 *   bop, comb3, lcbop, vashishta, pace, hdnnp, pinn, quip, rann,
 *   aenet, agni, edip, edip/multi, eim, extep, hybrid, hybrid/overlay,
 *   morse, polymorphic, table, ream
 */

export type PotentialFormat =
  | 'eam-alloy'
  | 'eam-fs'
  | 'eam-cd'
  | 'eam-he'
  | 'eam'
  | 'adp'
  | 'meam'
  | 'meam-spline'
  | 'tersoff'
  | 'tersoff-mod'
  | 'tersoff-mod-c'
  | 'tersoff-zbl'
  | 'sw'
  | 'reax-c'
  | 'bop'
  | 'comb3'
  | 'lcbop'
  | 'vashishta'
  | 'pace'
  | 'hdnnp'
  | 'pinn'
  | 'quip'
  | 'rann'
  | 'aenet'
  | 'agni'
  | 'edip'
  | 'edip-multi'
  | 'eim'
  | 'extep'
  | 'morse'
  | 'polymorphic'
  | 'table'
  | 'ream'
  | 'unknown-potential';

const POTENTIAL_EXTENSIONS: Array<[string[], PotentialFormat]> = [
  [['.eam.alloy'], 'eam-alloy'],
  [['.eam.fs', '.fs.eam'], 'eam-fs'],
  [['.eam.cd', '.cdeam'], 'eam-cd'],
  [['.eam.he'], 'eam-he'],
  [['.eam'], 'eam'],
  [['.adp', '.adp.txt'], 'adp'],
  [['.meam'], 'meam'],
  [['.meam.spline'], 'meam-spline'],
  [['.tersoff', '.tersoff.txt'], 'tersoff'],
  [['.sw'], 'sw'],
  [['.reax'], 'reax-c'],
  [['.bop', '.bop.table'], 'bop'],
  [['.comb3'], 'comb3'],
  [['.lcbop'], 'lcbop'],
  [['.vashishta'], 'vashishta'],
  [['.pace'], 'pace'],
  [['.hdnnp'], 'hdnnp'],
  [['.pinn'], 'pinn'],
  [['.quip'], 'quip'],
  [['.rann'], 'rann'],
  [['.aenet'], 'aenet'],
  [['.agni'], 'agni'],
  [['.edip'], 'edip'],
  [['.eim'], 'eim'],
  [['.extep'], 'extep'],
  [['.morse'], 'morse'],
  [['.polymorphic'], 'polymorphic'],
  [['.table'], 'table'],
  [['.ream'], 'ream'],
];

/** Detect if a file is a potential parameter file. */
export function detectPotentialFormat(filename: string): PotentialFormat | null {
  const lower = filename.toLowerCase();
  for (const [exts, fmt] of POTENTIAL_EXTENSIONS) {
    if (exts.some((ext) => lower.endsWith(ext))) return fmt;
  }
  return null;
}

/** Whether the filename indicates a NIST IPR potential parameter file. */
export function isPotentialFile(filename: string): boolean {
  return detectPotentialFormat(filename) !== null;
}

/** Guess pair_style from filename / format for unknown files. */
export function guessPairStyle(filename: string): string {
  const fmt = detectPotentialFormat(filename);
  if (!fmt) return 'unknown';
  const map: Record<PotentialFormat, string> = {
    'eam-alloy': 'eam/alloy',
    'eam-fs': 'eam/fs',
    'eam-cd': 'eam/cd',
    'eam-he': 'eam/he',
    eam: 'eam',
    adp: 'adp',
    meam: 'meam',
    'meam-spline': 'meam/spline',
    tersoff: 'tersoff',
    'tersoff-mod': 'tersoff/mod',
    'tersoff-mod-c': 'tersoff/mod/c',
    'tersoff-zbl': 'tersoff/zbl',
    sw: 'sw',
    'reax-c': 'reax/c',
    bop: 'bop',
    comb3: 'comb3',
    lcbop: 'lcbop',
    vashishta: 'vashishta',
    pace: 'pace',
    hdnnp: 'hdnnp',
    pinn: 'pinn',
    quip: 'quip',
    rann: 'rann',
    aenet: 'aenet',
    agni: 'agni',
    edip: 'edip',
    'edip-multi': 'edip/multi',
    eim: 'eim',
    extep: 'extep',
    morse: 'morse',
    polymorphic: 'polymorphic',
    table: 'table',
    ream: 'ream',
    'unknown-potential': 'unknown',
  };
  return map[fmt] ?? 'unknown';
}
