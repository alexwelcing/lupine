// Lupine Library — i18n module
// Provides translation function and language utilities for the SPA.

export const DEFAULT_LANG = 'en';
export const SUPPORTED_LANGS = ['en', 'zh'];

const STRINGS = {
  en: {
    'brand.title': 'Lupine Library',
    'meta.description': 'Mobile-first reader for Lupine Materials Science research: UQ, benchmarking, MLIPs, and computational materials theory.',

    'home.loading': 'Loading library…',
    'home.hero': 'Lupine <em>Research</em> Library',
    'home.hero.sub': 'Mobile-first reader for cutting-edge materials science research.',
    'home.stats.reports': 'reports',
    'home.stats.words': 'words',
    'home.stats.minutes': 'min of reading',
    'home.preprint.badge': 'New Preprint',
    'home.preprint.title': 'Immigrant Scientist — The Invisible Foundation',
    'home.preprint.sub': 'A data-driven analysis of immigrant contributions to US science and innovation.',
    'home.continue': 'Continue Reading',
    'home.error': 'Could not load the library. Please check your connection and try again.',
    'home.fallbackNotice': 'This article is not yet available in {lang}. Showing the English version.',

    'reader.loading': 'Loading article…',
    'reader.meta.read': 'min read',
    'reader.nav.prev': '← Previous',
    'reader.nav.next': 'Next →',
    'reader.nav.start': 'Start of library',
    'reader.nav.end': 'End of library',
    'reader.error.offline': 'Could not load this article. You may be offline, or the article may have moved.',

    'graph.loading': 'Building entity graph…',
    'graph.error.manifest': 'Could not load library manifest for the graph.',
    'graph.error.lib': 'Force-graph library failed to load.',

    'search.placeholder': 'Search the library…',
    'search.results.one': '1 result found.',
    'search.results.many': '{count} results found.',
    'search.all': 'All articles — type to filter.',

    'settings.title': 'Reader',
    'settings.lang': 'Language',
    'settings.textSize': 'Text size',
    'settings.theme': 'Theme',
    'settings.lineWidth': 'Line width',
    'settings.offline': 'Offline',
    'settings.saveOffline': 'Save entire library for offline',
    'settings.done': 'Done',
    'settings.saving': 'Saving…',
    'settings.saved': 'Saved ✓',
    'settings.saveFailed': 'Save failed — try again.',

    'aria.back': 'Back to library',
    'aria.graph': 'Knowledge Graph',
    'aria.search': 'Search',
    'aria.settings': 'Reader settings',
    'aria.closeSearch': 'Close search',
    'aria.closeGraph': 'Close graph',
  },

  zh: {
    'brand.title': 'Lupine 图书馆',
    'meta.description': '面向移动端的 Lupine 材料科学研究阅读器：不确定性量化、基准测试、MLIP 和计算材料理论。',

    'home.loading': '正在加载图书馆…',
    'home.hero': 'Lupine <em>研究</em>图书馆',
    'home.hero.sub': '面向前沿材料科学研究的移动优先阅读器。',
    'home.stats.reports': '篇报告',
    'home.stats.words': '字',
    'home.stats.minutes': '分钟阅读',
    'home.preprint.badge': '新预印本',
    'home.preprint.title': '移民科学家——无形的基石',
    'home.preprint.sub': '基于数据分析移民对美国科学与创新的贡献。',
    'home.continue': '继续阅读',
    'home.error': '无法加载图书馆，请检查网络连接后重试。',
    'home.fallbackNotice': '本文暂无{lang}版本，显示英文版。',

    'reader.loading': '正在加载文章…',
    'reader.meta.read': '分钟阅读',
    'reader.nav.prev': '← 上一篇',
    'reader.nav.next': '下一篇 →',
    'reader.nav.start': '已是第一篇',
    'reader.nav.end': '已是最后一篇',
    'reader.error.offline': '无法加载此文章，您可能处于离线状态或文章已移动。',

    'graph.loading': '正在构建知识图谱…',
    'graph.error.manifest': '无法加载图书馆清单。',
    'graph.error.lib': 'Force-graph 库加载失败。',

    'search.placeholder': '搜索图书馆…',
    'search.results.one': '找到 1 条结果。',
    'search.results.many': '找到 {count} 条结果。',
    'search.all': '全部文章 — 输入以筛选。',

    'settings.title': '阅读设置',
    'settings.lang': '语言',
    'settings.textSize': '字体大小',
    'settings.theme': '主题',
    'settings.lineWidth': '行宽',
    'settings.offline': '离线',
    'settings.saveOffline': '保存全部内容以供离线阅读',
    'settings.done': '完成',
    'settings.saving': '保存中…',
    'settings.saved': '已保存 ✓',
    'settings.saveFailed': '保存失败，请重试。',

    'aria.back': '返回图书馆',
    'aria.graph': '知识图谱',
    'aria.search': '搜索',
    'aria.settings': '阅读设置',
    'aria.closeSearch': '关闭搜索',
    'aria.closeGraph': '关闭图谱',
  },
};

/**
 * Translate a key to the requested language, with optional variable substitution.
 * Falls back to English if the key is not available in the requested language.
 * @param {string} key
 * @param {string} [lang]
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, lang = DEFAULT_LANG, vars) {
  const l = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  let str = STRINGS[l]?.[key] || STRINGS[DEFAULT_LANG]?.[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/**
 * Detect the user's preferred language from localStorage or navigator.
 * @returns {string}
 */
export function detectLang() {
  try {
    const saved = localStorage.getItem('ll.lang');
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  return DEFAULT_LANG;
}

/**
 * Persist the user's language choice.
 * @param {string} lang
 */
export function saveLang(lang) {
  try {
    localStorage.setItem('ll.lang', lang);
  } catch { /* ignore */ }
}
