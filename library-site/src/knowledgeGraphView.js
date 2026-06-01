const SVG_NS = 'http://www.w3.org/2000/svg';

const MODES = [
  { id: 'overview', label: 'Overview' },
  { id: 'topics', label: 'Topics' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'local', label: 'Local' },
];

const MODE_RELATIONS = {
  overview: new Set(['program', 'contains', 'tagged']),
  topics: new Set(['tagged', 'co-topic']),
  lifecycle: new Set(['program', 'contains', 'lifecycle', 'grouped']),
  local: new Set(['program', 'contains', 'tagged', 'lifecycle', 'grouped', 'related', 'co-topic']),
};

const RELATION_LABELS = {
  program: 'Programs',
  contains: 'Contains',
  tagged: 'Tags',
  lifecycle: 'Lifecycle',
  grouped: 'Groups',
  related: 'Related',
  'co-topic': 'Co-topics',
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.setAttribute('class', value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTokens(query) {
  return normalizeSearchValue(query)
    .split(/[^a-z0-9+#.-]+/i)
    .map(token => token.trim())
    .filter(token => token.length > 1);
}

function compactNumber(value) {
  return Number(value || 0).toLocaleString();
}

function truncate(value, max = 38) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text;
}

function nodeText(node) {
  return normalizeSearchValue([
    node.label,
    node.title,
    node.subtitle,
    node.type,
    node.category,
    node.status,
    node.group,
    (node.tags || []).join(' '),
  ].join(' '));
}

function nodeScore(node, tokens) {
  if (!tokens.length) return 0;
  const haystack = nodeText(node);
  let score = 0;
  for (const token of tokens) {
    if (!haystack.includes(token)) continue;
    score += 1;
    if (normalizeSearchValue(node.label).startsWith(token)) score += 4;
    if (normalizeSearchValue(node.label).includes(token)) score += 2;
    if (node.type === 'article') score += 0.5;
    if (node.featured) score += 0.5;
  }
  return score;
}

function nodeRadius(node) {
  if (node.type === 'corpus') return 18;
  if (node.type === 'category') return 12;
  if (node.type === 'status' || node.type === 'group') return 9;
  if (node.type === 'tag') return Math.min(9, 4.5 + Math.sqrt(node.count || 1));
  if (node.featured) return 7.5;
  return 5.4;
}

function shouldLabel(node, selectedId, mode) {
  if (node.id === selectedId) return true;
  if (node.type === 'corpus' || node.type === 'category' || node.type === 'status' || node.type === 'group') return true;
  return mode === 'topics' && node.type === 'tag' && (node.count || 0) >= 3;
}

function otherEnd(link, nodeId) {
  return link.source === nodeId ? link.target : link.source;
}

function relationLabel(link) {
  return link.label || link.relation || 'relation';
}

function compareNodeLabels(a, b) {
  return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
}

function setEquals(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function initialRelationsFor(mode, relationParam) {
  const allowed = MODE_RELATIONS[mode] || MODE_RELATIONS.overview;
  if (!relationParam) return new Set(allowed);
  const requested = String(relationParam)
    .split(',')
    .map(item => item.trim())
    .filter(item => allowed.has(item));
  return new Set(requested.length ? requested : allowed);
}

function defaultModeForFocus(focusId) {
  return focusId === 'library:root' ? 'overview' : 'local';
}

export async function renderKnowledgeGraphView(mount, { fetchKnowledgeGraph, initialFocus = '', initialState = {} } = {}) {
  mount.innerHTML = '<div class="loading">Mapping library graph...</div>';

  let graph;
  try {
    graph = await fetchKnowledgeGraph();
  } catch (error) {
    console.error(error);
    mount.innerHTML = '<div class="empty">The knowledge graph could not be loaded.</div>';
    return () => {};
  }

  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const linksByNode = new Map();
  for (const link of graph.links) {
    if (!linksByNode.has(link.source)) linksByNode.set(link.source, []);
    if (!linksByNode.has(link.target)) linksByNode.set(link.target, []);
    linksByNode.get(link.source).push(link);
    linksByNode.get(link.target).push(link);
  }

  const focusId = initialState.focusNodeId && nodeById.has(initialState.focusNodeId)
    ? initialState.focusNodeId
    : (initialFocus && nodeById.has(`article:${initialFocus}`) ? `article:${initialFocus}` : 'library:root');
  const initialMode = MODES.some(mode => mode.id === initialState.mode)
    ? initialState.mode
    : defaultModeForFocus(focusId);
  const state = {
    mode: initialMode,
    query: initialState.query || '',
    selectedId: focusId,
    relations: initialRelationsFor(initialMode, initialState.relations),
  };

  const root = el('section', { class: 'kg' });
  const head = el('header', { class: 'kg-head' });
  head.append(
    el('p', { class: 'kg-kicker' }, 'Knowledge Graph'),
    el('h1', {}, 'Knowledge Graph'),
    el('p', { class: 'kg-sub' }, 'A deterministic map of articles, program areas, tags, lifecycle states, and explicit corpus relationships.')
  );

  const toolbar = el('div', { class: 'kg-toolbar' });
  const search = el('input', {
    type: 'search',
    placeholder: 'Focus MLIP, Lean, funding, topology...',
    autocomplete: 'off',
    'aria-label': 'Search graph nodes',
  });
  const modeRow = el('div', { class: 'kg-mode-row', role: 'group', 'aria-label': 'Graph mode' });
  toolbar.append(el('div', { class: 'kg-search' }, search), modeRow);
  head.append(toolbar);
  const relationRow = el('div', { class: 'kg-relation-filter', role: 'group', 'aria-label': 'Relation filters' });
  head.append(relationRow);
  search.value = state.query;

  const statbar = el('div', { class: 'kg-stats' });
  head.append(statbar);

  const body = el('div', { class: 'kg-body' });
  const canvas = el('div', { class: 'kg-canvas' });
  const svg = svgEl('svg', {
    class: 'kg-svg',
    viewBox: '0 0 1000 680',
    role: 'img',
    'aria-label': 'Knowledge graph map',
    preserveAspectRatio: 'xMidYMid meet',
  });
  const legend = el('div', { class: 'kg-legend' },
    el('span', { class: 'kg-legend-item kg-legend-article' }, 'Article'),
    el('span', { class: 'kg-legend-item kg-legend-topic' }, 'Tag'),
    el('span', { class: 'kg-legend-item kg-legend-area' }, 'Area'),
    el('span', { class: 'kg-legend-item kg-legend-state' }, 'Status')
  );
  canvas.append(svg, legend);
  const inspector = el('aside', { class: 'kg-inspector' });
  body.append(canvas, inspector);

  root.append(head, body);
  mount.replaceChildren(root);

  function connectedLinks(nodeId) {
    return linksByNode.get(nodeId) || [];
  }

  function allowedRelations() {
    return MODE_RELATIONS[state.mode] || MODE_RELATIONS.overview;
  }

  function resetRelationsForMode() {
    state.relations = new Set(allowedRelations());
  }

  function syncUrl() {
    const selected = nodeById.get(state.selectedId);
    const params = new URLSearchParams();
    const defaultMode = defaultModeForFocus(state.selectedId);
    if (state.mode !== defaultMode) params.set('mode', state.mode);
    if (state.query.trim()) params.set('q', state.query.trim());
    if (!setEquals(state.relations, allowedRelations())) {
      params.set('rels', [...state.relations].sort().join(','));
    }
    let hash = '#/graph';
    if (selected?.type === 'article') {
      hash += `/${encodeURIComponent(selected.articleId)}`;
    } else if (selected && selected.id !== 'library:root') {
      params.set('focus', selected.id);
    }
    const query = params.toString();
    if (query) hash += `?${query}`;
    const next = `${location.pathname}${location.search}${hash}`;
    if (`${location.pathname}${location.search}${location.hash}` !== next) {
      history.replaceState(null, '', next);
    }
  }

  function matchingNodes() {
    const tokens = queryTokens(state.query);
    if (!tokens.length) return [];
    return graph.nodes
      .map(node => ({ node, score: nodeScore(node, tokens) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score || compareNodeLabels(a.node, b.node))
      .slice(0, 30);
  }

  function includeArticleContext(ids, node) {
    if (!node || node.type !== 'article') return;
    if (node.category) ids.add(`category:${node.category}`);
    if (node.status) ids.add(`status:${node.status}`);
    if (node.group) ids.add(`group:${node.group}`);
    for (const tag of (node.tags || []).slice(0, 10)) ids.add(`tag:${tag}`);
  }

  function visibleSet(matches) {
    const ids = new Set(['library:root']);
    const addNeighbors = (nodeId, relationFilter = null) => {
      ids.add(nodeId);
      for (const link of connectedLinks(nodeId)) {
        if (relationFilter && !relationFilter.has(link.relation)) continue;
        ids.add(link.source);
        ids.add(link.target);
      }
    };

    if (state.mode === 'overview') {
      for (const node of graph.nodes) {
        if (node.type === 'category' || node.type === 'article') ids.add(node.id);
        if (node.type === 'tag' && (node.count || 0) >= 3) ids.add(node.id);
      }
    } else if (state.mode === 'topics') {
      for (const node of graph.nodes) {
        if (node.type === 'category' || node.type === 'tag') ids.add(node.id);
        if (node.type === 'article' && (node.featured || (node.tags || []).some(tag => (nodeById.get(`tag:${tag}`)?.count || 0) >= 3))) {
          ids.add(node.id);
        }
      }
    } else if (state.mode === 'lifecycle') {
      for (const node of graph.nodes) {
        if (node.type === 'category' || node.type === 'status' || node.type === 'group' || node.type === 'article') ids.add(node.id);
      }
    } else {
      const selected = nodeById.get(state.selectedId) || nodeById.get('library:root');
        addNeighbors(selected.id, state.relations);
        includeArticleContext(ids, selected);
      for (const link of connectedLinks(selected.id).filter(link => link.relation === 'related' && state.relations.has('related')).slice(0, 12)) {
        const other = nodeById.get(otherEnd(link, selected.id));
        if (!other) continue;
        ids.add(other.id);
        includeArticleContext(ids, other);
      }
      if (selected.type === 'corpus') {
        for (const node of graph.nodes) {
          if (node.type === 'category' || node.type === 'article') ids.add(node.id);
        }
      }
    }

    if (matches.length) {
      for (const { node } of matches.slice(0, 18)) {
        addNeighbors(node.id, state.relations);
        includeArticleContext(ids, node);
      }
    }

    if (state.selectedId) {
      const selected = nodeById.get(state.selectedId);
      addNeighbors(state.selectedId, state.relations);
      includeArticleContext(ids, selected);
    }

    return ids;
  }

  function visibleGraph(matches) {
    const ids = visibleSet(matches);
    const visibleNodes = graph.nodes.filter(node => ids.has(node.id));
    const visibleIds = new Set(visibleNodes.map(node => node.id));
    const visibleLinks = graph.links.filter(link =>
      visibleIds.has(link.source) &&
      visibleIds.has(link.target) &&
      state.relations.has(link.relation)
    );
    return { nodes: visibleNodes, links: visibleLinks };
  }

  function selectNode(nodeId) {
    if (!nodeById.has(nodeId)) return;
    state.selectedId = nodeId;
    if (state.mode !== 'local' && nodeById.get(nodeId)?.type !== 'corpus') {
      state.mode = 'local';
      resetRelationsForMode();
    }
    syncUrl();
    update();
  }

  function renderModes() {
    modeRow.innerHTML = '';
    for (const mode of MODES) {
      const button = el('button', {
        type: 'button',
        class: `kg-mode${state.mode === mode.id ? ' active' : ''}`,
        'aria-pressed': state.mode === mode.id ? 'true' : 'false',
        onClick: () => {
          state.mode = mode.id;
          resetRelationsForMode();
          syncUrl();
          update();
        },
      }, mode.label);
      modeRow.append(button);
    }
  }

  function renderRelationFilters() {
    relationRow.innerHTML = '';
    for (const relation of allowedRelations()) {
      const active = state.relations.has(relation);
      relationRow.append(el('button', {
        type: 'button',
        class: `kg-relation-chip${active ? ' active' : ''}`,
        'aria-pressed': active ? 'true' : 'false',
        'aria-label': `${active ? 'Hide' : 'Show'} ${RELATION_LABELS[relation] || relation} relations`,
        onClick: () => {
          if (state.relations.has(relation)) state.relations.delete(relation);
          else state.relations.add(relation);
          syncUrl();
          update();
        },
      }, RELATION_LABELS[relation] || relation));
    }
  }

  function renderStats(visible) {
    statbar.innerHTML = '';
    statbar.append(
      el('span', { html: `<strong>${compactNumber(graph.stats.nodes)}</strong> nodes` }),
      ' ',
      el('span', { html: `<strong>${compactNumber(graph.stats.links)}</strong> links` }),
      ' ',
      el('span', { html: `<strong>${compactNumber(graph.stats.articleCount)}</strong> articles` }),
      ' ',
      el('span', { html: `<strong>${compactNumber(visible.nodes.length)}</strong> visible` })
    );
  }

  function renderSvg(visible) {
    svg.innerHTML = '';
    const edgeLayer = svgEl('g', { class: 'kg-edges' });
    const nodeLayer = svgEl('g', { class: 'kg-nodes' });

    for (const link of visible.links) {
      const source = nodeById.get(link.source);
      const target = nodeById.get(link.target);
      if (!source?.position || !target?.position) continue;
      const line = svgEl('line', {
        class: `kg-link kg-link--${link.relation}`,
        x1: source.position.x,
        y1: source.position.y,
        x2: target.position.x,
        y2: target.position.y,
        'stroke-width': Math.min(3.4, 0.7 + Math.sqrt(link.weight || 1) * 0.45).toFixed(2),
      }, svgEl('title', {}, `${source.label} -> ${target.label}: ${relationLabel(link)}${link.evidence ? ` (${link.evidence})` : ''}`));
      edgeLayer.append(line);
    }

    for (const node of visible.nodes) {
      if (!node.position) continue;
      const r = nodeRadius(node);
      const group = svgEl('g', {
        class: `kg-node kg-node--${node.type}${node.id === state.selectedId ? ' selected' : ''}`,
        transform: `translate(${node.position.x} ${node.position.y})`,
        tabindex: '0',
        role: 'button',
        'aria-label': `${node.type}: ${node.label}`,
      });
      group.append(
        svgEl('circle', { r }),
        svgEl('title', {}, `${node.label}${node.count ? ` (${node.count})` : ''}`)
      );
      group.addEventListener('click', () => selectNode(node.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectNode(node.id);
        }
      });
      nodeLayer.append(group);

      if (shouldLabel(node, state.selectedId, state.mode)) {
        const label = svgEl('text', {
          class: `kg-node-label kg-node-label--${node.type}${node.id === state.selectedId ? ' selected' : ''}`,
          x: node.position.x + r + 6,
          y: node.position.y + 4,
        }, truncate(node.label, node.id === state.selectedId ? 46 : 28));
        nodeLayer.append(label);
      }
    }

    svg.append(edgeLayer, nodeLayer);
  }

  function metaLine(node) {
    const parts = [node.type];
    if (node.category) parts.push(node.category);
    if (node.status) parts.push(node.status);
    if (node.group) parts.push(node.group);
    if (node.count && node.type !== 'article') parts.push(`${compactNumber(node.count)} items`);
    if (node.words) parts.push(`${compactNumber(node.words)} words`);
    return parts.join(' / ');
  }

  function renderInspector(matches) {
    const selected = nodeById.get(state.selectedId) || nodeById.get('library:root');
    const links = connectedLinks(selected.id)
      .map(link => ({ link, other: nodeById.get(otherEnd(link, selected.id)) }))
      .filter(item => item.other)
      .sort((a, b) => {
        if (a.link.relation !== b.link.relation) return a.link.relation.localeCompare(b.link.relation);
        return compareNodeLabels(a.other, b.other);
      });

    inspector.innerHTML = '';
    const selectedPanel = el('section', { class: 'kg-inspector-section' });
    selectedPanel.append(
      el('p', { class: 'kg-inspector-kicker' }, 'Selected'),
      el('h2', {}, selected.label),
      el('p', { class: 'kg-node-meta' }, metaLine(selected))
    );
    if (selected.subtitle) selectedPanel.append(el('p', { class: 'kg-node-sub' }, selected.subtitle));
    if (selected.blurb) selectedPanel.append(el('p', { class: 'kg-node-sub' }, selected.blurb));
    if (selected.type === 'article') {
      selectedPanel.append(el('a', { class: 'kg-read-link', href: `#/read/${selected.articleId}` }, 'Read article'));
    }
    inspector.append(selectedPanel);

    const relationPanel = el('section', { class: 'kg-inspector-section' });
    relationPanel.append(el('p', { class: 'kg-inspector-kicker' }, 'Relations'));
    if (!links.length) {
      relationPanel.append(el('p', { class: 'kg-muted' }, 'No explicit relations yet.'));
    } else {
      const list = el('div', { class: 'kg-relation-list' });
      for (const { link, other } of links.slice(0, 22)) {
        list.append(el('button', {
          type: 'button',
          class: 'kg-relation-item',
          onClick: () => selectNode(other.id),
        },
          el('span', { class: 'kg-relation-label' }, other.label),
          el('span', { class: 'kg-relation-kind' }, `${relationLabel(link)}${link.evidence ? `: ${link.evidence}` : ''}`)
        ));
      }
      relationPanel.append(list);
    }
    inspector.append(relationPanel);

    const matchPanel = el('section', { class: 'kg-inspector-section' });
    matchPanel.append(el('p', { class: 'kg-inspector-kicker' }, matches.length ? 'Matches' : 'Graph Scope'));
    if (matches.length) {
      const list = el('div', { class: 'kg-match-list' });
      for (const { node } of matches.slice(0, 12)) {
        list.append(el('button', {
          type: 'button',
          class: 'kg-match-item',
          onClick: () => selectNode(node.id),
        },
          el('span', {}, node.label),
          el('small', {}, metaLine(node))
        ));
      }
      matchPanel.append(list);
    } else {
      matchPanel.append(el('p', { class: 'kg-muted' },
        'This map is generated from catalog metadata, tags, lifecycle labels, groups, and high-confidence overlap. It avoids hidden NLP claims until the extraction layer is ready.'
      ));
    }
    inspector.append(matchPanel);
  }

  function update() {
    renderModes();
    renderRelationFilters();
    const matches = matchingNodes();
    const visible = visibleGraph(matches);
    renderStats(visible);
    renderSvg(visible);
    renderInspector(matches);
  }

  search.addEventListener('input', () => {
    state.query = search.value;
    syncUrl();
    update();
  });

  syncUrl();
  update();
  return () => {};
}
