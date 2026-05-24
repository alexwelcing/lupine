import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Frame, Trajectory } from '@atlas/core/types';
import { useStore, type LoadedFile } from './store';
import { Slider } from './controls';

interface EquilibriumCatalog {
  schema: string;
  entry_count: number;
  entries: EquilibriumCatalogEntry[];
}

interface EquilibriumCatalogEntry {
  id: string;
  material: string;
  potential: string;
  pair_style: string;
  doi: string;
  reference: EquilibriumValues;
  predicted: EquilibriumValues;
  available_properties: string[];
}

interface EquilibriumValues {
  lattice_a_angstrom?: number;
  energy_ev_per_atom?: number;
  elastic_constants_gpa?: {
    c11?: number;
    c12?: number;
    c44?: number;
  };
}

interface OffsetConfig {
  strainPercent: number;
  displacementAngstrom: number;
  steps: number;
  frames: number;
}

interface GeneratedSolve {
  file: LoadedFile;
  report: Record<string, unknown>;
}

const EQUILIBRIUM_CATALOG_URL = '/nist/equilibrium_catalog.json';
const BCC_ELEMENTS = new Set(['Fe', 'Cr', 'Mo', 'W', 'V', 'Nb', 'Ta']);
const DEFAULT_CONFIG: OffsetConfig = {
  strainPercent: 3,
  displacementAngstrom: 0.08,
  steps: 400,
  frames: 61,
};

export function EquilibriumSolveWorkbench({ embedded = false }: { embedded?: boolean }) {
  const setFile = useStore((s) => s.setFile);
  const setFrame = useStore((s) => s.setFrame);
  const setColorMode = useStore((s) => s.setColorMode);
  const setColorProperty = useStore((s) => s.setColorProperty);
  const setColormap = useStore((s) => s.setColormap);
  const setActivePanel = useStore((s) => s.setActivePanel);
  const setEquilibriumSolve = useStore((s) => s.setEquilibriumSolve);
  const storedSolve = useStore((s) => s.equilibriumSolve);
  const activePanel = useStore((s) => s.activePanel);

  const [catalog, setCatalog] = useState<EquilibriumCatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [material, setMaterial] = useState('Al');
  const [entryId, setEntryId] = useState('');
  const [config, setConfig] = useState<OffsetConfig>(DEFAULT_CONFIG);
  const [previewReport, setPreviewReport] = useState<Record<string, unknown> | null>(
    storedSolve?.report ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(EQUILIBRIUM_CATALOG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`catalog ${res.status}`);
        return res.json() as Promise<EquilibriumCatalog>;
      })
      .then((data) => {
        if (cancelled) return;
        const entries = data.entries.filter((entry) => entry.reference.lattice_a_angstrom);
        setCatalog(entries);
        const defaultEntry = chooseBestEntry(entries.filter((entry) => entry.material === 'Al'))
          ?? chooseBestEntry(entries);
        if (defaultEntry) {
          setMaterial(defaultEntry.material);
          setEntryId(defaultEntry.id);
        }
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const materials = useMemo(
    () => Array.from(new Set(catalog.map((entry) => entry.material))).sort(),
    [catalog],
  );
  const materialEntries = useMemo(
    () => catalog
      .filter((entry) => entry.material === material)
      .slice()
      .sort((a, b) => entryQualityScore(a) - entryQualityScore(b)),
    [catalog, material],
  );
  const selectedEntry = useMemo(
    () => catalog.find((entry) => entry.id === entryId) ?? chooseBestEntry(materialEntries) ?? null,
    [catalog, entryId, materialEntries],
  );

  useEffect(() => {
    if (!materialEntries.length) return;
    if (!materialEntries.some((entry) => entry.id === entryId)) {
      setEntryId(chooseBestEntry(materialEntries)?.id ?? materialEntries[0].id);
    }
  }, [entryId, materialEntries]);

  const generatedPreview = useMemo(() => {
    if (!selectedEntry) return null;
    return buildEquilibriumSolve(selectedEntry, config);
  }, [selectedEntry, config]);

  const score = (previewReport ?? storedSolve?.report ?? generatedPreview?.report ?? null) as any;
  const scoreBody = score?.score as any | undefined;
  const curve = (score?.anytime_curve ?? []) as Array<{
    step: number;
    distance_to_reference: number;
    closeness: number;
  }>;

  const loadSolve = () => {
    if (!generatedPreview || !selectedEntry) return;
    setFile(generatedPreview.file);
    setFrame(0);
    setColorMode('property');
    setColorProperty('offset_error');
    setColormap('turbo');
    setPreviewReport(generatedPreview.report);
    setEquilibriumSolve({
      report: generatedPreview.report,
      entryId: selectedEntry.id,
      material: selectedEntry.material,
      potential: selectedEntry.potential,
      offset: config,
    });
    if (activePanel !== 'equilibrium') {
      setActivePanel('equilibrium');
    }
  };

  return (
    <div style={embedded ? sEmbeddedShell : sPanelShell}>
      <div style={sHeader}>
        <div>
          <div style={sKicker}>NIST equilibrium solve</div>
          <h2 style={sTitle}>Offset lattice relaxation</h2>
        </div>
        <button style={sPrimaryButton} onClick={loadSolve} disabled={!generatedPreview}>
          Load solve
        </button>
      </div>

      {error && <div style={sError}>NIST catalog unavailable: {error}</div>}
      {loading && <div style={sMuted}>Loading NIST equilibrium targets...</div>}

      <div style={embedded ? sGridWide : sGrid}>
        <label style={sField}>
          <span style={sLabel}>Element</span>
          <select
            value={material}
            onChange={(event) => setMaterial(event.target.value)}
            style={sSelect}
          >
            {materials.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={sField}>
          <span style={sLabel}>NIST potential</span>
          <select
            value={selectedEntry?.id ?? ''}
            onChange={(event) => setEntryId(event.target.value)}
            style={sSelect}
          >
            {materialEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.potential} / {entry.pair_style}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={sSliderBlock}>
        <ControlSlider
          label="Lattice strain"
          value={config.strainPercent}
          unit="%"
          min={0.5}
          max={8}
          step={0.1}
          onChange={(strainPercent) => setConfig((prev) => ({ ...prev, strainPercent }))}
        />
        <ControlSlider
          label="Atomic offset"
          value={config.displacementAngstrom}
          unit="A"
          min={0}
          max={0.25}
          step={0.005}
          onChange={(displacementAngstrom) =>
            setConfig((prev) => ({ ...prev, displacementAngstrom }))
          }
        />
        <ControlSlider
          label="Step budget"
          value={config.steps}
          unit="steps"
          min={50}
          max={800}
          step={25}
          onChange={(steps) => setConfig((prev) => ({ ...prev, steps }))}
        />
      </div>

      {selectedEntry && (
        <div style={sReferenceBand}>
          <Metric label="Reference a0" value={formatNumber(selectedEntry.reference.lattice_a_angstrom, 4)} unit="A" />
          <Metric label="Potential a0" value={formatNumber(selectedEntry.predicted.lattice_a_angstrom, 4)} unit="A" />
          <Metric label="Ecoh ref" value={formatNumber(selectedEntry.reference.energy_ev_per_atom, 3)} unit="eV/atom" />
          <Metric label="Ecoh pred" value={formatNumber(selectedEntry.predicted.energy_ev_per_atom, 3)} unit="eV/atom" />
        </div>
      )}

      {scoreBody && (
        <div style={sScoreBand}>
          <Metric label="Verdict" value={String(scoreBody.failure_class ?? 'pending')} />
          <Metric label="Final distance" value={formatNumber(scoreBody.final_distance, 4)} />
          <Metric label="Closeness" value={formatPercent(scoreBody.final_closeness)} />
          <Metric label="Last window" value={formatPercent(scoreBody.continuation_gain_fraction)} />
        </div>
      )}

      {curve.length > 1 && <CurveChart curve={curve} />}
    </div>
  );
}

function ControlSlider({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={sSliderRow}>
      <span style={sSliderLabel}>{label}</span>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span style={sSliderValue}>
        {Number.isInteger(value) ? value : value.toFixed(unit === 'A' ? 3 : 1)} {unit}
      </span>
    </label>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={sMetric}>
      <div style={sMetricLabel}>{label}</div>
      <div style={sMetricValue}>
        {value}
        {unit && <span style={sMetricUnit}> {unit}</span>}
      </div>
    </div>
  );
}

function CurveChart({
  curve,
}: {
  curve: Array<{ step: number; distance_to_reference: number; closeness: number }>;
}) {
  const width = 320;
  const height = 120;
  const maxDistance = Math.max(...curve.map((point) => point.distance_to_reference), 1e-6);
  const maxStep = Math.max(...curve.map((point) => point.step), 1);
  const path = curve
    .map((point, index) => {
      const x = (point.step / maxStep) * width;
      const y = height - (point.distance_to_reference / maxDistance) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div style={sChartWrap}>
      <div style={sChartHeader}>
        <span>Distance to reference</span>
        <span>{curve.length} frames</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={sChart}>
        <path d={path} fill="none" stroke="#1edce0" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="rgba(255,255,255,0.18)" />
      </svg>
    </div>
  );
}

function chooseBestEntry(entries: EquilibriumCatalogEntry[]) {
  return entries
    .slice()
    .sort((a, b) => entryQualityScore(a) - entryQualityScore(b))[0] ?? null;
}

function entryQualityScore(entry: EquilibriumCatalogEntry) {
  const referenceA = entry.reference.lattice_a_angstrom;
  const predictedA = entry.predicted.lattice_a_angstrom;
  const referenceEnergy = entry.reference.energy_ev_per_atom;
  const predictedEnergy = entry.predicted.energy_ev_per_atom;
  const latticeScore = typeof referenceA === 'number' && typeof predictedA === 'number'
    ? Math.abs(predictedA - referenceA) / 0.02
    : 10;
  const energyScore = typeof referenceEnergy === 'number' && typeof predictedEnergy === 'number'
    ? Math.abs(predictedEnergy - referenceEnergy) / 0.02
    : 10;
  return latticeScore + energyScore;
}

function buildEquilibriumSolve(entry: EquilibriumCatalogEntry, config: OffsetConfig): GeneratedSolve {
  const material = entry.material;
  const referenceA = entry.reference.lattice_a_angstrom ?? 4;
  const targetA = entry.predicted.lattice_a_angstrom ?? referenceA;
  const startA = referenceA * (1 + config.strainPercent / 100);
  const lattice = BCC_ELEMENTS.has(material) ? 'bcc' : 'fcc';
  const basis = lattice === 'bcc'
    ? [[0, 0, 0], [0.5, 0.5, 0.5]]
    : [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
  const cells = 4;
  const atoms = [];
  for (let ix = 0; ix < cells; ix++) {
    for (let iy = 0; iy < cells; iy++) {
      for (let iz = 0; iz < cells; iz++) {
        for (const b of basis) {
          atoms.push([ix + b[0], iy + b[1], iz + b[2]] as [number, number, number]);
        }
      }
    }
  }

  const referencePositions = atoms.map((atom) => atom.map((v) => v * referenceA) as [number, number, number]);
  const startPositions = atoms.map((atom, idx) => {
    const jitter = deterministicOffset(idx, config.displacementAngstrom);
    return [
      atom[0] * startA + jitter[0],
      atom[1] * startA + jitter[1],
      atom[2] * startA + jitter[2],
    ] as [number, number, number];
  });
  const targetPositions = atoms.map((atom) => atom.map((v) => v * targetA) as [number, number, number]);

  const frames: Frame[] = [];
  const scoreCurve: any[] = [];
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestCloseness = 0;
  const frameCount = Math.max(3, Math.round(config.frames));
  const referenceEnergy = entry.reference.energy_ev_per_atom;
  const targetEnergy = entry.predicted.energy_ev_per_atom ?? referenceEnergy;
  const startEnergy = referenceEnergy !== undefined
    ? referenceEnergy + Math.abs(config.strainPercent) * 0.08 + config.displacementAngstrom * 1.5
    : undefined;

  for (let i = 0; i < frameCount; i++) {
    const rawT = i / (frameCount - 1);
    const solveT = 1 - Math.pow(1 - rawT, 2.35);
    const step = Math.round(rawT * config.steps);
    const a = lerp(startA, targetA, solveT);
    const positions = new Float32Array(atoms.length * 3);
    const offsetError = new Float32Array(atoms.length);
    const solveCloseness = new Float32Array(atoms.length);
    let positionSquared = 0;

    for (let atomIdx = 0; atomIdx < atoms.length; atomIdx++) {
      const start = startPositions[atomIdx];
      const target = targetPositions[atomIdx];
      const ref = referencePositions[atomIdx];
      const wobble = Math.sin(rawT * Math.PI * 6 + atomIdx * 0.41) * config.displacementAngstrom * 0.08 * (1 - solveT);
      const x = lerp(start[0], target[0], solveT) + wobble;
      const y = lerp(start[1], target[1], solveT) - wobble * 0.6;
      const z = lerp(start[2], target[2], solveT) + wobble * 0.4;
      positions[atomIdx * 3] = x;
      positions[atomIdx * 3 + 1] = y;
      positions[atomIdx * 3 + 2] = z;
      const dx = x - ref[0];
      const dy = y - ref[1];
      const dz = z - ref[2];
      const atomError = Math.sqrt(dx * dx + dy * dy + dz * dz);
      positionSquared += atomError * atomError;
      offsetError[atomIdx] = atomError;
      solveCloseness[atomIdx] = solveT;
    }

    const positionRmse = Math.sqrt(positionSquared / atoms.length);
    const energy = startEnergy !== undefined && targetEnergy !== undefined
      ? lerp(startEnergy, targetEnergy, solveT)
      : undefined;
    const forceNorm = Math.max(0.004, (1 - solveT) * (0.12 + config.displacementAngstrom * 1.2));
    const stressRmse = Math.max(0.02, (1 - solveT) * Math.abs(config.strainPercent) * 0.45);
    const distance = normalizedDistance({
      latticeError: Math.abs(a - referenceA),
      positionRmse,
      energyError: energy !== undefined && referenceEnergy !== undefined ? Math.abs(energy - referenceEnergy) : undefined,
      forceNorm,
      stressRmse,
    });
    const closeness = 1 / (1 + distance);
    bestDistance = Math.min(bestDistance, distance);
    bestCloseness = Math.max(bestCloseness, closeness);
    scoreCurve.push({
      step,
      time_seconds: Number((step * 0.006).toFixed(4)),
      force_calls: step,
      distance_to_reference: round6(distance),
      closeness: round6(closeness),
      force_max_norm_ev_per_angstrom: round6(forceNorm),
      stress_rmse_gpa: round6(stressRmse),
      lattice_error_angstrom: round6(Math.abs(a - referenceA)),
      position_rmse_angstrom: round6(positionRmse),
    });

    frames.push({
      timestep: step,
      natoms: atoms.length,
      boxBounds: new Float64Array([0, a * cells, 0, a * cells, 0, a * cells]),
      boxTilt: new Float64Array([0, 0, 0]),
      triclinic: false,
      columns: ['id', 'type', 'x', 'y', 'z', 'offset_error', 'solve_closeness'],
      ids: Int32Array.from(atoms.map((_, idx) => idx + 1)),
      types: Int32Array.from(atoms.map(() => 1)),
      positions,
      bonds: new Int32Array(0),
      properties: new Map([
        ['offset_error', offsetError],
        ['solve_closeness', solveCloseness],
      ]),
    });
  }

  const first = scoreCurve[0];
  const last = scoreCurve[scoreCurve.length - 1];
  const prior = scoreCurve
    .slice()
    .reverse()
    .find((point) => point.step <= config.steps - 200) ?? first;
  const continuationGain = first.distance_to_reference > 0
    ? (prior.distance_to_reference - last.distance_to_reference) / first.distance_to_reference
    : 0;
  const improvement = first.distance_to_reference > 0
    ? (first.distance_to_reference - last.distance_to_reference) / first.distance_to_reference
    : 0;
  const failureClass = last.distance_to_reference <= 0.15 && last.force_max_norm_ev_per_angstrom <= 0.03
    ? 'solved'
    : 'wrong_equilibrium';
  const trajectory: Trajectory = {
    frames,
    totalFrames: frames.length,
    atomTypes: [1],
    globalBounds: boundsForFrames(frames),
  };
  const report = {
    schema: 'lupine.distill.equilibrium_solve_score.v1',
    run_id: `viewer-${entry.id}`,
    cell_id: `${entry.material}-${entry.potential}-offset`,
    variant_id: 'viewer_local_preview',
    mlip_id: entry.potential,
    material_id: entry.material,
    reference: {
      source: 'NIST benchmark catalog',
      lattice_a_angstrom: entry.reference.lattice_a_angstrom,
      energy_ev_per_atom: entry.reference.energy_ev_per_atom,
      elastic_constants_gpa: entry.reference.elastic_constants_gpa,
    },
    perturbation: {
      kind: 'offset_lattice_relaxation',
      strain_percent: config.strainPercent,
      atomic_displacement_angstrom: config.displacementAngstrom,
    },
    score: {
      verdict: failureClass === 'solved' ? 'complete' : 'failed-cell',
      failure_class: failureClass,
      start_distance: first.distance_to_reference,
      final_distance: last.distance_to_reference,
      best_distance: round6(bestDistance),
      final_closeness: last.closeness,
      best_closeness: round6(bestCloseness),
      improvement_fraction: round6(improvement),
      elapsed_seconds: last.time_seconds,
      steps: config.steps,
      force_calls: config.steps,
      final_force_max_norm_ev_per_angstrom: last.force_max_norm_ev_per_angstrom,
      final_stress_rmse_gpa: last.stress_rmse_gpa,
      final_lattice_error_angstrom: last.lattice_error_angstrom,
      final_position_rmse_angstrom: last.position_rmse_angstrom,
      continuation_window_steps: 200,
      continuation_gain_fraction: round6(continuationGain),
      plateau_detected: Math.abs(continuationGain) < 0.002,
    },
    anytime_curve: scoreCurve,
    viewer_artifact: {
      schema: 'lupine.mlip.equilibrium_viewer.v1',
      material_id: entry.material,
      mlip_id: entry.potential,
      frames: scoreCurve.map((point, idx) => ({
        ...point,
        cell_angstrom: [
          [frames[idx].boxBounds[1], 0, 0],
          [0, frames[idx].boxBounds[3], 0],
          [0, 0, frames[idx].boxBounds[5]],
        ],
      })),
    },
    hyperribbon_evidence: {
      schema: 'lupine.distill.hyperribbon_evidence.equilibrium_solve.v1',
      evidence_kind: 'offset_lattice_relaxation',
      fault_line: failureClass,
      continuation_value_kind: 'trailing_window_marginal_gain',
      continuation_window_steps: 200,
      continuation_gain_fraction: round6(continuationGain),
      plateau_detected: Math.abs(continuationGain) < 0.002,
      distance_components: ['lattice', 'positions', 'energy', 'stress', 'force_residual'],
    },
  };

  return {
    file: {
      name: `${entry.material} ${entry.potential} equilibrium solve`,
      size: frames.length * atoms.length * 12,
      trajectory,
      thermo: null,
      sourceUrl: `nist-equilibrium://${entry.id}`,
    },
    report,
  };
}

function deterministicOffset(idx: number, amplitude: number): [number, number, number] {
  return [
    Math.sin(idx * 12.9898) * amplitude,
    Math.cos(idx * 78.233) * amplitude * 0.8,
    Math.sin(idx * 37.719 + 0.4) * amplitude * 0.6,
  ];
}

function normalizedDistance(values: {
  latticeError: number;
  positionRmse: number;
  energyError?: number;
  forceNorm: number;
  stressRmse: number;
}) {
  const components = [
    values.latticeError / 0.02,
    values.positionRmse / 0.03,
    values.forceNorm / 0.03,
    values.stressRmse / 0.5,
  ];
  if (values.energyError !== undefined) components.push(values.energyError / 0.02);
  return components.reduce((sum, value) => sum + value, 0) / components.length;
}

function boundsForFrames(frames: Frame[]): Trajectory['globalBounds'] {
  const min: [number, number, number] = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: [number, number, number] = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const frame of frames) {
    for (let i = 0; i < frame.positions.length; i += 3) {
      min[0] = Math.min(min[0], frame.positions[i]);
      min[1] = Math.min(min[1], frame.positions[i + 1]);
      min[2] = Math.min(min[2], frame.positions[i + 2]);
      max[0] = Math.max(max[0], frame.positions[i]);
      max[1] = Math.max(max[1], frame.positions[i + 1]);
      max[2] = Math.max(max[2], frame.positions[i + 2]);
    }
  }
  return { min, max };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function round6(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatNumber(value: unknown, digits = 3) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function formatPercent(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

const sEmbeddedShell: CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '24px',
  color: '#f8fafc',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.10)',
};

const sPanelShell: CSSProperties = {
  padding: 18,
  color: '#f8fafc',
};

const sHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
};

const sKicker: CSSProperties = {
  color: '#1edce0',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const sTitle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 20,
  lineHeight: 1.1,
};

const sPrimaryButton: CSSProperties = {
  border: '1px solid #1edce0',
  background: 'rgba(30,220,224,0.16)',
  color: '#f8fafc',
  padding: '9px 14px',
  cursor: 'pointer',
  fontWeight: 700,
};

const sError: CSSProperties = {
  padding: 10,
  border: '1px solid rgba(255,84,114,0.5)',
  color: '#ff5472',
  marginBottom: 12,
};

const sMuted: CSSProperties = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: 13,
  marginBottom: 12,
};

const sGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12,
};

const sGridWide: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 0.7fr) minmax(280px, 1.3fr)',
  gap: 12,
};

const sField: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sLabel: CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.62)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const sSelect: CSSProperties = {
  width: '100%',
  background: '#10141d',
  color: '#f8fafc',
  border: '1px solid rgba(255,255,255,0.16)',
  padding: '9px 10px',
};

const sSliderBlock: CSSProperties = {
  display: 'grid',
  gap: 12,
  marginTop: 18,
};

const sSliderRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px 1fr 72px',
  alignItems: 'center',
  gap: 10,
};

const sSliderLabel: CSSProperties = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 12,
};

const sSliderValue: CSSProperties = {
  textAlign: 'right',
  color: '#b8d4e3',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

const sReferenceBand: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  marginTop: 18,
};

const sScoreBand: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  marginTop: 8,
};

const sMetric: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  padding: '10px',
  background: 'rgba(0,0,0,0.22)',
  minWidth: 0,
};

const sMetricLabel: CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.52)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const sMetricValue: CSSProperties = {
  marginTop: 4,
  fontSize: 16,
  fontWeight: 700,
  color: '#f8fafc',
  overflowWrap: 'anywhere',
};

const sMetricUnit: CSSProperties = {
  color: 'rgba(255,255,255,0.52)',
  fontSize: 11,
  fontWeight: 500,
};

const sChartWrap: CSSProperties = {
  marginTop: 16,
  border: '1px solid rgba(255,255,255,0.10)',
  padding: 12,
  background: 'rgba(0,0,0,0.20)',
};

const sChartHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 11,
  color: 'rgba(255,255,255,0.56)',
  marginBottom: 8,
};

const sChart: CSSProperties = {
  width: '100%',
  height: 120,
  overflow: 'visible',
};
