// Lupine Library — mobile-first research reader.
// Single-page app with hash routing. No framework — dependencies are in the DOM.

const STATE = {
  manifest: null,          // { categories, articles, version }
  articleCache: new Map(), // id -> article (with html)
  view: 'home',
  currentId: null,
  settings: loadSettings(),
  progress: loadProgress(), // { [id]: { pct, scrollTop, ts } }
};

const VIEW = document.getElementById('view');
const TOPBAR = document.getElementById('topbar');
const BACK_BTN = document.getElementById('back-btn');
const PROGRESS_FILL = document.getElementById('progress-fill');

// ───────────────────────────────────────────────────────────────
// Persistence
// ───────────────────────────────────────────────────────────────
function loadSettings() {
  try {
    return Object.assign(
      { size: 'md', theme: 'dark', width: 'narrow' },
      JSON.parse(localStorage.getItem('ll.settings') || '{}')
    );
  } catch { return { size: 'md', theme: 'dark', width: 'narrow' }; }
}
function saveSettings() {
  localStorage.setItem('ll.settings', JSON.stringify(STATE.settings));
  applySettings();
}
function applySettings() {
  const html = document.documentElement;
  html.dataset.theme = STATE.settings.theme;
  html.dataset.readerSize = STATE.settings.size;
  html.dataset.readerWidth = STATE.settings.width;
  // Sync theme-color meta for PWA chrome
  const map = { dark: '#06070d', sepia: '#1f1a12', light: '#f6f5f0' };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = map[STATE.settings.theme] || '#06070d';
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('ll.progress') || '{}'); }
  catch { return {}; }
}
function saveProgress() {
  localStorage.setItem('ll.progress', JSON.stringify(STATE.progress));
}

// ───────────────────────────────────────────────────────────────
// Manifest + article loading (cache-aware)
// ───────────────────────────────────────────────────────────────
async function fetchManifest() {
  if (STATE.manifest) return STATE.manifest;
  const res = await fetch('/data/library.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('manifest fetch failed');
  STATE.manifest = await res.json();
  return STATE.manifest;
}
async function fetchArticle(id) {
  if (STATE.articleCache.has(id)) return STATE.articleCache.get(id);
  const res = await fetch(`/data/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(`article ${id} fetch failed`);
  const article = await res.json();
  STATE.articleCache.set(id, article);
  return article;
}

// ───────────────────────────────────────────────────────────────
// Home / shelves
// ───────────────────────────────────────────────────────────────
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}

function cardFor(article, opts = {}) {
  const p = STATE.progress[article.id];
  const card = el('a', { href: `#/read/${article.id}`, class: 'card' });
  if (opts.showCategory) {
    const catLabel = (STATE.manifest.categories.find(c => c.id === article.category) || {}).label;
    if (catLabel) card.append(el('span', { class: 'card-pill-cat' }, catLabel));
  }
  card.append(el('div', { class: 'card-title' }, article.title));
  if (article.subtitle) card.append(el('div', { class: 'card-sub' }, article.subtitle));

  const meta = el('div', { class: 'card-meta' });
  meta.append(el('span', {}, `${article.readMinutes} min`));
  meta.append(el('span', {}, `${article.words.toLocaleString()} words`));
  for (const t of (article.tags || []).slice(0, 3)) {
    meta.append(el('span', { class: 'tag' }, t));
  }
  card.append(meta);

  if (p && p.pct > 0.02) {
    const bar = el('div', { class: 'card-progress' });
    bar.append(el('span', { style: `width:${Math.min(100, Math.round(p.pct * 100))}%` }));
    card.append(bar);
  }
  return card;
}

async function renderHome() {
  STATE.view = 'home';
  BACK_BTN.hidden = true;
  setProgress(0);
  VIEW.innerHTML = '<div class="loading">Loading library…</div>';
  try {
    const m = await fetchManifest();
    VIEW.innerHTML = '';

    // Hero
    const hero = el('section', { class: 'hero' });
    hero.append(el('h1', { html: 'A field library for <em>materials research</em>, on the go.' }));
    hero.append(el('p', {}, 'Every research report in Lupine — UQ, phonon benchmarking, coarse-graining, ecosystem landscape — formatted for your phone. Save it offline before you step on the train.'));
    const totalWords = m.articles.reduce((a, b) => a + (b.words || 0), 0);
    const totalMin = m.articles.reduce((a, b) => a + (b.readMinutes || 0), 0);
    const stats = el('div', { class: 'hero-stats' });
    stats.append(el('span', { html: `<strong>${m.articles.length}</strong> reports` }));
    stats.append(el('span', { html: `<strong>${totalWords.toLocaleString()}</strong> words` }));
    stats.append(el('span', { html: `≈<strong>${totalMin}</strong> min total` }));
    hero.append(stats);
    VIEW.append(hero);

    // Continue reading
    const inProgress = Object.entries(STATE.progress)
      .map(([id, v]) => ({ id, ...v }))
      .filter(p => p.pct > 0.02 && p.pct < 0.98)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, 3)
      .map(p => m.articles.find(a => a.id === p.id))
      .filter(Boolean);
    if (inProgress.length) {
      const sec = el('section', { class: 'continue' });
      sec.append(el('h2', {}, 'Continue reading'));
      const cards = el('div', { class: 'cards' });
      for (const a of inProgress) cards.append(cardFor(a, { showCategory: true }));
      sec.append(cards);
      VIEW.append(sec);
    }

    // Shelves
    for (const cat of m.categories) {
      const arts = m.articles.filter(a => a.category === cat.id);
      if (!arts.length) continue;
      const shelf = el('section', { class: 'shelf' });
      shelf.append(el('h2', {}, cat.label));
      if (cat.blurb) shelf.append(el('p', { class: 'blurb' }, cat.blurb));
      const cards = el('div', { class: 'cards' });
      for (const a of arts) cards.append(cardFor(a));
      shelf.append(cards);
      VIEW.append(shelf);
    }
  } catch (e) {
    console.error(e);
    VIEW.innerHTML = '<div class="empty">Could not load the library. Check your connection and refresh.</div>';
  }
}

// ───────────────────────────────────────────────────────────────
// Reader
// ───────────────────────────────────────────────────────────────
async function renderReader(id) {
  STATE.view = 'reader';
  STATE.currentId = id;
  BACK_BTN.hidden = false;
  setProgress(0);
  VIEW.innerHTML = '<div class="loading">Loading…</div>';
  window.scrollTo({ top: 0, behavior: 'instant' });
  try {
    const m = await fetchManifest();
    const article = await fetchArticle(id);
    const cat = m.categories.find(c => c.id === article.category);

    VIEW.innerHTML = '';
    const root = el('article', { class: 'reader' });

    const head = el('header', { class: 'reader-head' });
    if (cat) head.append(el('div', { class: 'reader-cat' }, cat.label));
    head.append(el('h1', { class: 'reader-title' }, article.title));
    if (article.subtitle) head.append(el('p', { class: 'reader-sub' }, article.subtitle));
    const meta = el('div', { class: 'reader-meta' });
    meta.append(el('span', {}, `${article.readMinutes} min read`));
    meta.append(el('span', {}, `${article.words.toLocaleString()} words`));
    if (article.source) meta.append(el('span', { class: 'tag' }, article.source));
    head.append(meta);
    root.append(head);

    const body = el('div', { class: 'content' });
    body.innerHTML = article.html;
    root.append(body);

    VIEW.append(root);

    // Prev / next by manifest order, stable across categories
    const idx = m.articles.findIndex(a => a.id === id);
    const prev = idx > 0 ? m.articles[idx - 1] : null;
    const next = idx < m.articles.length - 1 ? m.articles[idx + 1] : null;
    const nav = el('nav', { class: 'reader-nav' });
    nav.append(linkBlock(prev, 'Previous', 'prev'));
    nav.append(linkBlock(next, 'Next up',  'next'));
    VIEW.append(nav);

    // Restore scroll position if partially read
    const p = STATE.progress[id];
    if (p && p.scrollTop) {
      // Wait for layout
      requestAnimationFrame(() => window.scrollTo({ top: p.scrollTop, behavior: 'instant' }));
    }
  } catch (e) {
    console.error(e);
    VIEW.innerHTML = '<div class="empty">Article not available offline. Connect and try again.</div>';
  }
}
function linkBlock(article, label, cls) {
  if (!article) {
    return el('a', { class: `${cls} disabled`, 'aria-disabled': 'true' },
      el('span', { class: 'lbl' }, label),
      el('span', {}, cls === 'prev' ? 'Start of library' : 'End of library'));
  }
  return el('a', { class: cls, href: `#/read/${article.id}` },
    el('span', { class: 'lbl' }, label),
    el('span', {}, article.title));
}

// Scroll-tracked progress
function onScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const pct = Math.min(1, Math.max(0, window.scrollY / max));
  setProgress(pct);
  if (STATE.view === 'reader' && STATE.currentId) {
    STATE.progress[STATE.currentId] = { pct, scrollTop: window.scrollY, ts: Date.now() };
    // Throttle writes
    clearTimeout(onScroll._t);
    onScroll._t = setTimeout(saveProgress, 400);
  }
}
function setProgress(pct) {
  PROGRESS_FILL.style.width = `${Math.round(pct * 100)}%`;
}

// ───────────────────────────────────────────────────────────────
// Router
// ───────────────────────────────────────────────────────────────
function route() {
  const hash = location.hash || '#/';
  const [, path, arg] = hash.match(/^#\/?([^/]*)\/?(.*)?$/) || [];
  if (path === 'read' && arg) {
    renderReader(decodeURIComponent(arg));
  } else {
    renderHome();
  }
}

// ───────────────────────────────────────────────────────────────
// Search dialog
// ───────────────────────────────────────────────────────────────
const searchDialog = document.getElementById('search-dialog');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchHint = document.getElementById('search-hint');

document.getElementById('search-btn').addEventListener('click', () => openSearch());
document.getElementById('search-close').addEventListener('click', () => searchDialog.close());
searchDialog.addEventListener('click', (e) => { if (e.target === searchDialog) searchDialog.close(); });

async function openSearch() {
  await fetchManifest();
  searchInput.value = '';
  renderSearchResults('');
  if (typeof searchDialog.showModal === 'function') searchDialog.showModal();
  else searchDialog.setAttribute('open', '');
  setTimeout(() => searchInput.focus(), 50);
}
searchInput?.addEventListener('input', () => renderSearchResults(searchInput.value.trim()));
function renderSearchResults(q) {
  const m = STATE.manifest;
  if (!m) return;
  const ql = q.toLowerCase();
  const list = q
    ? m.articles
        .map(a => ({ a, score: scoreMatch(a, ql) }))
        .filter(x => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .map(x => x.a)
    : m.articles;
  searchResults.innerHTML = '';
  if (!list.length) {
    searchHint.textContent = `No results for “${q}”.`;
    searchHint.classList.add('err');
    return;
  }
  searchHint.classList.remove('err');
  searchHint.textContent = q ? `${list.length} result${list.length === 1 ? '' : 's'}.` : 'All reports, A→Z by shelf order.';
  for (const a of list.slice(0, 30)) {
    const li = el('li');
    const link = el('a', { href: `#/read/${a.id}`,
      onclick: () => searchDialog.close() });
    link.append(el('div', { class: 'r-title' }, a.title));
    if (a.subtitle) link.append(el('div', { class: 'r-sub' }, a.subtitle));
    li.append(link);
    searchResults.append(li);
  }
}
function scoreMatch(a, q) {
  if (!q) return 1;
  const title = (a.title || '').toLowerCase();
  const sub   = (a.subtitle || '').toLowerCase();
  const tags  = (a.tags || []).join(' ').toLowerCase();
  let s = 0;
  if (title.includes(q)) s += 10;
  if (title.startsWith(q)) s += 5;
  if (sub.includes(q)) s += 4;
  if (tags.includes(q)) s += 3;
  // Token overlap
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) s += 1;
    if (sub.includes(token))   s += 0.5;
  }
  return s;
}

// ───────────────────────────────────────────────────────────────
// Settings dialog
// ───────────────────────────────────────────────────────────────
const settingsDialog = document.getElementById('settings-dialog');
document.getElementById('settings-btn').addEventListener('click', () => {
  syncSettingsUI();
  if (typeof settingsDialog.showModal === 'function') settingsDialog.showModal();
  else settingsDialog.setAttribute('open', '');
});
document.getElementById('settings-close').addEventListener('click', () => settingsDialog.close());
settingsDialog.addEventListener('click', (e) => { if (e.target === settingsDialog) settingsDialog.close(); });

function syncSettingsUI() {
  for (const btn of settingsDialog.querySelectorAll('[data-size]')) {
    btn.classList.toggle('active', btn.dataset.size === STATE.settings.size);
  }
  for (const btn of settingsDialog.querySelectorAll('[data-theme]')) {
    btn.classList.toggle('active', btn.dataset.theme === STATE.settings.theme);
  }
  for (const btn of settingsDialog.querySelectorAll('[data-width]')) {
    btn.classList.toggle('active', btn.dataset.width === STATE.settings.width);
  }
}
settingsDialog.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.size)  { STATE.settings.size = t.dataset.size;   saveSettings(); syncSettingsUI(); }
  if (t.dataset.theme) { STATE.settings.theme = t.dataset.theme; saveSettings(); syncSettingsUI(); }
  if (t.dataset.width) { STATE.settings.width = t.dataset.width; saveSettings(); syncSettingsUI(); }
});

// Offline cache action
const cacheBtn = document.getElementById('cache-btn');
cacheBtn.addEventListener('click', async () => {
  cacheBtn.disabled = true;
  cacheBtn.textContent = 'Saving…';
  try {
    const m = await fetchManifest();
    // Prefetch every article JSON so the SW picks them up
    await Promise.all(m.articles.map(a => fetch(`/data/${a.id}.json`, { cache: 'reload' })));
    cacheBtn.textContent = 'Saved ✓';
    cacheBtn.classList.add('done');
  } catch (e) {
    cacheBtn.textContent = 'Save failed — retry';
  } finally {
    cacheBtn.disabled = false;
  }
});

// ───────────────────────────────────────────────────────────────
// Wiring
// ───────────────────────────────────────────────────────────────
BACK_BTN.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else location.hash = '#/';
});
window.addEventListener('hashchange', route);
window.addEventListener('scroll', onScroll, { passive: true });

// Keyboard: / opens search
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    openSearch();
  }
});

applySettings();
route();

// Register service worker (offline + fast repeat loads)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=__VERSION__`).catch(() => {});
  });
}
