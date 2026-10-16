/* Outcome-free study planning. All probability/rank arithmetic runs in Python. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const scalar = (id) => $(id).value.trim();
  const count = (id) => {
    const raw = scalar(id);
    if (!/^(0|[1-9][0-9]{0,2})$/.test(raw) || Number(raw) > 256) {
      throw new Error('Panel counts must be integers from 0 to 256.');
    }
    return Number(raw);
  };
  const fact = (target, label, value) => {
    const item = node('div');
    const text = String(value);
    const field = node('dd', text.length > 96 ? 'planning-exact-long' : '', text);
    if (text.length > 96) {
      field.tabIndex = 0;
      field.setAttribute('role', 'region');
      field.setAttribute('aria-label', `${label}; full exact value, scroll vertically`);
    }
    item.append(node('dt', '', label), field);
    target.append(item);
  };
  const configurations = [
    {
      id: 'pool', endpoint: '/api/plan-pool',
      schema: 'lupine.discovery.pool_threshold_plan.v1',
      filename: 'lupine-pool-threshold-plan.json',
      request: () => ({ calibration_count: count('pool-plan-count'), alpha: scalar('pool-plan-alpha'),
        cutoff: scalar('pool-plan-cutoff'), iid_score_probability: scalar('pool-plan-probability') || null }),
      render: (target, plan) => {
        target.append(node('h3', '', plan.finite_rank ? 'Finite rank; usefulness unestablished' : 'Rank infeasible; whole-universe fallback'));
        const facts = node('dl', 'calibration-facts');
        fact(facts, 'Calibration panels / required rank', `${plan.calibration_count} / ${plan.rank}`);
        fact(facts, 'Minimum panels permitting finite rank', plan.minimum_finite_calibration_count);
        fact(facts, 'Scores allowed above cutoff', plan.tolerated_above_cutoff === null ? 'No finite rank' : plan.tolerated_above_cutoff);
        fact(facts, 'Threshold event', `τ ≤ ${plan.cutoff}`);
        fact(facts, 'Hypothetical IID p', plan.iid_score_probability === null ? 'Unknown — not supplied' : plan.iid_score_probability);
        fact(facts, 'Exact threshold-event probability', plan.threshold_event_probability === null
          ? 'Unknown — p was not supplied' : plan.threshold_event_probability);
        target.append(facts);
        target.append(node('p', 'field-help', plan.finite_rank
          ? 'A finite rank permits an observed order statistic. It does not establish useful reduction, calibration validity, or scientific adequacy. Any displayed probability assumes the supplied IID score law.'
          : 'No observed order statistic is available at this rank. The bounded-score pool rule falls back to τ = 1, so the event below one is impossible. This deterministic zero supplies no calibrated guarantee.'));
        target.append(node('p', 'field-help', 'Adding calibration panels need not increase this event probability. An all-score-one law never meets a cutoff below one. Selecting or tuning after calibration exposure does not provide conditional coverage.'));
      },
      valid: (plan) => typeof plan.finite_rank === 'boolean'
        && ['rank_infeasible', 'probability_unspecified', 'hypothetical_iid'].includes(plan.planning_status)
        && plan.adequacy_status === 'unestablished'
        && plan.calibrated_guarantee_status === 'not_established_by_planning',
    },
    {
      id: 'zero', endpoint: '/api/plan-zero-loss',
      schema: 'lupine.discovery.zero_failure_resolution_plan.v1',
      filename: 'lupine-zero-failure-resolution-plan.json',
      request: () => ({ loss_ceiling: scalar('zero-plan-ceiling'), significance: scalar('zero-plan-significance'),
        maximum_evaluation_panels: count('zero-plan-maximum') }),
      render: (target, plan) => {
        target.append(node('h3', '', plan.minimum_evaluation_panels === null
          ? 'Insufficient resolution within this cap' : 'Best-case zero-failure resolution'));
        const facts = node('dl', 'calibration-facts');
        fact(facts, 'Failure-probability ceiling', plan.loss_ceiling);
        fact(facts, 'Significance', plan.significance);
        fact(facts, 'Maximum evaluation panels', plan.maximum_evaluation_panels);
        fact(facts, 'Smallest qualifying panel count', plan.minimum_evaluation_panels === null ? 'None within this cap' : plan.minimum_evaluation_panels);
        fact(facts, 'Exact null bound at maximum count', plan.zero_failure_null_bound);
        fact(facts, 'Exact null bound at first qualifying count', plan.minimum_zero_failure_null_bound === null ? 'No qualifying count' : plan.minimum_zero_failure_null_bound);
        fact(facts, 'Power / observed evidence', 'Not computed / no observations');
        target.append(facts, node('p', 'field-help', 'These bounds assume IID failure events conditional on the frozen rule. Zero failures is a hypothetical best case. No true risk, statistical power, observed success, or sampling independence is established.'));
      },
      valid: (plan) => ['sufficient_zero_failure_resolution', 'insufficient_resolution'].includes(plan.resolution_status)
        && plan.power_status === 'not_computed' && plan.observed_evidence_status === 'no_observations',
    },
    {
      id: 'finite', endpoint: '/api/plan-finite-zero-loss', closed: true,
      schema: 'lupine.discovery.finite_zero_failure_resolution_plan.v1',
      filename: 'lupine-finite-zero-failure-resolution-plan.json',
      request: () => ({ population_panels: count('finite-plan-population'),
        loss_ceiling: scalar('finite-plan-ceiling'), significance: scalar('finite-plan-significance'),
        maximum_evaluation_panels: count('finite-plan-maximum') }),
      render: (target, plan) => {
        target.append(node('h3', '', plan.minimum_evaluation_panels === null
          ? 'Insufficient finite-population resolution within this cap' : 'Best-case finite-population resolution'));
        const facts = node('dl', 'calibration-facts');
        fact(facts, 'Complete residual population', plan.population_panels);
        fact(facts, 'Failure-fraction ceiling', plan.loss_ceiling);
        fact(facts, 'Smallest null failure count', plan.minimum_null_failures);
        fact(facts, 'Smallest attainable null failure fraction', plan.attainable_null_failure_fraction);
        fact(facts, 'Significance', plan.significance);
        fact(facts, 'Maximum sampled evaluation panels', plan.maximum_evaluation_panels);
        fact(facts, 'Smallest qualifying sample count', plan.minimum_evaluation_panels === null ? 'None within this cap' : plan.minimum_evaluation_panels);
        fact(facts, 'Exact null bound at maximum count', plan.zero_failure_null_bound);
        fact(facts, 'Exact null bound at first qualifying count', plan.minimum_zero_failure_null_bound === null ? 'No qualifying count' : plan.minimum_zero_failure_null_bound);
        fact(facts, 'Sampling design', 'Uniform without replacement');
        fact(facts, 'Claim scope', 'Frozen residual finite population only');
        fact(facts, 'Future-population risk', 'Not established');
        fact(facts, 'Power / observed evidence', 'Not computed / no observations');
        target.append(facts, node('p', 'field-help', 'Zero failures is hypothetical. The policy, complete panel frame and one binary failure endpoint must be fixed before evaluation selection. No IID model for failure labels is required; the uniform sampling premise remains unverified. A zero bound describes an impossible zero-failure sample under the stated finite null, not a measured success or a guarantee about future materials.'));
      },
      valid: (plan) => {
        const fields = ['population_panels', 'loss_ceiling', 'significance', 'maximum_evaluation_panels',
          'minimum_null_failures', 'attainable_null_failure_fraction', 'minimum_evaluation_panels',
          'zero_failure_null_bound', 'minimum_zero_failure_null_bound', 'resolution_status',
          'adequacy_status', 'power_status', 'observed_evidence_status', 'premise_status',
          'future_population_risk_status', 'claim_scope', 'sampling_design', 'null_hypothesis',
          'premises', 'maximum_panel_count', 'maximum_input_bits'];
        const exact = (value) => typeof value === 'string' && /^(0|[1-9][0-9]*)(\/[1-9][0-9]*)?$/.test(value);
        const sufficient = plan.minimum_evaluation_panels !== null;
        return Object.keys(plan).length === fields.length && fields.every((key) => Object.hasOwn(plan, key))
          && ['population_panels', 'maximum_evaluation_panels', 'minimum_null_failures'].every((key) => Number.isInteger(plan[key]))
          && ['loss_ceiling', 'significance', 'attainable_null_failure_fraction', 'zero_failure_null_bound'].every((key) => exact(plan[key]))
          && (sufficient ? Number.isInteger(plan.minimum_evaluation_panels) && exact(plan.minimum_zero_failure_null_bound)
            : plan.minimum_zero_failure_null_bound === null)
          && plan.resolution_status === (sufficient ? 'sufficient_zero_failure_resolution' : 'insufficient_resolution')
          && plan.adequacy_status === 'unestablished' && plan.power_status === 'not_computed'
          && plan.observed_evidence_status === 'no_observations'
          && plan.future_population_risk_status === 'not_established'
          && plan.claim_scope === 'frozen_residual_finite_population_only'
          && plan.sampling_design === 'uniform_without_replacement'
          && plan.null_hypothesis === 'fixed finite-population failure fraction >= loss_ceiling'
          && plan.maximum_panel_count === 256 && plan.maximum_input_bits === 32
          && Array.isArray(plan.premises) && plan.premises.every((premise) => typeof premise === 'string');
      },
    },
  ];
  for (const config of configurations) {
    const prefix = `${config.id}-plan`;
    const form = $(`${prefix}-form`);
    const status = $(`${prefix}-status`);
    const result = $(`${prefix}-result`);
    const submit = $(`${prefix}-submit`);
    const download = $(`${prefix}-download`);
    let revision = 0;
    let record = null;
    const clear = (message) => {
      revision += 1;
      record = null;
      result.replaceChildren(); result.hidden = true;
      download.disabled = true; submit.disabled = false;
      status.className = 'notice planning-status'; status.textContent = message;
    };
    form.addEventListener('input', () => clear('Inputs changed. Calculate a new plan.'));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clear('Calculating exact prospective arithmetic…');
      const requestRevision = revision;
      submit.disabled = true;
      try {
        const response = await fetch(config.endpoint, { method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(config.request()) });
        const value = await response.json();
        /* review-only mutation */
        if (!response.ok) throw new Error(value.error?.message || 'The plan could not be calculated.');
        if (value.schema !== config.schema || !value.plan || !config.valid(value.plan)
            || (config.closed && (Object.keys(value).length !== 2 || !Object.hasOwn(value, 'schema') || !Object.hasOwn(value, 'plan')))
            || value.plan.premise_status !== 'hypothetical_unverified' || !Array.isArray(value.plan.premises)) {
          throw new Error('The server returned an unsupported planning result.');
        }
        config.render(result, value.plan);
        const assumptions = node('details', 'planning-details');
        assumptions.append(node('summary', '', 'Declared assumptions and exact result'));
        const premises = node('ul');
        for (const premise of value.plan.premises) premises.append(node('li', '', premise));
        assumptions.append(premises, node('pre', '', JSON.stringify(value, null, 2)));
        result.append(assumptions); result.hidden = false;
        record = value; download.disabled = false;
        status.textContent = config.id === 'pool' && value.plan.finite_rank === false
          ? 'Rank infeasible. The zero threshold-event probability is deterministic; no calibrated guarantee follows.'
          : 'Calculated under hypothetical assumptions. Scientific usefulness remains unestablished.';
      } catch (error) {
        /* review-only mutation */
        record = null; result.replaceChildren(); result.hidden = true; download.disabled = true;
        status.className = 'notice planning-status error';
        status.textContent = error.message || 'The plan could not be calculated.';
      } finally {
        if (revision === requestRevision) submit.disabled = false;
      }
    });
    download.addEventListener('click', () => {
      if (record === null || download.disabled) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(record)], { type: 'application/json' }));
      const link = node('a'); link.href = url; link.download = config.filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
})();
