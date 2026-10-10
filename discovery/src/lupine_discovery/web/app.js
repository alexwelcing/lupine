/* Lupine Discovery local workbench. Server-side exact arithmetic makes decisions;
 * floating-point values below position the illustrative interval chart only. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { catalog: [], caseId: null, metadata: null, raw: '', problem: null, certificate: null, replay: null, revision: 0, busy: false, filter: 'all', benchmarksLoaded: false };
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  };
  const pretty = (value) => String(value ?? '').replaceAll('_', ' ');
  const list = (value) => Array.isArray(value) ? value : [];
  const exactText = (value) => value === null || value === undefined ? 'Not established' : String(value);
  const truthText = (value) => value === true ? 'Yes' : value === false ? 'No' : 'Unknown';
  const isCalibrated = () => state.certificate?.schema === 'lupine.discovery.calibrated_certificate.v1';
  const isAbstained = () => isCalibrated() && state.certificate.calibration?.status === 'abstained';
  const isPareto = () => state.certificate?.schema === 'lupine.discovery.pareto_certificate.v1';
  // Keep the submitted nominal problem intact for its digest and separate replay.
  // Prepared intervals are a presentation view of the certificate, never new input.
  const intervalProblem = () => isCalibrated() ? state.certificate.prepared_problem : state.problem;
  const ratio = (value) => {
    if (value === null || value === undefined || value === '') return NaN;
    const parts = String(value).split('/');
    return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(value);
  };
  const percent = (value) => Number.isFinite(ratio(value)) ? `${(ratio(value) * 100).toFixed(1)}%` : 'Unknown';
  const parseForDisplay = (raw) => JSON.parse(raw, (key, value) => {
    // Never silently round a JSON integer before displaying it or change its scope.
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new Error('Use quoted strings for decimal values or integers outside the safe browser range, for example "0.25".');
    }
    return value;
  });
  async function api(path, rawBody) {
    const response = await fetch(path, rawBody === undefined ? { headers: { Accept: 'application/json' } } : {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: rawBody,
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error(`The local server returned an unreadable response (${response.status}).`); }
    if (!response.ok) {
      const detail = typeof result.error === 'string' ? result.error : result.error?.message || result.message;
      throw new Error(detail || `The request could not be completed (${response.status}).`);
    }
    return result;
  }
  function notify(message, kind = '') {
    $('notice').textContent = message;
    $('notice').className = `notice ${kind}`;
    $('notice').hidden = !message;
  }
  function busy(value) {
    state.busy = value;
    $('analyze').disabled = value || !state.raw.trim();
    $('analyze').replaceChildren(document.createTextNode(value ? 'Working…' : 'Build candidate pool '), node('span', '', value ? '' : '→'));
    $('replay-builtin').disabled = value;
    $('outcomes-upload').disabled = value;
    $('analyze').setAttribute('aria-busy', String(value));
  }
  function invalidate() {
    state.revision += 1;
    state.certificate = null;
    state.replay = null;
    state.filter = 'all';
    $('analysis-results').hidden = true;
    $('empty-state').hidden = false;
    $('replay-results').hidden = true;
    $('replay-results').replaceChildren();
    $('replay-tag').textContent = 'NOT YET EVALUATED';
    $('step-prepare').className = 'current';
    $('step-select').className = '';
    $('step-replay').className = '';
    for (const button of document.querySelectorAll('[data-filter]')) {
      button.classList.toggle('selected', button.dataset.filter === 'all');
      button.setAttribute('aria-pressed', String(button.dataset.filter === 'all'));
    }
    busy(false);
  }
  function renderOverview() {
    const problem = state.problem;
    $('scenario-overview').hidden = !problem || typeof problem !== 'object';
    if (!problem || typeof problem !== 'object') return;
    const scenario = problem.scenario || {};
    const objective = scenario.objective || {};
    const objectives = Object.entries(scenario.objectives || {});
    const constraints = Object.keys(scenario.constraints || {});
    $('case-kind').textContent = state.metadata ? pretty(state.metadata.kind || 'known-answer case').toUpperCase() : 'CUSTOM INPUT';
    $('candidate-count').textContent = `${list(problem.candidates).length} candidates`;
    $('case-title').textContent = state.metadata?.title || scenario.id || 'Untitled scenario';
    $('case-description').textContent = state.metadata?.description || problem.description || (problem.schema === 'lupine.discovery.calibrated_problem.v1'
      ? 'Nominal predictions and separate calibration residuals determine whether conditional screening is available.'
      : problem.schema === 'lupine.discovery.pareto_problem.v1' ? 'Compare objective bounds without collapsing tradeoffs into a single score.' : 'Supply score bounds and constraints for the candidates in this scenario.');
    $('scenario-objective').textContent = objectives.length ? objectives.map(([key, spec]) => `${key}: ${pretty(spec.direction || 'minimize')} · ${spec.unit || 'unit not declared'}`).join('; ')
      : `${pretty(objective.direction || 'minimize')} · ${objective.unit || 'unit not declared'}`;
    $('scenario-constraints').textContent = constraints.length ? `${constraints.join(', ')} ≤ 0` : 'None declared';
    $('scenario-reference').textContent = objectives.length ? objectives.map(([key, spec]) => `${key}: ${spec.reference || 'not declared'}`).join('; ') : objective.reference || 'Not declared';
  }
  function setRaw(raw, metadata = null) {
    state.raw = raw;
    state.metadata = metadata;
    state.caseId = metadata?.id || null;
    $('problem-json').value = raw;
    invalidate();
    try { state.problem = parseForDisplay(raw); renderOverview(); notify(''); }
    catch (error) { state.problem = null; renderOverview(); notify(error.message, 'error'); }
    $('analyze').disabled = !state.raw.trim();
  }
  async function loadCase(id) {
    if (!id) return;
    invalidate();
    const revision = state.revision;
    busy(true);
    notify('Loading the scenario. Known outcomes remain separate.');
    try {
      const result = await api(`/api/cases/${encodeURIComponent(id)}`);
      if (revision !== state.revision) return;
      setRaw(JSON.stringify(result.problem, null, 2), result);
      $('case-select').value = id;
    } catch (error) {
      if (revision === state.revision) { notify(error.message, 'error'); busy(false); }
    }
  }
  function metric(label, value, caption, suffix = '') {
    const box = node('div', 'metric');
    box.append(node('div', 'metric-label', label));
    const number = node('div', 'metric-value', value);
    if (suffix) number.append(node('small', '', suffix));
    box.append(number, node('div', 'metric-caption', caption));
    return box;
  }
  function renderSelection() {
    const certificate = state.certificate;
    const selection = certificate.selection;
    const count = list(state.problem.candidates).length;
    const retained = list(selection.retained).length;
    const abstained = isAbstained();
    const pareto = isPareto();
    $('empty-state').hidden = true;
    $('analysis-results').hidden = false;
    $('selection-metrics').replaceChildren(
      metric('RETAINED POOL', retained, 'All unresolved candidates remain', `/ ${count}`),
      metric('EXCLUDED', count - retained, abstained ? 'Screening withheld; no exclusions' : `${list(selection.certified_infeasible).length} infeasible · ${list(selection.dominated).length} dominated`),
      pareto ? metric('FEASIBLE ACROSS BOUNDS', list(selection.certified_feasible).length, 'Conditional on sound constraint intervals')
        : metric('CONDITIONAL REGRET BOUND', abstained ? 'Unavailable' : exactText(selection.regret_bound), abstained ? 'No certified incumbent or feasibility' : selection.incumbent ? `Incumbent: ${selection.incumbent}` : 'No feasible incumbent established'),
    );
    $('selection-note').classList.toggle('abstained', abstained);
    if (abstained) {
      $('result-title').textContent = 'Screening withheld';
      $('selection-note').textContent = 'Every candidate remains in the pool. Calibration does not support screening this input: no candidate is certified feasible, no candidate is excluded, and no incumbent or regret bound is established. Nominal predictions below are not uncertainty bounds.';
    } else if (!list(selection.possible_feasible).length) {
      $('result-title').textContent = 'No possible feasible candidates';
      $('selection-note').textContent = 'If every supplied interval is sound, this finite candidate universe is infeasible. This does not rule out candidates beyond the input.';
    } else if (pareto) {
      $('result-title').textContent = `${retained} candidate${retained === 1 ? '' : 's'} in the Pareto pool`;
      $('selection-note').textContent = 'If every supplied interval contains its true value, this pool retains every feasible Pareto optimum, including equal objective ties. It can still contain dominated or infeasible candidates whose status the bounds do not resolve. Each objective is compared separately; this pool is not yet an observed Pareto front.';
    } else if (!selection.incumbent) {
      $('result-title').textContent = 'Uncertainty keeps the pool open';
      $('selection-note').textContent = 'No candidate is feasible across all its constraint bounds. All possibly feasible candidates remain; an incumbent and regret bound cannot yet be established.';
    } else {
      $('result-title').textContent = `${retained} candidate${retained === 1 ? ' remains' : 's remain'} in the pool`;
      $('selection-note').textContent = 'Conditional guarantee: if the supplied intervals contain the true values, every feasible best candidate in this input is retained. Physical accuracy is not established by this decision.';
    }
    if (isCalibrated() && !abstained) {
      $('selection-note').textContent += ' These intervals come from calibration arithmetic under assumed, unverified sampling and predictor-independence premises. A finite radius does not establish their soundness.';
    }
    renderCalibration();
    renderPool();
    renderEvidence();
    const queue = node('div', 'queue-chips');
    list(certificate.measurement_queue?.candidate_ids).forEach((id, index) => {
      const chip = node('span', 'queue-chip');
      chip.append(node('small', '', `${index + 1}.`), document.createTextNode(id));
      queue.append(chip);
    });
    $('measurement-queue').replaceChildren(queue);
    if (!queue.childElementCount) $('measurement-queue').append(node('p', 'selection-empty', 'No retained candidates to measure.'));
    $('measurement-note').textContent = abstained || pareto ? 'Listed in deterministic identifier order. This is not a ranking by predicted quality or a guarantee of discovery.' : 'A heuristic ordering for further measurement. It does not reduce the retained pool or guarantee a discovery.';
    $('replay-intro').textContent = abstained ? 'The all-retained pool has been fixed. Separate known outcomes can audit feasibility and retained optima. Interval coverage and incumbent regret are unavailable because screening was withheld.' : pareto ? 'The pool has been fixed. Separate known outcomes check each objective and constraint, and establish the true Pareto front only when the finite archive is complete.' : 'The pool has been fixed. Compare it with separate known outcomes to check coverage, retained optima, and observed regret.';
    $('replay-builtin').hidden = !state.caseId || state.metadata?.has_outcomes === false;
    $('step-prepare').className = 'complete';
    $('step-select').className = 'current';
  }
  function candidateReason(id) {
    if (isAbstained()) return 'Retained because screening is withheld. Feasibility is not certified.';
    const reason = state.certificate.reasons?.[id] || {};
    if (reason.reason === 'constraint_lower_bound_positive') return `Outside constraints: ${list(reason.constraints).join(', ')}.`;
    if (reason.reason === 'incumbent_upper_strictly_below_candidate_lower') return `Worse than ${reason.witness} across all score bounds.`;
    if (reason.reason === 'certified_feasible_bound_dominance') return `Dominated across the bounds by feasible witness ${reason.witness}; strictly better in ${list(reason.strict_objectives).join(', ')}.`;
    if (isPareto()) return list(state.certificate.selection.certified_feasible).includes(id) ? 'Feasible across the bounds; dominance remains unproved.' : 'Feasibility or objective tradeoffs remain unresolved.';
    return list(state.certificate.selection.certified_feasible).includes(id) ? 'Feasible across the supplied bounds.' : 'Feasibility or ranking remains unresolved.';
  }
  function renderPool() {
    if (isPareto()) { renderParetoPool(); return; }
    const selection = state.certificate.selection;
    const retained = new Set(list(selection.retained));
    const abstained = isAbstained();
    const candidates = list((intervalProblem() || state.problem).candidates);
    $('pool-heading').textContent = abstained ? 'Nominal predictions' : 'Candidate intervals';
    $('pool-help').textContent = abstained ? 'Lower predictions indicate nominal preference only. These exact values carry no interval coverage or feasibility claim.'
      : isCalibrated() ? 'Lower scores are better. Intervals use the calibrated radii under the declared, unverified premises.' : 'Lower scores are better. Intervals show the supplied bounds.';
    $('pool-legend').hidden = abstained;
    $('threshold-legend').hidden = false;
    const numbers = candidates.flatMap((c) => list(c.score).map(ratio));
    const chartUsable = numbers.length > 0 && numbers.every(Number.isFinite);
    let low = chartUsable ? Math.min(...numbers) : 0;
    let high = chartUsable ? Math.max(...numbers) : 1;
    if (low === high) { low -= 1; high += 1; }
    const scaleUsable = chartUsable && Number.isFinite(high - low) && high > low;
    const position = (value) => Math.max(0, Math.min(100, (ratio(value) - low) / (high - low) * 100));
    const table = node('table', 'candidate-table');
    const caption = node('caption', 'sr-only', abstained ? 'Nominal predictions only. Screening is withheld; every candidate is retained without certified feasibility.' : 'Candidate score intervals and selection decisions. Bar positions are approximate; endpoint labels are exact.');
    const head = node('thead');
    const headRow = node('tr');
    ['Candidate', `${abstained ? 'Prediction' : 'Score'} · ${state.problem.scenario?.objective?.unit || 'declared unit'}`, 'Decision'].forEach((text) => {
      const th = node('th', '', text); th.scope = 'col'; headRow.append(th);
    });
    head.append(headRow);
    const body = node('tbody');
    const filtered = candidates.filter((candidate) => state.filter === 'all' || (state.filter === 'retained') === retained.has(candidate.id));
    for (const candidate of filtered) {
      const included = retained.has(candidate.id);
      const row = node('tr'); row.dataset.candidateId = candidate.id; row.dataset.decision = included ? 'retained' : 'excluded';
      const idCell = node('td'); idCell.append(node('span', 'candidate-id', candidate.id));
      if (candidate.id === selection.incumbent) idCell.append(node('span', 'incumbent-marker', '↳ incumbent'));
      const scoreCell = node('td');
      if (scaleUsable) {
        const track = node('div', 'score-interval'); track.setAttribute('aria-hidden', 'true');
        const line = node('span', `score-line${included ? '' : ' excluded'}`);
        line.style.left = `${position(candidate.score[0])}%`;
        line.style.width = `${Math.max(0, position(candidate.score[1]) - position(candidate.score[0]))}%`;
        track.append(line);
        if (selection.threshold !== null && selection.threshold !== undefined && Number.isFinite(ratio(selection.threshold))) {
          const threshold = node('span', 'score-threshold'); threshold.style.left = `${position(selection.threshold)}%`; track.append(threshold);
        }
        scoreCell.append(track);
      }
      scoreCell.append(node('span', 'score-values', abstained ? exactText(candidate.score) : `[${candidate.score[0]}, ${candidate.score[1]}]`));
      if (abstained) scoreCell.append(node('span', 'prediction-label', 'Nominal · no interval'));
      const decision = node('td');
      decision.append(node('span', `row-status${abstained ? ' withheld' : included ? '' : ' excluded'}`, included ? 'Retained' : 'Excluded'), node('p', 'row-reason', candidateReason(candidate.id)));
      const constraints = Object.entries(candidate.constraints || {});
      if (constraints.length) {
        const details = node('details', 'row-reason');
        details.append(node('summary', '', `${constraints.length} constraint${constraints.length === 1 ? '' : 's'}`));
        for (const [key, interval] of constraints) details.append(node('div', '', abstained ? `${key}: ${exactText(interval)} (nominal prediction)` : `${key}: [${interval[0]}, ${interval[1]}]`));
        decision.append(details);
      }
      row.append(idCell, scoreCell, decision); body.append(row);
    }
    table.append(caption, head, body);
    $('pool-table').replaceChildren(table);
    $('pool-table').tabIndex = 0;
    $('pool-table').setAttribute('role', 'region');
    $('pool-table').setAttribute('aria-label', abstained ? 'Scrollable nominal prediction table' : 'Scrollable candidate interval table');
    if (!filtered.length) $('pool-table').append(node('p', 'empty-filter', 'No candidates in this group.'));
    if (!abstained && !scaleUsable && filtered.length) $('pool-table').append(node('p', 'field-help', 'Visual scale unavailable for these values. The exact endpoints are shown.'));
  }
  function renderParetoPool() {
    const selection = state.certificate.selection;
    const retained = new Set(list(selection.retained));
    const candidates = list(state.problem.candidates);
    const objectives = Object.entries(state.problem.scenario?.objectives || {});
    const scales = new Map();
    for (const [key] of objectives) {
      const values = candidates.flatMap((candidate) => list(candidate.objectives?.[key]).map(ratio));
      let low = Math.min(...values), high = Math.max(...values);
      if (low === high) { low -= 1; high += 1; }
      if (values.length && values.every(Number.isFinite) && Number.isFinite(high - low) && high > low) scales.set(key, { low, high });
    }
    $('pool-heading').textContent = 'Objective intervals';
    $('pool-help').textContent = 'Minimize each objective. Every objective has its own illustrative scale; exact endpoint labels govern the decision. Tradeoffs and equal objective ties remain unless a feasible witness proves strict dominance.';
    $('pool-legend').hidden = false;
    $('threshold-legend').hidden = true;
    const table = node('table', 'candidate-table pareto-table');
    const caption = node('caption', 'sr-only', 'Candidate objective intervals and Pareto screening decisions. Each objective uses its own approximate scale; endpoint labels are exact.');
    const head = node('thead'), headRow = node('tr');
    for (const label of ['Candidate', 'Objectives · minimize each', 'Decision']) {
      const th = node('th', '', label); th.scope = 'col'; headRow.append(th);
    }
    head.append(headRow);
    const body = node('tbody');
    const filtered = candidates.filter((candidate) => state.filter === 'all' || (state.filter === 'retained') === retained.has(candidate.id));
    for (const candidate of filtered) {
      const included = retained.has(candidate.id);
      const row = node('tr'); row.dataset.candidateId = candidate.id; row.dataset.decision = included ? 'retained' : 'excluded';
      const idCell = node('td'); idCell.append(node('span', 'candidate-id', candidate.id));
      const objectiveCell = node('td');
      for (const [key, spec] of objectives) {
        const bound = candidate.objectives[key];
        const objective = node('div', 'objective-bound'); objective.dataset.objective = key;
        objective.append(node('span', 'objective-label', `${key} · ${spec.unit}`));
        const scale = scales.get(key);
        if (scale) {
          const position = (value) => Math.max(0, Math.min(100, (ratio(value) - scale.low) / (scale.high - scale.low) * 100));
          const track = node('div', 'score-interval'); track.setAttribute('aria-hidden', 'true');
          const line = node('span', `score-line${included ? '' : ' excluded'}`);
          line.style.left = `${position(bound[0])}%`;
          line.style.width = `${Math.max(0, position(bound[1]) - position(bound[0]))}%`;
          track.append(line); objective.append(track);
        }
        objective.append(node('span', 'score-values', `[${exactText(bound[0])}, ${exactText(bound[1])}]`));
        objectiveCell.append(objective);
      }
      const decision = node('td');
      decision.append(node('span', `row-status${included ? '' : ' excluded'}`, included ? 'Retained' : 'Excluded'), node('p', 'row-reason', candidateReason(candidate.id)));
      const constraints = Object.entries(candidate.constraints || {});
      if (constraints.length) {
        const details = node('details', 'row-reason'); details.append(node('summary', '', `${constraints.length} constraint${constraints.length === 1 ? '' : 's'}`));
        for (const [key, bound] of constraints) details.append(node('div', '', `${key}: [${exactText(bound[0])}, ${exactText(bound[1])}]`));
        decision.append(details);
      }
      row.append(idCell, objectiveCell, decision); body.append(row);
    }
    table.append(caption, head, body);
    $('pool-table').replaceChildren(table);
    $('pool-table').tabIndex = 0;
    $('pool-table').setAttribute('role', 'region');
    $('pool-table').setAttribute('aria-label', 'Scrollable candidate objective interval table');
    if (!filtered.length) $('pool-table').append(node('p', 'empty-filter', 'No candidates in this group.'));
    if (scales.size < objectives.length && filtered.length) $('pool-table').append(node('p', 'field-help', 'Some visual scales are unavailable. All exact objective endpoints are shown.'));
  }
  function renderCalibration() {
    const panel = $('calibration-panel');
    panel.hidden = !isCalibrated();
    if (!isCalibrated()) return;
    const calibration = state.certificate.calibration;
    const plan = calibration.plan || {};
    const abstained = isAbstained();
    panel.classList.toggle('abstained', abstained);
    $('calibration-status').textContent = abstained ? 'Screening withheld' : 'Finite conditional intervals';
    $('calibration-premise').textContent = calibration.premise_status === 'unsupported'
      ? 'Premises unsupported. The arithmetic does not authorize exclusion.'
      : 'Premises assumed and unverified. This is conditional calibration arithmetic, not an observed coverage guarantee.';
    const facts = $('calibration-facts'); facts.replaceChildren();
    addFact(facts, 'Declared whole-pool risk budget δ', exactText(plan.delta));
    addFact(facts, 'Scalar events (candidates × targets)', exactText(plan.event_count));
    addFact(facts, 'Per-event budget ε', exactText(plan.epsilon));
    addFact(facts, 'Residuals per target n', exactText(plan.calibration_count));
    addFact(facts, 'Required order-statistic rank k', exactText(plan.rank));
    addFact(facts, 'Minimum n for a finite radius', exactText(plan.minimum_finite_calibration_count));
    const reasons = $('calibration-reasons'); reasons.replaceChildren();
    const reasonText = {
      required_rank_exceeds_calibration_count: 'The required rank exceeds the available calibration count. Using the largest observed error would not meet this budget.',
      unsupported_premises: 'The declared sampling or predictor-independence premises are unsupported.',
      premises_unsupported: 'The declared sampling or predictor-independence premises are unsupported.',
      sampling_scope_unsupported: 'The declared sampling scope does not support the calibration premises.',
      finite_order_statistic_under_unverified_premises: 'A finite order statistic is available only under the declared, unverified premises.',
    };
    for (const reason of list(calibration.reasons)) reasons.append(node('li', '', reasonText[reason] || pretty(reason)));
    reasons.hidden = !reasons.childElementCount;
    const targets = $('calibration-targets'); targets.replaceChildren();
    for (const [name, target] of Object.entries(calibration.targets || {})) {
      const radius = target.radius === null || target.radius === undefined ? 'Unavailable' : exactText(target.radius);
      const row = node('div', 'calibration-target');
      row.append(node('strong', '', name), node('span', '', `Radius: ${radius}${abstained && target.radius !== null && target.radius !== undefined ? ' · screening withheld' : ''}`));
      if (target.reason) row.append(node('small', '', calibration.premise_status === 'unsupported' && target.outcome_kind === 'finite' ? 'Finite arithmetic radius; unsupported premises prevent using it for screening.' : reasonText[target.reason] || pretty(target.reason)));
      targets.append(row);
    }
    $('calibration-identifiers').textContent = `Predictor: ${calibration.predictor_id || 'undeclared'} · Calibration: ${calibration.calibration_id || 'undeclared'}`;
    $('calibration-scope').textContent = `Sampling scope: ${calibration.sampling_scope || 'undeclared'}`;
  }
  function renderEvidence() {
    const assessments = Object.values(state.certificate.evidence_assessment || {});
    const target = $('evidence-content');
    target.replaceChildren(node('p', 'evidence-summary', isCalibrated()
      ? state.certificate.calibration.premise_status === 'unsupported' ? 'Calibration premises are unsupported. All candidates remain; physical accuracy and interval coverage are unestablished.'
        : 'Calibration premises are assumed and unverified. A declared risk budget and a finite radius do not verify exchangeability, predictor independence, or physical accuracy.'
      : 'Evidence links describe the premises. They do not establish physical truth.'));
    const counts = new Map();
    for (const entry of assessments) {
      const label = {
        includes_synthetic_evidence: 'Synthetic evidence', missing_premises: 'Evidence missing',
        declared_assumptions: 'Assumptions included', rejected_premises: 'Rejected evidence',
        linked_evidence_not_physical_attestation: 'Linked evidence · unverified truth',
      }[entry.state] || pretty(entry.state || 'unresolved');
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    for (const [label, count] of counts) {
      const row = node('div', 'evidence-state'); row.append(node('span', '', label), node('strong', '', `${count} candidate${count === 1 ? '' : 's'}`)); target.append(row);
    }
    if (!assessments.length) target.append(node('p', 'field-help', isAbstained() ? 'No interval certificate is available for screening.' : 'No linked evidence was supplied. Interval soundness remains an assumption.'));
    const missing = assessments.filter((entry) => list(entry.missing_quantities).length).length;
    const rejected = assessments.filter((entry) => list(entry.rejected_evidence).length).length;
    const unpinned = assessments.filter((entry) => list(entry.unpinned_sources).length).length;
    if (missing) target.append(node('p', 'field-help', `${missing} candidate${missing === 1 ? ' has' : 's have'} quantities without evidence.`));
    if (rejected) target.append(node('p', 'field-help status-fail', `${rejected} candidate${rejected === 1 ? ' has' : 's have'} rejected evidence. Do not treat the pool as physically certified.`));
    if (unpinned) target.append(node('p', 'field-help', `${unpinned} candidate${unpinned === 1 ? ' has' : 's have'} sources without a content hash. A hash would verify identity, not truth.`));
    if (list(state.problem.evidence).length) {
      const details = node('details', 'replay-details'); details.append(node('summary', '', 'Inspect evidence records'));
      for (const record of state.problem.evidence) {
        const item = node('div', 'evidence-record');
        item.append(node('strong', '', record.id), node('p', '', `${pretty(record.kind)} · ${record.status}`), node('p', '', record.statement));
        item.append(node('p', '', `${record.scope?.quantity || 'quantity undeclared'} · ${record.scope?.unit || 'unit undeclared'} · ${record.scope?.reference || 'reference undeclared'}`));
        let sourceLink;
        try {
          const source = new URL(record.source?.uri);
          if (['http:', 'https:'].includes(source.protocol)) {
            sourceLink = node('a', '', 'Source ↗'); sourceLink.href = source.href; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
          }
        } catch { /* Non-network references stay text. */ }
        item.append(sourceLink || node('p', '', record.source?.uri || 'No source URI'));
        details.append(item);
      }
      target.append(details);
    }
  }
  async function analyze() {
    if (state.busy) return;
    const revision = state.revision;
    try {
      state.problem = parseForDisplay(state.raw);
      busy(true); notify(state.problem.schema === 'lupine.discovery.calibrated_problem.v1' ? 'Checking the calibration budget before screening the pool…' : 'Building the pool from the declared bounds…');
      // Preserve the original JSON. The server detects duplicate keys and parses
      // exact values; JSON.stringify(JSON.parse(input)) would erase those checks.
      const result = await api('/api/select', `{"problem":${state.raw}}`);
      if (revision !== state.revision) return;
      state.certificate = result; state.replay = null;
      $('replay-results').hidden = true;
      $('replay-tag').textContent = 'NOT YET EVALUATED';
      renderSelection(); notify(isAbstained() ? 'Screening withheld. All candidates remain; the decision is fixed before outcomes are evaluated.' : 'Pool built. The decision is fixed before outcomes are evaluated.', isAbstained() ? '' : 'success');
    } catch (error) { if (revision === state.revision) notify(error.message, 'error'); }
    finally { if (revision === state.revision) busy(false); }
  }
  function addFact(target, label, value) {
    const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); target.append(row);
  }
  function renderReplay(report) {
    if (isPareto()) { renderParetoReplay(report); return; }
    const evaluation = report.evaluation || report;
    const abstained = isAbstained();
    const target = $('replay-results'); target.hidden = false; target.replaceChildren();
    const refuted = evaluation.empirical_soundness === 'refuted_on_observed_outcomes';
    const complete = evaluation.outcome_completeness === 'complete';
    const supported = evaluation.empirical_soundness === 'supported_on_complete_finite_archive';
    const verdict = abstained ? 'Retention audit only. Screening was withheld, so interval coverage is unavailable.' : refuted ? 'Interval premises failed on observed outcomes.' : supported ? 'All supplied bounds contained the known outcomes in this finite case.' : 'The available outcomes do not establish full coverage.';
    target.append(node('div', `replay-verdict${refuted ? ' fail' : supported ? '' : ' unknown'}`, verdict));
    $('replay-tag').textContent = abstained ? 'RETENTION AUDIT' : refuted ? 'COVERAGE FAILURE' : supported ? 'OBSERVED COVERAGE' : 'INCOMPLETE EVIDENCE';
    const facts = node('dl', 'replay-stats');
    addFact(facts, 'All true optima retained', truthText(evaluation.all_true_minimizers_retained));
    addFact(facts, 'Outcome completeness', pretty(evaluation.outcome_completeness || 'unknown'));
    addFact(facts, 'Score coverage', abstained ? 'Unavailable · no interval' : percent(evaluation.score_coverage));
    addFact(facts, 'Constraint coverage', abstained ? 'Unavailable · no interval' : Object.keys(state.problem.scenario?.constraints || {}).length ? percent(evaluation.constraint_coverage) : 'No constraints declared');
    addFact(facts, 'Observed incumbent regret', abstained ? 'Unavailable · no incumbent' : exactText(evaluation.incumbent_regret));
    addFact(facts, 'Conditional regret bound held', abstained ? 'Unavailable · no bound' : truthText(evaluation.regret_bound_holds));
    target.append(facts);
    const minimizers = list(evaluation.true_minimizers);
    if (minimizers.length) target.append(node('p', 'field-help', `Known best feasible candidates: ${minimizers.join(', ')}.`));
    const missing = list(evaluation.missing_truth_ids);
    if (missing.length) target.append(node('p', 'field-help status-fail', `Missing outcomes: ${missing.join(', ')}. Unknown outcomes are not failures or passes.`));
    const details = node('details', 'replay-details'); details.append(node('summary', '', 'Inspect per-candidate observations'));
    const observations = node('ul', 'observation-list');
    for (const [id, observation] of Object.entries(evaluation.per_candidate || {})) {
      const constraintValues = Object.values(observation.constraint_coverage || {});
      const constraints = constraintValues.length ? constraintValues.some((v) => v === false) ? 'failed' : constraintValues.every((v) => v === true) ? 'covered' : 'unknown' : 'none / unreported';
      const score = observation.score_covered === true ? 'covered' : observation.score_covered === false ? 'failed' : 'unknown';
      observations.append(node('li', '', abstained ? `${id} · interval coverage unavailable · observed feasible: ${truthText(observation.true_feasible)}` : `${id} · score ${score} · constraints ${constraints} · feasible: ${truthText(observation.true_feasible)}`));
    }
    details.append(observations); target.append(details);
    target.append(node('p', 'replay-caveat', abstained ? 'Retaining every candidate prevents screening losses, but provides no reduction of the pool or evidence of predictive accuracy. Outcomes audit the retained pool; they cannot retrospectively supply the missing calibration premise.' : refuted ? 'A failed interval premise prevents applying the conditional retention guarantee. This is a measured failure of the supplied bounds, not a contradiction of the theorem.' : complete ? 'This result describes the supplied finite case. It does not establish accuracy for new candidates, new conditions, or a different source of evidence.' : 'Incomplete outcomes cannot establish that every optimum was retained. Keep the unresolved states open.'));
    $('step-select').className = 'complete'; $('step-replay').className = 'current';
  }
  function renderParetoReplay(report) {
    const evaluation = report.evaluation || report;
    const target = $('replay-results'); target.hidden = false; target.replaceChildren();
    const refuted = evaluation.empirical_soundness === 'refuted_on_observed_outcomes';
    const supported = evaluation.empirical_soundness === 'supported_on_complete_finite_archive';
    const complete = evaluation.outcome_completeness === 'complete';
    const verdict = refuted ? 'Objective or constraint bounds failed on observed outcomes.' : supported ? 'All objective and constraint bounds contained the known outcomes in this finite case.' : 'Incomplete outcomes leave the true Pareto front and full coverage unresolved.';
    target.append(node('div', `replay-verdict${refuted ? ' fail' : supported ? '' : ' unknown'}`, verdict));
    $('replay-tag').textContent = refuted ? 'COVERAGE FAILURE' : supported ? 'OBSERVED COVERAGE' : 'INCOMPLETE EVIDENCE';
    const facts = node('dl', 'replay-stats');
    addFact(facts, 'Every true Pareto candidate retained', truthText(evaluation.all_true_pareto_candidates_retained));
    addFact(facts, 'Outcome completeness', pretty(evaluation.outcome_completeness || 'unknown'));
    for (const [key, coverage] of Object.entries(evaluation.objective_coverage || {})) addFact(facts, `${key} coverage`, percent(coverage));
    addFact(facts, 'Constraint coverage', Object.keys(state.problem.scenario?.constraints || {}).length ? percent(evaluation.constraint_coverage) : 'No constraints declared');
    target.append(facts);
    const front = list(evaluation.true_pareto_front);
    const frontPanel = node('div', 'pareto-front'); frontPanel.id = 'pareto-front';
    frontPanel.append(node('h4', '', complete ? 'True Pareto front in this finite case' : 'True Pareto front unresolved'));
    if (complete && Array.isArray(evaluation.true_pareto_front)) {
      if (front.length) {
        const members = node('ul', 'pareto-front-members');
        for (const id of front) members.append(node('li', '', id));
        frontPanel.append(members);
        frontPanel.append(node('p', 'field-help', 'Every listed candidate is feasible and undominated among the complete known outcomes. Equal objective ties remain distinct candidates.'));
      } else frontPanel.append(node('p', 'field-help', 'The complete outcomes contain no feasible candidates.'));
    } else {
      frontPanel.append(node('p', 'field-help', 'Missing objectives or constraints can change the front. The observed subset cannot establish retention of the full true front.'));
      const observed = list(evaluation.observed_pareto_front);
      if (observed.length) frontPanel.append(node('p', 'field-help', `Front of the observed complete candidates only: ${observed.join(', ')}.`));
    }
    target.append(frontPanel);
    const missing = list(evaluation.missing_truth_ids);
    if (missing.length) target.append(node('p', 'field-help status-fail', `Incomplete outcomes: ${missing.join(', ')}. Unknown values are not failures or passes.`));
    const details = node('details', 'replay-details'); details.append(node('summary', '', 'Inspect per-candidate observations'));
    const observations = node('ul', 'observation-list');
    const coveredText = (covered) => covered === true ? 'covered' : covered === false ? 'failed' : 'unknown';
    for (const [id, observation] of Object.entries(evaluation.per_candidate || {})) {
      const objectives = Object.entries(observation.objective_coverage || {}).map(([key, covered]) => `${key} ${coveredText(covered)}`);
      const constraints = Object.entries(observation.constraint_coverage || {}).map(([key, covered]) => `${key} ${coveredText(covered)}`);
      observations.append(node('li', '', `${id} · ${objectives.join(' · ')} · constraints: ${constraints.join(', ') || 'none declared'} · observed feasible: ${truthText(observation.true_feasible)}`));
    }
    details.append(observations); target.append(details);
    target.append(node('p', 'replay-caveat', refuted ? 'Failed bounds prevent applying the conditional Pareto-retention guarantee. A lost true Pareto candidate is a measured failure of these inputs; it is not erased by a successful result on another objective.' : complete ? 'This front describes the supplied finite archive. It does not establish physical accuracy, future coverage, or performance beyond this candidate universe.' : 'Keep the full-front conclusion unknown until the separately supplied outcomes are complete.'));
    $('step-select').className = 'complete'; $('step-replay').className = 'current';
  }
  async function replay(rawOutcomes) {
    if (!state.certificate || state.busy) return;
    const revision = state.revision;
    busy(true); $('replay-results').hidden = true;
    notify('Comparing the fixed pool with separate known outcomes…');
    try {
      if (rawOutcomes !== undefined) parseForDisplay(rawOutcomes);
      const result = rawOutcomes === undefined
        ? await api(`/api/cases/${encodeURIComponent(state.caseId)}/replay`, `{"problem":${state.raw}}`)
        : await api('/api/replay', `{"problem":${state.raw},"outcomes":${rawOutcomes}}`);
      if (revision !== state.revision) return;
      state.replay = result; renderReplay(result); notify('Evaluation complete. Observed failures and unknown outcomes are retained in the result.');
    } catch (error) {
      if (revision === state.revision) { $('replay-tag').textContent = 'EVALUATION NOT COMPLETED'; notify(error.message, 'error'); }
    } finally { if (revision === state.revision) busy(false); }
  }
  function download(value, name) {
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
    const link = node('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function setView(view) {
    const valid = view === 'benchmarks' ? 'benchmarks' : 'workbench';
    for (const name of ['workbench', 'benchmarks']) {
      $(`view-${name}`).hidden = name !== valid;
      const button = $(`nav-${name}`); button.classList.toggle('active', name === valid);
      if (name === valid) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
    $('breadcrumb-current').textContent = valid === 'workbench' ? 'Candidate pool' : 'Known answers';
    if (valid === 'benchmarks' && !state.benchmarksLoaded) loadBenchmarks();
    history.replaceState(null, '', `#${valid}`);
  }
  function renderKnown(report) {
    const summary = report?.summary || {};
    const cases = list(report?.cases);
    $('suite-metrics').replaceChildren(
      metric('CASES CHECKED', summary.total ?? cases.length, 'Fresh deterministic evaluation'),
      metric('EXPECTED BEHAVIOR', summary.passed ?? 'Unknown', 'Includes detection of negative controls'),
      metric('UNEXPECTED FAILURES', summary.failed ?? 'Unknown', 'Any failure blocks this suite gate'),
    );
    const target = $('known-case-list'); target.replaceChildren();
    cases.forEach((entry, index) => {
      const card = node('article', 'known-case'); card.dataset.caseId = entry.id;
      const content = node('div'); content.append(node('h3', '', entry.title || entry.id));
      const negative = String(entry.kind || '').includes('negative') || String(entry.kind || '').includes('unsound');
      content.append(node('p', '', negative ? 'Negative control · expected to expose a failed premise or missed optimum.' : `${pretty(entry.kind || 'known-answer case')} · checked against explicit outcomes.`));
      const observed = entry.observed || {};
      content.append(node('p', 'known-observation', `Pool ${observed.pool_size ?? '?'} / ${observed.candidate_count ?? '?'} · all optima retained: ${truthText(observed.all_true_minimizers_retained)} · intervals sound: ${truthText(observed.intervals_sound)}`));
      const details = node('details', 'known-checks'); details.append(node('summary', '', 'Inspect checks'));
      const checks = node('ul', 'observation-list');
      for (const [name, passed] of Object.entries(entry.checks || {})) checks.append(node('li', '', `${passed === true ? '✓' : passed === false ? '×' : '?'} ${pretty(name)}`));
      details.append(checks); content.append(details);
      const action = node('div', 'known-case-action');
      const passed = ['pass', 'passed', 'ok'].includes(String(entry.status).toLowerCase());
      const failed = ['fail', 'failed'].includes(String(entry.status).toLowerCase());
      action.append(node('span', `case-result${failed ? ' fail' : passed ? '' : ' unknown'}`, passed ? '✓ Expected behavior' : failed ? '× Unexpected failure' : pretty(entry.status || 'Not evaluated')));
      if (state.catalog.some((c) => c.id === entry.id)) {
        const button = node('button', 'text-button', 'Open case ↗'); button.type = 'button';
        button.addEventListener('click', () => { setView('workbench'); $('case-select').value = entry.id; loadCase(entry.id); $('main').focus(); }); action.append(button);
      }
      card.append(node('span', 'known-case-index', String(index + 1).padStart(2, '0')), content, action); target.append(card);
    });
    if (!cases.length) target.append(node('p', 'notice', 'No known-answer case results were supplied by the server.'));
  }
  function renderArchives(report, additional) {
    const target = $('archive-cards'); target.replaceChildren();
    const tasks = [...list(report?.tasks), ...list(additional?.tasks)];
    for (const task of tasks) {
      const card = node('article', 'archive-card panel'); card.dataset.archiveTask = task.task;
      const names = { matbench_expt_gap: 'Experimental band gaps', matbench_steels: 'Steel yield strength', freesolv_experimental_hydration_free_energy: 'Molecular hydration energies' };
      card.append(node('p', 'eyebrow', task.task || 'ARCHIVED TASK'), node('h3', '', names[task.task] || pretty(task.task)), node('p', 'archive-description', task.objective));
      const sound = task.empirical_soundness === 'refuted_on_observed_outcomes';
      const testCount = task.split_counts?.test;
      const misses = Number.isInteger(testCount) && Number.isInteger(task.covered_count) ? testCount - task.covered_count : list(task.uncovered_test_ids).length;
      card.append(node('p', 'archive-verdict', sound ? `Interval premises refuted · ${misses} observed values outside their bounds.` : 'Recorded retrospective result · not a physical certificate.'));
      const facts = node('dl', 'archive-facts');
      addFact(facts, 'Held-out candidates', exactText(testCount));
      addFact(facts, 'Observed interval coverage', `${task.covered_count ?? '?'} / ${testCount ?? '?'} (${percent(task.empirical_test_coverage)})`);
      addFact(facts, 'Candidate pool', `${task.interval_pool?.size ?? '?'} / ${testCount ?? '?'}`);
      addFact(facts, 'True optima retained', `${task.interval_pool?.retained_optimum_count ?? '?'} / ${task.interval_pool?.optimum_count ?? '?'}`);
      addFact(facts, 'All optima retained', truthText(task.interval_pool?.all_optima_retained));
      addFact(facts, 'Observed incumbent regret', exactText(task.incumbent_regret));
      card.append(facts);
      let footnote = task.interval_pool?.all_optima_retained === false ? 'The pool dropped known best candidates. Average interval coverage was insufficient for the whole-pool guarantee.' : 'Retaining the optimum does not repair failed interval premises.';
      if (task.nominal_top_one?.some_optimum_retained === true) footnote += ' The nominal top-one baseline also retained an optimum in this recorded run.';
      card.append(node('p', 'archive-footnote', footnote));
      if (typeof task.archive_url === 'string') {
        try {
          const url = new URL(task.archive_url);
          if (url.protocol === 'https:') {
            const link = node('a', 'archive-source', 'Pinned public dataset ↗'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; card.append(link);
          }
        } catch { /* Invalid source URL is omitted, not activated. */ }
      }
      target.append(card);
    }
    if (!tasks.length) target.append(node('p', 'notice', 'No archived replay report is available in this installation.'));
    const protocol = $('archive-protocol'); protocol.replaceChildren();
    for (const [label, source] of [['Materials archives', report], ['Molecular archive', additional]]) {
      if (!source) continue;
      protocol.append(node('h3', '', label));
      for (const [key, value] of Object.entries(source.protocol || {})) protocol.append(node('p', '', `${pretty(key)}: ${typeof value === 'object' ? JSON.stringify(value) : value}`));
    }
    protocol.append(node('p', '', 'The archives were already public. Composition or exact-SMILES grouping reduces direct duplication, but it does not establish prospective blindness or simultaneous interval coverage. Reported success on a task is not evidence of superiority to the included baseline.'));
  }
  function renderConstrained(report) {
    const content = $('constrained-content');
    const status = $('constrained-status');
    content.hidden = true; status.hidden = false;
    status.className = 'notice';
    if (!report) {
      status.textContent = 'No constrained calculation report is bundled yet. No measured gate outcome is available.';
      return;
    }
    if (!['lupine.discovery.constrained.replay.v1', 'lupine.discovery.constrained.dashboard.v1'].includes(report.schema)
        || report.protocol_id !== 'jarvis-gap-formation-v1') {
      status.className = 'notice error';
      status.textContent = 'The bundled constrained report has an unsupported schema or protocol. Its results have not been displayed.';
      return;
    }
    const rateText = (rate) => {
      if (!rate || rate.numerator === undefined || rate.denominator === undefined) return 'Unavailable';
      const value = `${exactText(rate.numerator)} / ${exactText(rate.denominator)}`;
      return String(rate.denominator) === '0' ? `${value} · undefined` : value;
    };
    const provenance = $('constrained-provenance'); provenance.replaceChildren();
    provenance.append(node('p', '', `Protocol: ${report.protocol_id} · frozen commit: ${report.protocol_commit || 'not supplied'}`));
    provenance.append(node('p', '', report.interpretation || 'Retrospective archived calculations; sampling premises and independent predictive superiority remain unverified.'));
    const source = report.source || {};
    try {
      const url = new URL(source.url || source.source_url || source.archive_url);
      if (url.protocol === 'https:') {
        const link = node('a', 'archive-source', 'Pinned archive source ↗');
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; provenance.append(link);
      }
    } catch { /* Missing or unsupported source locations stay in the receipt. */ }
    const exportButton = node('button', 'text-button', 'Download displayed report'); exportButton.type = 'button';
    exportButton.addEventListener('click', () => download(report, 'lupine-constrained-dashboard.json')); provenance.append(exportButton);
    const gateNames = {
      engineering_integrity: 'Engineering integrity', nontrivial_constrained_evidence: 'Constrained population',
      observed_primary_screening: 'Observed primary screening', recommendation_value: 'Recommendation value at budget 4',
      shift_behavior: 'Oxygen-family scope handling',
    };
    const gates = $('constrained-gates'); gates.replaceChildren();
    for (const [key, title] of Object.entries(gateNames)) {
      const gate = report.gates?.[key];
      const card = node('article', 'constrained-gate'); card.dataset.gate = key;
      const label = typeof gate?.status === 'string' ? gate.status.toUpperCase() : 'UNREPORTED';
      const style = ['PASS', 'FAIL', 'OPEN', 'BLOCKED'].includes(label) ? label.toLowerCase() : 'unknown';
      card.append(node('span', `gate-status ${style}`, label), node('h4', '', title));
      if (!gate) card.append(node('p', '', 'No measured gate result was supplied.'));
      else {
        for (const text of [gate.reason, gate.claim, gate.scientific_interpretation]) {
          if (typeof text === 'string') card.append(node('p', text.includes('BLOCKED') ? 'status-fail' : '', text));
        }
        const checks = node('ul', 'gate-checks');
        for (const [name, value] of Object.entries(gate.checks || {})) {
          const result = value === true ? 'PASS' : value === false ? 'FAIL' : value === null ? 'OPEN' : exactText(value);
          const item = node('li'); item.append(node('strong', value === false ? 'status-fail' : '', `${result} · `), document.createTextNode(pretty(name))); checks.append(item);
        }
        if (checks.childElementCount) card.append(checks);
        if (gate.independent_panel_premise) card.append(node('p', '', `Independent-panel premise: ${pretty(gate.independent_panel_premise)}.`));
        if (gate.external_replication_required === true) card.append(node('p', '', 'A separate frozen replication is still required.'));
      }
      gates.append(card);
    }
    const arms = $('constrained-arms'); arms.replaceChildren();
    const policies = [['interval', 'Interval acquisition'], ['nominal_5nn', 'Nominal 5NN'], ['nearest_1nn', 'Nearest 1NN'], ['random_0', 'Random · seed 0']];
    const budgets = [0, 1, 2, 4, 8, 20];
    for (const role of ['primary', 'shift']) {
      const arm = report.arms?.[role];
      const section = node('section', 'panel constrained-arm'); section.dataset.arm = role;
      const heading = node('h3', '', role === 'primary' ? 'Primary · oxygen-free compositions' : 'Shift · oxygen-containing compositions');
      heading.id = `constrained-${role}-heading`; section.setAttribute('aria-labelledby', heading.id); section.append(heading);
      section.append(node('p', 'constrained-arm-scope', role === 'primary'
        ? 'The frozen protocol assigns training and calibration to the oxygen-free family. Finite screening remains conditional on unverified sampling and predictor premises.'
        : 'The frozen protocol withholds the oxygen family from fitting and calibration and requires operational abstention, with nominal acquisition order. The scope-handling gate reports whether that requirement held. Coverage below is an unsupported-transfer diagnostic, not an operational interval guarantee.'));
      if (!arm) { section.append(node('p', 'notice', 'This arm was not reported.')); arms.append(section); continue; }
      const facts = node('dl', 'constrained-arm-facts');
      addFact(facts, 'Panels', exactText(arm.panel_count));
      addFact(facts, 'Candidates', exactText(arm.candidate_count));
      addFact(facts, 'Panels with feasible candidates', exactText(arm.feasible_panel_count));
      addFact(facts, 'Panels without feasible candidates', exactText(arm.no_feasible_panel_count));
      addFact(facts, 'Mixed-feasibility panels', exactText(arm.mixed_feasibility_panel_count));
      addFact(facts, role === 'shift' ? 'Diagnostic simultaneous coverage' : 'Panel simultaneous coverage', rateText(arm.panel_simultaneous_coverage));
      addFact(facts, 'All-optimum retention · feasible panels', rateText(arm.all_optimum_retention));
      addFact(facts, 'Median retained fraction', exactText(arm.median_retained_fraction));
      addFact(facts, 'Lost optimum candidates', exactText(arm.lost_optimum_count));
      addFact(facts, 'False infeasibility exclusions', exactText(arm.false_infeasibility_exclusion_count));
      addFact(facts, 'Actually infeasible certified incumbents', exactText(arm.actually_infeasible_certified_incumbent_count));
      section.append(facts);
      if (role === 'shift') section.append(node('p', 'field-help', 'Retention from abstaining preserves candidates without showing predictive accuracy. Revealed archive values can establish finite-case feasibility; unmeasured feasibility and regret remain uncertified.'));
      section.append(node('p', 'field-help', 'Hit = panels with a revealed feasible candidate / all panels. Success = panels finding a candidate within 0.1 eV of their feasible optimum / panels with a feasible optimum. Budget 0 suggestions are unverified and do not count as hits.'));
      const region = node('div', 'constrained-table-region'); region.tabIndex = 0;
      region.setAttribute('role', 'region'); region.setAttribute('aria-label', `${role === 'primary' ? 'Primary' : 'Shift'} reveal-budget comparisons, scroll horizontally for all policies`);
      const table = node('table', 'constrained-table');
      table.append(node('caption', 'sr-only', 'Verified feasible hits and successes within 0.1 eV of optimum, by reveal budget and policy. Each count shows its reported denominator.'));
      const head = node('thead'), headers = node('tr');
      for (const text of ['Reveals per panel', ...policies.map(([, name]) => name)]) { const cell = node('th', '', text); cell.scope = 'col'; headers.append(cell); }
      head.append(headers); table.append(head);
      const body = node('tbody');
      for (const budget of budgets) {
        const row = node('tr', budget === 4 ? 'primary-budget' : ''); row.dataset.budget = String(budget);
        const label = node('th', '', budget); label.scope = 'row';
        if (budget === 4) label.append(node('span', 'budget-primary', 'Primary comparison'));
        row.append(label);
        for (const [policy] of policies) {
          const metrics = arm.policy_curves?.[policy]?.[String(budget)];
          const cell = node('td'); cell.dataset.policy = policy;
          if (!metrics) cell.append(node('span', '', 'Unavailable'));
          else {
            cell.append(node('span', 'budget-measure', `Hit ${rateText(metrics.feasible_hit)}`), node('span', 'budget-measure', `Success ${rateText(metrics.within_0_1_ev_success)}`));
            const excluded = metrics.within_0_1_ev_success?.undefined;
            if (excluded !== null && excluded !== undefined && String(excluded) !== '0') cell.append(node('small', 'budget-undefined', `${exactText(excluded)} panel(s) have no defined optimum.`));
          }
          row.append(cell);
        }
        body.append(row);
      }
      table.append(body); region.append(table); section.append(region);
      section.append(node('p', 'field-help', 'Budget 4 was fixed before outcomes. These counts do not establish superiority outside this archive. Primary comparisons use random seed 0; the other random orders are sensitivity analyses, not independent experiments.'));
      if (arm.paired_budget4) {
        const details = node('details', 'protocol-details'); details.append(node('summary', '', 'Budget 4 paired comparisons'));
        for (const [key, comparison] of Object.entries(arm.paired_budget4)) {
          const title = policies.find(([id]) => id === key)?.[1] || pretty(key);
          details.append(node('h4', '', `Interval acquisition versus ${title}`));
          details.append(node('p', '', `Wins ${exactText(comparison.wins)} · losses ${exactText(comparison.losses)} · ties ${exactText(comparison.ties)} · feasible-panel denominator ${exactText(comparison.feasible_panel_denominator)}.`));
          details.append(node('p', '', `Reported success-fraction difference: ${exactText(comparison.paired_success_fraction_difference)}. One-sided paired sign-test p: ${exactText(comparison.one_sided_sign_test_p)}; provisional threshold: ${exactText(comparison.multiplicity_threshold)}.`));
          details.append(node('p', '', comparison.interpretation || 'The independent-panel premise is unverified. Shared calibration and chemical dependence prevent independently confirmed superiority.'));
        }
        section.append(details);
      }
      const sensitivity = arm.random_sensitivity?.budgets;
      if (sensitivity) {
        const details = node('details', 'protocol-details'); details.append(node('summary', '', 'All-random-order sensitivity'));
        for (const budget of budgets) {
          const result = sensitivity[String(budget)];
          if (result) details.append(node('p', '', `Budget ${budget}: success fraction mean ${exactText(result.within_0_1_ev_success_mean)}, range ${exactText(result.within_0_1_ev_success_minimum)} to ${exactText(result.within_0_1_ev_success_maximum)} across ${exactText(result.defined_seed_count)} / ${exactText(result.seed_count)} defined random orders.`));
        }
        section.append(details);
      }
      arms.append(section);
    }
    const protocol = $('constrained-protocol'); protocol.replaceChildren();
    const shown = ['schema', 'protocol_id', 'protocol_commit', 'protocol_sha256', 'source', 'source_receipt_sha256', 'freeze_receipt_sha256', 'model_digest', 'target_seal', 'premise_status', 'calibration', 'training_calibration_cost', 'full_report_identity', 'full_report_sha256', 'full_report_path', 'reproduction', 'interpretation'];
    for (const key of shown) {
      if (report[key] === undefined) continue;
      const item = node('div', 'constrained-metadata'); item.append(node('h4', '', pretty(key)));
      item.append(node('pre', '', typeof report[key] === 'object' ? JSON.stringify(report[key], null, 2) : exactText(report[key]))); protocol.append(item);
    }
    status.hidden = true; content.hidden = false;
  }
  async function loadBenchmarks() {
    $('benchmark-status').hidden = false;
    $('benchmark-status').className = 'notice';
    $('benchmark-status').textContent = 'Running the known-answer suite and loading recorded archive evaluations…';
    try {
      const report = await api('/api/benchmarks');
      renderKnown(report.known_answers); renderArchives(report.archived, report.additional_archived); renderConstrained(report.constrained_archived);
      if (!$('refresh-benchmarks')) {
        const refresh = node('button', 'button button-outline button-small', '↻ Run known-answer suite again');
        refresh.id = 'refresh-benchmarks'; refresh.addEventListener('click', loadBenchmarks);
        $('suite-metrics').insertAdjacentElement('afterend', refresh);
      }
      $('benchmark-content').hidden = false;
      $('benchmark-status').hidden = true;
      state.benchmarksLoaded = true;
    } catch (error) {
      $('benchmark-status').className = 'notice error';
      $('benchmark-status').replaceChildren(document.createTextNode(error.message + ' '));
      const retry = node('button', 'text-button', 'Retry'); retry.addEventListener('click', loadBenchmarks); $('benchmark-status').append(retry);
    }
  }
  $('case-select').addEventListener('change', (event) => loadCase(event.target.value));
  $('problem-json').addEventListener('input', () => {
    state.raw = $('problem-json').value; state.caseId = null; state.metadata = null; $('case-select').value = '';
    invalidate();
    try { state.problem = parseForDisplay(state.raw); renderOverview(); notify('Inputs changed. Build a new pool before evaluating outcomes.'); }
    catch { state.problem = null; renderOverview(); notify('The draft is not valid JSON yet. Complete the edit before building the pool.'); }
  });
  $('problem-upload').addEventListener('change', async (event) => {
    const file = event.target.files[0]; if (!file) return;
    invalidate();
    const revision = state.revision;
    try {
      const raw = await file.text();
      if (revision === state.revision) { setRaw(raw); $('case-select').value = ''; $('json-editor').open = false; }
    }
    catch (error) { notify(`Could not read this file: ${error.message}`, 'error'); }
    finally { event.target.value = ''; }
  });
  $('outcomes-upload').addEventListener('change', async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const revision = state.revision;
    try { const raw = await file.text(); if (revision === state.revision) await replay(raw); }
    catch (error) { notify(`Could not read this file: ${error.message}`, 'error'); }
    finally { event.target.value = ''; }
  });
  $('analyze').addEventListener('click', analyze);
  $('replay-builtin').addEventListener('click', () => replay());
  $('download-certificate').addEventListener('click', () => {
    if (state.certificate) download(state.certificate, `lupine-certificate-${String(state.certificate.scenario_id).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  });
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    if (state.certificate) renderPool();
  }));
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); setView('workbench'); });
  window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
  async function start() {
    try {
      const catalog = await api('/api/catalog'); state.catalog = list(catalog.cases);
      $('case-select').replaceChildren(node('option', '', 'Select a known-answer case'));
      $('case-select').firstChild.value = '';
      for (const entry of state.catalog) { const option = node('option', '', entry.title || entry.id); option.value = entry.id; $('case-select').append(option); }
      if (state.catalog.length) await loadCase(state.catalog[0].id);
      else notify('No built-in cases are available. Upload a problem to begin.');
    } catch (error) {
      $('case-select').replaceChildren(node('option', '', 'Cases unavailable'));
      notify(`Could not load built-in cases. ${error.message} You can still upload a problem.`, 'error');
    }
    setView(location.hash.slice(1));
  }
  start();
})();
