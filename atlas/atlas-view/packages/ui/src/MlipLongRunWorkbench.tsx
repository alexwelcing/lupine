import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Frame, Trajectory } from '@atlas/core/types';
import { useStore, type LoadedFile } from './store';

const REGISTRY_URL = '/mlip/mlip-long-demo-registry.json';
const RIBBON_PREP_URL = '/mlip/mlip-long-demo-ribbon-prep.json';
const CALIBRATION_ARTIFACT_URL = '/mlip/chgnet-al-fcc-2x2x2-relax-repro-v2-score-default.json';
const MLIP_VISUAL_SUBFRAMES_PER_SEGMENT = 120;
const MLIP_VISUAL_FRAME_RATE = 120;

interface LongDemoRegistry {
  schema: string;
  demos: LongDemo[];
}

interface LongDemo {
  id: string;
  title: string;
  demo_class: string;
  primary_material_id: string;
  why_we_care: string;
  scientific_distill: {
    status: string;
    primary_metrics: string[];
    measured_artifacts?: MeasuredArtifact[];
  };
  viewer: {
    status: string;
    measured_artifacts?: MeasuredArtifact[];
  };
  claim_gate: {
    scientific_claim_allowed: boolean;
    viewer_claim_allowed: boolean;
    next_evidence_step: string;
  };
}

interface MeasuredArtifact {
  schema: string;
  uri: string;
  label?: string;
  variant_id?: string;
  mlip_id?: string;
  artifact_role?: string;
  paired_score_uri?: string;
  score_summary?: ScoreSummary;
}

interface ScoreSummary {
  schema?: string;
  primary_metric?: string;
  baseline_final_reference_position_rmse_angstrom?: number;
  distill_final_reference_position_rmse_angstrom?: number;
  final_rmse_lift_fraction?: number;
  mean_rmse_lift_fraction?: number;
  distill_intervention_count?: number;
  verdict?: string;
  anytime_curve?: AnytimePoint[];
  intervention_curve?: InterventionPoint[];
}

interface AnytimePoint {
  frame_index?: number;
  step?: number;
  baseline_reference_position_rmse_angstrom?: number;
  distill_reference_position_rmse_angstrom?: number;
  rmse_lift_fraction?: number;
  baseline_force_max_norm_ev_per_angstrom?: number;
  distill_force_max_norm_ev_per_angstrom?: number;
  baseline_energy_drift_ev_per_atom?: number;
  distill_energy_drift_ev_per_atom?: number;
  distill_intervention_count?: number;
}

interface InterventionPoint {
  iteration?: number;
  step?: number;
  reference_rmse_before_angstrom?: number;
  reference_rmse_after_angstrom?: number;
  local_rmse_lift_fraction?: number;
  correction_norm_max_angstrom?: number;
  correction_norm_mean_angstrom?: number;
  force_max_norm_ev_per_angstrom_before?: number;
  stiff_axis_drift_fraction?: number;
}

interface RibbonPrepArtifact {
  schema: string;
  prep_id: string;
  ribbons: DemoRibbonPrep[];
  shared_ribbon_principles: string[];
}

interface DemoRibbonPrep {
  demo_id: string;
  ribbon_id: string;
  status: string;
  material_id: string;
  science_contract: {
    primary_question: string;
    reference_lock: {
      required_before_active_correction: boolean;
      required_sources: string[];
      blocked_until_locked: string[];
    };
    support_plan: {
      support_family: string;
      eval_family: string;
      leakage_guard: string;
      minimum_support_cases: number;
    };
    allowed_correction_coordinates: string[];
    stiff_axes_to_preserve: string[];
    primary_metrics: string[];
    acceptance_gate: Record<string, number | boolean>;
    refusal_triggers: string[];
    theorem_hooks: string[];
  };
  ribbon_policy: {
    mode: string;
    ribbon_version: string;
    projected_ribbon_enabled: boolean;
    max_energy_bias_ev_per_atom?: number;
    energy_correction_scale?: number;
    max_stiff_axis_drift_fraction?: number;
    min_complement_residual_fraction?: number;
    max_projection_distance_proxy?: number;
    min_projected_support_lift_fraction?: number;
  };
  run_plan: {
    phase_0_preflight: string[];
    phase_1_local_pair: string[];
    phase_2_cloud: string[];
  };
  viewer_contract: {
    status: string;
    scene_rule: string;
    required_layers: string[];
    blocked_layers_until_reference_lock: string[];
    artifact_schemas: string[];
  };
}

interface EquilibriumScoreArtifact {
  schema: 'lupine.distill.equilibrium_solve_score.v1';
  run_id?: string;
  cell_id?: string;
  variant_id?: string;
  mlip_id?: string;
  material_id: string;
  score?: Record<string, unknown>;
  anytime_curve?: Array<Record<string, unknown>>;
  viewer_artifact: {
    schema: 'lupine.mlip.equilibrium_viewer.v1';
    material_id: string;
    mlip_id?: string;
    frames: ViewerFrame[];
  };
}

interface MdTrajectoryArtifact {
  schema: 'lupine.mlip.md_trajectory.v1';
  run_id?: string;
  cell_id?: string;
  variant_id?: string;
  mlip_id?: string;
  material_id: string;
  frames: ViewerFrame[];
  diagnostics?: Record<string, unknown>;
}

interface PairedScoreArtifact {
  schema: 'lupine.distill.md_observable_score.v1';
  score?: Record<string, unknown>;
  anytime_curve?: AnytimePoint[];
  intervention_curve?: InterventionPoint[];
}

interface ViewerFrame {
  step?: number;
  time_seconds?: number;
  cell_angstrom?: number[][];
  positions_angstrom?: number[][];
  force_max_norm_ev_per_angstrom?: number;
  distance_to_reference?: number;
  closeness?: number;
  energy_ev_per_atom?: number;
  total_energy_ev_per_atom?: number;
  temperature_k?: number;
  symbols?: string[];
}

const TYPE_BY_ELEMENT: Record<string, number> = {
  H: 1,
  Li: 3,
  C: 6,
  O: 8,
  Mg: 12,
  Al: 13,
  P: 15,
  Fe: 26,
  Ni: 28,
};

export function MlipLongRunWorkbench({ embedded = false }: { embedded?: boolean }) {
  const setFile = useStore((s) => s.setFile);
  const setGhostFile = useStore((s) => s.setGhostFile);
  const setFrame = useStore((s) => s.setFrame);
  const setColorMode = useStore((s) => s.setColorMode);
  const setColorProperty = useStore((s) => s.setColorProperty);
  const setColormap = useStore((s) => s.setColormap);
  const setCameraPreset = useStore((s) => s.setCameraPreset);
  const setPlaying = useStore((s) => s.togglePlay);
  const playing = useStore((s) => s.playing);

  const [registry, setRegistry] = useState<LongDemoRegistry | null>(null);
  const [prep, setPrep] = useState<RibbonPrepArtifact | null>(null);
  const [selectedDemoId, setSelectedDemoId] = useState('ni-vacancy-diffusion-arrhenius-v1');
  const [error, setError] = useState<string | null>(null);
  const [loadingArtifact, setLoadingArtifact] = useState<string | null>(null);
  const [pairedScore, setPairedScore] = useState<PairedScoreArtifact | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<LongDemoRegistry>(REGISTRY_URL),
      fetchJson<RibbonPrepArtifact>(RIBBON_PREP_URL),
    ])
      .then(([registryPayload, prepPayload]) => {
        if (cancelled) return;
        setRegistry(registryPayload);
        setPrep(prepPayload);
        if (!prepPayload.ribbons.some((ribbon) => ribbon.demo_id === selectedDemoId)) {
          setSelectedDemoId(prepPayload.ribbons[0]?.demo_id ?? selectedDemoId);
        }
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRibbon = useMemo(
    () => prep?.ribbons.find((ribbon) => ribbon.demo_id === selectedDemoId) ?? prep?.ribbons[0] ?? null,
    [prep, selectedDemoId],
  );
  const selectedDemo = useMemo(
    () => registry?.demos.find((demo) => demo.id === selectedRibbon?.demo_id) ?? null,
    [registry, selectedRibbon],
  );
  const measuredArtifacts = useMemo(() => {
    const science = selectedDemo?.scientific_distill.measured_artifacts ?? [];
    const viewer = selectedDemo?.viewer.measured_artifacts ?? [];
    const unique = new Map<string, MeasuredArtifact>();
    for (const artifact of [...science, ...viewer]) {
      if (artifact.uri && !unique.has(artifact.uri)) unique.set(artifact.uri, artifact);
    }
    return Array.from(unique.values());
  }, [selectedDemo]);
  const distillWinArtifact = useMemo(
    () => measuredArtifacts.find((artifact) => artifact.score_summary?.verdict === 'distill_accuracy_win') ?? null,
    [measuredArtifacts],
  );
  const distillWin = useMemo<ScoreSummary | null>(() => {
    const summary = distillWinArtifact?.score_summary;
    if (!summary) return null;
    return {
      ...summary,
      anytime_curve: summary.anytime_curve?.length ? summary.anytime_curve : pairedScore?.anytime_curve ?? [],
      intervention_curve: summary.intervention_curve?.length ? summary.intervention_curve : pairedScore?.intervention_curve ?? [],
    };
  }, [distillWinArtifact, pairedScore]);

  useEffect(() => {
    let cancelled = false;
    setPairedScore(null);
    const scoreUri = distillWinArtifact?.paired_score_uri;
    if (!scoreUri) return () => {
      cancelled = true;
    };
    fetchJson<PairedScoreArtifact>(scoreUri)
      .then((payload) => {
        if (!cancelled) setPairedScore(payload);
      })
      .catch(() => {
        if (!cancelled) setPairedScore(null);
      });
    return () => {
      cancelled = true;
    };
  }, [distillWinArtifact?.paired_score_uri]);

  const loadArtifactIntoViewer = async (artifactOrUrl: MeasuredArtifact | string, labelOverride?: string) => {
    const artifact = typeof artifactOrUrl === 'string' ? null : artifactOrUrl;
    const url = typeof artifactOrUrl === 'string' ? artifactOrUrl : artifactOrUrl.uri;
    const label = labelOverride ?? artifact?.label ?? url;
    setLoadingArtifact(label);
    try {
      const payload = await fetchJson<EquilibriumScoreArtifact | MdTrajectoryArtifact>(url);
      const loaded = artifactToLoadedFile(payload, url);
      setFile(loaded);
      const baselineArtifact = artifact ? pairedBaselineArtifactFor(artifact, measuredArtifacts) : null;
      if (baselineArtifact) {
        const baselinePayload = await fetchJson<EquilibriumScoreArtifact | MdTrajectoryArtifact>(baselineArtifact.uri);
        const baselineLoaded = artifactToLoadedFile(baselinePayload, baselineArtifact.uri);
        setGhostFile({
          ...baselineLoaded,
          name: `${baselineLoaded.name} baseline ghost`,
        });
      } else {
        setGhostFile(null);
      }
      setFrame(0);
      const chemistryFirst = payload.schema === 'lupine.mlip.md_trajectory.v1';
      setColorMode(chemistryFirst ? 'type' : 'property');
      setColorProperty(chemistryFirst ? null : 'distance_to_final');
      setColormap('turbo');
      setCameraPreset('iso');
      useStore.setState({
        atomColorSource: 'element',
        atomScale: chemistryFirst ? 1.35 : 1.0,
        materialPreset: 'matte',
        materialIntensity: chemistryFirst ? 0.75 : 0.35,
        environmentPreset: 'studio',
        showBonds: false,
      });
      if (!playing) setPlaying();
      useStore.setState({ activePanel: 'mlipLongRun' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingArtifact(null);
    }
  };

  if (error) {
    return (
      <section style={embedded ? sEmbeddedShell : sPanelShell}>
        <div style={sError}>Distill viewer evidence unavailable: {error}</div>
      </section>
    );
  }

  if (!prep || !registry) {
    return (
      <section style={embedded ? sEmbeddedShell : sPanelShell}>
        <div style={sMuted}>Loading Distill long-run viewer...</div>
      </section>
    );
  }

  if (!embedded && selectedRibbon && selectedDemo) {
    return (
      <section style={sStoryShell}>
        <div style={sKicker}>Why this run matters</div>
        <h2 style={sStoryTitle}>{selectedRibbon.material_id}</h2>
        <p style={sStoryLead}>{selectedDemo.why_we_care}</p>

        {distillWin && (
          <div style={sStoryWin}>
            <div style={sWinTopline}>Distill Accuracy win measured locally</div>
            <div style={sStoryWinNumber}>{formatSignedPercent(distillWin.final_rmse_lift_fraction)}</div>
            <div style={sStoryWinCopy}>
              Final reference RMSE moved from {formatAngstrom(distillWin.baseline_final_reference_position_rmse_angstrom)} to {formatAngstrom(distillWin.distill_final_reference_position_rmse_angstrom)} with {distillWin.distill_intervention_count ?? 0} in-run corrections.
            </div>
          </div>
        )}

        <div style={sStoryActions}>
          {storyArtifacts(measuredArtifacts).map((artifact) => (
            <button
              key={`${artifact.uri}:${artifact.variant_id ?? ''}`}
              style={artifact.variant_id === 'distill_accuracy' ? sStoryPrimaryAction : sStoryAction}
              onClick={() => loadArtifactIntoViewer(artifact)}
              disabled={loadingArtifact !== null}
              title={artifact.uri}
            >
              <span>{artifact.variant_id === 'distill_accuracy' ? 'View Distill flow' : 'View baseline flow'}</span>
              <strong>{artifact.score_summary?.verdict === 'distill_accuracy_win'
                ? `${artifact.mlip_id ?? 'MLIP'} ${formatSignedPercent(artifact.score_summary.final_rmse_lift_fraction)}`
                : artifact.mlip_id ?? artifact.variant_id ?? 'artifact'}</strong>
            </button>
          ))}
        </div>

        <div style={sStoryLine}>
          <span>Baseline drift</span>
          <strong>{formatAngstrom(distillWin?.baseline_final_reference_position_rmse_angstrom)}</strong>
          <span>Distill recovered</span>
          <strong>{formatAngstrom(distillWin?.distill_final_reference_position_rmse_angstrom)}</strong>
        </div>

        {distillWin && (
          <IterationEvidence
            curve={distillWin.anytime_curve ?? []}
            interventions={distillWin.intervention_curve ?? []}
          />
        )}

        <div style={sStorySwitcher}>
          {prep.ribbons.map((ribbon) => (
            <button
              key={ribbon.demo_id}
              type="button"
              style={sStoryTab(ribbon.demo_id === selectedRibbon.demo_id)}
              onClick={() => setSelectedDemoId(ribbon.demo_id)}
            >
              <span>{ribbon.material_id}</span>
            </button>
          ))}
        </div>

        <div style={sStoryFinePrint}>
          Local paired claim only. External Ni vacancy diffusion references remain locked behind the next cloud canary.
        </div>
      </section>
    );
  }

  return (
    <section style={embedded ? sEmbeddedShell : sPanelShell}>
      <div style={sHeader}>
        <div>
          <div style={sKicker}>LUPI Distill viewer</div>
          <h2 style={sTitle}>Long-run ribbon cockpit</h2>
        </div>
        <button
          style={sPrimaryButton}
          onClick={() => loadArtifactIntoViewer(CALIBRATION_ARTIFACT_URL, 'measured Al-fcc calibration')}
          disabled={loadingArtifact !== null}
        >
          {loadingArtifact ? 'Loading...' : 'Load measured solve'}
        </button>
      </div>

      <div style={sTopGrid}>
        <Metric label="Ribbons" value={`${prep.ribbons.length}`} />
        <Metric label="Shadow ready" value={`${prep.ribbons.filter((r) => r.status.includes('ready_for_local_shadow_run')).length}`} />
        <Metric label="Reference blocked" value={`${prep.ribbons.filter((r) => r.status.includes('reference_required')).length}`} />
        <Metric label="Viewer rule" value="measured only" />
      </div>

      <div style={sDemoTabs}>
        {prep.ribbons.map((ribbon) => (
          <button
            key={ribbon.demo_id}
            type="button"
            style={sDemoTab(ribbon.demo_id === selectedRibbon?.demo_id, ribbon.status.includes('reference_required'))}
            onClick={() => setSelectedDemoId(ribbon.demo_id)}
          >
            <span style={sDemoTabMaterial}>{ribbon.material_id}</span>
            <strong style={sDemoTabLabel}>{shortRibbonLabel(ribbon.ribbon_id)}</strong>
          </button>
        ))}
      </div>

      {selectedRibbon && selectedDemo && (
        <div style={embedded ? sSelectedLayout : sSelectedNarrowLayout}>
          <div style={sRibbonCard}>
            <div style={sCardTop}>
              <span>{selectedRibbon.status.replaceAll('_', ' ')}</span>
              <strong>{selectedDemo.demo_class.replaceAll('_', ' ')}</strong>
            </div>
            <h3 style={sCardTitle}>{selectedDemo.title}</h3>
            <p style={sBodyText}>{selectedRibbon.science_contract.primary_question}</p>

            <div style={sMetricGrid}>
              <Metric label="Mode" value={selectedRibbon.ribbon_policy.mode.replaceAll('_', ' ')} compact />
              <Metric label="Accuracy gate" value={formatPercent(selectedRibbon.science_contract.acceptance_gate.min_paired_accuracy_lift_fraction)} compact />
              <Metric label="Stiff max" value={formatPercent(selectedRibbon.science_contract.acceptance_gate.max_stiff_axis_drift_fraction)} compact />
              <Metric label="Intervention max" value={formatPercent(selectedRibbon.science_contract.acceptance_gate.max_intervention_rate)} compact />
            </div>

            <ListBlock title="Allowed correction coordinates" items={selectedRibbon.science_contract.allowed_correction_coordinates} />
            <ListBlock title="Stiff axes preserved" items={selectedRibbon.science_contract.stiff_axes_to_preserve} />
            <ListBlock title="Refuse if" items={selectedRibbon.science_contract.refusal_triggers} tone="warn" />
          </div>

          <div style={sViewerCard}>
            <div style={sKicker}>Viewer surface</div>
            <h3 style={sPanelTitle}>Scene layers are locked to artifacts.</h3>
            <p style={sBodyText}>{selectedRibbon.viewer_contract.scene_rule}</p>
            {distillWin && (
              <div style={sWinPanel}>
                <div style={sWinTopline}>Distill Accuracy win measured locally</div>
                <div style={sWinMetrics}>
                  <Metric
                    label="Final RMSE lift"
                    value={formatSignedPercent(distillWin.final_rmse_lift_fraction)}
                    compact
                  />
                  <Metric
                    label="Baseline RMSE"
                    value={formatAngstrom(distillWin.baseline_final_reference_position_rmse_angstrom)}
                    compact
                  />
                  <Metric
                    label="Distill RMSE"
                    value={formatAngstrom(distillWin.distill_final_reference_position_rmse_angstrom)}
                    compact
                  />
                  <Metric
                    label="Interventions"
                    value={`${distillWin.distill_intervention_count ?? 0}`}
                    compact
                  />
                </div>
              </div>
            )}
            <ListBlock title="Required viewer layers" items={selectedRibbon.viewer_contract.required_layers} />
            <ListBlock title="Blocked until reference lock" items={selectedRibbon.viewer_contract.blocked_layers_until_reference_lock} tone="warn" />

            <div style={sActionStack}>
              <button
                style={measuredArtifacts.length ? sPrimaryButton : sDisabledButton}
                disabled={!measuredArtifacts.length || loadingArtifact !== null}
                onClick={() => {
                  const first = measuredArtifacts[0];
                  if (first) void loadArtifactIntoViewer(first, selectedDemo.id);
                }}
              >
                {measuredArtifacts.length ? 'Load measured demo' : 'Awaiting measured demo artifact'}
              </button>
              {measuredArtifacts.map((artifact) => (
                <button
                  key={`${artifact.uri}:${artifact.label ?? ''}`}
                  style={sArtifactButton}
                  onClick={() => loadArtifactIntoViewer(artifact)}
                  disabled={loadingArtifact !== null}
                  title={artifact.uri}
                >
                  <span>{artifact.label ?? artifact.variant_id ?? 'measured artifact'}</span>
                  <strong>
                    {artifact.score_summary?.verdict === 'distill_accuracy_win'
                      ? `${artifact.mlip_id ?? 'MLIP'} +${formatPercentNumber(artifact.score_summary.final_rmse_lift_fraction)}`
                      : artifact.mlip_id ?? artifact.schema.replace(/^lupine\./, '')}
                  </strong>
                </button>
              ))}
              <button
                style={sSecondaryButton}
                onClick={() => loadArtifactIntoViewer(CALIBRATION_ARTIFACT_URL, 'measured Al-fcc calibration')}
                disabled={loadingArtifact !== null}
              >
                Validate loader on real Al-fcc artifact
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const freshUrl = url.startsWith('/mlip/') ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : url;
  const res = await fetch(freshUrl, { cache: 'reload' });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

function pairedBaselineArtifactFor(artifact: MeasuredArtifact, artifacts: MeasuredArtifact[]): MeasuredArtifact | null {
  if (artifact.variant_id !== 'distill_accuracy') return null;
  return artifacts.find((candidate) =>
    candidate.variant_id === 'baseline'
    && (!artifact.mlip_id || candidate.mlip_id === artifact.mlip_id)
  ) ?? artifacts.find((candidate) => candidate.variant_id === 'baseline') ?? null;
}

function artifactToLoadedFile(payload: EquilibriumScoreArtifact | MdTrajectoryArtifact, sourceUrl: string): LoadedFile {
  if (payload.schema === 'lupine.distill.equilibrium_solve_score.v1') {
    return equilibriumScoreToLoadedFile(payload, sourceUrl);
  }
  if (payload.schema === 'lupine.mlip.md_trajectory.v1') {
    return mdTrajectoryToLoadedFile(payload, sourceUrl);
  }
  throw new Error(`Unsupported MLIP artifact schema: ${(payload as { schema?: string }).schema ?? 'unknown'}`);
}

function equilibriumScoreToLoadedFile(payload: EquilibriumScoreArtifact, sourceUrl: string): LoadedFile {
  const frames = viewerFramesToFrames(payload.viewer_artifact.frames, payload.material_id);
  return {
    name: `${payload.material_id} ${payload.mlip_id ?? 'MLIP'} measured solve`,
    size: frames.reduce((sum, frame) => sum + frame.positions.byteLength, 0),
    trajectory: framesToTrajectory(frames),
    thermo: null,
    sourceUrl,
  };
}

function mdTrajectoryToLoadedFile(payload: MdTrajectoryArtifact, sourceUrl: string): LoadedFile {
  const displayFrames = buildCinematicViewerFrames(payload.frames, MLIP_VISUAL_SUBFRAMES_PER_SEGMENT);
  const frames = viewerFramesToFrames(displayFrames, payload.material_id);
  const variant = payload.variant_id ? ` ${payload.variant_id.replaceAll('_', ' ')}` : '';
  return {
    name: `${payload.material_id} ${payload.mlip_id ?? 'MLIP'}${variant} 120fps measured flow`,
    size: frames.reduce((sum, frame) => sum + frame.positions.byteLength, 0),
    trajectory: framesToTrajectory(frames),
    thermo: null,
    sourceUrl,
    playbackFrameRate: MLIP_VISUAL_FRAME_RATE,
  };
}

function buildCinematicViewerFrames(viewerFrames: ViewerFrame[], subframesPerSegment: number): ViewerFrame[] {
  if (viewerFrames.length < 2 || subframesPerSegment <= 1) return viewerFrames;
  const dense: ViewerFrame[] = [];
  for (let idx = 0; idx < viewerFrames.length - 1; idx += 1) {
    const current = viewerFrames[idx];
    const next = viewerFrames[idx + 1];
    for (let subframe = 0; subframe < subframesPerSegment; subframe += 1) {
      dense.push(interpolateViewerFrame(current, next, subframe / subframesPerSegment, idx, subframe));
    }
  }
  dense.push({
    ...viewerFrames[viewerFrames.length - 1],
    step: viewerFrames[viewerFrames.length - 1].step ?? dense.length,
  });
  return dense;
}

function interpolateViewerFrame(
  current: ViewerFrame,
  next: ViewerFrame,
  t: number,
  sourceFrameIndex: number,
  visualSubframe: number,
): ViewerFrame {
  return {
    ...current,
    step: interpolateNumeric(current.step, next.step, t) ?? sourceFrameIndex * MLIP_VISUAL_SUBFRAMES_PER_SEGMENT + visualSubframe,
    time_seconds: interpolateNumeric(current.time_seconds, next.time_seconds, t),
    cell_angstrom: interpolateCell(current.cell_angstrom, next.cell_angstrom, t),
    positions_angstrom: interpolatePositionsMinimumImage(current.positions_angstrom, next.positions_angstrom, current.cell_angstrom, t),
    force_max_norm_ev_per_angstrom: interpolateNumeric(current.force_max_norm_ev_per_angstrom, next.force_max_norm_ev_per_angstrom, t),
    distance_to_reference: interpolateNumeric(current.distance_to_reference, next.distance_to_reference, t),
    closeness: interpolateNumeric(current.closeness, next.closeness, t),
    energy_ev_per_atom: interpolateNumeric(current.energy_ev_per_atom, next.energy_ev_per_atom, t),
    total_energy_ev_per_atom: interpolateNumeric(current.total_energy_ev_per_atom, next.total_energy_ev_per_atom, t),
    temperature_k: interpolateNumeric(current.temperature_k, next.temperature_k, t),
    symbols: current.symbols ?? next.symbols,
  };
}

function interpolateNumeric(a: unknown, b: unknown, t: number): number | undefined {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) && !Number.isFinite(right)) return undefined;
  if (!Number.isFinite(left)) return right;
  if (!Number.isFinite(right)) return left;
  return left + (right - left) * t;
}

function interpolateCell(a: number[][] | undefined, b: number[][] | undefined, t: number): number[][] | undefined {
  if (!a?.length || !b?.length || a.length !== b.length) return a ?? b;
  return a.map((row, rowIndex) => row.map((value, colIndex) => interpolateNumeric(value, b[rowIndex]?.[colIndex], t) ?? value));
}

function interpolatePositionsMinimumImage(
  currentPositions: number[][] | undefined,
  nextPositions: number[][] | undefined,
  cell: number[][] | undefined,
  t: number,
): number[][] | undefined {
  if (!currentPositions?.length || !nextPositions?.length || currentPositions.length !== nextPositions.length) {
    return currentPositions ?? nextPositions;
  }
  const inverseCell = invert3x3(cell);
  return currentPositions.map((position, idx) => {
    const next = nextPositions[idx] ?? position;
    if (inverseCell && cell) {
      const currentFractional = multiplyRowVectorMatrix(position, inverseCell);
      const nextFractional = multiplyRowVectorMatrix(next, inverseCell);
      const deltaFractional = [
        minimumImageFraction(nextFractional[0] - currentFractional[0]),
        minimumImageFraction(nextFractional[1] - currentFractional[1]),
        minimumImageFraction(nextFractional[2] - currentFractional[2]),
      ];
      const deltaCartesian = multiplyRowVectorMatrix(deltaFractional, cell);
      return [
        position[0] + deltaCartesian[0] * t,
        position[1] + deltaCartesian[1] * t,
        position[2] + deltaCartesian[2] * t,
      ];
    }
    return [
      position[0] + ((next[0] ?? position[0]) - position[0]) * t,
      position[1] + ((next[1] ?? position[1]) - position[1]) * t,
      position[2] + ((next[2] ?? position[2]) - position[2]) * t,
    ];
  });
}

function minimumImageFraction(value: number) {
  return value - Math.round(value);
}

function multiplyRowVectorMatrix(vector: number[], matrix: number[][]): [number, number, number] {
  return [
    (vector[0] ?? 0) * (matrix[0]?.[0] ?? 0) + (vector[1] ?? 0) * (matrix[1]?.[0] ?? 0) + (vector[2] ?? 0) * (matrix[2]?.[0] ?? 0),
    (vector[0] ?? 0) * (matrix[0]?.[1] ?? 0) + (vector[1] ?? 0) * (matrix[1]?.[1] ?? 0) + (vector[2] ?? 0) * (matrix[2]?.[1] ?? 0),
    (vector[0] ?? 0) * (matrix[0]?.[2] ?? 0) + (vector[1] ?? 0) * (matrix[1]?.[2] ?? 0) + (vector[2] ?? 0) * (matrix[2]?.[2] ?? 0),
  ];
}

function invert3x3(matrix: number[][] | undefined): number[][] | null {
  if (!matrix || matrix.length !== 3 || matrix.some((row) => row.length !== 3)) return null;
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

function viewerFramesToFrames(viewerFrames: ViewerFrame[], materialId: string): Frame[] {
  if (!viewerFrames.length) throw new Error('Measured artifact has no frames.');
  const finalPositions = lastPositions(viewerFrames);
  return viewerFrames.map((viewerFrame) => {
    const positionsList = viewerFrame.positions_angstrom;
    if (!positionsList?.length) throw new Error('Measured viewer frame is missing positions_angstrom.');
    const natoms = positionsList.length;
    const positions = new Float32Array(natoms * 3);
    const types = new Int32Array(natoms);
    const distanceToFinal = new Float32Array(natoms);
    const solveCloseness = new Float32Array(natoms);
    const forceNorm = new Float32Array(natoms);
    const globalDistance = typeof viewerFrame.distance_to_reference === 'number'
      ? viewerFrame.distance_to_reference
      : 0;
    const closeness = typeof viewerFrame.closeness === 'number' ? viewerFrame.closeness : 1 / (1 + globalDistance);
    const maxForce = typeof viewerFrame.force_max_norm_ev_per_angstrom === 'number'
      ? viewerFrame.force_max_norm_ev_per_angstrom
      : 0;

    for (let idx = 0; idx < natoms; idx += 1) {
      const pos = positionsList[idx] ?? [0, 0, 0];
      positions[idx * 3] = Number(pos[0]) || 0;
      positions[idx * 3 + 1] = Number(pos[1]) || 0;
      positions[idx * 3 + 2] = Number(pos[2]) || 0;
      const final = finalPositions[idx] ?? pos;
      types[idx] = elementTypeForFrame(viewerFrame, idx, materialId);
      distanceToFinal[idx] = distance3(pos, final);
      solveCloseness[idx] = closeness;
      forceNorm[idx] = maxForce;
    }

    const cell = viewerFrame.cell_angstrom;
    const bounds = cellToBounds(cell, positions);
    return {
      timestep: Number(viewerFrame.step) || 0,
      natoms,
      boxBounds: bounds.boxBounds,
      boxTilt: bounds.boxTilt,
      triclinic: bounds.triclinic,
      columns: ['id', 'type', 'x', 'y', 'z', 'distance_to_final', 'solve_closeness', 'force_norm'],
      ids: Int32Array.from({ length: natoms }, (_, idx) => idx + 1),
      types,
      positions,
      bonds: new Int32Array(0),
      properties: new Map([
        ['distance_to_final', distanceToFinal],
        ['solve_closeness', solveCloseness],
        ['force_norm', forceNorm],
      ]),
    };
  });
}

function framesToTrajectory(frames: Frame[]): Trajectory {
  return {
    frames,
    totalFrames: frames.length,
    atomTypes: Array.from(new Set(Array.from(frames[0]?.types ?? []))),
    globalBounds: boundsForFrames(frames),
  };
}

function lastPositions(frames: ViewerFrame[]): number[][] {
  return frames
    .slice()
    .reverse()
    .find((frame) => frame.positions_angstrom?.length)
    ?.positions_angstrom ?? [];
}

function cellToBounds(cell: number[][] | undefined, positions: Float32Array) {
  if (cell?.length === 3) {
    const x = Math.max(vectorLength(cell[0]), 1);
    const y = Math.max(vectorLength(cell[1]), 1);
    const z = Math.max(vectorLength(cell[2]), 1);
    const triclinic = Math.abs(cell[1]?.[0] ?? 0) > 1e-5
      || Math.abs(cell[2]?.[0] ?? 0) > 1e-5
      || Math.abs(cell[2]?.[1] ?? 0) > 1e-5;
    return {
      boxBounds: new Float64Array([0, x, 0, y, 0, z]),
      boxTilt: new Float64Array([cell[1]?.[0] ?? 0, cell[2]?.[0] ?? 0, cell[2]?.[1] ?? 0]),
      triclinic,
    };
  }
  const bounds = boundsForPositions(positions);
  return {
    boxBounds: new Float64Array([
      bounds.min[0],
      bounds.max[0],
      bounds.min[1],
      bounds.max[1],
      bounds.min[2],
      bounds.max[2],
    ]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
  };
}

function boundsForFrames(frames: Frame[]): { min: [number, number, number]; max: [number, number, number] } {
  const bounds = frames.reduce(
    (acc, frame) => mergeBounds(acc, boundsForPositions(frame.positions)),
    emptyBounds(),
  );
  return finiteBounds(bounds);
}

function boundsForPositions(positions: Float32Array) {
  const bounds = emptyBounds();
  for (let idx = 0; idx < positions.length; idx += 3) {
    bounds.min[0] = Math.min(bounds.min[0], positions[idx]);
    bounds.min[1] = Math.min(bounds.min[1], positions[idx + 1]);
    bounds.min[2] = Math.min(bounds.min[2], positions[idx + 2]);
    bounds.max[0] = Math.max(bounds.max[0], positions[idx]);
    bounds.max[1] = Math.max(bounds.max[1], positions[idx + 1]);
    bounds.max[2] = Math.max(bounds.max[2], positions[idx + 2]);
  }
  return finiteBounds(bounds);
}

function emptyBounds() {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] as [number, number, number],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY] as [number, number, number],
  };
}

function mergeBounds(left: ReturnType<typeof emptyBounds>, right: ReturnType<typeof emptyBounds>) {
  return {
    min: [
      Math.min(left.min[0], right.min[0]),
      Math.min(left.min[1], right.min[1]),
      Math.min(left.min[2], right.min[2]),
    ] as [number, number, number],
    max: [
      Math.max(left.max[0], right.max[0]),
      Math.max(left.max[1], right.max[1]),
      Math.max(left.max[2], right.max[2]),
    ] as [number, number, number],
  };
}

function finiteBounds(bounds: ReturnType<typeof emptyBounds>) {
  if (!bounds.min.every(Number.isFinite) || !bounds.max.every(Number.isFinite)) {
    return { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] };
  }
  return bounds;
}

function elementType(materialId: string) {
  const match = materialId.match(/[A-Z][a-z]?/);
  return TYPE_BY_ELEMENT[match?.[0] ?? ''] ?? 1;
}

function elementTypeForFrame(frame: ViewerFrame, atomIndex: number, materialId: string) {
  const symbol = frame.symbols?.[atomIndex];
  return TYPE_BY_ELEMENT[symbol ?? ''] ?? elementType(materialId);
}

function vectorLength(value: number[] | undefined) {
  if (!value) return 0;
  return Math.sqrt((value[0] ?? 0) ** 2 + (value[1] ?? 0) ** 2 + (value[2] ?? 0) ** 2);
}

function distance3(a: number[], b: number[]) {
  const dx = (Number(a[0]) || 0) - (Number(b[0]) || 0);
  const dy = (Number(a[1]) || 0) - (Number(b[1]) || 0);
  const dz = (Number(a[2]) || 0) - (Number(b[2]) || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div style={compact ? sMetricCompact : sMetric}>
      <span style={sMetricLabel}>{label}</span>
      <strong style={sMetricValue}>{value}</strong>
    </div>
  );
}

function ListBlock({ title, items, tone = 'normal' }: { title: string; items: string[]; tone?: 'normal' | 'warn' }) {
  return (
    <div style={sListBlock}>
      <div style={tone === 'warn' ? sListTitleWarn : sListTitle}>{title}</div>
      <ul style={sList}>
        {items.map((item) => (
          <li key={item} style={sListItem}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function IterationEvidence({ curve, interventions }: { curve: AnytimePoint[]; interventions: InterventionPoint[] }) {
  const sampled = sampleCurve(curve, 6);
  const maxRmse = Math.max(
    0.001,
    ...sampled.flatMap((point) => [
      Number(point.baseline_reference_position_rmse_angstrom) || 0,
      Number(point.distill_reference_position_rmse_angstrom) || 0,
    ]),
  );
  const latest = curve[curve.length - 1];
  const early = curve.find((point) => Number(point.rmse_lift_fraction) > 0);
  return (
    <div style={sIterationPanel}>
      <div style={sIterationHeader}>
        <span>Iteration evidence</span>
        <strong>{curve.length ? `${curve.length} measured checkpoints` : 'awaiting curve'}</strong>
      </div>
      {early && latest && (
        <p style={sIterationCopy}>
          The first correction buys {formatSignedPercent(early.rmse_lift_fraction)} at step {formatStep(early.step)}; by step {formatStep(latest.step)}, the same guarded policy reaches {formatSignedPercent(latest.rmse_lift_fraction)} without moving the stiff axes.
        </p>
      )}
      <div style={sCurveRows}>
        {sampled.map((point) => (
          <div key={`${point.frame_index ?? point.step}`} style={sCurveRow}>
            <span style={sStepLabel}>s{formatStep(point.step)}</span>
            <div style={sCurveBars}>
              <div
                style={{
                  ...sBaselineBar,
                  width: `${barPercent(point.baseline_reference_position_rmse_angstrom, maxRmse)}%`,
                }}
                title={`Baseline ${formatAngstrom(point.baseline_reference_position_rmse_angstrom)}`}
              />
              <div
                style={{
                  ...sDistillBar,
                  width: `${barPercent(point.distill_reference_position_rmse_angstrom, maxRmse)}%`,
                }}
                title={`Distill ${formatAngstrom(point.distill_reference_position_rmse_angstrom)}`}
              />
            </div>
            <strong style={sLiftValue}>{formatSignedPercent(point.rmse_lift_fraction)}</strong>
          </div>
        ))}
      </div>
      <div style={sInterventionStrip}>
        {interventions.slice(0, 10).map((point) => (
          <div key={`${point.iteration ?? point.step}`} style={sInterventionDot} title={`Correction ${point.iteration}: ${formatAngstrom(point.reference_rmse_before_angstrom)} -> ${formatAngstrom(point.reference_rmse_after_angstrom)}`}>
            <span>{point.iteration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPercent(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : 'n/a';
}

function formatPercentNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(0)}%` : 'n/a';
}

function formatSignedPercent(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `+${(n * 100).toFixed(1)}%` : 'n/a';
}

function formatAngstrom(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(4)} A` : 'n/a';
}

function formatStep(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n)}` : 'n/a';
}

function shortRibbonLabel(value: string) {
  return value.replace(/^hyperribbon-long-/, '').replace(/-v\d+$/, '');
}

function storyArtifacts(artifacts: MeasuredArtifact[]) {
  return [...artifacts].sort((left, right) => {
    const rank = (artifact: MeasuredArtifact) => artifact.variant_id === 'distill_accuracy' ? 0 : artifact.variant_id === 'baseline' ? 1 : 2;
    return rank(left) - rank(right);
  });
}

function sampleCurve<T>(curve: T[], maxPoints: number): T[] {
  if (curve.length <= maxPoints) return curve;
  return Array.from({ length: maxPoints }, (_, idx) => {
    const position = Math.round((idx / Math.max(1, maxPoints - 1)) * (curve.length - 1));
    return curve[position];
  });
}

function barPercent(value: unknown, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(2, Math.min(100, (n / max) * 100));
}

const sEmbeddedShell: CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '28px 20px',
};

const sPanelShell: CSSProperties = {
  padding: 18,
};

const sStoryShell: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: 18,
  minHeight: '100%',
  background: 'linear-gradient(180deg, rgba(7, 12, 18, 0.96), rgba(2, 4, 7, 0.98))',
};

const sHeader: CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  marginBottom: 16,
};

const sKicker: CSSProperties = {
  color: '#1edce0',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const sTitle: CSSProperties = {
  margin: '4px 0 0',
  color: '#f8fafc',
  fontSize: 28,
  lineHeight: 1,
};

const sStoryTitle: CSSProperties = {
  margin: '-6px 0 0',
  color: '#f8fafc',
  fontSize: 34,
  lineHeight: 0.95,
};

const sStoryLead: CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.78)',
  fontSize: 14,
  lineHeight: 1.5,
};

const sStoryWin: CSSProperties = {
  padding: '14px 0',
  borderTop: '1px solid rgba(73, 222, 128, 0.34)',
  borderBottom: '1px solid rgba(73, 222, 128, 0.22)',
};

const sStoryWinNumber: CSSProperties = {
  color: '#bbf7d0',
  fontSize: 46,
  fontWeight: 950,
  lineHeight: 0.95,
  marginTop: 8,
};

const sStoryWinCopy: CSSProperties = {
  color: 'rgba(220,252,231,0.80)',
  fontSize: 13,
  lineHeight: 1.45,
  marginTop: 8,
};

const sStoryActions: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 8,
};

const sStoryAction: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 48,
  padding: '10px 12px',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 0,
  background: 'rgba(255,255,255,0.045)',
  color: '#f8fafc',
  cursor: 'pointer',
  textAlign: 'left',
};

const sStoryPrimaryAction: CSSProperties = {
  ...sStoryAction,
  borderColor: 'rgba(73, 222, 128, 0.56)',
  background: 'rgba(73, 222, 128, 0.12)',
};

const sStoryLine: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '7px 12px',
  padding: '10px 0',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(226,232,240,0.66)',
  fontSize: 12,
};

const sIterationPanel: CSSProperties = {
  display: 'grid',
  gap: 9,
  padding: 11,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.035)',
};

const sIterationHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  color: 'rgba(226,232,240,0.68)',
  fontSize: 11,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const sIterationCopy: CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.72)',
  fontSize: 12,
  lineHeight: 1.42,
};

const sCurveRows: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const sCurveRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '34px 1fr 54px',
  gap: 8,
  alignItems: 'center',
};

const sStepLabel: CSSProperties = {
  color: 'rgba(226,232,240,0.58)',
  fontSize: 11,
  fontWeight: 800,
};

const sCurveBars: CSSProperties = {
  display: 'grid',
  gap: 3,
  minWidth: 0,
};

const sBaselineBar: CSSProperties = {
  height: 5,
  background: 'rgba(248, 113, 113, 0.52)',
};

const sDistillBar: CSSProperties = {
  height: 5,
  background: 'rgba(74, 222, 128, 0.74)',
};

const sLiftValue: CSSProperties = {
  color: '#bbf7d0',
  fontSize: 12,
  textAlign: 'right',
};

const sInterventionStrip: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
};

const sInterventionDot: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 24,
  height: 24,
  border: '1px solid rgba(73, 222, 128, 0.38)',
  background: 'rgba(73, 222, 128, 0.10)',
  color: '#bbf7d0',
  fontSize: 10,
  fontWeight: 900,
};

const sStorySwitcher: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 7,
};

const sStoryTab = (active: boolean): CSSProperties => ({
  minHeight: 36,
  padding: '8px 10px',
  border: `1px solid ${active ? 'rgba(30,220,224,0.7)' : 'rgba(255,255,255,0.10)'}`,
  borderRadius: 0,
  background: active ? 'rgba(30,220,224,0.13)' : 'rgba(255,255,255,0.035)',
  color: '#f8fafc',
  textAlign: 'left',
  cursor: 'pointer',
});

const sStoryFinePrint: CSSProperties = {
  marginTop: 'auto',
  paddingTop: 10,
  borderTop: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(226,232,240,0.52)',
  fontSize: 11,
  lineHeight: 1.45,
};

const sPanelTitle: CSSProperties = {
  margin: '6px 0 0',
  color: '#f8fafc',
  fontSize: 20,
  lineHeight: 1.08,
};

const sPrimaryButton: CSSProperties = {
  minHeight: 38,
  padding: '9px 13px',
  border: '1px solid rgba(30,220,224,0.72)',
  borderRadius: 0,
  background: 'rgba(30,220,224,0.16)',
  color: '#f8fafc',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const sSecondaryButton: CSSProperties = {
  ...sPrimaryButton,
  borderColor: 'rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.06)',
};

const sArtifactButton: CSSProperties = {
  display: 'grid',
  gap: 4,
  minHeight: 46,
  padding: '9px 11px',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 0,
  background: 'rgba(255,255,255,0.045)',
  color: '#f8fafc',
  fontSize: 12,
  lineHeight: 1.2,
  textAlign: 'left',
  cursor: 'pointer',
};

const sDisabledButton: CSSProperties = {
  ...sPrimaryButton,
  borderColor: 'rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.035)',
  color: 'rgba(255,255,255,0.42)',
  cursor: 'not-allowed',
};

const sTopGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 10,
  marginBottom: 14,
};

const sMetric: CSSProperties = {
  padding: 12,
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.045)',
};

const sMetricCompact: CSSProperties = {
  ...sMetric,
  padding: 9,
};

const sMetricLabel: CSSProperties = {
  display: 'block',
  color: 'rgba(226,232,240,0.58)',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const sMetricValue: CSSProperties = {
  display: 'block',
  marginTop: 4,
  color: '#f8fafc',
  fontSize: 13,
  lineHeight: 1.25,
};

const sDemoTabs: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 8,
  marginBottom: 14,
};

const sDemoTab = (active: boolean, blocked: boolean): CSSProperties => ({
  minHeight: 68,
  padding: 10,
  border: `1px solid ${active ? '#1edce0' : blocked ? 'rgba(244, 186, 68, 0.36)' : 'rgba(255,255,255,0.11)'}`,
  background: active ? 'rgba(30,220,224,0.14)' : 'rgba(255,255,255,0.04)',
  color: '#f8fafc',
  textAlign: 'left',
  cursor: 'pointer',
});

const sDemoTabMaterial: CSSProperties = {
  display: 'block',
  color: 'rgba(226,232,240,0.82)',
  fontSize: 12,
  lineHeight: 1.25,
};

const sDemoTabLabel: CSSProperties = {
  display: 'block',
  marginTop: 6,
  color: '#f8fafc',
  fontSize: 13,
  lineHeight: 1.2,
  overflowWrap: 'anywhere',
};

const sSelectedLayout: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 12,
};

const sSelectedNarrowLayout: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12,
};

const sRibbonCard: CSSProperties = {
  minWidth: 0,
  padding: 14,
  border: '1px solid rgba(30,220,224,0.24)',
  background: 'linear-gradient(145deg, rgba(30,220,224,0.07), rgba(255,255,255,0.035))',
};

const sViewerCard: CSSProperties = {
  minWidth: 0,
  padding: 14,
  border: '1px solid rgba(125,145,255,0.28)',
  background: 'rgba(255,255,255,0.04)',
};

const sCardTop: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 10,
  color: 'rgba(226,232,240,0.68)',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const sCardTitle: CSSProperties = {
  margin: '10px 0 0',
  color: '#f8fafc',
  fontSize: 22,
  lineHeight: 1.1,
};

const sBodyText: CSSProperties = {
  margin: '10px 0 0',
  color: 'rgba(226,232,240,0.72)',
  fontSize: 13,
  lineHeight: 1.5,
};

const sMetricGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  marginTop: 12,
};

const sWinPanel: CSSProperties = {
  marginTop: 12,
  padding: 11,
  border: '1px solid rgba(73, 222, 128, 0.42)',
  background: 'rgba(73, 222, 128, 0.08)',
};

const sWinTopline: CSSProperties = {
  color: '#bbf7d0',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const sWinMetrics: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  marginTop: 9,
};

const sListBlock: CSSProperties = {
  marginTop: 12,
  paddingTop: 10,
  borderTop: '1px solid rgba(255,255,255,0.08)',
};

const sListTitle: CSSProperties = {
  color: '#1edce0',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const sListTitleWarn: CSSProperties = {
  ...sListTitle,
  color: '#f4ba44',
};

const sList: CSSProperties = {
  display: 'grid',
  gap: 5,
  margin: '8px 0 0',
  paddingLeft: 18,
};

const sListItem: CSSProperties = {
  color: 'rgba(226,232,240,0.72)',
  fontSize: 12,
  lineHeight: 1.35,
};

const sActionStack: CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 14,
};

const sError: CSSProperties = {
  padding: 12,
  border: '1px solid rgba(255,84,114,0.44)',
  background: 'rgba(255,84,114,0.08)',
  color: '#ffd4dc',
  fontSize: 13,
};

const sMuted: CSSProperties = {
  color: 'rgba(226,232,240,0.66)',
  fontSize: 13,
};
