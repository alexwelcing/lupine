// Lupine Library — mobile-first research reader.
// Single-page app with hash routing. No framework — dependencies are in the DOM.

import { t, detectLang, saveLang, DEFAULT_LANG, SUPPORTED_LANGS } from './i18n.js';

const STATE = {
  manifest: null,          // { categories, articles, version }
  articleCache: new Map(), // id -> article (with html)
  view: 'home',
  currentId: null,
  settings: loadSettings(),
  progress: loadProgress(), // { [id]: { pct, scrollTop, ts } }
  statusFilter: null,       // null = all; else a status id from manifest.statuses
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
      { size: 'md', theme: 'dark', width: 'narrow', lang: detectLang() },
      JSON.parse(localStorage.getItem('ll.settings') || '{}')
    );
  } catch { return { size: 'md', theme: 'dark', width: 'narrow', lang: detectLang() }; }
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
  html.lang = STATE.settings.lang || DEFAULT_LANG;
  // Sync theme-color meta for PWA chrome
  const map = { dark: '#06070d', sepia: '#1f1a12', light: '#f6f5f0' };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = map[STATE.settings.theme] || '#06070d';
  // Sync page title
  const brandTitle = document.querySelector('.brand-title');
  if (brandTitle) brandTitle.textContent = t('brand.title', STATE.settings.lang);
}

function translateStaticDOM() {
  const lang = STATE.settings.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key, lang);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute('aria-label', t(key, lang));
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.setAttribute('placeholder', t(key, lang));
  }
  const titleEl = document.querySelector('title.i18n-title');
  if (titleEl) titleEl.textContent = `${t('brand.title', lang)} — ${t('meta.description', lang).slice(0, 60)}…`;
  const descEl = document.querySelector('meta.i18n-desc');
  if (descEl) descEl.setAttribute('content', t('meta.description', lang));
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
async function fetchArticle(id, preferredLang) {
  const cacheKey = `${id}:${preferredLang || STATE.settings.lang}`;
  if (STATE.articleCache.has(cacheKey)) return STATE.articleCache.get(cacheKey);

  const lang = preferredLang || STATE.settings.lang;
  let res = null;
  let triedLang = null;

  // Try preferred language variant first
  if (lang !== DEFAULT_LANG) {
    res = await fetch(`/data/${encodeURIComponent(id)}.${lang}.json`);
    if (res.ok) triedLang = lang;
  }

  // Fall back to default
  if (!res || !res.ok) {
    res = await fetch(`/data/${encodeURIComponent(id)}.json`);
    triedLang = DEFAULT_LANG;
  }

  if (!res.ok) throw new Error(`article ${id} fetch failed`);
  const article = await res.json();
  article._displayLang = triedLang;
  article._requestedLang = lang;
  STATE.articleCache.set(cacheKey, article);
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
    if (catLabel) card.append(el('span', { class: 'card-pill-cat' }, t(catLabel, STATE.settings.lang)));
  }
  if (article.status) {
    const st = (STATE.manifest.statuses || {})[article.status] || { label: { en: article.status }, color: '#888' };
    card.append(el('span', {
      class: 'card-status',
      style: `display:inline-block;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:2px 8px;border-radius:999px;color:${st.color};border:1px solid ${st.color};background:color-mix(in srgb, ${st.color} 12%, transparent);`,
    }, t(st.label, STATE.settings.lang)));
  }
  card.append(el('div', { class: 'card-title' }, t(article.title, STATE.settings.lang)));
  if (article.subtitle) card.append(el('div', { class: 'card-sub' }, t(article.subtitle, STATE.settings.lang)));

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
  document.documentElement.dataset.view = 'home';
  BACK_BTN.hidden = true;
  setProgress(0);
  VIEW.innerHTML = `<div class="loading">${t('home.loading', STATE.settings.lang)}</div>`;
  try {
    const m = await fetchManifest();
    VIEW.innerHTML = '';

    // Hero
    const hero = el('section', { class: 'hero' });
    hero.append(el('h1', { html: t('home.hero', STATE.settings.lang) }));
    hero.append(el('p', {}, t('home.hero.sub', STATE.settings.lang)));
    const totalWords = m.articles.reduce((a, b) => a + (b.words || 0), 0);
    const totalMin = m.articles.reduce((a, b) => a + (b.readMinutes || 0), 0);
    const stats = el('div', { class: 'hero-stats' });
    stats.append(el('span', { html: `<strong>${m.articles.length}</strong> ${t('home.stats.reports', STATE.settings.lang)}` }));
    stats.append(el('span', { html: `<strong>${totalWords.toLocaleString()}</strong> ${t('home.stats.words', STATE.settings.lang)}` }));
    stats.append(el('span', { html: `≈<strong>${totalMin}</strong> ${t('home.stats.minutes', STATE.settings.lang)}` }));
    hero.append(stats);
    VIEW.append(hero);

    // Preprint Banner — aligned to the 720px content column via .callout.
    const paperBanner = el('section', { class: 'callout' });
    const bannerLink = el('a', { class: 'callout-box callout-preprint', href: '/immi_paper.pdf', target: '_blank' });
    bannerLink.append(el('span', { style: 'font-size:0.75rem;text-transform:uppercase;color:var(--accent);font-weight:700;letter-spacing:0.05em;' }, t('home.preprint.badge', STATE.settings.lang)));
    bannerLink.append(el('strong', { style: 'font-size:1.1rem;' }, t('home.preprint.title', STATE.settings.lang)));
    bannerLink.append(el('span', { style: 'font-size:0.9rem;opacity:0.75;' }, t('home.preprint.sub', STATE.settings.lang)));
    paperBanner.append(bannerLink);
    VIEW.append(paperBanner);

    // Interactive theory report — a fully typeset, explorable companion to the
    // preprint (live hyper-ribbon explorer, KaTeX math, regulator FSM).
    const reportBanner = el('section', { class: 'callout' });
    const reportLink = el('a', { class: 'callout-box callout-featured', href: '/reports/growing-hyper-ribbon.html' });
    reportLink.append(el('span', { style: 'font-size:0.75rem;text-transform:uppercase;color:var(--lupine-300);font-weight:700;letter-spacing:0.05em;' }, '◆ Interactive series · live GPU showcase'));
    reportLink.append(el('strong', { style: 'font-size:1.1rem;' }, 'Growing the Hyper-Ribbon'));
    reportLink.append(el('span', { style: 'font-size:0.9rem;opacity:0.75;' }, 'Part 1 framework · Part 2 real-data validation · Compute Log (experiments actually run).'));
    const reportLinks = el('div', { style: 'display:flex;gap:10px;margin-top:6px;' });
    reportLinks.append(el('a', { href: '/reports/growing-hyper-ribbon.html', style: 'font-size:0.8rem;font-weight:700;color:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:4px 12px;border-radius:999px;' }, 'Part 1 →'));
    reportLinks.append(el('a', { href: '/reports/growing-hyper-ribbon-part-2.html', style: 'font-size:0.8rem;font-weight:700;color:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:4px 12px;border-radius:999px;' }, 'Part 2 →'));
    reportLinks.append(el('a', { href: '/reports/growing-hyper-ribbon-experiments.html', style: 'font-size:0.8rem;font-weight:700;color:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:4px 12px;border-radius:999px;' }, 'Compute Log →'));
    reportLinks.append(el('a', { href: '/reports/growing-hyper-ribbon-observatory.html', style: 'font-size:0.8rem;font-weight:700;color:var(--accent-ink);background:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:4px 12px;border-radius:999px;' }, '◆ Observatory →'));
    reportLink.append(reportLinks);
    reportBanner.append(reportLink);
    VIEW.append(reportBanner);

    // Featured — catalog entries flagged featured:true, rendered prominently
    // so the most important current work is the first thing read.
    const featured = (m.articles || []).filter(a => a.featured);
    for (const fa of featured) {
      const card = el('section', { class: 'callout' });
      const link = el('a', { class: 'callout-box callout-featured', href: `#/read/${fa.id}` });
      link.append(el('span', { style: 'font-size:0.75rem;text-transform:uppercase;color:var(--lupine-300);font-weight:700;letter-spacing:0.05em;' }, '★ Featured'));
      link.append(el('strong', { style: 'font-size:1.1rem;' }, t(fa.title, STATE.settings.lang)));
      if (fa.subtitle) link.append(el('span', { style: 'font-size:0.9rem;opacity:0.75;' }, t(fa.subtitle, STATE.settings.lang)));
      card.append(link);
      VIEW.append(card);
    }

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
      sec.append(el('h2', {}, t('home.continue', STATE.settings.lang)));
      const cards = el('div', { class: 'cards' });
      for (const a of inProgress) cards.append(cardFor(a, { showCategory: true }));
      sec.append(cards);
      VIEW.append(sec);
    }

    // Status filter — browse the corpus by lifecycle stage. Only statuses
    // actually present in the corpus get a chip, each with a live count.
    const statuses = m.statuses || {};
    const presentCounts = {};
    for (const a of m.articles) if (a.status) presentCounts[a.status] = (presentCounts[a.status] || 0) + 1;
    const presentStatuses = Object.keys(statuses).filter(s => presentCounts[s]);
    if (presentStatuses.length) {
      const bar = el('div', { class: 'status-filter' });
      const chip = (label, color, active, on) => {
        const c = el('button', {
          class: 'status-chip' + (active ? ' active' : ''),
          style: `font-size:0.75rem;font-weight:700;padding:5px 12px;border-radius:999px;cursor:pointer;border:1px solid ${color};color:${active ? '#fff' : color};background:${active ? color : `color-mix(in srgb, ${color} 10%, transparent)`};`,
        }, label);
        c.addEventListener('click', on);
        return c;
      };
      bar.append(chip(`All · ${m.articles.length}`, '#9ca3af', !STATE.statusFilter, () => { STATE.statusFilter = null; renderHome(); }));
      for (const s of presentStatuses) {
        const st = statuses[s];
        bar.append(chip(`${t(st.label, STATE.settings.lang)} · ${presentCounts[s]}`, st.color, STATE.statusFilter === s, () => { STATE.statusFilter = s; renderHome(); }));
      }
      VIEW.append(bar);
    }

    // Shelves
    for (const cat of m.categories) {
      let arts = m.articles.filter(a => a.category === cat.id);
      if (STATE.statusFilter) arts = arts.filter(a => a.status === STATE.statusFilter);
      if (!arts.length) continue;
      const shelf = el('section', { class: 'shelf' });
      shelf.append(el('h2', {}, t(cat.label, STATE.settings.lang)));
      if (cat.blurb && !STATE.statusFilter) shelf.append(el('p', { class: 'blurb' }, t(cat.blurb, STATE.settings.lang)));
      const cards = el('div', { class: 'cards' });
      for (const a of arts) cards.append(cardFor(a));
      shelf.append(cards);
      VIEW.append(shelf);
    }
    if (STATE.statusFilter && !m.articles.some(a => a.status === STATE.statusFilter)) {
      VIEW.append(el('div', { class: 'empty', style: 'margin:24px 16px;' }, 'No entries with this status.'));
    }
  } catch (e) {
    console.error(e);
    VIEW.innerHTML = `<div class="empty">${t('home.error', STATE.settings.lang)}</div>`;
  }
}

// ───────────────────────────────────────────────────────────────
// Reader
// ───────────────────────────────────────────────────────────────
async function renderReader(id) {
  STATE.view = 'reader';
  document.documentElement.dataset.view = 'reader';
  STATE.currentId = id;
  BACK_BTN.hidden = false;
  setProgress(0);
  VIEW.innerHTML = `<div class="loading">${t('reader.loading', STATE.settings.lang)}</div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
  try {
    const m = await fetchManifest();
    const article = await fetchArticle(id);
    const cat = m.categories.find(c => c.id === article.category);

    VIEW.innerHTML = '';
    const root = el('article', { class: 'reader' });

    const head = el('header', { class: 'reader-head' });
    if (cat) head.append(el('div', { class: 'reader-cat' }, t(cat.label, STATE.settings.lang)));

    // Fallback notice when article not available in requested language
    if (article._displayLang && article._requestedLang && article._displayLang !== article._requestedLang) {
      const langName = (m.languages && m.languages[article._requestedLang]?.native) || article._requestedLang;
      const notice = el('div', { class: 'lang-fallback', style: 'margin-bottom: 12px; padding: 10px 14px; border-radius: 6px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; font-size: 0.85rem;' });
      notice.textContent = t('home.fallbackNotice', STATE.settings.lang, { lang: langName });
      head.append(notice);
    }

    head.append(el('h1', { class: 'reader-title' }, t(article.title, STATE.settings.lang)));
    if (article.subtitle) head.append(el('p', { class: 'reader-sub' }, t(article.subtitle, STATE.settings.lang)));
    const meta = el('div', { class: 'reader-meta' });
    meta.append(el('span', {}, `${article.readMinutes} ${t('reader.meta.read', STATE.settings.lang)}`));
    meta.append(el('span', {}, `${article.words.toLocaleString()} ${t('home.stats.words', STATE.settings.lang)}`));
    if (article.source) meta.append(el('span', { class: 'tag' }, article.source));
    head.append(meta);
    root.append(head);

    // Extracted Knowledge Panel
    if (article.extracted_knowledge && Object.keys(article.extracted_knowledge).length > 0) {
      const panel = el('div', { class: 'knowledge-panel' });
      panel.append(el('h3', { class: 'kp-title' }, 'Extracted Knowledge'));
      const grid = el('div', { class: 'knowledge-grid' });
      for (const [key, val] of Object.entries(article.extracted_knowledge)) {
        const item = el('div', { class: 'knowledge-item' });
        item.append(el('span', { class: 'k-key' }, key));
        let displayVal = val;
        if (Array.isArray(val)) displayVal = val.join(', ');
        else if (typeof val === 'object') displayVal = JSON.stringify(val);
        item.append(el('span', { class: 'k-val' }, String(displayVal)));
        grid.append(item);
      }
      panel.append(grid);
      root.append(panel);
    }

    const body = el('div', { class: 'content' });
    body.innerHTML = article.html;
    root.append(body);

    VIEW.append(root);

    // Prev / next by manifest order, stable across categories
    const idx = m.articles.findIndex(a => a.id === id);
    const prev = idx > 0 ? m.articles[idx - 1] : null;
    const next = idx < m.articles.length - 1 ? m.articles[idx + 1] : null;
    const nav = el('nav', { class: 'reader-nav' });
    nav.append(linkBlock(prev, t('reader.nav.prev', STATE.settings.lang), 'prev'));
    nav.append(linkBlock(next, t('reader.nav.next', STATE.settings.lang), 'next'));
    VIEW.append(nav);

    // Restore scroll position if partially read
    const p = STATE.progress[id];
    if (p && p.scrollTop) {
      // Wait for layout
      requestAnimationFrame(() => window.scrollTo({ top: p.scrollTop, behavior: 'instant' }));
    }
  } catch (e) {
    console.error(e);
    VIEW.innerHTML = `<div class="empty">${t('reader.error.offline', STATE.settings.lang)}</div>`;
  }
}
function linkBlock(article, label, cls) {
  if (!article) {
    return el('a', { class: `${cls} disabled`, 'aria-disabled': 'true' },
      el('span', { class: 'lbl' }, label),
      el('span', {}, cls === 'prev' ? t('reader.nav.start', STATE.settings.lang) : t('reader.nav.end', STATE.settings.lang)));
  }
  return el('a', { class: cls, href: `#/read/${article.id}` },
    el('span', { class: 'lbl' }, label),
    el('span', {}, t(article.title, STATE.settings.lang)));
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
  searchHint.textContent = q
    ? (list.length === 1 ? t('search.results.one', STATE.settings.lang) : t('search.results.many', STATE.settings.lang, { count: list.length }))
    : t('search.all', STATE.settings.lang);
  for (const a of list.slice(0, 30)) {
    const li = el('li');
    const link = el('a', { href: `#/read/${a.id}`,
      onclick: () => searchDialog.close() });
    link.append(el('div', { class: 'r-title' }, t(a.title, STATE.settings.lang)));
    if (a.subtitle) link.append(el('div', { class: 'r-sub' }, t(a.subtitle, STATE.settings.lang)));
    li.append(link);
    searchResults.append(li);
  }
}
function scoreMatch(a, q) {
  if (!q) return 1;
  const title = (typeof a.title === 'string' ? a.title : Object.values(a.title || {}).join(' ')).toLowerCase();
  const sub   = (typeof a.subtitle === 'string' ? a.subtitle : Object.values(a.subtitle || {}).join(' ')).toLowerCase();
  const tags  = (a.tags || []).join(' ').toLowerCase();
  
  let extractedTokens = '';
  if (a.extracted_knowledge) {
     extractedTokens = Object.values(a.extracted_knowledge)
        .map(v => typeof v === 'object' ? JSON.stringify(v) : String(v))
        .join(' ')
        .toLowerCase();
  }

  let s = 0;
  if (title.includes(q)) s += 10;
  if (title.startsWith(q)) s += 5;
  if (sub.includes(q)) s += 4;
  if (tags.includes(q)) s += 3;
  if (extractedTokens.includes(q)) s += 5;

  // Token overlap
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) s += 1;
    if (sub.includes(token))   s += 0.5;
    if (extractedTokens.includes(token)) s += 0.8;
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
  for (const btn of settingsDialog.querySelectorAll('[data-lang]')) {
    btn.classList.toggle('active', btn.dataset.lang === STATE.settings.lang);
  }
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
  if (t.dataset.lang)  { STATE.settings.lang = t.dataset.lang;   saveLang(t.dataset.lang); saveSettings(); syncSettingsUI(); applySettings(); translateStaticDOM(); if (STATE.view === 'home') renderHome(); else if (STATE.view === 'reader' && STATE.currentId) renderReader(STATE.currentId); }
  if (t.dataset.size)  { STATE.settings.size = t.dataset.size;   saveSettings(); syncSettingsUI(); }
  if (t.dataset.theme) { STATE.settings.theme = t.dataset.theme; saveSettings(); syncSettingsUI(); }
  if (t.dataset.width) { STATE.settings.width = t.dataset.width; saveSettings(); syncSettingsUI(); }
});

// Offline cache action
const cacheBtn = document.getElementById('cache-btn');
cacheBtn.addEventListener('click', async () => {
  cacheBtn.disabled = true;
  cacheBtn.textContent = t('settings.saving', STATE.settings.lang);
  try {
    const m = await fetchManifest();
    // Prefetch every article JSON so the SW picks them up
    const fetches = [];
    for (const a of m.articles) {
      fetches.push(fetch(`/data/${a.id}.json`, { cache: 'reload' }));
      for (const lng of (a.languages || []).slice(1)) {
        fetches.push(fetch(`/data/${a.id}.${lng}.json`, { cache: 'reload' }));
      }
    }
    await Promise.all(fetches);
    cacheBtn.textContent = t('settings.saved', STATE.settings.lang);
    cacheBtn.classList.add('done');
  } catch (e) {
    cacheBtn.textContent = t('settings.saveFailed', STATE.settings.lang);
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
translateStaticDOM();
route();

// Register service worker (offline + fast repeat loads). When a new version
// installs, ask it to take over and reload exactly once so users immediately
// pick up code/asset changes (otherwise stale caches can hide deploys).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`/sw.js?v=__VERSION__`);
      const promote = (sw) => {
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage('skipWaiting');
          }
        });
      };
      promote(reg.installing);
      reg.addEventListener('updatefound', () => promote(reg.installing));
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
    } catch {}
  });
}
