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
  const isCoupled = () => state.certificate?.schema === 'lupine.discovery.coupled_certificate.v1';
  const coupledActive = () => isCoupled() && String(state.certificate.coupling?.status).startsWith('conditional_');
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
    $('download-certificate').disabled = value || !state.certificate;
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
      : problem.schema === 'lupine.discovery.pareto_problem.v1' ? 'Compare objective bounds without collapsing tradeoffs into a single score.'
        : problem.schema === 'lupine.discovery.coupled_problem.v1' ? 'Inspect shared affine quantities, exact exclusion proofs, and the separate common-world premise.' : 'Supply score bounds and constraints for the candidates in this scenario.');
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
  function exactDetails(label, value) {
    const details = node('details', 'replay-details exact-details');
    details.append(node('summary', '', label), node('pre', '', JSON.stringify(value, null, 2)));
    return details;
  }
  function affineText(expression) {
    if (!expression || typeof expression !== 'object') return 'Expression unavailable';
    const latents = list(state.problem?.latent_variables);
    const terms = list(expression.coefficients).map((value, index) => `(${exactText(value)}) × ${latents[index]?.id || `z${index}`}`);
    return [...terms, `(${exactText(expression.constant)})`].join(' + ');
  }
  function coupledReason(id) {
    if (!coupledActive()) return 'Screening withheld. No operational feasibility or exclusion claim.';
    const selection = state.certificate.selection;
    if (list(selection.coupled_infeasible).includes(id)) return 'An exact contradiction proves this candidate infeasible within the admitted model.';
    if (list(selection.coupled_dominated).includes(id)) return `${selection.dominance_witnesses?.[id] || 'A witness'} is feasible and strictly better whenever ${id} is feasible (domain Q${id}).`;
    if (list(selection.interval_infeasible).includes(id)) return 'The active model-derived interval proves a violated constraint.';
    if (list(selection.interval_dominated).includes(id)) return 'The active model-derived interval baseline supplies a better feasible candidate.';
    return list(selection.certified_feasible).includes(id) ? 'Conditionally feasible across the model box; optimality remains unresolved.' : 'Retained without a valid exclusion; feasibility or optimality remains unresolved.';
  }
  function renderCoupledSelection() {
    $('coupled-diagnostic').open = false;
    const certificate = state.certificate, selection = certificate.selection;
    const active = coupledActive(), count = list(state.problem.candidates).length, retained = list(selection.retained).length;
    $('empty-state').hidden = true; $('analysis-results').hidden = false; $('calibration-panel').hidden = true;
    $('selection-note').classList.toggle('abstained', !active);
    const labels = {
      conditional_screened: 'Conditional coupled pool', conditional_partially_screened: 'Conditional partial screening',
      unsupported_all_retained: 'Screening withheld · unsupported relation',
      consistency_unresolved_all_retained: 'Screening withheld · consistency unresolved',
      proved_inconsistent_all_retained: 'Model premises inconsistent · all retained',
    };
    $('result-title').textContent = labels[certificate.coupling?.status] || 'Coupled screening status unresolved';
    $('selection-note').textContent = active
      ? 'If one common admissible latent world represents all actual quantities, every tied feasible optimum remains. Retained candidates are unresolved, not certified possible or robust optima. This conservative search does not establish physical validity.'
      : 'All original candidates remain. No operational feasibility or exclusion claim is made. Any smaller model-derived box pool below is a separate diagnostic and cannot replace this decision. Inconsistent model premises do not prove that no material is feasible.';
    if (certificate.coupling?.status === 'conditional_partially_screened') $('selection-note').textContent += ' Checking or search stopped at a work limit; already verified exclusions remain valid, and all others remain retained.';
    $('selection-metrics').replaceChildren(
      metric('ACTUAL RETAINED POOL', retained, active ? 'Conditional common-world retention' : 'Whole-universe fallback', `/ ${count}`),
      metric('OPERATIONAL EXCLUSIONS', count - retained, active ? 'Interval and coupled proofs' : 'Screening withheld'),
      metric('CONDITIONALLY FEASIBLE', list(selection.certified_feasible).length, active ? 'From the active interval baseline' : 'No feasibility certificates in use'),
    );
    renderCoupledModel(); renderPool();
    const evidence = $('evidence-content');
    evidence.replaceChildren(node('p', 'evidence-summary', 'One common latent vector must represent every actual score and constraint. This scientific premise remains unverified.'));
    const facts = node('dl', 'coupled-facts');
    addFact(facts, 'Premise', pretty(certificate.common_world?.premise_status));
    addFact(facts, 'Relation basis', pretty(certificate.common_world?.relation_basis));
    addFact(facts, 'Declared reference', certificate.common_world?.reference || 'Not declared');
    addFact(facts, 'Physical attestation', 'Not established by this program');
    evidence.append(facts);
    const queue = node('div', 'queue-chips');
    for (const id of list(selection.retained)) queue.append(node('span', 'queue-chip', id));
    $('measurement-queue').replaceChildren(queue);
    if (!queue.childElementCount) $('measurement-queue').append(node('p', 'selection-empty', 'No retained candidates in the admitted model.'));
    $('measurement-note').textContent = 'Retained IDs only. No acquisition ranking, coupled incumbent, or coupled regret bound is supplied.';
    $('replay-intro').textContent = 'The actual coupled pool is fixed. Separate outcomes audit retained optima directly. An optional outcome-world point is a separate compatibility check and cannot repair this decision.';
    $('replay-builtin').hidden = !state.caseId || state.metadata?.has_outcomes === false;
    $('step-prepare').className = 'complete'; $('step-select').className = 'current';
  }
  function renderCoupledModel() {
    const certificate = state.certificate, coupling = certificate.coupling || {}, active = coupledActive();
    $('coupled-panel').hidden = false;
    $('coupled-premise').textContent = 'Model consistency and scientific validity are separate. A verified point lies in the mathematical domain; it is not a confirmed physical world.';
    const facts = $('coupled-facts'); facts.replaceChildren();
    addFact(facts, 'Screening state', pretty(coupling.status));
    addFact(facts, 'Selection-time consistency check', pretty(coupling.consistency?.status || 'not checked'));
    addFact(facts, 'Check reason', pretty(coupling.consistency?.reason || 'not available'));
    addFact(facts, 'Supplied selection-time point', coupling.supplied_consistency_point == null ? 'Not supplied' : JSON.stringify(coupling.supplied_consistency_point));
    const latents = $('coupled-latents'); latents.replaceChildren(node('h4', '', 'Shared normalized latent coordinates'));
    const latentList = node('ul', 'observation-list');
    for (const latent of list(state.problem.latent_variables)) latentList.append(node('li', '', `${latent.id}: [${list(latent.bounds).join(', ')}] · unit ${latent.unit} · ${latent.reference}`));
    latents.append(latentList.childElementCount ? latentList : node('p', 'field-help', 'No latent coordinates: every expression is constant. An explicit empty point [] is distinct from a missing point.'));
    const model = $('coupled-model-details'); model.replaceChildren();
    model.append(exactDetails('Objective and constraint scopes', state.problem.scenario), exactDetails('Original coupling rows', state.problem.rows), exactDetails('Sealed model identities', certificate.model_identity), exactDetails('Execution profile and limits', certificate.execution));
    const diagnostic = $('coupled-diagnostic-content'); diagnostic.replaceChildren();
    diagnostic.append(node('p', 'field-help', active ? 'This model-derived box selection supplies the active conditional baseline. It remains separate from the actual coupled result above.' : 'DIAGNOSTIC ONLY · GATE CLOSED. These bounds derive from the same unaccepted model and authorize no operational pruning or feasibility claim.'));
    const box = certificate.diagnostics?.box_selection_diagnostic || {};
    diagnostic.append(node('p', 'diagnostic-pool', `Separate box pool: ${list(box.retained).join(', ') || 'Empty'}. Actual operational pool: ${list(certificate.selection.retained).join(', ') || 'Empty'}.`));
    diagnostic.append(exactDetails('Exact marginal intervals (model-derived)', certificate.diagnostics?.marginal_intervals), exactDetails('Full box diagnostic · its incumbent/regret are not coupled claims', box));
    const proofs = $('coupled-proofs'); proofs.replaceChildren(node('h4', '', 'Exact exclusion proofs'));
    for (const [id, record] of Object.entries(certificate.exclusion_certificates || {})) {
      const proof = record.certificate || {}, card = node('article', 'coupled-proof'); card.dataset.excludedCandidate = id;
      card.append(node('h5', '', `${id} · ${pretty(record.kind)}`));
      if (record.kind === 'dominance') {
        card.append(node('p', '', `${proof.witness_id} is feasible whenever ${id} is feasible, on Q${id}. This is conditional feasibility, not global feasibility throughout P.`));
        card.append(node('p', 'exact-bound', `score(${proof.witness_id}) − score(${id}) ≤ ${exactText(proof.improvement?.upper)} < 0`));
        card.append(node('p', 'field-help', `Exact difference: ${affineText(proof.improvement?.expression)}. Domain: ${proof.improvement?.domain_id || 'undeclared'}`));
      } else card.append(node('p', '', `The domain Q${id}, where this candidate is feasible, has an exact contradiction certificate. This claim is conditional on the admitted model.`));
      card.append(exactDetails('Inspect exact expressions, row multipliers and domains', record)); proofs.append(card);
    }
    if (!Object.keys(certificate.exclusion_certificates || {}).length) proofs.append(node('p', 'field-help', 'No accepted coupled exclusion certificates. Any active interval exclusions are identified in the candidate table.'));
    const assessments = node('details', 'replay-details'); assessments.append(node('summary', '', `All proof assessments (${list(certificate.proof_assessments).length})`));
    for (const item of list(certificate.proof_assessments)) {
      const record = node('div', 'coupled-assessment'); record.dataset.proofStatus = item.check?.status || 'unknown';
      const identity = item.source === 'supplied' ? `Supplied ${item.supplied_id} · input ${item.input_index}` : 'Automatic search';
      record.append(node('strong', '', `${identity} · ${pretty(item.check?.status || 'unknown')}`), node('p', '', `${item.candidate_id || 'Common domain P'}${item.witness_id ? ` ← ${item.witness_id}` : ''} · ${pretty(item.check?.reason || 'No reason supplied')}`), exactDetails('Exact assessment', item));
      assessments.append(record);
    }
    if (!list(certificate.proof_assessments).length) assessments.append(node('p', 'field-help', 'No proof assessments were produced.'));
    proofs.append(assessments);
  }
  function renderCoupledPool() {
    const selection = state.certificate.selection, retained = new Set(list(selection.retained));
    $('pool-heading').textContent = 'Affine quantities & actual decisions';
    $('pool-help').textContent = 'Every formula uses the same normalized latent coordinates. Exact values are shown. Selection comes from the operational receipt, never from the separate box diagnostic.';
    $('pool-legend').hidden = true;
    const table = node('table', 'candidate-table coupled-table');
    table.append(node('caption', 'sr-only', 'Shared affine candidate expressions and actual coupled screening decisions.'));
    const head = node('thead'), headers = node('tr');
    for (const title of ['Candidate', `Affine score · ${state.problem.scenario?.objective?.unit || 'declared unit'}`, 'Actual decision']) { const th = node('th', '', title); th.scope = 'col'; headers.append(th); }
    head.append(headers); const body = node('tbody');
    const candidates = list(state.problem.candidates).filter((row) => state.filter === 'all' || (state.filter === 'retained') === retained.has(row.id));
    for (const candidate of candidates) {
      const included = retained.has(candidate.id), row = node('tr'); row.dataset.candidateId = candidate.id; row.dataset.decision = included ? 'retained' : 'excluded';
      const id = node('th', 'candidate-id', candidate.id); id.scope = 'row';
      const quantity = node('td'); quantity.append(node('code', 'affine-formula', affineText(candidate.score)));
      const constraints = Object.entries(candidate.constraints || {});
      if (constraints.length) {
        const details = node('details', 'row-reason'); details.append(node('summary', '', `${constraints.length} affine constraint${constraints.length === 1 ? '' : 's'}`));
        for (const [key, expression] of constraints) details.append(node('p', '', `${key}: ${affineText(expression)} ≤ 0 · ${state.problem.scenario?.constraints?.[key]?.unit || 'declared unit'} · ${state.problem.scenario?.constraints?.[key]?.reference || 'reference undeclared'}`));
        quantity.append(details);
      }
      const decision = node('td'); decision.append(node('span', `row-status${!coupledActive() ? ' withheld' : included ? '' : ' excluded'}`, included ? 'Retained' : 'Excluded'), node('p', 'row-reason', coupledReason(candidate.id)));
      row.append(id, quantity, decision); body.append(row);
    }
    table.append(head, body); $('pool-table').replaceChildren(table);
    $('pool-table').tabIndex = 0; $('pool-table').setAttribute('role', 'region'); $('pool-table').setAttribute('aria-label', 'Scrollable affine candidate and actual decision table');
    if (!candidates.length) $('pool-table').append(node('p', 'empty-filter', 'No candidates in this group.'));
  }
  function renderSelection() {
    $('coupled-panel').hidden = !isCoupled();
    if (isCoupled()) { renderCoupledSelection(); return; }
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
    if (isCoupled()) { renderCoupledPool(); return; }
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
      const coupled = state.problem.schema === 'lupine.discovery.coupled_problem.v1';
      if (coupled) {
        state.certificate = null; state.replay = null;
        $('analysis-results').hidden = true; $('empty-state').hidden = false;
        $('replay-results').hidden = true; $('replay-results').replaceChildren();
        $('replay-tag').textContent = 'NOT YET EVALUATED';
        $('step-select').className = ''; $('step-replay').className = '';
      }
      busy(true); notify(coupled ? 'Checking shared-model premises, consistency and exact proofs…' : state.problem.schema === 'lupine.discovery.calibrated_problem.v1' ? 'Checking the calibration budget before screening the pool…' : 'Building the pool from the declared bounds…');
      // Preserve the original JSON. The server detects duplicate keys and parses
      // exact values; JSON.stringify(JSON.parse(input)) would erase those checks.
      const result = await api('/api/select', coupled ? JSON.stringify({ problem_raw: state.raw }) : `{"problem":${state.raw}}`);
      if (revision !== state.revision) return;
      state.certificate = result; state.replay = null;
      $('replay-results').hidden = true;
      $('replay-tag').textContent = 'NOT YET EVALUATED';
      renderSelection();
      const withheld = isAbstained() || (isCoupled() && !coupledActive());
      notify(withheld ? 'Screening withheld. All candidates remain; the decision is fixed before outcomes are evaluated.' : 'Pool built. The decision is fixed before outcomes are evaluated.', withheld ? '' : 'success');
    } catch (error) { if (revision === state.revision) notify(error.message, 'error'); }
    finally { if (revision === state.revision) busy(false); }
  }
  function addFact(target, label, value) {
    const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); target.append(row);
  }
  function renderCoupledReplay(report) {
    const audit = report.outcome_audit || {}, world = report.provided_world_audit || {};
    const target = $('replay-results'); target.hidden = false; target.replaceChildren();
    const retained = audit.all_true_minimizers_retained, complete = audit.outcome_completeness === 'complete';
    const noFeasible = audit.retention_status === 'undefined_no_feasible_candidate', empty = audit.retention_status === 'not_evaluated_empty_universe';
    const verdict = retained === false ? 'Actual coupled selection lost a true feasible optimum in the complete reported values.'
      : retained === true ? 'All true feasible optima in the complete reported values survived the actual coupled selection.'
        : noFeasible ? 'The complete reported values contain no feasible candidate. Optimum retention is undefined.'
          : empty ? 'The candidate universe is empty. Optimum retention is not evaluated.'
            : 'Partial outcomes leave full-universe optimum retention unresolved.';
    target.append(node('div', `replay-verdict${retained === false ? ' fail' : retained === true ? '' : ' unknown'}`, verdict));
    $('replay-tag').textContent = retained === false ? 'OPTIMUM LOST' : retained === true ? 'REPORTED OPTIMA RETAINED' : 'RETENTION UNRESOLVED';
    const facts = node('dl', 'replay-stats');
    addFact(facts, 'Actual pool fixed before replay', list(report.decision?.selection?.retained).join(', ') || 'Empty');
    addFact(facts, 'Every true feasible optimum retained', noFeasible || empty ? 'Undefined' : truthText(retained));
    addFact(facts, 'Outcome completeness', pretty(audit.outcome_completeness || 'unknown'));
    addFact(facts, 'Complete candidates', `${exactText(audit.complete_candidate_count)} / ${exactText(audit.universe_count)}`);
    addFact(facts, 'True feasible optimum', exactText(audit.true_feasible_optimum));
    addFact(facts, 'True minimizer IDs', Array.isArray(audit.true_minimizer_ids) ? audit.true_minimizer_ids.join(', ') || 'None' : 'Not established');
    addFact(facts, 'Lost optimum IDs', Array.isArray(audit.lost_optimum_ids) ? audit.lost_optimum_ids.join(', ') || 'None' : 'Not established');
    target.append(facts);
    if (list(audit.missing_truth_ids).length) target.append(node('p', 'field-help', `Missing or partial outcomes: ${audit.missing_truth_ids.join(', ')}. Unknown values are not passes or failures.`));
    const observed = node('details', 'replay-details'); observed.append(node('summary', '', 'Direct observed feasibility and exclusion audit'));
    const observations = node('ul', 'observation-list');
    for (const [id, values] of Object.entries(audit.per_candidate || {})) observations.append(node('li', '', `${id} · observed feasible: ${truthText(values.true_feasible)} · all quantities reported: ${truthText(values.truth_complete)} · actually retained: ${truthText(values.retained)}`));
    observed.append(observations, exactDetails('Exact outcome and exclusion checks', audit)); target.append(observed);
    const worldPanel = node('section', 'provided-world-audit'); worldPanel.id = 'provided-world-audit';
    worldPanel.append(node('h4', '', 'Separate outcome-world point'));
    const worldLabels = {
      not_supplied: 'No outcome-world point supplied. Common-world compatibility is not decided.',
      provided_point_outside_domain: 'The supplied outcome point is outside the mathematical domain.',
      provided_point_mismatch: 'The supplied outcome point does not match all reported quantities.',
      provided_point_consistent_no_reported_values: 'The supplied point is in the domain, but no observed quantities were available to compare.',
      provided_point_matches_reported_values: world.all_quantities_reported ? 'This point fits the complete finite reported values.' : 'This point fits the available reported values; unreported quantities remain unresolved.',
      unresolved_by_work_limit: 'The outcome-point check did not finish within its work limit.',
    };
    worldPanel.append(node('p', 'field-help', worldLabels[world.status] || 'Outcome-point compatibility is not established.'));
    worldPanel.append(node('p', 'field-help', `Compared ${exactText(world.checked_quantity_count)} quantities. This outcome point is separate from the selection-time consistency point and cannot repair screening. A rejected or mismatching point does not rule out another fitting common point; a matching point does not establish physical truth.`));
    if (list(world.mismatches).length) {
      const mismatches = node('ul', 'observation-list status-fail');
      for (const mismatch of world.mismatches) mismatches.append(node('li', '', `${mismatch.candidate_id} / ${mismatch.quantity}: reported ${exactText(mismatch.reported)}, model at this point ${exactText(mismatch.model_at_provided_point)}.`));
      worldPanel.append(mismatches);
    }
    worldPanel.append(exactDetails('Exact supplied-world audit', world)); target.append(worldPanel);
    const coverage = report.diagnostics?.marginal_coverage || {};
    const diagnostic = node('details', 'replay-details coupled-diagnostic'); diagnostic.id = 'coupled-replay-coverage';
    diagnostic.append(node('summary', '', 'Diagnostic marginal coverage · not common-world evidence'));
    for (const [label, values] of [['Score', coverage.score_coverage], ['Constraints', coverage.constraint_coverage]]) {
      diagnostic.append(node('p', 'field-help', `${label}: ${exactText(values?.covered)} / ${exactText(values?.checked)} observed values inside model-derived box intervals; rate ${values?.rate == null ? 'Unavailable' : `${percent(values.rate)} (exact ${values.rate})`}.`));
    }
    diagnostic.append(node('p', 'field-help', 'Even full marginal coverage does not establish a single shared world. Diagnostic coverage is not the actual pool-retention decision and does not upgrade the common-world premise.'), exactDetails('Full marginal diagnostic', coverage)); target.append(diagnostic);
    target.append(node('p', 'replay-caveat', `${complete ? 'This describes only the supplied finite reported values.' : 'Complete scores and constraints for the whole universe are required for a global optimum claim.'} Scientific validity remains unestablished. Retaining everyone can pass retention without any screening benefit.`));
    $('step-select').className = 'complete'; $('step-replay').className = 'current';
  }
  function renderReplay(report) {
    if (isCoupled()) { renderCoupledReplay(report); return; }
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
    if (isCoupled()) { state.replay = null; $('replay-results').replaceChildren(); }
    busy(true); $('replay-results').hidden = true;
    notify('Comparing the fixed pool with separate known outcomes…');
    try {
      if (rawOutcomes !== undefined && !isCoupled()) parseForDisplay(rawOutcomes);
      const result = rawOutcomes === undefined
        ? await api(`/api/cases/${encodeURIComponent(state.caseId)}/replay`, isCoupled() ? JSON.stringify({ problem_raw: state.raw }) : `{"problem":${state.raw}}`)
        : await api('/api/replay', isCoupled() ? JSON.stringify({ problem_raw: state.raw, outcomes_raw: rawOutcomes }) : `{"problem":${state.raw},"outcomes":${rawOutcomes}}`);
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
  function readableExact(value) {
    const text = exactText(value), wrapper = node('div', 'readable-exact');
    if (text.length <= 30) { wrapper.textContent = text; return wrapper; }
    const parts = text.split('/');
    let approximate = ratio(value);
    if (!Number.isFinite(approximate) && parts.length === 2 && /^-?\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      const negative = parts[0].startsWith('-'), numerator = parts[0].replace(/^-/, ''), denominator = parts[1];
      const mantissa = (digits) => Number(digits.slice(0, 15)) / (10 ** (Math.min(15, digits.length) - 1));
      approximate = (negative ? -1 : 1) * mantissa(numerator) / mantissa(denominator) * (10 ** (numerator.length - denominator.length));
    }
    if (Number.isFinite(approximate)) wrapper.append(node('span', 'metric-approximation', `≈ ${approximate.toPrecision(6)}`));
    const detail = node('details', 'exact-number'); detail.append(node('summary', '', 'Exact rational'), node('code', '', text)); wrapper.append(detail);
    return wrapper;
  }
  function dataTable(headers, rows, caption, className = '') {
    const region = node('div', `constrained-table-region ${className}`); region.tabIndex = 0;
    region.setAttribute('role', 'region'); region.setAttribute('aria-label', caption);
    const table = node('table', 'constrained-table'); table.append(node('caption', '', caption));
    const head = node('thead'), header = node('tr');
    for (const label of headers) { const cell = node('th', '', label); cell.scope = 'col'; header.append(cell); }
    head.append(header); table.append(head); const body = node('tbody');
    for (const values of rows) {
      const row = node('tr');
      values.forEach((value, index) => { const cell = node(index ? 'td' : 'th'); if (!index) cell.scope = 'row'; cell.append(value instanceof Node ? value : document.createTextNode(exactText(value))); row.append(cell); });
      body.append(row);
    }
    table.append(body); region.append(table); return region;
  }
  function renderTrainingTail(report) {
    const status = $('training-tail-status'), content = $('training-tail-content'); content.hidden = true; content.replaceChildren(); status.hidden = false;
    status.className = 'notice';
    if (!report || report.available === false) { status.textContent = 'No training-only development report is bundled. No result or model-selection outcome is inferred.'; return; }
    if (report.schema !== 'lupine.discovery.training_tail.dashboard.v1' || list(report.models).length !== 4 || list(report.properties).length !== 2) {
      status.textContent = 'The training-only report has an unsupported or incomplete shape. Its results have not been displayed.'; return;
    }
    const decision = report.decision || {}, noGo = decision.status === 'NO_GO_MODEL_IMPROVEMENT';
    const verdict = node('div', `replay-verdict${noGo ? ' fail' : ' unknown'}`); verdict.id = 'training-tail-verdict'; verdict.dataset.status = decision.status || 'unknown';
    verdict.append(node('strong', '', decision.status || 'Development decision unavailable'), node('p', '', noGo ? 'No ridge model met the predeclared development gates. No replacement model was selected.' : 'A development decision is recorded below. Any advance requires a separately frozen fresh calibration/evaluation protocol.'));
    content.append(verdict, node('p', 'field-help', 'Training-only out-of-fold model selection. No new coverage guarantee, independent selected-model test, model replacement, or change to the original benchmark follows from this report.'));
    const facts = node('dl', 'constrained-arm-facts');
    addFact(facts, 'Training records', exactText(report.scope?.training_count));
    addFact(facts, 'Selected development model', decision.selected_model || 'None');
    addFact(facts, 'Reproduction', pretty(report.reproduction?.execution_status || 'not established'));
    addFact(facts, 'Raw artifacts identical', truthText(report.reproduction?.raw_artifacts_identical));
    addFact(facts, 'Pooled tail rank', `${exactText(report.scope?.pooled_tail_rank)} of ${exactText(report.scope?.training_count)}`);
    addFact(facts, 'Calibration / evaluation targets opened', `${truthText(report.scope?.calibration_targets_opened)} / ${truthText(report.scope?.evaluation_targets_opened)}`);
    content.append(facts);
    content.append(node('p', 'field-help', 'The pooled tail is the tenth-largest residual; each fold tail is the second-largest. These extremes are sensitive to individual records. Approximate display values are labeled ≈; exact rationals remain inspectable and gate decisions come from the recorded exact calculation.'));
    const rows = [];
    for (const model of report.models) for (const property of report.properties) {
      const metrics = model.metrics?.[property.id]?.pooled || {};
      rows.push([`${model.label}${model.lambda == null ? '' : ` · λ=${model.lambda}`} / ${property.label} (${property.unit})`, metrics.count, metrics.tail_rank, readableExact(metrics.tail), readableExact(metrics.mae), readableExact(metrics.maximum), readableExact(metrics.median), readableExact(metrics.p90), readableExact(metrics.p95), readableExact(metrics.p99)]);
    }
    const metrics = dataTable(['Model / property', 'Rows', 'Tail rank', 'Tail error', 'MAE', 'Maximum', 'Median', '90th', '95th', '99th'], rows, 'All four models and both properties · pooled out-of-fold absolute errors', 'training-tail-metrics'); metrics.id = 'training-tail-metrics'; content.append(metrics);
    const folds = node('details', 'protocol-details'); folds.append(node('summary', '', 'Every fold metric and exact tail ranges'));
    for (const model of report.models) for (const property of report.properties) {
      const value = model.metrics?.[property.id] || {};
      folds.append(dataTable(['Fold', 'Rows', 'Tail rank', 'Tail', 'MAE', 'Maximum', 'Median', '90th', '95th', '99th'], list(value.folds).map((item, index) => [index, item.count, item.tail_rank, readableExact(item.tail), readableExact(item.mae), readableExact(item.maximum), readableExact(item.median), readableExact(item.p90), readableExact(item.p95), readableExact(item.p99)]), `${model.label}${model.lambda == null ? '' : ` λ=${model.lambda}`} · ${property.label} (${property.unit})`), exactDetails('Exact fold tail minimum, maximum and range', value.fold_tail_range));
    }
    content.append(folds, node('h3', 'constrained-subheading', 'Every alternative and every gate'));
    const gates = node('div', 'training-tail-gates'); gates.id = 'training-tail-gates';
    const marginLabels = { pooled_tail_10pct: 'Pooled tail improvement ≥10%', pooled_mae_nonincrease: 'Pooled MAE does not increase', pooled_max_10pct_allowance: 'Pooled maximum deterioration ≤10%' };
    for (const model of report.models.filter((item) => item.role !== 'baseline')) {
      const alternative = decision.alternatives?.[model.id] || {}, card = node('article', 'panel training-tail-model'); card.dataset.model = model.id;
      card.append(node('h4', '', `${model.label} · λ=${exactText(model.lambda)}`), node('span', `gate-status ${alternative.status === 'ELIGIBLE' ? 'pass' : 'fail'}`, alternative.status || 'NOT REPORTED'));
      for (const property of report.properties) {
        const ordinary = alternative.ordinary?.[property.id] || {}, guard = alternative.numeric_guard?.[property.id] || {};
        const detail = node('details', 'replay-details training-tail-target'); detail.dataset.property = property.id;
        detail.append(node('summary', '', `${property.label} · ordinary ${ordinary.passed === true ? 'PASS' : ordinary.passed === false ? 'FAIL' : 'UNKNOWN'} · numerical guard ${guard.passed === true ? 'PASS' : guard.passed === false ? 'FAIL' : 'UNKNOWN'}`));
        for (const [name, result] of [['Ordinary gates', ordinary], ['Numerical sensitivity guard', guard]]) {
          detail.append(node('h5', '', name));
          const gateFacts = node('dl', 'constrained-arm-facts');
          addFact(gateFacts, 'Passed', truthText(result.passed)); addFact(gateFacts, 'Positive baseline tail', truthText(result.positive_baseline_tail));
          addFact(gateFacts, 'Strictly improving folds', `${exactText(result.strictly_improving_folds)} / 5 · at least 4 required`);
          addFact(gateFacts, 'Metric inflation', `${exactText(result.metric_inflation)} ${property.unit}`);
          const ratioFact = node('div'); ratioFact.append(node('dt', '', 'Pooled tail / baseline tail'), node('dd')); ratioFact.lastChild.append(readableExact(result.pooled_tail_ratio)); gateFacts.append(ratioFact);
          if (result.ratio_unavailable_reason) addFact(gateFacts, 'Ratio unavailable', pretty(result.ratio_unavailable_reason));
          detail.append(gateFacts, dataTable(['Pooled gate', 'Exact margin (must be ≥ 0)'], Object.entries(result.pooled_margins || {}).map(([key, value]) => [marginLabels[key] || pretty(key), readableExact(value)]), `${property.label} · ${name} · pooled margins`));
          detail.append(dataTable(['Fold', 'Strict tail improvement (> 0 counts)', 'Tail allowance (≥ 0)', 'Maximum allowance (≥ 0)'], list(result.fold_margins).map((value, index) => [index, readableExact(value.strict_tail_improvement), readableExact(value.tail_10pct_allowance), readableExact(value.max_10pct_allowance)]), `${property.label} · ${name} · all fold margins`));
        }
        card.append(detail);
      }
      gates.append(card);
    }
    content.append(gates);
    const failures = decision.failures || {};
    content.append(node('p', 'field-help', Object.keys(failures).length ? 'Recorded fit or execution failures are preserved below.' : 'No fit failures were recorded. A completed fit is not a passed scientific gate.'), exactDetails('All recorded model failures', failures));
    const costs = list(report.resources?.passes).map((pass) => [pass.pass, `${exactText(pass.elapsed_seconds)} s`, `${exactText(pass.process_wall_seconds)} s`, `${exactText(pass.user_cpu_seconds)} / ${exactText(pass.system_cpu_seconds)} s`, `${exactText(pass.peak_rss_kib_linux)} KiB`, pass.completed_ridge_fits, pass.budget_checks]);
    content.append(dataTable(['Pass', 'Measured elapsed', 'Parent wall time', 'User / system CPU', 'Peak RSS', 'Ridge fits', 'Budget checks'], costs, 'Both process passes · recorded computational costs'), exactDetails('Per-stage costs, numerical stack and resource limits', report.resources));
    const provenance = node('details', 'protocol-details'); provenance.id = 'training-tail-provenance'; provenance.append(node('summary', '', 'Frozen protocol, reproduction, provenance & scope'));
    for (const key of ['protocol', 'scientific_result_sha256', 'dashboard_content_sha256', 'reproduction', 'scope', 'provenance', 'projection']) provenance.append(exactDetails(pretty(key), report[key]));
    const links = node('div', 'training-tail-links');
    for (const [label, address] of Object.entries(report.links || {})) {
      try { const url = new URL(address); if (!['https:', 'http:'].includes(url.protocol)) continue; const link = node('a', '', `${pretty(label)} ↗`); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link); } catch { /* Invalid report links are not executable navigation. */ }
    }
    provenance.append(links); content.append(provenance);
    const exportButton = node('button', 'button button-outline button-small', '↓ Training-only report'); exportButton.id = 'download-training-tail'; exportButton.addEventListener('click', () => download(report, 'lupine-training-tail-dashboard.json')); content.append(exportButton);
    status.hidden = true; content.hidden = false;
  }
  async function loadBenchmarks() {
    $('benchmark-status').hidden = false;
    $('benchmark-status').className = 'notice';
    $('benchmark-status').textContent = 'Running the known-answer suite and loading recorded archive evaluations…';
    try {
      const report = await api('/api/benchmarks');
      renderKnown(report.known_answers); renderArchives(report.archived, report.additional_archived); renderConstrained(report.constrained_archived); renderTrainingTail(report.training_tail);
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
