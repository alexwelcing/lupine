/* Read-only published source checks. Identity validation is not scientific admission. */
(() => {
  'use strict';
  const commit = '88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d';
  const digest = '74e8ca924e2eb4524aea2e54362bf78e88208fa8699cdb38a3ad795c91bf2c24';
  const ids = ['li-tensile-v3', 'dryad-dielectric'];
  const statuses = ['BLOCKED_SCHEMA', 'BLOCKED_ACCESS'];
  const fields = ['id', 'title', 'data_kind', 'status', 'scientific_admission',
    'completed_actions', 'unexecuted_actions', 'blockers', 'exposure',
    'license_declaration', 'evidence_urls'];
  const unavailable = 'Source-readiness evidence is unavailable or unsupported. No source is inferred ready.';
  let generation = 0;
  const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const require = condition => { if (!condition) throw new Error('Unsupported source-readiness evidence'); };
  const keys = (value, expected) => value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === [...expected].sort().join('|');
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 1024
    && /^[\x20-\x7e]+$/.test(value);
  const texts = values => Array.isArray(values) && values.length > 0 && values.length <= 16
    && values.every(text);
  function evidenceURL(value) {
    if (!text(value) || !/^https:\/\/github\.com\/alexwelcing\/lupine\/blob\/[0-9a-f]{40}\/discovery\/[A-Za-z0-9._/-]+$/.test(value)) return false;
    const url = new URL(value);
    const prefix = `/alexwelcing/lupine/blob/${commit}/discovery/`;
    return url.origin === 'https://github.com' && !url.username && !url.password
      && !url.search && !url.hash && url.pathname.startsWith(prefix)
      && !url.pathname.split('/').some(part => part === '.' || part === '..')
      && (url.pathname.slice(prefix.length).startsWith('reports/')
        || url.pathname.slice(prefix.length) === 'docs/li-v3-custody-plan.md');
  }
  function validate(report) {
    require(keys(report, ['schema', 'snapshot_commit', 'sources']));
    require(report.schema === 'lupine.source-readiness.v1' && report.snapshot_commit === commit);
    require(Array.isArray(report.sources) && report.sources.length === ids.length);
    report.sources.forEach((source, index) => {
      require(keys(source, fields) && source.id === ids[index] && source.status === statuses[index]);
      require(source.scientific_admission === 'NOT_ADMITTED');
      require([source.title, source.data_kind, source.license_declaration].every(text));
      require(['completed_actions', 'unexecuted_actions', 'blockers', 'exposure'].every(name => texts(source[name])));
      require(texts(source.evidence_urls) && source.evidence_urls.every(evidenceURL));
    });
    require(JSON.stringify(report).length <= 32768);
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value !== null && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
    }
    return JSON.stringify(value);
  }
  function list(title, items) {
    const section = node('div'), values = node('ul');
    section.append(node('h4', title));
    items.forEach(value => values.append(node('li', value)));
    section.append(values);
    return section;
  }
  function card(source, index) {
    const article = node('article', undefined, 'panel archive-card source-readiness-card');
    article.id = 'source-readiness-' + source.id;
    const title = node('h3', source.title); title.id = article.id + '-title';
    article.setAttribute('aria-labelledby', title.id);
    article.append(title, node('p', source.data_kind, 'archive-description'));
    article.append(node('p', index === 0
      ? 'Stopped during the first layout check. No complete layout was established.'
      : 'The README request was denied. No dataset file was acquired.', 'archive-verdict'));
    article.append(node('p', 'Scientific admission: NOT_ADMITTED', 'field-help'));
    article.append(list('Still unresolved', index === 0
      ? ['A complete layout and scientific schema.', 'Verified eligibility, matching measurements, groups, and sampling independence.']
      : ['The README and dataset contents.', 'Verified units, matching calculation records, completeness, groups, and source overlap.', 'How dataset version 1 relates to the filename suffix and processed archive.']));
    article.append(node('p', index === 0
      ? 'No second layout check, documentary inventory, or record-frame check ran.'
      : 'README parsing and dataset acquisition did not run.', 'field-help'));
    const actions = node('details', undefined, 'protocol-details');
    actions.append(node('summary', 'Completed actions, actions not run, and recorded blockers'),
      list('Completed actions', source.completed_actions), list('Not run or not completed', source.unexecuted_actions),
      list('Recorded blockers', source.blockers));
    const disclosure = node('details', undefined, 'protocol-details');
    disclosure.append(node('summary', 'Exposure, license declaration, and evidence'),
      list('Recorded exposure', source.exposure), node('h4', 'License declaration'), node('p', source.license_declaration));
    const links = node('ul');
    source.evidence_urls.forEach((url, i) => {
      const item = node('li'), link = node('a', `Source evidence ${i + 1}`);
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${source.title}: source evidence ${i + 1} (opens in a new tab)`);
      item.append(link); links.append(item);
    });
    disclosure.append(node('h4', 'Published evidence'), links);
    article.append(actions, disclosure);
    return article;
  }
  async function render(report) {
    const revision = ++generation;
    const status = document.getElementById('source-readiness-status');
    const content = document.getElementById('source-readiness-content');
    content.replaceChildren(); content.hidden = true; status.hidden = false;
    status.className = 'notice'; status.textContent = unavailable;
    if (!report) return false;
    try {
      validate(report);
      const snapshot = JSON.parse(JSON.stringify(report));
      const wire = JSON.stringify(snapshot, null, 2) + '\n';
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(snapshot)));
      if (revision !== generation) return false;
      require([...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('') === digest);
      const fragment = document.createDocumentFragment();
      fragment.append(node('p', 'Neither source is admitted for scientific benchmarking. A blocked source check is not a negative scientific result.', 'notice'));
      const cards = node('div', undefined, 'archive-cards');
      snapshot.sources.forEach((source, index) => cards.append(card(source, index)));
      fragment.append(cards);
      const button = node('button', '↓ Complete source-readiness JSON', 'button button-outline button-small');
      button.id = 'download-source-readiness'; button.type = 'button';
      button.addEventListener('click', () => {
        if (revision !== generation) return;
        const url = URL.createObjectURL(new Blob([wire], {type: 'application/json'}));
        const link = node('a'); link.href = url; link.download = 'lupine-source-readiness.json';
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      fragment.append(button); content.append(fragment); status.hidden = true; content.hidden = false;
      return true;
    } catch {
      if (revision === generation) {
        content.replaceChildren(); content.hidden = true; status.hidden = false; status.textContent = unavailable;
      }
      return false;
    }
  }
  window.LupineSourceReadiness = Object.freeze({render});
})();
