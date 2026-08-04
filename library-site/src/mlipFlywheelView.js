const EVIDENCE_URL = '/reports/assets/mlip/mlip-flywheel-evidence.json';

export function renderMlipFlywheelView(mount) {
  const controller = new AbortController();
  let canvasCleanup = null;

  mount.replaceChildren(
    h('section', { class: 'flywheel-lab fly-loading' },
      h('p', { class: 'fly-kicker' }, 'Library Live Lab'),
      h('h1', {}, 'Loading measured evidence')
    )
  );

  loadEvidence(controller.signal)
    .then(({ evidence, relaxation, liveCampaigns, policyReplays, diagnostics, longDemos, ribbonPrep }) => {
      if (controller.signal.aborted) return;
      const root = renderEvidence(evidence, relaxation, liveCampaigns, policyReplays, diagnostics, longDemos, ribbonPrep);
      mount.replaceChildren(root);
      initStages(root, evidence.stages || []);
      canvasCleanup = initLatticeCanvas(root, relaxation);
    })
    .catch((error) => {
      if (controller.signal.aborted) return;
      mount.replaceChildren(renderEvidenceError(error));
    });

  return () => {
    controller.abort();
    if (typeof canvasCleanup === 'function') canvasCleanup();
  };
}

async function loadEvidence(signal) {
  const evidence = await fetchJson(EVIDENCE_URL, signal);
  const url = evidence?.relaxation_artifact?.url;
  if (!url) throw new Error('Evidence file does not name a relaxation artifact.');
  const campaignDescriptors = Array.isArray(evidence?.campaign_artifacts) && evidence.campaign_artifacts.length
    ? evidence.campaign_artifacts
    : [evidence?.live_campaign_artifact].filter(Boolean);
  const replayDescriptors = Array.isArray(evidence?.policy_replay_artifacts) && evidence.policy_replay_artifacts.length
    ? evidence.policy_replay_artifacts
    : [evidence?.policy_replay_artifact].filter(Boolean);
  const diagnosticDescriptors = Array.isArray(evidence?.diagnostic_artifacts) ? evidence.diagnostic_artifacts : [];
  const longDemoDescriptors = Array.isArray(evidence?.long_demo_artifacts) ? evidence.long_demo_artifacts : [];
  const ribbonPrepDescriptors = Array.isArray(evidence?.long_demo_ribbon_prep_artifacts)
    ? evidence.long_demo_ribbon_prep_artifacts
    : [];
  const [relaxation, liveCampaigns, policyReplays, diagnostics, longDemos, ribbonPrep] = await Promise.all([
    fetchJson(url, signal),
    Promise.all(campaignDescriptors.map(async (descriptor) => ({
      descriptor,
      payload: await loadOptionalJson(descriptor?.url, signal),
    }))),
    Promise.all(replayDescriptors.map(async (descriptor) => ({
      descriptor,
      payload: await loadOptionalJson(descriptor?.url, signal),
    }))),
    Promise.all(diagnosticDescriptors.map(async (descriptor) => ({
      descriptor,
      payload: await loadOptionalJson(descriptor?.url, signal),
    }))),
    Promise.all(longDemoDescriptors.map(async (descriptor) => ({
      descriptor,
      payload: await loadOptionalJson(descriptor?.url, signal),
    }))),
    Promise.all(ribbonPrepDescriptors.map(async (descriptor) => ({
      descriptor,
      payload: await loadOptionalJson(descriptor?.url, signal),
    }))),
  ]);
  assertEvidence(evidence, relaxation);
  return { evidence, relaxation, liveCampaigns, policyReplays, diagnostics, longDemos, ribbonPrep };
}

async function fetchJson(url, signal) {
  const res = await fetch(url, { cache: 'no-cache', signal });
  if (!res.ok) throw new Error(`Evidence fetch failed: ${url}`);
  return res.json();
}

async function loadOptionalJson(url, signal) {
  if (!url) return null;
  try {
    return await fetchJson(url, signal);
  } catch (error) {
    return {
      schema: 'lupine.library.optional_artifact_error.v1',
      url,
      error: error?.message || 'Optional artifact unavailable',
    };
  }
}

function assertEvidence(evidence, relaxation) {
  if (evidence?.schema !== 'lupine.library.mlip_flywheel_evidence.v1') {
    throw new Error('Unexpected flywheel evidence schema.');
  }
  if (relaxation?.schema !== 'lupine.distill.equilibrium_solve_score.v1') {
    throw new Error('Unexpected relaxation score schema.');
  }
  if (!Array.isArray(relaxation?.viewer_artifact?.frames) || relaxation.viewer_artifact.frames.length === 0) {
    throw new Error('Relaxation artifact has no measured viewer frames.');
  }
}

function renderEvidence(evidence, relaxation, liveCampaigns, policyReplays, diagnostics, longDemos, ribbonPrep) {
  const root = h('section', { class: 'flywheel-lab', 'aria-labelledby': 'flywheel-title' });
  root.append(renderWhy(evidence));
  root.append(renderWorkGuidance(evidence.work_guidance));
  root.append(renderHero(evidence, relaxation));
  root.append(renderSubspaceDiagnostics(diagnostics));
  root.append(renderLongDemos(longDemos));
  root.append(renderRibbonPrep(ribbonPrep));
  root.append(renderLiveCampaigns(liveCampaigns));
  root.append(renderPolicyReplays(policyReplays));
  root.append(renderStageSystem(evidence.stages || []));
  root.append(renderBaselineMatrix(evidence.baseline));
  root.append(renderTriplets(evidence.distill_triplets || []));
  root.append(renderEvaluators(evidence.evaluators || []));
  root.append(renderSources(evidence.sources || []));
  return root;
}

function renderSubspaceDiagnostics(diagnostics) {
  const items = Array.isArray(diagnostics) ? diagnostics : [];
  if (!items.length) return document.createDocumentFragment();
  return h('div', { class: 'fly-campaign-stack' },
    ...items.map((item) => renderSubspaceDiagnostic(item.payload, item.descriptor))
  );
}

function renderLongDemos(longDemos) {
  const items = Array.isArray(longDemos) ? longDemos : [];
  if (!items.length) return document.createDocumentFragment();
  return h('div', { class: 'fly-campaign-stack' },
    ...items.map((item) => renderLongDemoRegistry(item.payload, item.descriptor))
  );
}

function renderLongDemoRegistry(registry, descriptor) {
  const isError = registry?.schema === 'lupine.library.optional_artifact_error.v1';
  const demos = Array.isArray(registry?.demos) ? registry.demos : [];
  const claimPolicy = registry?.claim_policy || {};
  const measuredCount = demos.filter((demo) => {
    const science = Array.isArray(demo?.scientific_distill?.measured_artifacts)
      ? demo.scientific_distill.measured_artifacts.length
      : 0;
    const viewer = Array.isArray(demo?.viewer?.measured_artifacts) ? demo.viewer.measured_artifacts.length : 0;
    return science > 0 || viewer > 0;
  }).length;
  return h('section', { class: 'fly-section fly-long-demos', 'aria-labelledby': 'fly-long-demo-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, isError ? 'Demo registry unavailable' : 'Long-horizon demos'),
      h('h2', { id: 'fly-long-demo-title' }, descriptor?.title || 'Distill science and viewer evidence move together.'),
      h('p', {}, descriptor?.description || 'Each demo has a measured scientific lane and a measured viewer lane; planned work is rendered as awaiting evidence, never as a result.')
    ),
    isError
      ? h('p', { class: 'fly-caption' }, registry.error || 'Long-demo artifact unavailable.')
      : [
        h('div', { class: 'fly-live-run-head' },
          h('div', {}, h('span', {}, 'Registry'), h('strong', {}, registry?.registry_id || 'unknown')),
          h('div', {}, h('span', {}, 'Measured demos'), h('strong', {}, `${measuredCount} / ${demos.length}`)),
          h('div', {}, h('span', {}, 'Claim policy'), h('strong', {}, claimPolicy.mock_or_placeholder_allowed === false ? 'no mock artifacts' : 'review required'))
        ),
        renderLongDemoStreams(registry?.workstream_contract),
        h('div', { class: 'fly-long-demo-grid' }, ...demos.map(renderLongDemoCard)),
        h('p', { class: 'fly-caption' }, 'This section is intentionally a work queue until measured artifacts arrive. The viewer will not draw synthetic trajectories or fake reference curves.')
      ]
  );
}

function renderLongDemoStreams(contract) {
  const science = contract?.scientific_distill || {};
  const viewer = contract?.viewer || {};
  return h('div', { class: 'fly-long-streams' },
    renderLongStream('Scientific Distill', science),
    renderLongStream('Viewer', viewer)
  );
}

function renderLongStream(label, stream) {
  const mustEmit = Array.isArray(stream?.must_emit) ? stream.must_emit : [];
  return h('article', { class: 'fly-long-stream' },
    h('span', {}, label),
    h('strong', {}, stream?.owner || 'owner pending'),
    h('p', {}, stream?.responsibility || 'Responsibility is not defined in the registry.'),
    mustEmit.length
      ? h('ul', {}, ...mustEmit.slice(0, 6).map((item) => h('li', {}, item)))
      : null
  );
}

function renderLongDemoCard(demo) {
  const science = demo?.scientific_distill || {};
  const viewer = demo?.viewer || {};
  const gate = demo?.claim_gate || {};
  const scienceArtifacts = Array.isArray(science.measured_artifacts) ? science.measured_artifacts.length : 0;
  const viewerArtifacts = Array.isArray(viewer.measured_artifacts) ? viewer.measured_artifacts.length : 0;
  const measured = scienceArtifacts > 0 && viewerArtifacts > 0;
  const metrics = Array.isArray(science.primary_metrics) ? science.primary_metrics.slice(0, 5) : [];
  return h('article', { class: `fly-long-demo ${measured ? 'measured' : 'awaiting'}` },
    h('div', { class: 'fly-live-pair-top' },
      h('span', {}, demo?.demo_class || 'demo'),
      h('strong', {}, demo?.primary_material_id || 'material pending')
    ),
    h('h3', {}, demo?.title || 'Untitled demo'),
    h('p', { class: 'fly-long-why' }, demo?.why_we_care || ''),
    h('dl', { class: 'fly-long-status' },
      stat('Distill science', science.status || 'awaiting'),
      stat('Viewer', viewer.status || 'awaiting'),
      stat('Science artifacts', String(scienceArtifacts)),
      stat('Viewer artifacts', String(viewerArtifacts)),
      stat('Claim', gate.scientific_claim_allowed || gate.viewer_claim_allowed ? 'review' : 'not yet'),
      stat('Next evidence', gate.next_evidence_step || 'lock measured artifact')
    ),
    metrics.length
      ? h('div', { class: 'fly-long-metrics' },
        h('span', {}, 'Primary metrics'),
        h('ul', {}, ...metrics.map((metric) => h('li', {}, metric)))
      )
      : null
  );
}

function renderRibbonPrep(ribbonPrep) {
  const items = Array.isArray(ribbonPrep) ? ribbonPrep : [];
  if (!items.length) return document.createDocumentFragment();
  return h('div', { class: 'fly-campaign-stack' },
    ...items.map((item) => renderRibbonPrepArtifact(item.payload, item.descriptor))
  );
}

function renderRibbonPrepArtifact(prep, descriptor) {
  const isError = prep?.schema === 'lupine.library.optional_artifact_error.v1';
  const ribbons = Array.isArray(prep?.ribbons) ? prep.ribbons : [];
  const shadowReady = ribbons.filter((ribbon) => String(ribbon.status || '').includes('ready_for_local_shadow_run')).length;
  const referenceBlocked = ribbons.filter((ribbon) => String(ribbon.status || '').includes('reference_required')).length;
  return h('section', { class: 'fly-section fly-ribbon-prep', 'aria-labelledby': 'fly-ribbon-prep-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, isError ? 'Ribbon prep unavailable' : 'Ribbon prep'),
      h('h2', { id: 'fly-ribbon-prep-title' }, descriptor?.title || 'Prep the ribbons before the run.'),
      h('p', {}, descriptor?.description || 'Each long demo declares what Distill may correct, what it must refuse, and what the viewer may show.')
    ),
    isError
      ? h('p', { class: 'fly-caption' }, prep.error || 'Ribbon prep artifact unavailable.')
      : [
        h('div', { class: 'fly-live-run-head' },
          h('div', {}, h('span', {}, 'Prep'), h('strong', {}, prep?.prep_id || 'unknown')),
          h('div', {}, h('span', {}, 'Shadow-ready'), h('strong', {}, `${shadowReady} / ${ribbons.length}`)),
          h('div', {}, h('span', {}, 'Reference blocked'), h('strong', {}, `${referenceBlocked}`))
        ),
        h('div', { class: 'fly-ribbon-principles' },
          ...(Array.isArray(prep?.shared_ribbon_principles) ? prep.shared_ribbon_principles.slice(0, 5).map((item) => h('p', {}, item)) : [])
        ),
        h('div', { class: 'fly-ribbon-prep-grid' }, ...ribbons.map(renderRibbonPrepCard)),
        h('p', { class: 'fly-caption' }, 'These are run gates, not measured results. Active correction stays blocked until the listed references and support/eval splits are locked.')
      ]
  );
}

function renderRibbonPrepCard(ribbon) {
  const science = ribbon?.science_contract || {};
  const policy = ribbon?.ribbon_policy || {};
  const viewer = ribbon?.viewer_contract || {};
  const acceptance = science.acceptance_gate || {};
  const refusal = Array.isArray(science.refusal_triggers) ? science.refusal_triggers.slice(0, 5) : [];
  const layers = Array.isArray(viewer.required_layers) ? viewer.required_layers.slice(0, 5) : [];
  return h('article', { class: `fly-ribbon-card ${String(ribbon?.status || '').includes('reference_required') ? 'blocked' : 'ready'}` },
    h('div', { class: 'fly-live-pair-top' },
      h('span', {}, ribbon?.status || 'prep'),
      h('strong', {}, ribbon?.material_id || 'material')
    ),
    h('h3', {}, ribbon?.ribbon_id || 'ribbon pending'),
    h('p', { class: 'fly-long-why' }, science.primary_question || ''),
    h('dl', { class: 'fly-ribbon-limits' },
      stat('Mode', policy.mode || 'n/a'),
      stat('Accuracy gate', formatPercent(acceptance.min_paired_accuracy_lift_fraction)),
      stat('Stiff drift max', formatPercent(acceptance.max_stiff_axis_drift_fraction)),
      stat('Intervention max', formatPercent(acceptance.max_intervention_rate)),
      stat('Projection max', formatMetric(policy.max_projection_distance_proxy)),
      stat('Reference lock', science.reference_lock?.required_before_active_correction ? 'required' : 'review')
    ),
    h('div', { class: 'fly-ribbon-two-col' },
      h('div', {},
        h('span', {}, 'Refuse if'),
        refusal.length ? h('ul', {}, ...refusal.map((item) => h('li', {}, item))) : h('p', {}, 'No refusal triggers listed.')
      ),
      h('div', {},
        h('span', {}, 'Viewer layers'),
        layers.length ? h('ul', {}, ...layers.map((item) => h('li', {}, item))) : h('p', {}, 'No viewer layers listed.')
      )
    )
  );
}

function renderSubspaceDiagnostic(diagnostic, descriptor) {
  const isError = diagnostic?.schema === 'lupine.library.optional_artifact_error.v1';
  const summary = diagnostic?.summary || {};
  const cells = Array.isArray(diagnostic?.cells) ? diagnostic.cells : [];
  const energyCells = cells.filter((cell) => cell.row_id === 'energy_volume');
  const titleId = `fly-subspace-title-${slug(descriptor?.source_id || diagnostic?.campaign_id || 'diagnostic')}`;
  return h('section', { class: 'fly-section fly-subspace-diagnostic', 'aria-labelledby': titleId },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, isError ? 'Diagnostic unavailable' : 'Spectral v4 diagnostic'),
      h('h2', { id: titleId }, descriptor?.title || 'Residual concentration in the orthogonal complement'),
      h('p', {}, descriptor?.description || 'Offline replay diagnostic over completed artifacts; it measures whether the correction signal is concentrated away from the stiff feature axis.')
    ),
    isError
      ? h('p', { class: 'fly-caption' }, diagnostic.error || 'Diagnostic artifact unavailable.')
      : [
        h('div', { class: 'fly-live-run-head' },
          h('div', {}, h('span', {}, 'Verdict'), h('strong', {}, String(summary.verdict || 'awaiting').replace(/_/g, ' '))),
          h('div', {}, h('span', {}, 'Mean complement'), h('strong', {}, formatPercent(summary.mean_complement_residual_fraction))),
          h('div', {}, h('span', {}, 'Mean stiff axis'), h('strong', {}, formatPercent(summary.mean_stiff_axis_residual_fraction)))
        ),
        h('dl', { class: 'fly-live-run-stats' },
          stat('Measured cells', `${summary.cells_measured ?? 0} / ${summary.cells_total ?? 0}`),
          stat('Complement supported', `${summary.cells_complement_supported ?? 0}`),
          stat('Stiff dominated', `${summary.cells_stiff_dominated ?? 0}`),
          stat('Basis', diagnostic?.basis_space || 'feature')
        ),
        h('div', { class: 'fly-subspace-breakthrough' },
          h('strong', {}, 'Breakthrough signal'),
          h('p', {}, energyCells.length
            ? `Energy-volume is ${energyCells.map((cell) => `${cell.mlip_id} ${formatPercent(cell.complement_residual_fraction)}`).join(', ')} complement-heavy across the measured MLIP canary.`
            : 'Energy-volume complement concentration has not been measured in this artifact.')
        ),
        h('div', { class: 'fly-subspace-grid' }, ...cells.map(renderSubspaceCell)),
        h('p', { class: 'fly-caption' }, 'This is a replay diagnostic over completed baseline artifacts, not a new cloud claim. It is the spend gate for projected-ribbon v4.')
      ]
  );
}

function renderSubspaceCell(cell) {
  const complement = Number(cell.complement_residual_fraction);
  const stiff = Number(cell.stiff_axis_residual_fraction);
  const complementHeavy = Number.isFinite(complement) && complement >= 0.5;
  return h('article', { class: `fly-subspace-cell ${complementHeavy ? 'complement' : 'stiff'}` },
    h('div', { class: 'fly-live-pair-top' },
      h('span', {}, cell.row_id || 'row'),
      h('strong', {}, cell.mlip_id || 'mlip')
    ),
    h('dl', {},
      stat('Complement', formatPercent(complement)),
      stat('Stiff axis', formatPercent(stiff)),
      stat('Projected lift', formatPercent(cell.projected_support_lift_fraction)),
      stat('Projection distance', formatMetric(cell.projection_distance_proxy))
    ),
    h('small', {}, String(cell.status || 'unknown').replace(/_/g, ' '))
  );
}

function renderPolicyReplays(policyReplays) {
  const items = Array.isArray(policyReplays) ? policyReplays : [];
  if (!items.length) return document.createDocumentFragment();
  return h('div', { class: 'fly-campaign-stack' },
    ...items.map((item) => renderPolicyReplay(item.payload, item.descriptor))
  );
}

function renderLiveCampaigns(liveCampaigns) {
  const items = Array.isArray(liveCampaigns) ? liveCampaigns : [];
  if (!items.length) return document.createDocumentFragment();
  return h('div', { class: 'fly-campaign-stack' },
    ...items.map((item) => renderLiveCampaign(item.payload, item.descriptor))
  );
}

function renderPolicyReplay(policyReplay, descriptor) {
  if (!descriptor && !policyReplay) return document.createDocumentFragment();
  const summary = policyReplay?.summary || {};
  const pairs = Array.isArray(policyReplay?.pairs) ? policyReplay.pairs : [];
  const eligible = summary.flagship_eligible === true;
  const isError = policyReplay?.schema === 'lupine.library.optional_artifact_error.v1';
  const title = descriptor?.title || 'Local policy replay gate';
  return h('section', { class: `fly-section fly-policy-replay ${eligible ? 'eligible' : 'blocked'}`, 'aria-labelledby': 'fly-policy-replay-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, isError ? 'Replay unavailable' : eligible ? 'Candidate proof gate' : 'Replay blocked'),
      h('h2', { id: 'fly-policy-replay-title' }, title),
      h('p', {}, descriptor?.description || 'Replay runs completed cloud predictions through the local Rust policy before spending on another Cloud Run image.')
    ),
    isError
      ? h('p', { class: 'fly-caption' }, policyReplay.error || 'Replay artifact unavailable.')
      : [
        h('div', { class: 'fly-live-run-head' },
          h('div', {}, h('span', {}, 'Scope'), h('strong', {}, policyReplay?.scope || 'unknown')),
          h('div', {}, h('span', {}, 'Status'), h('strong', {}, String(summary.status || 'awaiting').replace(/_/g, ' '))),
          h('div', {}, h('span', {}, 'Mean lift'), h('strong', {}, formatPercent(summary.mean_lift_fraction)))
        ),
        h('dl', { class: 'fly-live-run-stats' },
          stat('Pairs', `${summary.pairs_measured ?? 0} / ${summary.pairs_total ?? 0}`),
          stat('Improved', `${summary.pairs_improved ?? 0}`),
          stat('Regressed', `${summary.pairs_regressed ?? 0}`),
          stat('Unchanged', `${summary.pairs_unchanged ?? 0}`),
          stat('Cloud claim', 'not yet'),
          stat('Next', eligible ? 'rebuild canary' : 'revise policy')
        ),
        h('div', { class: 'fly-live-pair-grid' }, ...pairs.map(renderReplayPair)),
        h('p', { class: 'fly-caption' }, summary.next_action || 'Replay is a spend gate, not a final claim.')
      ]
  );
}

function renderEvidenceError(error) {
  return h('section', { class: 'flywheel-lab' },
    h('article', { class: 'fly-section' },
      h('p', { class: 'fly-kicker' }, 'Evidence unavailable'),
      h('h1', { class: 'fly-error-title' }, 'No visual rendered'),
      h('p', {}, error?.message || 'The MLIP flywheel evidence artifact could not be loaded.')
    )
  );
}

function renderWhy(evidence) {
  const why = evidence.why || {};
  const points = why.supporting_points || [];
  return h('header', { class: 'fly-why' },
    h('div', { class: 'fly-why-main' },
      h('p', { class: 'fly-kicker' }, 'Why this matters'),
      h('h1', { id: 'flywheel-title' }, why.headline || evidence.title || 'MLIP Flywheel Visual Review'),
      h('p', { class: 'fly-why-answer' }, why.answer || evidence.subtitle || ''),
      h('div', { class: 'fly-decision' },
        h('span', {}, 'Decision'),
        h('strong', {}, why.decision || 'Review measured evidence before claiming promotion.')
      )
    ),
    h('div', { class: 'fly-why-points' },
      ...points.map((point) => h('article', { class: 'fly-why-point' },
        h('span', {}, point.label),
        h('strong', {}, point.metric),
        h('p', {}, point.detail),
        point.source_id ? h('small', {}, point.source_id) : null
      ))
    )
  );
}

function renderWorkGuidance(guidance) {
  if (!guidance) return document.createDocumentFragment();
  const moves = guidance.next_moves || [];
  return h('section', { class: 'fly-section fly-work-guidance', 'aria-labelledby': 'fly-work-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, 'How this guides the work'),
      h('h2', { id: 'fly-work-title' }, guidance.headline || 'Use evidence gaps as the work queue.'),
      h('p', {}, guidance.principle || 'Every task needs a claim and a proof gate before it graduates.')
    ),
    h('div', { class: 'fly-work-grid' }, ...moves.map(renderWorkMove))
  );
}

function renderWorkMove(move) {
  return h('article', { class: 'fly-work-card' },
    h('div', { class: 'fly-work-card-head' },
      h('span', { class: 'fly-work-priority' }, move.priority || 'Next'),
      h('span', { class: 'fly-work-state' }, move.state || 'planned')
    ),
    h('h3', {}, move.title || 'Untitled work item'),
    h('dl', { class: 'fly-work-claims' },
      stat('why', move.why),
      stat('claim unlocked', move.claim_unlocked),
      stat('proof required', move.proof_required),
      stat('owner', move.owner)
    )
  );
}

function renderHero(evidence, relaxation) {
  const summary = evidence.summary || {};
  const score = relaxation.score || {};
  const viewer = relaxation.viewer_artifact || {};
  const frames = viewer.frames || [];
  const first = frames[0] || {};
  const last = frames[frames.length - 1] || {};

  const hero = h('header', { class: 'fly-hero' });
  const copy = h('div', { class: 'fly-hero-copy' },
    h('p', { class: 'fly-kicker' }, 'Evidence cockpit'),
    h('h2', {}, evidence.title || 'MLIP Flywheel Visual Review'),
    h('p', { class: 'fly-lede' }, 'The exhibits below are organized as evidence: measured baseline, measured Distill triplets, measured relaxation trajectory, then evaluator status.'),
    h('div', { class: 'fly-actions' },
      h('a', { class: 'fly-button primary', href: '#/read/mlip-cloud-baseline-distill' }, 'Baseline report'),
      h('a', { class: 'fly-button', href: '#/read/mlip-flywheel-readiness' }, 'Readiness notes')
    ),
    h('dl', { class: 'fly-statline' },
      stat('Baseline', `${summary.baseline_cells_completed} / ${summary.baseline_cells_total}`),
      stat('Distill evidence', `${summary.numeric_distill_triplets} numeric triplets`),
      stat('Promoted', `${summary.promoted_accuracy_cells} accuracy wins`),
      stat('Cloud confirmed', `${summary.cloud_confirmed_distill_cells || 0} Distill cell`),
      stat('Claim status', summary.claim_status)
    )
  );

  const visual = h('div', { class: 'fly-visual-panel' },
    h('div', { class: 'fly-visual-head' },
      h('span', {}, 'Measured offset relaxation'),
      h('span', { class: 'fly-mode-label' }, `${relaxation.mlip_id} ${relaxation.material_id}`)
    ),
    h('canvas', {
      class: 'fly-lattice',
      width: '900',
      height: '520',
      'aria-label': 'Measured CHGNet Al-fcc relaxation frames',
    }),
    h('div', { class: 'fly-live-metrics' },
      h('span', {}, 'frame step ', h('strong', { 'data-live': 'step' }, String(first.step ?? 0))),
      h('span', {}, 'closeness ', h('strong', { 'data-live': 'closeness' }, formatPercent(first.closeness))),
      h('span', {}, 'force max ', h('strong', { 'data-live': 'force' }, formatForce(first.force_max_norm_ev_per_angstrom)))
    ),
    h('div', { class: 'fly-relax-summary' },
      stat('start distance', formatMetric(score.start_distance)),
      stat('final distance', formatMetric(score.final_distance)),
      stat('force calls', String(score.force_calls)),
      stat('elapsed', `${formatMetric(score.elapsed_seconds)} s`)
    ),
    h('p', { class: 'fly-mode-note' },
      `Actual artifact ${relaxation.run_id}: ${frames.length} recorded viewer frames, step ${first.step ?? 0} to ${last.step ?? 'n/a'}, verdict ${score.verdict || 'unknown'}.`
    ),
    renderCurve(relaxation.anytime_curve || [])
  );

  hero.append(copy, visual);
  return hero;
}

function renderStageSystem(stages) {
  return h('section', { class: 'fly-section fly-stages', 'aria-labelledby': 'fly-stage-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, 'Stage comprehension'),
      h('h2', { id: 'fly-stage-title' }, 'Every stage is evidence-backed or explicitly not claimed.'),
      h('p', {}, 'The view separates quantitative signals from qualitative judgments so planned work cannot masquerade as measured improvement.')
    ),
    h('div', { class: 'fly-stage-layout' },
      h('div', { class: 'fly-stage-rail', role: 'tablist', 'aria-label': 'Run stages' },
        ...stages.map((stage, index) => stageButton(stage, index === 0))
      ),
      h('div', { class: 'fly-stage-detail', 'data-stage-detail': '' })
    )
  );
}

function renderBaselineMatrix(baseline) {
  const rows = baseline?.rows || [];
  const mlips = baseline?.mlips || [];
  const cells = baseline?.cells || [];
  const grid = h('div', { class: 'fly-matrix-grid', role: 'table', 'aria-label': 'MLIP baseline grid' });

  grid.append(h('div', { class: 'fly-matrix-corner', role: 'columnheader' }, 'Row / MLIP'));
  for (const mlip of mlips) grid.append(h('div', { class: 'fly-matrix-head', role: 'columnheader' }, mlip.label));

  for (const row of rows) {
    grid.append(h('div', { class: 'fly-matrix-rowhead', role: 'rowheader' },
      h('strong', {}, row.label),
      h('span', {}, row.unit)
    ));
    const ranked = rankRow(row, mlips, cells);
    for (const mlip of mlips) {
      const value = cellValue(cells, row.id, mlip.id);
      const rank = ranked.findIndex((item) => item.mlip_id === mlip.id) + 1;
      const good = rowGoodness(row, mlips, cells, value);
      grid.append(h('div', {
        class: `fly-matrix-cell${rank === 1 ? ' winner' : ''}`,
        role: 'cell',
        style: `--good-alpha:${(good * 0.34).toFixed(3)};--bad-alpha:${((1 - good) * 0.22).toFixed(3)}`,
        title: `${mlip.label} ${row.label}: ${formatMetric(value)} ${row.unit}`,
      },
        h('strong', {}, formatMetric(value)),
        h('span', {}, rank === 1 ? 'best row' : `rank ${rank}`)
      ));
    }
  }

  return h('section', { class: 'fly-section fly-matrix', 'aria-labelledby': 'fly-matrix-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, 'Quantitative baseline'),
      h('h2', { id: 'fly-matrix-title' }, 'The 5x5 plane is measured cloud evidence.'),
      h('p', {}, 'Lower is better in every cell. Stress and elastic use log-scaled color because their outliers are orders of magnitude apart.')
    ),
    grid,
    h('p', { class: 'fly-caption' }, baseline?.read || '')
  );
}

function renderLiveCampaign(liveCampaign, descriptor) {
  if (!descriptor && !liveCampaign) return document.createDocumentFragment();
  const summary = liveCampaign?.summary || {};
  const gate = summary.promotion_gate || {};
  const pairs = Array.isArray(liveCampaign?.pairs) ? liveCampaign.pairs : [];
  const measurable = pairs.filter((pair) => ['distill_improved', 'distill_regressed', 'unchanged'].includes(pair.verdict));
  const blocked = String(gate.status || '').startsWith('blocked');
  const eligible = gate.flagship_eligible === true;
  const gateLabel = blocked ? 'Rejected candidate' : eligible ? 'Flagship candidate' : 'Live campaign';
  const headline = liveCampaign?.schema === 'lupine.library.mlip_paired_accuracy_live_summary.v1'
    ? `${summary.cells_completed || 0} / ${summary.cells_total || 0} cloud cells returned`
    : 'Live campaign status artifact not yet available';
  const titleId = `fly-live-campaign-title-${slug(liveCampaign?.campaign_id || descriptor?.campaign_id || 'pending')}`;

  return h('section', { class: `fly-section fly-live-campaign ${blocked ? 'blocked' : eligible ? 'eligible' : 'pending'}`, 'aria-labelledby': titleId },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, gateLabel),
      h('h2', { id: titleId }, descriptor?.title || 'Paired accuracy campaign'),
      h('p', {}, descriptor?.description || 'Live campaign evidence is collected directly from GCS cell artifacts.')
    ),
    h('div', { class: 'fly-live-run-head' },
      h('div', {},
        h('span', {}, 'Run'),
        h('strong', {}, liveCampaign?.campaign_id || descriptor?.campaign_id || 'pending')
      ),
      h('div', {},
        h('span', {}, 'Status'),
        h('strong', {}, headline)
      ),
      h('div', {},
        h('span', {}, 'Promotion'),
        h('strong', {}, String(gate.status || summary.campaign_verdict || 'awaiting_gate').replace(/_/g, ' '))
      )
    ),
    h('dl', { class: 'fly-live-run-stats' },
      stat('Completed', `${summary.cells_completed ?? 0}`),
      stat('Failed', `${summary.cells_failed ?? 0}`),
      stat('Missing', `${summary.cells_missing ?? summary.cells_total ?? 0}`),
      stat('Measured pairs', `${summary.pairs_measured ?? 0}`),
      stat('Improved pairs', `${summary.pairs_improved ?? 0}`),
      stat('Regressed pairs', `${summary.pairs_regressed ?? 0}`),
      stat('Unchanged pairs', `${summary.pairs_unchanged ?? 0}`),
      stat('Flagship', eligible ? 'eligible' : 'blocked')
    ),
    blocked ? renderPromotionBlocker(gate) : null,
    h('div', { class: 'fly-live-pair-grid' },
      ...pairs.slice(0, 25).map(renderLivePair)
    ),
    measurable.length === 0
      ? h('p', { class: 'fly-caption' }, 'No paired accuracy deltas are claimed until both baseline and Distill artifacts exist for the same row and MLIP.')
      : h('p', { class: 'fly-caption' }, blocked
        ? `${measurable.length} paired deltas are measured, but this ribbon is blocked from flagship claims.`
        : `${measurable.length} paired deltas are now claim-grade because both artifacts are present.`)
  );
}

function renderPromotionBlocker(gate) {
  const failures = Array.isArray(gate.failed_conditions) ? gate.failed_conditions : [];
  return h('article', { class: 'fly-live-blocker' },
    h('strong', {}, 'Do not launch this as the accuracy result.'),
    h('p', {}, gate.next_action || 'Reject this ribbon for flagship claims and rerun a gated canary.'),
    failures.length ? h('ul', {}, ...failures.map((failure) => h('li', {}, failure))) : null
  );
}

function renderLivePair(pair) {
  const tone = pair.verdict === 'distill_improved' ? 'good' : pair.verdict === 'distill_regressed' ? 'bad' : 'pending';
  const lift = Number(pair.lift_fraction);
  return h('article', { class: `fly-live-pair ${tone}` },
    h('div', { class: 'fly-live-pair-top' },
      h('span', {}, pair.row_label || pair.row_id),
      h('strong', {}, pair.mlip_id)
    ),
    h('dl', {},
      stat('Baseline', formatMetric(pair.baseline_error)),
      stat('Distill', formatMetric(pair.distill_error)),
      stat('Lift', Number.isFinite(lift) ? formatPercent(lift) : 'n/a')
    ),
    h('small', {}, String(pair.verdict || 'awaiting_pair').replace(/_/g, ' '))
  );
}

function renderReplayPair(pair) {
  const tone = pair.verdict === 'distill_improved' ? 'good' : pair.verdict === 'distill_regressed' ? 'bad' : 'pending';
  const lift = Number(pair.lift_fraction);
  return h('article', { class: `fly-live-pair ${tone}` },
    h('div', { class: 'fly-live-pair-top' },
      h('span', {}, pair.row_label || pair.row_id),
      h('strong', {}, pair.mlip_id)
    ),
    h('dl', {},
      stat('Baseline', formatMetric(pair.baseline_error)),
      stat('Replay', formatMetric(pair.replayed_distill_error)),
      stat('Lift', Number.isFinite(lift) ? formatPercent(lift) : 'n/a')
    ),
    h('small', {}, String(pair.verdict || 'awaiting_pair').replace(/_/g, ' '))
  );
}

function renderTriplets(triplets) {
  return h('section', { class: 'fly-section fly-triplets', 'aria-labelledby': 'fly-triplet-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, 'Accuracy hill climb'),
      h('h2', { id: 'fly-triplet-title' }, 'Only numeric triplets are rendered.'),
      h('p', {}, 'The blocked stress cell is displayed with the same prominence as the energy wins because refusal is part of the scientific result.')
    ),
    h('div', { class: 'fly-triplet-list' }, ...triplets.map(renderTriplet))
  );
}

function renderEvaluators(evaluators) {
  return h('section', { class: 'fly-section fly-evals', 'aria-labelledby': 'fly-eval-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, 'Quant plus qual evaluators'),
      h('h2', { id: 'fly-eval-title' }, 'Evaluator status is not inflated.'),
      h('p', {}, 'Each evaluator card states whether it is runtime evidence, Phoenix work, or a not-claimed metric.')
    ),
    h('div', { class: 'fly-eval-grid' }, ...evaluators.map(renderEvaluator)),
    h('div', { class: 'fly-principle' },
      h('strong', {}, 'No mock policy:'),
      h('span', {}, ' this page renders measured artifacts, named sources, or explicit non-claims only.')
    )
  );
}

function renderSources(sources) {
  return h('section', { class: 'fly-section fly-sources', 'aria-labelledby': 'fly-source-title' },
    h('div', { class: 'fly-section-head' },
      h('p', { class: 'fly-kicker' }, 'Evidence sources'),
      h('h2', { id: 'fly-source-title' }, 'Provenance stays visible.')
    ),
    h('div', { class: 'fly-source-list' },
      ...sources.map((source) => h('article', { class: 'fly-source' },
        h('h3', {}, source.id),
        h('p', {}, source.description || ''),
        source.path ? h('code', {}, source.path) : null,
        ...(Array.isArray(source.paths) ? source.paths.map((path) => h('code', {}, path)) : [])
      ))
    )
  );
}

function renderTriplet(triplet) {
  const accel = Number(triplet.distill_accuracy_accelerate);
  const hasAccel = Number.isFinite(accel);
  const max = Math.max(triplet.baseline, triplet.distill_accuracy, ...(hasAccel ? [accel] : []));
  const promoted = String(triplet.verdict || '').startsWith('promote');
  const barItems = [
    ['Baseline', triplet.baseline, triplet.baseline / max, 'base'],
    ['Distill Accuracy', triplet.distill_accuracy, triplet.distill_accuracy / max, triplet.distill_accuracy <= triplet.baseline ? 'good' : 'bad'],
  ];
  if (hasAccel) {
    barItems.push(['Accuracy + Accelerate', accel, accel / max, accel <= triplet.baseline ? 'good' : 'bad']);
  }
  return h('article', { class: `fly-triplet ${promoted ? 'promoted' : 'blocked'}` },
    h('div', { class: 'fly-triplet-head' },
      h('h3', {}, triplet.label),
      h('span', {}, triplet.verdict.replace(/_/g, ' '))
    ),
    bars(barItems),
    h('p', {}, triplet.note)
  );
}

function renderEvaluator(item) {
  return h('article', { class: `fly-eval ${item.kind}` },
    h('div', { class: 'fly-eval-top' },
      h('span', {}, item.kind),
      h('span', {}, item.state)
    ),
    h('h3', {}, item.name),
    h('p', {}, item.target),
    h('small', {}, item.owner)
  );
}

function renderCurve(points) {
  if (!points.length) return null;
  const w = 560;
  const hgt = 130;
  const pad = 18;
  const maxStep = Math.max(...points.map((p) => Number(p.step) || 0), 1);
  const values = points.map((p) => Number(p.closeness) || 0);
  const minV = Math.min(...values);
  const maxV = Math.max(...values, minV + 0.001);
  const coords = points.map((p) => {
    const x = pad + ((Number(p.step) || 0) / maxStep) * (w - pad * 2);
    const y = hgt - pad - (((Number(p.closeness) || 0) - minV) / (maxV - minV)) * (hgt - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return h('figure', { class: 'fly-curve' },
    svg('svg', { viewBox: `0 0 ${w} ${hgt}`, role: 'img', 'aria-label': 'Measured closeness curve' },
      svg('polyline', { points: coords, fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ...points.map((p) => {
        const [x, y] = coords.split(' ')[points.indexOf(p)].split(',');
        return svg('circle', { cx: x, cy: y, r: '4' });
      })
    ),
    h('figcaption', {}, 'Measured closeness over recorded force-call checkpoints.')
  );
}

function bars(items) {
  const wrap = h('div', { class: 'fly-bars' });
  for (const [label, value, width, tone] of items) {
    wrap.append(h('div', { class: `fly-bar ${tone}` },
      h('span', { class: 'fly-bar-label' }, label),
      h('span', { class: 'fly-bar-track' }, h('i', { style: `width:${Math.max(4, width * 100).toFixed(1)}%` })),
      h('span', { class: 'fly-bar-value' }, formatMetric(value))
    ));
  }
  return wrap;
}

function initStages(root, stages) {
  const detail = root.querySelector('[data-stage-detail]');
  const buttons = Array.from(root.querySelectorAll('[data-stage]'));
  const show = (id) => {
    const stage = stages.find((item) => item.id === id) || stages[0];
    if (!stage) return;
    for (const button of buttons) {
      const active = button.dataset.stage === stage.id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    detail.replaceChildren(
      h('p', { class: 'fly-stage-state' }, stage.state),
      h('h3', {}, stage.label),
      h('dl', { class: 'fly-stage-signal' },
        h('div', {}, h('dt', {}, 'Quant signal'), h('dd', {}, stage.quant)),
        h('div', {}, h('dt', {}, 'Qual judgment'), h('dd', {}, stage.qual))
      ),
      h('ul', { class: 'fly-evidence-list' }, ...(stage.evidence || []).map((item) => h('li', {}, item)))
    );
  };
  buttons.forEach((button) => button.addEventListener('click', () => show(button.dataset.stage)));
  if (stages.length) show(stages[0].id);
}

function stageButton(stage, active = false) {
  return h('button', {
    type: 'button',
    class: `fly-stage-button${active ? ' active' : ''}`,
    'data-stage': stage.id,
    role: 'tab',
    'aria-selected': active ? 'true' : 'false',
  },
    h('span', {}, stage.label),
    h('small', {}, stage.state)
  );
}

function initLatticeCanvas(root, relaxation) {
  const canvas = root.querySelector('.fly-lattice');
  const ctx = canvas?.getContext?.('2d', { alpha: true });
  const frames = relaxation?.viewer_artifact?.frames || [];
  if (!canvas || !ctx || !frames.length) return null;

  const allPositions = frames.flatMap((frame) => frame.positions_angstrom || []);
  const projection = createProjection(allPositions, frames);
  const finalFrame = frames[frames.length - 1];
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let dpr = 1;
  let width = 0;
  let height = 0;
  let raf = 0;
  let frameIndex = reduceMotion ? frames.length - 1 : 0;
  let lastAdvance = 0;
  const live = {
    step: root.querySelector('[data-live="step"]'),
    closeness: root.querySelector('[data-live="closeness"]'),
    force: root.querySelector('[data-live="force"]'),
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(300, Math.floor(rect.width));
    height = Math.max(230, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(frames[frameIndex]);
  };

  function loop(now) {
    if (!reduceMotion && now - lastAdvance > 900) {
      frameIndex = (frameIndex + 1) % frames.length;
      lastAdvance = now;
    }
    draw(frames[frameIndex]);
    raf = requestAnimationFrame(loop);
  }

  function draw(frame) {
    drawGround(ctx, width, height);
    drawCell(ctx, frame, projection, width, height);
    drawFinalGhost(ctx, finalFrame, projection, width, height);
    drawNearestNeighborGraph(ctx, frame, projection, width, height);
    drawAtoms(ctx, frame, projection, width, height);
    live.step.textContent = String(frame.step ?? 0);
    live.closeness.textContent = formatPercent(frame.closeness);
    live.force.textContent = formatForce(frame.force_max_norm_ev_per_angstrom);
  }

  resize();
  raf = requestAnimationFrame(loop);
  window.addEventListener('resize', resize, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}

function createProjection(positions, frames) {
  const points = [];
  for (const pos of positions) points.push(toIso(pos));
  for (const frame of frames) {
    for (const corner of cellCorners(frame.cell_angstrom || [])) points.push(toIso(corner));
  }
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  return { minX, maxX, minY, maxY };
}

function project(pos, projection, width, height) {
  const p = toIso(pos);
  const pad = Math.min(width, height) * 0.11;
  const sx = (width - pad * 2) / Math.max(0.001, projection.maxX - projection.minX);
  const sy = (height - pad * 2) / Math.max(0.001, projection.maxY - projection.minY);
  const scale = Math.min(sx, sy);
  const x = width * 0.5 + (p.x - (projection.minX + projection.maxX) / 2) * scale;
  const y = height * 0.52 + (p.y - (projection.minY + projection.maxY) / 2) * scale;
  return { x, y, z: Number(pos[2]) || 0, r: Math.max(4, scale * 0.055) };
}

function toIso(pos) {
  const x = Number(pos[0]) || 0;
  const y = Number(pos[1]) || 0;
  const z = Number(pos[2]) || 0;
  return { x: x - y * 0.34, y: (x + y) * 0.12 + z * 0.72 };
}

function drawGround(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(9, 12, 22, 0.98)');
  gradient.addColorStop(0.55, 'rgba(18, 20, 46, 0.92)');
  gradient.addColorStop(1, 'rgba(6, 7, 13, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawCell(ctx, frame, projection, width, height) {
  const corners = cellCorners(frame.cell_angstrom || []).map((pos) => project(pos, projection, width, height));
  if (corners.length !== 8) return;
  const edges = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 215, 227, 0.16)';
  ctx.lineWidth = 1;
  for (const [a, b] of edges) {
    ctx.beginPath();
    ctx.moveTo(corners[a].x, corners[a].y);
    ctx.lineTo(corners[b].x, corners[b].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFinalGhost(ctx, frame, projection, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 215, 227, 0.24)';
  ctx.lineWidth = 1;
  for (const pos of frame.positions_angstrom || []) {
    const p = project(pos, projection, width, height);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 1.45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNearestNeighborGraph(ctx, frame, projection, width, height) {
  const positions = frame.positions_angstrom || [];
  const threshold = estimateNeighborThreshold(positions);
  ctx.save();
  ctx.strokeStyle = 'rgba(78, 205, 196, 0.26)';
  ctx.lineWidth = 1.15;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (distance3(positions[i], positions[j]) > threshold) continue;
      const a = project(positions[i], projection, width, height);
      const b = project(positions[j], projection, width, height);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawAtoms(ctx, frame, projection, width, height) {
  const points = (frame.positions_angstrom || [])
    .map((pos) => project(pos, projection, width, height))
    .sort((a, b) => a.y - b.y);
  for (const p of points) {
    const glow = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.4, 0, p.x, p.y, p.r * 2.8);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.26, 'rgba(78,205,196,0.92)');
    glow.addColorStop(0.78, 'rgba(78,205,196,0.30)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(78,205,196,0.95)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cellCorners(cell) {
  if (!Array.isArray(cell) || cell.length < 3) return [];
  const [a, b, c] = cell;
  const add = (u, v, w) => [
    (u ? a[0] : 0) + (v ? b[0] : 0) + (w ? c[0] : 0),
    (u ? a[1] : 0) + (v ? b[1] : 0) + (w ? c[1] : 0),
    (u ? a[2] : 0) + (v ? b[2] : 0) + (w ? c[2] : 0),
  ];
  return [add(0,0,0), add(1,0,0), add(0,1,0), add(1,1,0), add(0,0,1), add(1,0,1), add(0,1,1), add(1,1,1)];
}

function estimateNeighborThreshold(positions) {
  const nearest = [];
  for (let i = 0; i < positions.length; i++) {
    let best = Infinity;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      best = Math.min(best, distance3(positions[i], positions[j]));
    }
    if (Number.isFinite(best)) nearest.push(best);
  }
  nearest.sort((a, b) => a - b);
  const median = nearest[Math.floor(nearest.length / 2)] || 2.9;
  return median * 1.12;
}

function distance3(a, b) {
  const dx = (Number(a[0]) || 0) - (Number(b[0]) || 0);
  const dy = (Number(a[1]) || 0) - (Number(b[1]) || 0);
  const dz = (Number(a[2]) || 0) - (Number(b[2]) || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function stat(label, value) {
  return h('div', {}, h('dt', {}, label), h('dd', {}, value ?? 'n/a'));
}

function cellValue(cells, rowId, mlipId) {
  const cell = cells.find((item) => item.row_id === rowId && item.mlip_id === mlipId);
  return Number(cell?.value);
}

function rankRow(row, mlips, cells) {
  return mlips
    .map((mlip) => ({ mlip_id: mlip.id, value: cellValue(cells, row.id, mlip.id) }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => a.value - b.value);
}

function rowGoodness(row, mlips, cells, value) {
  const transform = (v) => row.scale === 'log10' ? Math.log10(Math.max(v, 0.000001)) : v;
  const values = mlips.map((mlip) => cellValue(cells, row.id, mlip.id)).filter(Number.isFinite);
  const transformed = values.map(transform);
  const min = Math.min(...transformed);
  const max = Math.max(...transformed);
  if (!Number.isFinite(value) || max === min) return 0;
  return 1 - ((transform(value) - min) / (max - min));
}

function formatMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'n/a';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function formatPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : 'n/a';
}

function formatForce(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(4)} eV/A` : 'n/a';
}

function slug(value) {
  return String(value || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class') node.className = value;
    else if (key === 'style') node.setAttribute('style', value);
    else if (value != null) node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value != null) node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
