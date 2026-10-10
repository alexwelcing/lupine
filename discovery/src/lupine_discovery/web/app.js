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
    const constraints = Object.keys(scenario.constraints || {});
    $('case-kind').textContent = state.metadata ? pretty(state.metadata.kind || 'known-answer case').toUpperCase() : 'CUSTOM INPUT';
    $('candidate-count').textContent = `${list(problem.candidates).length} candidates`;
    $('case-title').textContent = state.metadata?.title || scenario.id || 'Untitled scenario';
    $('case-description').textContent = state.metadata?.description || problem.description || 'Supply score bounds and constraints for the candidates in this scenario.';
    $('scenario-objective').textContent = `${pretty(objective.direction || 'minimize')} · ${objective.unit || 'unit not declared'}`;
    $('scenario-constraints').textContent = constraints.length ? `${constraints.join(', ')} ≤ 0` : 'None declared';
    $('scenario-reference').textContent = objective.reference || 'Not declared';
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
    $('empty-state').hidden = true;
    $('analysis-results').hidden = false;
    $('selection-metrics').replaceChildren(
      metric('RETAINED POOL', retained, 'All unresolved candidates remain', `/ ${count}`),
      metric('EXCLUDED', count - retained, `${list(selection.certified_infeasible).length} infeasible · ${list(selection.dominated).length} dominated`),
      metric('CONDITIONAL REGRET BOUND', exactText(selection.regret_bound), selection.incumbent ? `Incumbent: ${selection.incumbent}` : 'No feasible incumbent established'),
    );
    if (!list(selection.possible_feasible).length) {
      $('result-title').textContent = 'No possible feasible candidates';
      $('selection-note').textContent = 'If every supplied interval is sound, this finite candidate universe is infeasible. This does not rule out candidates beyond the input.';
    } else if (!selection.incumbent) {
      $('result-title').textContent = 'Uncertainty keeps the pool open';
      $('selection-note').textContent = 'No candidate is feasible across all its constraint bounds. All possibly feasible candidates remain; an incumbent and regret bound cannot yet be established.';
    } else {
      $('result-title').textContent = `${retained} candidate${retained === 1 ? ' remains' : 's remain'} in the pool`;
      $('selection-note').textContent = 'Conditional guarantee: if the supplied intervals contain the true values, every feasible best candidate in this input is retained. Physical accuracy is not established by this decision.';
    }
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
    $('replay-builtin').hidden = !state.caseId || state.metadata?.has_outcomes === false;
    $('step-prepare').className = 'complete';
    $('step-select').className = 'current';
  }
  function candidateReason(id) {
    const reason = state.certificate.reasons?.[id] || {};
    if (reason.reason === 'constraint_lower_bound_positive') return `Outside constraints: ${list(reason.constraints).join(', ')}.`;
    if (reason.reason === 'incumbent_upper_strictly_below_candidate_lower') return `Worse than ${reason.witness} across all score bounds.`;
    return list(state.certificate.selection.certified_feasible).includes(id) ? 'Feasible across the supplied bounds.' : 'Feasibility or ranking remains unresolved.';
  }
  function renderPool() {
    const selection = state.certificate.selection;
    const retained = new Set(list(selection.retained));
    const candidates = list(state.problem.candidates);
    const numbers = candidates.flatMap((c) => list(c.score).map(ratio));
    const chartUsable = numbers.length > 0 && numbers.every(Number.isFinite);
    let low = chartUsable ? Math.min(...numbers) : 0;
    let high = chartUsable ? Math.max(...numbers) : 1;
    if (low === high) { low -= 1; high += 1; }
    const scaleUsable = chartUsable && Number.isFinite(high - low) && high > low;
    const position = (value) => Math.max(0, Math.min(100, (ratio(value) - low) / (high - low) * 100));
    const table = node('table', 'candidate-table');
    const caption = node('caption', 'sr-only', 'Candidate score intervals and selection decisions. Bar positions are approximate; endpoint labels are exact.');
    const head = node('thead');
    const headRow = node('tr');
    ['Candidate', `Score · ${state.problem.scenario?.objective?.unit || 'declared unit'}`, 'Decision'].forEach((text) => {
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
      scoreCell.append(node('span', 'score-values', `[${candidate.score[0]}, ${candidate.score[1]}]`));
      const decision = node('td');
      decision.append(node('span', `row-status${included ? '' : ' excluded'}`, included ? 'Retained' : 'Excluded'), node('p', 'row-reason', candidateReason(candidate.id)));
      const constraints = Object.entries(candidate.constraints || {});
      if (constraints.length) {
        const details = node('details', 'row-reason');
        details.append(node('summary', '', `${constraints.length} constraint${constraints.length === 1 ? '' : 's'}`));
        for (const [key, interval] of constraints) details.append(node('div', '', `${key}: [${interval[0]}, ${interval[1]}]`));
        decision.append(details);
      }
      row.append(idCell, scoreCell, decision); body.append(row);
    }
    table.append(caption, head, body);
    $('pool-table').replaceChildren(table);
    $('pool-table').tabIndex = 0;
    $('pool-table').setAttribute('role', 'region');
    $('pool-table').setAttribute('aria-label', 'Scrollable candidate interval table');
    if (!filtered.length) $('pool-table').append(node('p', 'empty-filter', 'No candidates in this group.'));
    if (!scaleUsable && filtered.length) $('pool-table').append(node('p', 'field-help', 'Visual scale unavailable for these values. The exact endpoints are shown.'));
  }
  function renderEvidence() {
    const assessments = Object.values(state.certificate.evidence_assessment || {});
    const target = $('evidence-content');
    target.replaceChildren(node('p', 'evidence-summary', 'Evidence links describe the premises. They do not establish physical truth.'));
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
    if (!assessments.length) target.append(node('p', 'field-help', 'No linked evidence was supplied. Interval soundness remains an assumption.'));
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
      busy(true); notify('Building the pool from the declared bounds…');
      // Preserve the original JSON. The server detects duplicate keys and parses
      // exact values; JSON.stringify(JSON.parse(input)) would erase those checks.
      const result = await api('/api/select', `{"problem":${state.raw}}`);
      if (revision !== state.revision) return;
      state.certificate = result; state.replay = null;
      $('replay-results').hidden = true;
      $('replay-tag').textContent = 'NOT YET EVALUATED';
      renderSelection(); notify('Pool built. The decision is fixed before outcomes are evaluated.', 'success');
    } catch (error) { if (revision === state.revision) notify(error.message, 'error'); }
    finally { if (revision === state.revision) busy(false); }
  }
  function addFact(target, label, value) {
    const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); target.append(row);
  }
  function renderReplay(report) {
    const evaluation = report.evaluation || report;
    const target = $('replay-results'); target.hidden = false; target.replaceChildren();
    const refuted = evaluation.empirical_soundness === 'refuted_on_observed_outcomes';
    const complete = evaluation.outcome_completeness === 'complete';
    const supported = evaluation.empirical_soundness === 'supported_on_complete_finite_archive';
    const verdict = refuted ? 'Interval premises failed on observed outcomes.' : supported ? 'All supplied bounds contained the known outcomes in this finite case.' : 'The available outcomes do not establish full coverage.';
    target.append(node('div', `replay-verdict${refuted ? ' fail' : supported ? '' : ' unknown'}`, verdict));
    $('replay-tag').textContent = refuted ? 'COVERAGE FAILURE' : supported ? 'OBSERVED COVERAGE' : 'INCOMPLETE EVIDENCE';
    const facts = node('dl', 'replay-stats');
    addFact(facts, 'All true optima retained', truthText(evaluation.all_true_minimizers_retained));
    addFact(facts, 'Outcome completeness', pretty(evaluation.outcome_completeness || 'unknown'));
    addFact(facts, 'Score coverage', percent(evaluation.score_coverage));
    addFact(facts, 'Constraint coverage', Object.keys(state.problem.scenario?.constraints || {}).length ? percent(evaluation.constraint_coverage) : 'No constraints declared');
    addFact(facts, 'Observed incumbent regret', exactText(evaluation.incumbent_regret));
    addFact(facts, 'Conditional regret bound held', truthText(evaluation.regret_bound_holds));
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
      observations.append(node('li', '', `${id} · score ${score} · constraints ${constraints} · feasible: ${truthText(observation.true_feasible)}`));
    }
    details.append(observations); target.append(details);
    target.append(node('p', 'replay-caveat', refuted ? 'A failed interval premise prevents applying the conditional retention guarantee. This is a measured failure of the supplied bounds, not a contradiction of the theorem.' : complete ? 'This result describes the supplied finite case. It does not establish accuracy for new candidates, new conditions, or a different source of evidence.' : 'Incomplete outcomes cannot establish that every optimum was retained. Keep the unresolved states open.'));
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
  async function loadBenchmarks() {
    $('benchmark-status').hidden = false;
    $('benchmark-status').className = 'notice';
    $('benchmark-status').textContent = 'Running the known-answer suite and loading recorded archive evaluations…';
    try {
      const report = await api('/api/benchmarks');
      renderKnown(report.known_answers); renderArchives(report.archived, report.additional_archived);
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
