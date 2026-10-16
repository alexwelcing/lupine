/* Descriptive fixed stored-label census. This view never reads individual labels. */
(() => {
  'use strict';
  const schema = 'lupine.rhizo.fixed-stored-census.v1';
  let generation = 0;
  const metrics = ['signed', 'absolute', 'squared'];
  const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const boundedText = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
  const require = condition => { if (!condition) throw new Error('Unsupported or incomplete stored-label report'); };
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const keys = (value, expected) => object(value) && Object.keys(value).sort().join('|') === [...expected].sort().join('|');
  function rational(value, nonnegative = false) {
    require(keys(value, ['numerator', 'denominator']));
    require(typeof value.numerator === 'string' && typeof value.denominator === 'string');
    require(value.numerator.length <= 5001 && value.denominator.length <= 2500);
    require(/^(0|-?[1-9][0-9]*)$/.test(value.numerator) && /^[1-9][0-9]*$/.test(value.denominator));
    require(!nonnegative || !value.numerator.startsWith('-'));
    return value.denominator === '1' ? value.numerator : `${value.numerator}/${value.denominator}`;
  }
  function validate(report) {
    require(object(report) && report.schema === schema && report.status === 'DESCRIPTIVE_CENSUS_COMPLETE');
    require(report.reason === 'ALL_FIXED_STORED_DISCREPANCIES_COMPUTED');
    require(report.scientific_status === 'NOT_ADMITTED' && report.actual_reference_choice === 'UNKNOWN');
    require(report.metric_interpretation === 'EXACT_DESCRIPTIVE_STORED_LABEL_DISCREPANCIES_NOT_PHYSICAL_ERROR_ESTIMATES');
    require(report.sign_convention === 'STORED_PREDICTION_MINUS_STORED_REFERENCE');
    require(typeof report.synthetic === 'boolean' && report.output_error === null);
    require(report.fixed_position_weight === 1 && report.model_ranking_or_winner === null && report.tolerance_success_criterion === null);
    require(report.reference_choice_reconstructed === false && report.binder_executed === false && report.reference_or_bound_objects_read === false);
    require(object(report.counts) && report.counts.fixed_ids === 36 && report.counts.fixed_positions === 144 && report.counts.groups === 16 && report.counts.reference_equality_groups === 36);
    require(object(report.exposure) && report.exposure.fresh_holdout_claim === false);
    require(Array.isArray(report.groups) && report.groups.length === 16);
    require(Array.isArray(report.reference_equality) && report.reference_equality.length === 36);
    const groups = [...report.groups].sort((a, b) => order(JSON.stringify([a.model_id, a.property, a.unit]), JSON.stringify([b.model_id, b.property, b.unit])));
    const seen = new Set(), models = new Set(), properties = new Set(), allIds = new Set(), modelIds = new Map();
    for (const group of groups) {
      require(object(group) && [group.model_id, group.property, group.unit, group.squared_unit].every(boundedText));
      require(group.count === 9 && group.fixed_position_weight === 1 && group.metric_interpretation === 'STORED_LABEL_DISCREPANCIES');
      require((group.unit === 'eV' && group.squared_unit === 'eV^2') || (group.unit === 'J/m^2' && group.squared_unit === '(J/m^2)^2'));
      require(Array.isArray(group.unit_ids) && group.unit_ids.length === 9 && group.unit_ids.every(boundedText) && new Set(group.unit_ids).size === 9);
      const fixedIds = JSON.stringify([...group.unit_ids].sort());
      require(!modelIds.has(group.model_id) || modelIds.get(group.model_id) === fixedIds); modelIds.set(group.model_id, fixedIds);
      group.unit_ids.forEach(id => allIds.add(id));
      const key = JSON.stringify([group.model_id, group.property, group.unit]);
      require(!seen.has(key)); seen.add(key); models.add(group.model_id); properties.add(JSON.stringify([group.property, group.unit]));
      for (const metric of metrics) for (const summary of ['sum', 'mean']) rational(group[`${summary}_${metric}_discrepancy`], metric !== 'signed');
    }
    require(models.size === 4 && properties.size === 4 && allIds.size === 36);
    const refs = [...report.reference_equality].sort((a, b) => order(JSON.stringify([a.material, a.structure, a.property, a.unit]), JSON.stringify([b.material, b.structure, b.property, b.unit])));
    const refKeys = new Set(), materials = new Set();
    for (const ref of refs) {
      require(object(ref) && [ref.material, ref.structure, ref.property, ref.unit].every(boundedText));
      require(ref.count === 4 && Array.isArray(ref.model_ids) && ref.model_ids.length === 4 && new Set(ref.model_ids).size === 4 && ref.model_ids.every(id => models.has(id)));
      require(['ALL_STORED_REFERENCES_EQUAL', 'STORED_REFERENCES_DIFFER'].includes(ref.stored_reference_equality));
      require(typeof ref.token_spellings_equal === 'boolean' && typeof ref.citation_literals_equal === 'boolean');
      require(ref.actual_reference_choice === 'UNKNOWN' && ref.common_physical_truth_established === false);
      require(!ref.token_spellings_equal || ref.stored_reference_equality === 'ALL_STORED_REFERENCES_EQUAL');
      const key = JSON.stringify([ref.material, ref.structure, ref.property, ref.unit]);
      require(!refKeys.has(key) && properties.has(JSON.stringify([ref.property, ref.unit]))); refKeys.add(key); materials.add(JSON.stringify([ref.material, ref.structure]));
    }
    require(materials.size === 9);
    return {groups, refs};
  }
  function table(id, headers, rows, caption) {
    const region = node('div', undefined, 'constrained-table-region');
    region.tabIndex = 0; region.setAttribute('role', 'region'); region.setAttribute('aria-label', caption); region.id = id;
    const result = node('table', undefined, 'constrained-table'); result.append(node('caption', caption));
    const head = node('thead'), header = node('tr');
    for (const title of headers) { const cell = node('th', title); cell.scope = 'col'; header.append(cell); }
    head.append(header); result.append(head);
    const body = node('tbody');
    for (const values of rows) {
      const row = node('tr');
      values.forEach((value, i) => { const cell = node(i ? 'td' : 'th', String(value)); if (!i) cell.scope = 'row'; row.append(cell); });
      body.append(row);
    }
    result.append(body); region.append(result); return region;
  }
  function details(label, content) {
    const element = node('details', undefined, 'protocol-details'); element.append(node('summary', label), content); return element;
  }
  function render(report) {
    const revision = ++generation;
    const status = document.getElementById('recorded-census-status'), content = document.getElementById('recorded-census-content');
    content.replaceChildren(); content.hidden = true; status.hidden = false; status.className = 'notice';
    if (!report) { status.textContent = 'No stored-label census is bundled. No numerical result is inferred.'; return; }
    try {
      const {groups, refs} = validate(report), fragment = document.createDocumentFragment();
      const verdict = node('p', report.synthetic ? 'SYNTHETIC CONTROL · no measured stored-label result' : 'Historical stored-label arithmetic · scientific screening NOT ADMITTED', 'notice'); verdict.id = 'recorded-census-verdict';
      fragment.append(verdict, node('p', 'All 144 stored pairs across 36 material/model IDs are included. Each of the 16 groups contains nine material positions with equal weight. Counts are archive positions, not independent experiments.', 'field-help'));
      fragment.append(node('p', 'Signed discrepancy = stored prediction − stored reference. Absolute and squared discrepancies use that same stored pair. These are exact arithmetic summaries of serialized values, not physical error estimates. NULL tolerances provide no success threshold.', 'field-help'));
      fragment.append(table('recorded-census-means', ['Model / property', 'Positions', 'Signed mean', 'Absolute mean', 'Unit', 'Squared mean', 'Squared unit'],
        groups.map(g => [`${g.model_id} / ${g.property}`, g.count, rational(g.mean_signed_discrepancy), rational(g.mean_absolute_discrepancy), g.unit, rational(g.mean_squared_discrepancy), g.squared_unit]),
        'All 16 fixed groups · exact stored-label discrepancy means, ordered by identity'));
      fragment.append(details('All exact sums and fixed contributing IDs', table('recorded-census-sums', ['Model / property', 'Signed sum', 'Absolute sum', 'Unit', 'Squared sum', 'Squared unit', 'Contributing stored IDs'],
        groups.map(g => [`${g.model_id} / ${g.property}`, rational(g.sum_signed_discrepancy), rational(g.sum_absolute_discrepancy), g.unit, rational(g.sum_squared_discrepancy), g.squared_unit, g.unit_ids.join(', ')]),
        'Exact sums for every group; each sum has nine positions')));
      fragment.append(node('h3', 'Do the models use the same stored reference?', 'constrained-subheading'),
        node('p', 'Equality below compares stored rational values, token spellings and citation strings separately. Equal values do not establish common physical truth or equivalent geometry. Different values do not identify the correct reference or prove a binding error. Historical reference choice remains UNKNOWN; no model winner is selected.', 'field-help'));
      const equalityText = value => value ? 'Equal' : 'Different';
      fragment.append(details('All 36 material/property reference checks', table('recorded-census-references', ['Material / structure / property', 'Unit', 'Models', 'Stored rational values', 'Token spellings', 'Citation strings'],
        refs.map(r => [`${r.material} / ${r.structure} / ${r.property}`, r.unit, r.model_ids.join(', '), r.stored_reference_equality === 'ALL_STORED_REFERENCES_EQUAL' ? 'Equal' : 'Different', equalityText(r.token_spellings_equal), equalityText(r.citation_literals_equal)]),
        'Four stored model references in each of 36 fixed material/property groups')));
      fragment.append(node('p', (report.synthetic ? 'This generated fixture provides no measured historical result. ' : 'This exposed historical census provides descriptive evidence only. ') + 'Neither establishes a fresh holdout, training independence, uncertainty coverage, primary-source extraction accuracy or operating-condition transfer. No fit, ranking, threshold or scientific pass decision is introduced.', 'field-help'));
      const exportButton = node('button', '↓ Complete stored-label census', 'button button-outline button-small'); exportButton.id = 'download-recorded-census'; exportButton.type = 'button';
      exportButton.addEventListener('click', () => {
        if (revision !== generation) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + '\n'], {type: 'application/json'}));
        const anchor = node('a'); anchor.href = url; anchor.download = 'lupine-recorded-label-census.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
      });
      fragment.append(exportButton); content.append(fragment); status.hidden = true; content.hidden = false;
    } catch {
      status.textContent = 'The stored-label census is blocked, incomplete or unsupported. No numerical summary is displayed.';
    }
  }
  window.LupineRecordedCensus = Object.freeze({render});
})();
