import { getElementSpec } from '@atlas/core';
import type { Frame } from '@atlas/core/types';
import type { LoadedFile } from './store';
import { ALL_EXAMPLES, publicAssetUrl, type GalleryExample } from './landing/shared';
import { functionalGroupsForMolecule, type FunctionalGroupConcept } from './organicFunctionalGroups';

export interface ElementStudyFact {
  atomicNumber: number;
  symbol: string;
  name: string;
  role: string;
  color: string;
  count: number;
  percent: number;
}

export interface PropertyStudyFact {
  name: string;
  min: number;
  max: number;
  mean: number;
}

export interface SelectedAtomStudyFact {
  index: number;
  id: number;
  type: number;
  symbol: string;
  name: string;
  xyz: [number, number, number];
  properties: Array<{ name: string; value: number }>;
}

export interface MoleculeStudyFacts {
  title: string;
  fileName: string;
  formula: string;
  atomCount: number;
  frameIndex: number;
  frameCount: number;
  timestep: number;
  sourceLabel: string;
  sourceUrl?: string;
  galleryExample: GalleryExample | null;
  composition: ElementStudyFact[];
  functionalGroups: FunctionalGroupConcept[];
  propertyStats: PropertyStudyFact[];
  selectedAtoms: SelectedAtomStudyFact[];
  bounds: {
    x: number;
    y: number;
    z: number;
  };
  bondSummary: string;
  studyCue: string;
  shareUrl?: string;
}

export function buildMoleculeStudyFacts({
  file,
  frameIndex,
  selectedAtoms = [],
  lastBondCount = 0,
  showBonds = false,
  shareUrl,
}: {
  file: LoadedFile | null;
  frameIndex: number;
  selectedAtoms?: number[];
  lastBondCount?: number;
  showBonds?: boolean;
  shareUrl?: string;
}): MoleculeStudyFacts | null {
  if (!file) return null;
  const frame = file.trajectory.frames[frameIndex] ?? file.trajectory.frames[0];
  if (!frame) return null;

  const galleryExample = findGalleryExample(file);
  const functionalGroups = galleryExample ? functionalGroupsForMolecule(galleryExample.id) : [];
  const composition = summarizeComposition(frame);

  return {
    title: galleryExample?.title ?? stripExtension(file.name),
    fileName: file.name,
    formula: formatFormula(composition),
    atomCount: frame.natoms,
    frameIndex,
    frameCount: file.trajectory.totalFrames,
    timestep: frame.timestep,
    sourceLabel: inferSourceLabel(file, galleryExample),
    sourceUrl: file.sourceUrl,
    galleryExample,
    composition,
    functionalGroups,
    propertyStats: summarizeProperties(frame),
    selectedAtoms: summarizeSelectedAtoms(frame, selectedAtoms),
    bounds: summarizeBounds(frame),
    bondSummary: summarizeBonds(frame, lastBondCount, showBonds),
    studyCue: buildStudyCue(composition, functionalGroups),
    shareUrl,
  };
}

export function findGalleryExample(file: LoadedFile): GalleryExample | null {
  const candidates = [
    file.sourceUrl,
    file.name,
  ].filter((value): value is string => Boolean(value)).map(normalizePathLike);

  for (const example of ALL_EXAMPLES) {
    const exampleUrl = normalizePathLike(publicAssetUrl(example.file));
    const exampleFile = normalizePathLike(example.file);
    const exampleBase = normalizePathLike(fileBaseName(example.file));
    if (candidates.some(candidate =>
      candidate === exampleUrl ||
      candidate === exampleFile ||
      candidate.endsWith(`/${exampleFile}`) ||
      candidate.endsWith(`/${exampleBase}`) ||
      fileBaseName(candidate) === exampleBase
    )) {
      return example;
    }
  }
  return null;
}

export function renderStudySheetHtml(facts: MoleculeStudyFacts): string {
  const groupRows = facts.functionalGroups.length
    ? facts.functionalGroups.map(group => `
      <section class="group" style="--accent:${escapeAttr(group.color)}">
        <h3>${escapeHtml(group.label)}</h3>
        <p>${escapeHtml(group.short)}</p>
        <dl>
          <div><dt>Recognize</dt><dd>${escapeHtml(group.recognize)}</dd></div>
          <div><dt>Reactivity</dt><dd>${escapeHtml(group.reactivity)}</dd></div>
          <div><dt>Watch for</dt><dd>${escapeHtml(group.commonConfusion)}</dd></div>
          <div><dt>Self-check</dt><dd>${escapeHtml(group.studyPrompt)}</dd></div>
        </dl>
      </section>
    `).join('')
    : '<p class="muted">No curated organic functional-group mapping is attached to this structure yet.</p>';

  const compositionRows = facts.composition.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.symbol)}</strong></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${item.count.toLocaleString()}</td>
      <td>${item.percent.toFixed(1)}%</td>
    </tr>
  `).join('');

  const propertyRows = facts.propertyStats.length
    ? facts.propertyStats.map(prop => `
      <tr>
        <td>${escapeHtml(prop.name)}</td>
        <td>${formatNumber(prop.min)}</td>
        <td>${formatNumber(prop.mean)}</td>
        <td>${formatNumber(prop.max)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="muted">No per-atom scalar properties were found in this frame.</td></tr>';

  const selectedRows = facts.selectedAtoms.length
    ? facts.selectedAtoms.map(atom => `
      <tr>
        <td>#${atom.index}</td>
        <td>${escapeHtml(atom.symbol)} / ${escapeHtml(atom.name)}</td>
        <td>${atom.xyz.map(value => value.toFixed(2)).join(', ')}</td>
        <td>${atom.properties.slice(0, 2).map(prop => `${escapeHtml(prop.name)} ${formatNumber(prop.value)}`).join('; ') || 'none'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="muted">No atom selection was pinned when this sheet was generated.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(facts.title)} study sheet</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #111827;
      background: #f8fafc;
      font-kerning: normal;
      font-optical-sizing: auto;
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; line-height: 1.58; }
    main { max-width: 920px; margin: 0 auto; display: grid; gap: 22px; }
    header { display: grid; gap: 8px; border-bottom: 2px solid #0f172a; padding-bottom: 18px; }
    .eyebrow { color: #0369a1; font-size: 12px; font-weight: 800; letter-spacing: 0; text-transform: uppercase; }
    h1 { margin: 0; font-size: 34px; line-height: 1.1; letter-spacing: 0; text-wrap: balance; }
    h2 { margin: 0 0 8px; font-size: 17px; line-height: 1.25; letter-spacing: 0; }
    h3 { margin: 0; font-size: 14px; letter-spacing: 0; }
    p { margin: 0; max-width: 70ch; text-wrap: pretty; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; color: #475569; font-size: 12px; }
    .meta span { border: 1px solid #cbd5e1; border-radius: 999px; padding: 3px 8px; background: white; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .metric { border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 10px; }
    .metric span { display: block; color: #64748b; font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0; }
    .metric strong { display: block; margin-top: 3px; font-size: 16px; overflow-wrap: anywhere; }
    section { display: grid; gap: 10px; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-variant-numeric: tabular-nums lining-nums; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-size: 12px; }
    th { color: #475569; background: #f1f5f9; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
    tr:last-child td { border-bottom: 0; }
    .groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .group { border: 1px solid color-mix(in srgb, var(--accent) 42%, #cbd5e1); border-left: 4px solid var(--accent); border-radius: 8px; background: white; padding: 12px; }
    dl { display: grid; gap: 7px; margin: 0; }
    dt { color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
    dd { margin: 0; font-size: 12px; }
    .muted { color: #64748b; }
    .actions { display: flex; gap: 8px; margin-top: 4px; }
    button { border: 1px solid #0f172a; border-radius: 8px; background: #0f172a; color: white; padding: 9px 12px; font: inherit; font-size: 13px; font-weight: 750; cursor: pointer; }
    @media (max-width: 720px) {
      body { padding: 18px; }
      .summary, .groups { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; }
    }
    @media print {
      body { padding: 0; background: white; }
      main { max-width: none; }
      .actions { display: none; }
      section, .group, table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="eyebrow">Lupi study sheet</div>
      <h1>${escapeHtml(facts.title)}</h1>
      <p>${escapeHtml(facts.studyCue)}</p>
      <div class="meta">
        <span>${escapeHtml(facts.sourceLabel)}</span>
        <span>${escapeHtml(facts.fileName)}</span>
        ${facts.shareUrl ? `<span>${escapeHtml(facts.shareUrl)}</span>` : ''}
      </div>
      <div class="actions">
        <button type="button" onclick="window.print()">Print or save PDF</button>
      </div>
    </header>

    <section class="summary" aria-label="Molecule summary">
      <div class="metric"><span>Formula</span><strong>${escapeHtml(facts.formula || 'Unknown')}</strong></div>
      <div class="metric"><span>Atoms</span><strong>${facts.atomCount.toLocaleString()}</strong></div>
      <div class="metric"><span>Frame</span><strong>${facts.frameIndex + 1} / ${facts.frameCount}</strong></div>
      <div class="metric"><span>Bonds</span><strong>${escapeHtml(facts.bondSummary)}</strong></div>
    </section>

    <section>
      <h2>Functional Groups</h2>
      <div class="groups">${groupRows}</div>
    </section>

    <section>
      <h2>Composition</h2>
      <table>
        <thead><tr><th>Element</th><th>Name</th><th>Count</th><th>Share</th></tr></thead>
        <tbody>${compositionRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Selected Atoms</h2>
      <table>
        <thead><tr><th>Atom</th><th>Element</th><th>XYZ Angstrom</th><th>Properties</th></tr></thead>
        <tbody>${selectedRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Frame Properties</h2>
      <table>
        <thead><tr><th>Property</th><th>Min</th><th>Mean</th><th>Max</th></tr></thead>
        <tbody>${propertyRows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

export function studySheetFileName(facts: MoleculeStudyFacts, extension = 'html'): string {
  const safe = facts.title
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'lupi-molecule';
  return `Lupi-study-sheet-${safe}.${extension}`;
}

function summarizeComposition(frame: Frame): ElementStudyFact[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < frame.natoms; i++) {
    const atomicNumber = frame.types[i];
    counts.set(atomicNumber, (counts.get(atomicNumber) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([atomicNumber, count]) => {
      const spec = safeElementSpec(atomicNumber);
      return {
        atomicNumber,
        symbol: spec.symbol,
        name: spec.name,
        role: spec.role,
        color: spec.color,
        count,
        percent: frame.natoms > 0 ? (count / frame.natoms) * 100 : 0,
      };
    })
    .sort((a, b) => {
      if (a.atomicNumber === 6) return -1;
      if (b.atomicNumber === 6) return 1;
      if (a.atomicNumber === 1 && b.atomicNumber !== 6) return -1;
      if (b.atomicNumber === 1 && a.atomicNumber !== 6) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
}

function formatFormula(composition: ElementStudyFact[]): string {
  return composition.map(item => `${item.symbol}${item.count > 1 ? item.count : ''}`).join('');
}

function summarizeProperties(frame: Frame): PropertyStudyFact[] {
  const rows: PropertyStudyFact[] = [];
  frame.properties.forEach((values, name) => {
    if (!values || values.length === 0 || rows.length >= 6) return;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
      count += 1;
    }
    if (count > 0) rows.push({ name, min, max, mean: sum / count });
  });
  return rows;
}

function summarizeSelectedAtoms(frame: Frame, selectedAtoms: number[]): SelectedAtomStudyFact[] {
  return selectedAtoms
    .filter(index => index >= 0 && index < frame.natoms)
    .slice(0, 4)
    .map(index => {
      const type = frame.types[index];
      const spec = safeElementSpec(type);
      const properties: Array<{ name: string; value: number }> = [];
      frame.properties.forEach((values, name) => {
        if (values && values.length > index && properties.length < 4) {
          properties.push({ name, value: values[index] });
        }
      });
      return {
        index,
        id: frame.ids[index] ?? index,
        type,
        symbol: spec.symbol,
        name: spec.name,
        xyz: [
          frame.positions[index * 3],
          frame.positions[index * 3 + 1],
          frame.positions[index * 3 + 2],
        ],
        properties,
      };
    });
}

function summarizeBounds(frame: Frame) {
  const b = frame.boxBounds;
  if (!b || b.length < 6) return { x: 0, y: 0, z: 0 };
  return {
    x: Math.max(0, b[1] - b[0]),
    y: Math.max(0, b[3] - b[2]),
    z: Math.max(0, b[5] - b[4]),
  };
}

function summarizeBonds(frame: Frame, lastBondCount: number, showBonds: boolean): string {
  const fileBondCount = frame.bonds?.length ? Math.floor(frame.bonds.length / 2) : 0;
  const count = lastBondCount || fileBondCount;
  if (count > 0) return `${count.toLocaleString()} inferred`;
  return showBonds ? 'calculating' : 'hidden';
}

function buildStudyCue(composition: ElementStudyFact[], groups: FunctionalGroupConcept[]): string {
  if (groups.length > 0) {
    const labels = groups.slice(0, 4).map(group => group.label).join(', ');
    return `Start with the visible functional groups: ${labels}. Ask how each pattern changes polarity, acidity, and the next likely reaction.`;
  }
  const symbols = new Set(composition.map(item => item.symbol));
  if (symbols.has('C') && (symbols.has('O') || symbols.has('N') || symbols.has('S') || symbols.has('P'))) {
    return 'This looks organic-rich: compare the carbon framework with nearby heteroatoms to predict polarity, acid-base behavior, and reaction sites.';
  }
  if (composition.some(item => item.role.toLowerCase().includes('metal'))) {
    return 'Read this as a materials structure: compare element domains, coordination, cell geometry, and any active per-atom property coloring.';
  }
  return 'Use the composition, geometry, selected atoms, and per-frame properties to decide what structural question this view answers.';
}

function inferSourceLabel(file: LoadedFile, galleryExample: GalleryExample | null): string {
  if (galleryExample) return `Gallery - ${galleryExample.domain}`;
  const source = file.sourceUrl ?? '';
  if (source.startsWith('opfs://')) return 'Local trajectory library';
  if (source.startsWith('local://')) return 'Local import';
  if (source.includes('omol') || source.includes('OMol')) return 'Meta OMol25';
  if (source.startsWith('http')) return 'Remote structure';
  if (source === 'inline-firestore') return 'Shared saved view';
  return 'Loaded structure';
}

function safeElementSpec(atomicNumber: number) {
  try {
    return getElementSpec(atomicNumber);
  } catch {
    return {
      symbol: `T${atomicNumber}`,
      name: `Type ${atomicNumber}`,
      role: 'Atom type',
      color: '#94a3b8',
    };
  }
}

function normalizePathLike(value: string): string {
  let next = value.trim().replace(/\\/g, '/').toLowerCase();
  next = next.split('#')[0].split('?')[0];
  next = next.replace(/^https?:\/\/[^/]+\/?/, '/');
  return next.replace(/\/+/g, '/').replace(/^\/+/, '');
}

function fileBaseName(value: string): string {
  return normalizePathLike(value).split('/').filter(Boolean).pop() ?? normalizePathLike(value);
}

function stripExtension(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || value;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs < 0.001 || abs >= 100000) return value.toExponential(2);
  if (abs < 1) return value.toFixed(4);
  return value.toFixed(3);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
