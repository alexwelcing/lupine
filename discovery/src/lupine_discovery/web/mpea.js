/* Read-only presentation of the separately audited archival aggregate report. */
(() => {
  'use strict';
  const completeSchema = 'lupine.discovery.mpea.evaluation_public.v1';
  const unavailableSchema = 'lupine.discovery.mpea.unavailable_public.v1';
  const policies = ['primary', 'stopped', 'processing', 'objective_only', ...Array.from({length: 20}, (_, i) => `random_${i}`)];
  const names = {primary: 'Source-balanced 5NN', stopped: '5NN stopped at pool cost', processing: 'Processing median', objective_only: 'Objective-only 5NN'};
  const text = value => value === null || value === undefined ? 'Unavailable' : String(value);
  const title = value => String(value).replaceAll('_', ' ').toLowerCase();
  const node = (tag, content, className = '') => {
    const result = document.createElement(tag);
    if (content !== undefined) result.textContent = content;
    if (className) result.className = className;
    return result;
  };
  const fact = (list, label, value) => {
    const row = node('div'); row.append(node('dt', label), node('dd', text(value))); list.append(row);
  };
  const details = (label, child) => {
    const result = node('details', undefined, 'protocol-details');
    result.append(node('summary', label), child); return result;
  };
  const countFacts = values => {
    const list = node('dl', undefined, 'constrained-arm-facts');
    for (const [key, value] of Object.entries(values || {})) fact(list, title(key), value);
    return list;
  };
  const binary = metric => {
    if (!metric || metric.rate === null) return 'Unavailable';
    return `${text(metric.success_count)} / ${text(metric.known_count)} known; ${text(metric.panel_denominator)} assigned; ${text(metric.unavailable_count)} unavailable`;
  };
  const numeric = metric => {
    if (!metric || metric.mean === null) return 'Unavailable';
    return `${text(metric.mean)} · ${text(metric.known_count)} / ${text(metric.panel_denominator)} defined`;
  };
  const policyName = policy => names[policy] || `Hash control ${policy.slice(7)}`;

  function comparison(report, population, view, selected, sameCost = false) {
    const region = node('div', undefined, 'constrained-table-region');
    region.tabIndex = 0; region.setAttribute('role', 'region');
    region.setAttribute('aria-label', `${population} ${sameCost ? 'same pool cost' : 'fixed budget'} policy comparison`);
    const table = node('table', undefined, 'constrained-table');
    table.append(node('caption', sameCost
      ? 'All policies at the actual pool cost K of each panel. Cost and outcome denominators remain explicit.'
      : 'Any-optimum hits and total recorded-row bundle requests at each fixed per-panel cap.'));
    const header = node('tr');
    const budgets = [0, 1, 2, 4, 8, 16, 32];
    for (const label of ['Policy', ...(sameCost ? ['Any-optimum hit', 'Total bundle requests', 'Mean regret (MPa)'] : budgets.map(b => `Cap ${b}`))]) {
      const cell = node('th', label); cell.scope = 'col'; header.append(cell);
    }
    const head = node('thead'); head.append(header); table.append(head);
    const body = node('tbody');
    for (const policy of selected) {
      const result = report.payload.policy_metrics[population][policy];
      const row = node('tr'); row.dataset.mpeaPolicy = policy;
      const label = node('th', policyName(policy)); label.scope = 'row'; row.append(label);
      if (sameCost) {
        const metrics = result.same_actual_pool_cost[view];
        row.append(node('td', binary(metrics.any_optimum_hit)), node('td', text(metrics.actual_bundle_cost.sum)), node('td', numeric(metrics.regret)));
      } else {
        for (const budget of budgets) {
          const snapshot = result.budget_snapshots.find(item => item.requested_cap === budget);
          const metrics = snapshot.metrics[view];
          const cell = node('td'); cell.dataset.mpeaBudget = String(budget);
          cell.append(node('span', binary(metrics.any_optimum_hit), 'budget-measure'),
            node('small', `Bundle requests: ${text(metrics.actual_bundle_cost.sum)}`, 'budget-undefined'));
          row.append(cell);
        }
      }
      body.append(row);
    }
    table.append(body); region.append(table); return region;
  }

  function renderPopulation(report, population) {
    const payload = report.payload;
    const result = payload.population_metrics[population];
    const calibration = payload.calibration_summary[population];
    const section = node('section', undefined, 'panel constrained-arm'); section.dataset.mpeaPopulation = population;
    section.append(node('h3', population === 'primary' ? 'Primary · every assigned record' : 'Secondary · complete recorded endpoints'));
    section.append(node('p', population === 'primary'
      ? 'Original records remain assigned. Any undefined endpoint among all 40 reserved panels withholds the primary sampling premise and screening.'
      : 'The predeclared complete-record subset preserves every assigned source panel, including empty panels. This result applies only to that subset.', 'field-help'));
    const calibrationFacts = node('dl', undefined, 'constrained-arm-facts');
    fact(calibrationFacts, 'Calibration status', calibration.status);
    fact(calibrationFacts, 'Sampling premise', calibration.premise_status);
    fact(calibrationFacts, 'Alpha', calibration.alpha);
    fact(calibrationFacts, 'Calibration panels / order statistic', `${calibration.n} / ${calibration.k}`);
    fact(calibrationFacts, 'Prefix threshold', calibration.threshold);
    fact(calibrationFacts, 'Unknown calibration scores', calibration.unknown_score_count);
    fact(calibrationFacts, 'Empty calibration panels', calibration.empty_calibration_panels);
    fact(calibrationFacts, 'Infeasible calibration panels', calibration.complete_infeasible_calibration_panels);
    fact(calibrationFacts, 'All-optimum retention · observed feasible panels', binary(result.pool.observed_feasible_panels.all_optima_retained));
    fact(calibrationFacts, 'Mean pool fraction · observed feasible panels', numeric(result.pool_fraction_observed_feasible));
    section.append(calibrationFacts, node('p', [...calibration.reasons, ...calibration.study_reasons].map(title).join(' · ') || 'No additional calibration reasons.', 'field-help'));
    section.append(node('p', calibration.conditional_guarantee || 'No finite conditional retention statement is available.'));
    section.append(node('p', 'The finite claim is marginal for one future panel under its stated score-law premise. It does not certify feasibility, all 20 evaluation panels together, or reliability after conditioning on the observed calibration.', 'notice'));
    section.append(details('Population counts and retained-pool shapes', (() => {
      const content = node('div'); content.append(countFacts(result.counts), countFacts(calibration.decision_counts)); return content;
    })()));
    const label = node('label', 'Comparison denominator ', 'field-label');
    const select = node('select'); select.setAttribute('aria-label', `${population} comparison denominator`);
    for (const [value, caption] of [['assigned_panels', 'All assigned panels'], ['observed_feasible_panels', 'Truth-complete panels with a feasible record']]) {
      const option = node('option', caption); option.value = value; select.append(option);
    }
    label.append(select); section.append(label);
    const tables = node('div');
    function refresh() {
      tables.replaceChildren(comparison(report, population, select.value, policies.slice(0, 4)),
        details('All 20 hash controls at every budget', comparison(report, population, select.value, policies.slice(4))),
        details('All 24 policies at the same actual pool cost', comparison(report, population, select.value, policies, true)));
    }
    select.addEventListener('change', refresh); refresh(); section.append(tables);
    section.append(node('p', 'One request reveals the archived yield-strength/elongation bundle for one record, including an unresolved bundle. This is an information cost. Means use only defined values; unavailable counts remain in the exported report. A stopped policy and its full ranking have identical discoveries through the same cost K.', 'field-help'));
    return section;
  }

  function render(report) {
    const status = document.getElementById('mpea-status');
    const content = document.getElementById('mpea-content');
    content.replaceChildren(); content.hidden = true; status.hidden = false; status.className = 'notice';
    if (!report) { status.textContent = 'The archival study has no bundled result yet. No measured outcome is available.'; return; }
    try {
      if (![completeSchema, unavailableSchema].includes(report.schema) || report.protocol_id !== 'mpea-t25-archival-v1'
          || !['synthetic_fixture', 'registered_original', 'registered_reproduction'].includes(report.execution_kind)) throw new Error('Unsupported report');
      const payload = report.payload;
      const complete = report.schema === completeSchema;
      if (complete ? report.status !== 'COMPLETE' || !['GO_DESIGN_INDEPENDENT_STUDY', 'NO_GO_ARCHIVAL_USEFULNESS'].includes(payload.overall_verdict)
        : !['BLOCKED', 'INCOMPLETE', 'NO_GO_INSUFFICIENT_DEVELOPMENT'].includes(report.status) || payload.overall_verdict !== null) throw new Error('Unsupported outcome');
      const fragment = document.createDocumentFragment();
      const label = report.execution_kind === 'synthetic_fixture' ? 'SYNTHETIC CONTROL · no measured archive result' : 'REGISTERED ARCHIVAL REPLAY · experimental records';
      fragment.append(node('p', label, 'notice'));
      const verdict = node('h3', complete ? title(payload.overall_verdict) : title(report.status)); verdict.id = 'mpea-verdict'; verdict.dataset.status = complete ? payload.overall_verdict : report.status;
      fragment.append(verdict, node('p', complete
        ? (payload.overall_verdict === 'GO_DESIGN_INDEPENDENT_STUDY' ? 'The frozen gates support designing a further independent study. Physical performance and deployment remain unqualified.' : 'The complete archival evaluation did not meet all frozen usefulness gates. Every failed gate remains visible below.')
        : 'The study did not complete a scientific usefulness evaluation. No overall performance verdict is available.'));
      const facts = node('dl', undefined, 'constrained-arm-facts');
      if (payload.funnel) {
        for (const [key, value] of Object.entries(payload.funnel.counts)) fact(facts, title(key), value);
        for (const [role, value] of Object.entries(payload.funnel.roles)) fact(facts, `${title(role)} · rows / source groups`, value ? `${value.rows} / ${value.source_groups}` : null);
      }
      if (complete) {
        fact(facts, 'Elongation requirement (percentage points)', payload.derived_threshold.value);
        fact(facts, 'Threshold origin', 'Lower median of complete development records; not a power-plant design requirement');
        fact(facts, 'All 40 primary panels have defined endpoints', payload.all_40_primary_endpoints_defined ? 'Yes' : 'No');
        fact(facts, 'Completed / scheduled policy runs', `${payload.run_accounting.completed_runs} / ${payload.run_accounting.scheduled_runs}`);
      } else {
        fact(facts, 'Last sealed stage', payload.last_sealed_stage);
        fact(facts, 'Completed policy runs', payload.completed_policy_runs);
        fact(facts, 'Stop reasons', report.reasons.map(title).join(' · '));
      }
      fragment.append(facts);
      if (complete) {
        const gates = node('div', undefined, 'constrained-gates'); gates.id = 'mpea-gates';
        for (const [key, value] of Object.entries(payload.component_verdicts)) {
          const card = node('article', undefined, 'constrained-gate'); card.dataset.mpeaGate = key;
          card.append(node('span', value === null ? 'UNAVAILABLE' : value ? 'PASS' : 'FAIL', `gate-status ${value === null ? 'unknown' : value ? 'pass' : 'fail'}`), node('h4', title(key)),
            node('p', payload.component_reasons[key].map(title).join(' · ') || 'The declared component checks passed.'));
          gates.append(card);
        }
        fragment.append(gates);
        const checks = node('div');
        for (const [key, value] of Object.entries(payload.gate_checks)) checks.append(node('p', `${value ? 'PASS' : 'FAIL'} · ${title(key)} · ${payload.gate_reasons[key].map(title).join(' · ')}`));
        checks.append(countFacts(payload.gate_denominators), node('h4', 'Exact signed gate margins'), countFacts(payload.gate_margins));
        fragment.append(details('Every frozen check, denominator and margin', checks));
        fragment.append(node('p', 'Pool gates use feasible secondary panels F. Ranking gates use their subset D with at least two records, fixed cap 4 and all 20 hash controls. Fewer than 10 panels in D fails adequacy. Panels of size at most 4 limit ranking discrimination at that cap.', 'field-help'));
        for (const population of ['primary', 'secondary']) fragment.append(renderPopulation(report, population));
      }
      const targetCounts = node('div');
      for (const [role, aggregate] of Object.entries(payload.target_status_counts || {})) {
        targetCounts.append(node('h4', title(role)));
        if (!aggregate) { targetCounts.append(node('p', 'Target summary unavailable.')); continue; }
        targetCounts.append(countFacts({rows: aggregate.row_count, complete_rows: aggregate.complete_row_count, complete_source_groups: aggregate.complete_source_group_count}));
        for (const target of ['yield_strength', 'elongation']) {
          targetCounts.append(node('h4', title(target)), countFacts(aggregate.target_status_counts[target]));
          targetCounts.append(details(`${title(target)} · all parser reasons`, countFacts(aggregate.target_reason_counts[target])));
        }
      }
      fragment.append(details('Parsed endpoint states and unresolved records', targetCounts));
      const access = node('div'); access.id = 'mpea-access';
      const accessCounts = report.access.counts;
      access.append(node('p', 'Capturing mixed source bytes is separate from interpreting selected target cells. Unknown counters remain unavailable; these declarations depend on the audited custody execution.'));
      const actorCounts = node('dl', undefined, 'constrained-arm-facts');
      for (const field of ['mixed_source_captures', 'mixed_source_bytes', 'model_visible_bundles', 'calibrator_visible_bundles', 'policy_bundle_requests', 'auditor_unique_bundles']) fact(actorCounts, title(field), accessCounts[field]);
      access.append(actorCounts);
      for (const role of ['DEVELOPMENT', 'CALIBRATION', 'EVALUATION']) {
        access.append(node('h4', title(role)));
        const roleAccess = node('dl', undefined, 'constrained-arm-facts');
        for (const field of ['accumulated_bundles', 'decoded_bundles', 'interpreted_bundles']) fact(roleAccess, title(field), accessCounts[field][role]);
        access.append(roleAccess);
      }
      fragment.append(details('Source capture and role-specific value access', access));
      const costs = node('div');
      if (complete) costs.append(countFacts(payload.costs));
      costs.append(countFacts(report.usage), node('p', 'Resource observations describe this execution. Sampled RSS is not an instantaneous process-tree peak certificate. Logical row requests do not measure laboratory cost.'));
      fragment.append(details('Recorded costs and resource observations', costs));
      const provenance = node('div'); provenance.id = 'mpea-provenance';
      const sourceLabel = report.execution_kind === 'synthetic_fixture' ? 'Intended archival source, not this constructed input' : 'Archival source';
      provenance.append(node('p', `${sourceLabel}: Figshare 10.6084/m9.figshare.12642953.v9 · CC BY 4.0. Scientific report identity: ${text(report.scientific_sha256)}`));
      if (report.registration) provenance.append(node('p', `Registered source commit: ${report.registration.commit}`));
      for (const value of Object.values(payload.scope)) provenance.append(node('p', value));
      fragment.append(details('Scope and provenance', provenance));
      const download = node('button', 'Download displayed archival report', 'button button-outline button-small'); download.id = 'download-mpea'; download.type = 'button';
      download.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(report) + '\n'], {type: 'application/json'}));
        const link = node('a'); link.href = url; link.download = 'lupine-mpea-archival-report.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      fragment.append(download); content.append(fragment); content.hidden = false; status.hidden = true;
    } catch {
      content.replaceChildren(); status.className = 'notice error';
      status.textContent = 'The archival report has an unsupported or incomplete structure. Its results have not been displayed.';
    }
  }
  window.LupineMpea = Object.freeze({render});
})();
