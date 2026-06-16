import { getElementSpec } from '@atlas/core';
import type { Frame } from '@atlas/core/types';
import type { LoadedFile } from './store';
import { ALL_EXAMPLES, publicAssetUrl, type GalleryExample } from './landing/shared';
import { functionalGroupsForMolecule, type FunctionalGroupConcept } from './organicFunctionalGroups';
import { buildOchemCourseCompanion, type OchemCourseCompanion } from './ochemCourseCompanion';
import {
  buildMaterialsScienceCompanion,
  type MaterialsScienceCompanion,
} from './materialsScienceCompanion';

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
  source: 'source-column';
  interpretation: string;
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

export type BondStudySource = 'source' | 'visual-guide' | 'not-shown' | 'missing';

export interface BondStudyFact {
  summary: string;
  detail: string;
  source: BondStudySource;
  count: number | null;
  isScientific: boolean;
}

export interface DataProvenanceFact {
  coordinates: string;
  bonds: string;
  properties: string;
  curriculum: string;
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
  bondInfo: BondStudyFact;
  dataProvenance: DataProvenanceFact;
  studyCue: string;
  ochemCompanion: OchemCourseCompanion;
  materialsCompanion: MaterialsScienceCompanion;
  shareUrl?: string;
}

export interface StudySheetRenderOptions {
  visualSnapshotDataUrl?: string;
  visualCaption?: string;
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
  const title = galleryExample?.title ?? stripExtension(file.name);
  const functionalGroups = galleryExample ? functionalGroupsForMolecule(galleryExample.id) : [];
  const composition = summarizeComposition(frame);
  const propertyStats = summarizeProperties(frame);
  const bondInfo = summarizeBonds(frame, lastBondCount, showBonds);
  const sourceLabel = inferSourceLabel(file, galleryExample);
  const bounds = summarizeBounds(frame);

  return {
    title,
    fileName: file.name,
    formula: formatFormula(composition),
    atomCount: frame.natoms,
    frameIndex,
    frameCount: file.trajectory.totalFrames,
    timestep: frame.timestep,
    sourceLabel,
    sourceUrl: file.sourceUrl,
    galleryExample,
    composition,
    functionalGroups,
    propertyStats,
    selectedAtoms: summarizeSelectedAtoms(frame, selectedAtoms),
    bounds,
    bondSummary: bondInfo.summary,
    bondInfo,
    dataProvenance: buildDataProvenance({ file, frame, sourceLabel, bondInfo, propertyStats }),
    studyCue: buildStudyCue(composition, functionalGroups),
    ochemCompanion: buildOchemCourseCompanion({ title, composition, functionalGroups }),
    materialsCompanion: buildMaterialsScienceCompanion({
      title,
      composition,
      propertyStats,
      galleryExample,
      frameCount: file.trajectory.totalFrames,
      bounds,
      bondEvidence: bondInfo,
    }),
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

export function renderStudySheetHtml(facts: MoleculeStudyFacts, options: StudySheetRenderOptions = {}): string {
  const companion = facts.ochemCompanion;
  const materials = facts.materialsCompanion;
  const visualSnapshot = options.visualSnapshotDataUrl
    ? `
    <section class="visual">
      <div>
        <h2>Current View</h2>
        <p>${escapeHtml(options.visualCaption ?? 'This image captures the active viewer camera, atom colors, material style, optional visual bond guides, and background at export time. Visual bond guides are not source bond data unless the provenance section says source bonds exist.')}</p>
      </div>
      <img src="${escapeAttr(options.visualSnapshotDataUrl)}" alt="${escapeAttr(`${facts.title} current Lupi view`)}">
    </section>
  `
    : `
    <section class="visual visual-empty">
      <h2>Current View</h2>
      <p class="muted">No rendered view image was captured for this sheet.</p>
    </section>
  `;

  const reasoningRows = companion.reasoningSteps.map((step, index) => `
    <article class="step">
      <span>${index + 1}</span>
      <div>
        <h3>${escapeHtml(step.label)}</h3>
        <p>${escapeHtml(step.prompt)}</p>
      </div>
    </article>
  `).join('');

  const priorityRows = companion.mechanismPriorities.length
    ? companion.mechanismPriorities.map(priority => `
      <article class="priority">
        <h3>${escapeHtml(priority.label)}</h3>
        <p>${escapeHtml(priority.why)}</p>
        <strong>${escapeHtml(priority.typicalMove)}</strong>
      </article>
    `).join('')
    : '<p class="muted">No named organic mechanism priorities are attached to this structure yet.</p>';

  const spectroscopyRows = companion.spectroscopyChecks.length
    ? companion.spectroscopyChecks.map(check => `
      <tr>
        <td>${escapeHtml(check.signal)}</td>
        <td>${escapeHtml(check.reason)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="2" class="muted">No first-course spectroscopy cues are attached yet.</td></tr>';

  const examRows = companion.examPrompts.map(prompt => `<li>${escapeHtml(prompt)}</li>`).join('');
  const compareRows = companion.comparePrompts.map(prompt => `<li>${escapeHtml(prompt)}</li>`).join('');
  const learningRows = companion.learningPath.map(step => `
    <article class="learning-step">
      <strong>${escapeHtml(step.phase)} / ${escapeHtml(step.label)}</strong>
      <p>${escapeHtml(step.prompt)}</p>
      <em>${escapeHtml(step.mentorNote)}</em>
    </article>
  `).join('');
  const practiceRows = companion.practiceCards.map(card => `
    <article class="practice-card">
      <h3>${escapeHtml(card.prompt)}</h3>
      <p><strong>Check:</strong> ${escapeHtml(card.answer)}</p>
      <p><strong>Why:</strong> ${escapeHtml(card.why)}</p>
    </article>
  `).join('');
  const trapRows = companion.commonTraps.map(trap => `
    <article class="trap-card">
      <h3>${escapeHtml(trap.trap)}</h3>
      <p>${escapeHtml(trap.correction)}</p>
    </article>
  `).join('');
  const materialsRows = materials.curriculumAxes.map(axis => `
    <article class="materials-axis">
      <strong>${escapeHtml(axis.axis)} / ${escapeHtml(axis.label)}</strong>
      <p>${escapeHtml(axis.prompt)}</p>
      <em>${escapeHtml(axis.mentorNote)}</em>
    </article>
  `).join('');
  const materialsCheckRows = materials.characterizationChecks.map(check => `
    <tr>
      <td>${escapeHtml(check.method)}</td>
      <td>${escapeHtml(check.readout)}</td>
    </tr>
  `).join('');
  const materialsPracticeRows = materials.practiceCards.map(card => `
    <article class="practice-card">
      <h3>${escapeHtml(card.prompt)}</h3>
      <p><strong>Check:</strong> ${escapeHtml(card.answer)}</p>
      <p><strong>Why:</strong> ${escapeHtml(card.why)}</p>
    </article>
  `).join('');
  const provenanceRows = [
    ['Coordinates', facts.dataProvenance.coordinates],
    ['Bonds', facts.dataProvenance.bonds],
    ['Properties', facts.dataProvenance.properties],
    ['Curriculum', facts.dataProvenance.curriculum],
  ].map(([label, copy]) => `
    <article class="provenance-card">
      <strong>${escapeHtml(label)}</strong>
      <p>${escapeHtml(copy)}</p>
    </article>
  `).join('');

  const groupRows = facts.functionalGroups.length
    ? facts.functionalGroups.map(group => `
      <section class="group" style="--accent:${escapeAttr(group.color)}">
        <h3>${escapeHtml(group.label)}</h3>
        <p>${escapeHtml(group.short)}</p>
        <dl>
          <div><dt>Recognize</dt><dd>${escapeHtml(group.recognize)}</dd></div>
          <div><dt>Course unit</dt><dd>${escapeHtml(group.firstCourse)}</dd></div>
          <div><dt>Mechanism</dt><dd>${escapeHtml(group.reactivity)}</dd></div>
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
        <td>${escapeHtml(prop.interpretation)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" class="muted">No source per-atom scalar columns were found in this frame.</td></tr>';

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
    .visual { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 1fr); gap: 18px; align-items: start; border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 14px; }
    .visual img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; background: #020617; }
    .visual-empty { grid-template-columns: 1fr; }
    .course { display: grid; grid-template-columns: minmax(0, 0.82fr) minmax(280px, 1fr); gap: 16px; align-items: start; }
    .course-intro { border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 14px; }
    .course-intro strong { display: inline-block; color: #0369a1; font-size: 12px; margin-bottom: 6px; }
    .steps, .priorities { display: grid; gap: 10px; }
    .step, .priority { border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 11px; }
    .step { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; }
    .step span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: #0f172a; color: white; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums lining-nums; }
    .priority strong { display: block; margin-top: 6px; color: #0f766e; font-size: 12px; line-height: 1.45; }
    .learning-grid, .practice-grid, .trap-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .learning-step, .practice-card, .trap-card { border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 11px; }
    .learning-step strong { color: #0369a1; font-size: 12px; }
    .learning-step em { display: block; color: #475569; font-size: 11px; font-style: normal; line-height: 1.42; }
    .practice-card { border-color: #99f6e4; }
    .practice-card p, .trap-card p { font-size: 12px; }
    .trap-card { border-color: #fde68a; }
    .materials-grid, .provenance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .materials-axis, .provenance-card { border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 11px; }
    .materials-axis strong, .provenance-card strong { color: #0f766e; font-size: 12px; }
    .materials-axis p, .provenance-card p { font-size: 12px; }
    .materials-axis em { display: block; color: #475569; font-size: 11px; font-style: normal; line-height: 1.42; }
    .question-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 0 0 6px; font-size: 12px; }
    @media (max-width: 720px) {
      body { padding: 18px; }
      .summary, .groups, .visual, .course, .question-grid, .learning-grid, .practice-grid, .trap-grid, .materials-grid, .provenance-grid { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; }
    }
    @media print {
      body { padding: 0; background: white; }
      main { max-width: none; }
      .actions { display: none; }
      section, .group, table, .visual, .step, .priority, .learning-step, .practice-card, .trap-card, .materials-axis, .provenance-card { break-inside: avoid; }
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

    ${visualSnapshot}

    <section>
      <h2>Data Provenance</h2>
      <div class="provenance-grid">${provenanceRows}</div>
    </section>

    <section>
      <h2>Materials Science Frame</h2>
      <div class="course">
        <div class="course-intro">
          <strong>${escapeHtml(materials.courseUnit)}</strong>
          <p>${escapeHtml(materials.instructorFrame)}</p>
        </div>
        <div class="materials-grid">${materialsRows}</div>
      </div>
    </section>

    <section>
      <h2>Materials Characterization Checks</h2>
      <table>
        <thead><tr><th>Check</th><th>Evidence to look for</th></tr></thead>
        <tbody>${materialsCheckRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Materials Practice Checks</h2>
      <div class="practice-grid">${materialsPracticeRows}</div>
    </section>

    <section>
      <h2>University Ochem Frame</h2>
      <div class="course">
        <div class="course-intro">
          <strong>${escapeHtml(companion.courseUnit)}</strong>
          <p>${escapeHtml(companion.instructorFrame)}</p>
        </div>
        <div class="steps">${reasoningRows}</div>
      </div>
    </section>

    <section>
      <h2>Mechanism Priorities</h2>
      <div class="priorities">${priorityRows}</div>
    </section>

    <section>
      <h2>Learning Loop</h2>
      <div class="learning-grid">${learningRows}</div>
    </section>

    <section>
      <h2>Practice Checks</h2>
      <div class="practice-grid">${practiceRows}</div>
    </section>

    <section>
      <h2>Common Traps</h2>
      <div class="trap-grid">${trapRows}</div>
    </section>

    <section>
      <h2>Functional Groups</h2>
      <div class="groups">${groupRows}</div>
    </section>

    <section>
      <h2>Spectroscopy Checks</h2>
      <table>
        <thead><tr><th>Signal</th><th>Why it matters</th></tr></thead>
        <tbody>${spectroscopyRows}</tbody>
      </table>
    </section>

    <section class="question-grid">
      <div>
        <h2>Exam Prompts</h2>
        <ul>${examRows}</ul>
      </div>
      <div>
        <h2>Compare</h2>
        <ul>${compareRows}</ul>
      </div>
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
        <thead><tr><th>Source column</th><th>Min</th><th>Mean</th><th>Max</th><th>Interpretation</th></tr></thead>
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
    if (count > 0) {
      rows.push({
        name,
        min,
        max,
        mean: sum / count,
        source: 'source-column',
        interpretation: 'Computed summary of a loaded source column; physical meaning comes from the file/workflow.',
      });
    }
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

function summarizeBonds(frame: Frame, lastBondCount: number, showBonds: boolean): BondStudyFact {
  const fileBondCount = frame.bonds?.length ? Math.floor(frame.bonds.length / 2) : 0;
  if (fileBondCount > 0) {
    return {
      summary: `${fileBondCount.toLocaleString()} source bonds`,
      detail: 'The loaded frame provides explicit bond pairs, so this count comes from source topology.',
      source: 'source',
      count: fileBondCount,
      isScientific: true,
    };
  }
  if (!showBonds) {
    return {
      summary: 'Not shown',
      detail: 'The source frame does not provide explicit bond pairs, and bond rendering is currently off.',
      source: 'not-shown',
      count: null,
      isScientific: false,
    };
  }
  if (lastBondCount > 0) {
    return {
      summary: 'Visual guide only',
      detail: `The viewer is drawing ${lastBondCount.toLocaleString()} proximity links from element radii and tolerance. These are not source bonds, bond orders, or measured topology.`,
      source: 'visual-guide',
      count: lastBondCount,
      isScientific: false,
    };
  }
  return {
    summary: 'No source bonds',
    detail: 'The loaded frame has atom positions but no explicit bond table. Lupi does not invent a bond count for study facts.',
    source: 'missing',
    count: null,
    isScientific: false,
  };
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

function buildDataProvenance({
  file,
  frame,
  sourceLabel,
  bondInfo,
  propertyStats,
}: {
  file: LoadedFile;
  frame: Frame;
  sourceLabel: string;
  bondInfo: BondStudyFact;
  propertyStats: PropertyStudyFact[];
}): DataProvenanceFact {
  const coordinateColumns = frame.columns?.length ? ` Columns: ${frame.columns.slice(0, 8).join(', ')}${frame.columns.length > 8 ? ', ...' : ''}.` : '';
  const propertyNames = propertyStats.map(prop => prop.name);
  return {
    coordinates: `${frame.natoms.toLocaleString()} atom positions are loaded from ${sourceLabel} (${file.name}).${coordinateColumns}`,
    bonds: bondInfo.detail,
    properties: propertyNames.length
      ? `Scalar statistics are computed only from loaded source columns: ${propertyNames.join(', ')}. Lupi does not fabricate charges, forces, stress, band gaps, or energies when those columns are absent.`
      : 'No source scalar property columns were found in this frame. Lupi does not fabricate charges, forces, stress, band gaps, or energies.',
    curriculum: 'Organic chemistry and materials-science prompts are teaching lenses derived from composition, gallery metadata, and source columns; they are not new simulation measurements.',
  };
}

function safeElementSpec(atomicNumber: number) {
  try {
    return getElementSpec(atomicNumber);
  } catch {
    return {
      symbol: `T${atomicNumber}`,
      name: `Type ${atomicNumber}`,
      radius: 1.5,
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
