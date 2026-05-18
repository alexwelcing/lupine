#!/usr/bin/env node
// Build the Lupine research library.
// Reads markdown sources defined in scripts/catalog.js, renders each to HTML,
// and emits a static site into dist/ ready for nginx on Cloud Run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { CATALOG } from './catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = path.join(DIST, 'data');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractTitle(md, fallback) {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : fallback;
}

function extractSubtitle(md) {
  // Look for "**Title:**" or a bold label pattern, else first non-heading paragraph
  const titleLabel = md.match(/^\*\*Title:\*\*\s+(.+?)\s*$/m);
  if (titleLabel) return titleLabel[1].trim();
  const firstPara = md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('>') && !p.startsWith('---'));
  if (!firstPara) return '';
  return stripTags(marked.parseInline(firstPara)).slice(0, 240);
}

function headingsToToc(md) {
  const lines = md.split('\n');
  const toc = [];
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const depth = m[1].length;
    const text = m[2].replace(/[`*_]/g, '').trim();
    toc.push({ depth, text, id: slugify(text) });
  }
  return toc;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Ensure each rendered heading has an id matching slugify(text) so TOC anchors work.
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  const plain = stripTags(text);
  const id = slugify(plain);
  return `<h${level} id="${id}">${text}</h${level}>`;
};
// Wrap tables in a scroll container and inject data-label on each <td> so
// the CSS can stack rows as labeled cards on narrow screens.
renderer.table = (header, body) => {
  const labels = [];
  header.replace(/<th[^>]*>([\s\S]*?)<\/th>/g, (_, inner) => {
    labels.push(stripTags(inner));
    return _;
  });
  let col = 0;
  const bodyWithLabels = body.replace(/<tr>([\s\S]*?)<\/tr>/g, (_, inner) => {
    col = 0;
    const injected = inner.replace(/<td([^>]*)>/g, (_, attrs) => {
      const label = labels[col] != null ? labels[col] : '';
      col++;
      return `<td${attrs} data-label="${escapeHtml(label)}">`;
    });
    return `<tr>${injected}</tr>`;
  });
  return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${bodyWithLabels}</tbody></table></div>`;
};
marked.setOptions({ renderer, headerIds: false, mangle: false, gfm: true, breaks: false });

// ───────────────────────────────────────────────────────────────
// Per-source preprocessors
// ───────────────────────────────────────────────────────────────

// tda_error_landscapes_report.md was extracted from a PDF with every line
// wrapped in "quotes" and its tables flattened into sequences of quoted
// lines surrounded by a `"Table"` opener and a `"Table N: caption"` closer.
// Reconstruct those blocks into proper HTML tables.
function preprocessTdaReport(md) {
  // Strip outer quote wrappers line-by-line (safe across the whole file:
  // 98% of lines have them and they're always extraction residue).
  const lines = md.split('\n').map((raw) => {
    const trimmed = raw.replace(/^\s*"|"\s*$/g, '');
    return trimmed;
  });

  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === 'Table') {
      // Seek closing caption within a reasonable window.
      let end = i + 1;
      const MAX_BLOCK = 80;
      while (end < lines.length && end - i < MAX_BLOCK) {
        const m = lines[end].trim().match(/^Table\s+(\d+):\s*(.+)$/);
        if (m) break;
        end++;
      }
      if (end < lines.length && end - i < MAX_BLOCK) {
        const cells = lines
          .slice(i + 1, end)
          .map((s) => s.trim())
          .filter(Boolean);
        const capMatch = lines[end].trim().match(/^Table\s+(\d+):\s*(.+)$/);
        const caption = `Table ${capMatch[1]}: ${capMatch[2]}`;
        out.push(reconstructTable(caption, cells));
        out.push('');
        i = end + 1;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }
  return out.join('\n');
}

function reconstructTable(caption, cells) {
  // The PDF extractor often split parentheticals and em-dashed clauses onto
  // their own lines, producing orphan "cells" that belong with the next
  // cell. Merge them forward so the grid divides cleanly.
  const merged = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const next = cells[i + 1];
    if (next && /^[(—–\-]/.test(c)) {
      merged.push(`${next} ${c}`.trim());
      i++; // consume next
    } else {
      merged.push(c);
    }
  }
  cells = merged;

  // Try a sensible column count. Prefer 4 → 3 → 5 → 2. Must have at least 2 rows.
  let cols = 0;
  for (const n of [4, 3, 5, 2]) {
    if (cells.length >= n * 2 && cells.length % n === 0) { cols = n; break; }
  }
  if (!cols) {
    // Fallback: render as a captioned data list — still readable on mobile.
    const items = cells.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
    return (
      `<figure class="ll-datablock">` +
      `<figcaption>${escapeHtml(caption)}</figcaption>` +
      `<ul>${items}</ul>` +
      `</figure>`
    );
  }
  const headers = cells.slice(0, cols);
  const rows = [];
  for (let r = cols; r < cells.length; r += cols) {
    rows.push(cells.slice(r, r + cols));
  }
  let html = '<div class="table-wrap"><table>';
  html += `<caption>${escapeHtml(caption)}</caption>`;
  html += '<thead><tr>';
  for (const h of headers) html += `<th>${escapeHtml(h)}</th>`;
  html += '</tr></thead><tbody>';
  for (const row of rows) {
    html += '<tr>';
    for (let c = 0; c < row.length; c++) {
      html += `<td data-label="${escapeHtml(headers[c] || '')}">${escapeHtml(row[c] || '')}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function preprocess(md, source) {
  if (/tda_error_landscapes/i.test(source || '')) return preprocessTdaReport(md);
  return md;
}

function estimateReadMinutes(words) {
  return Math.max(1, Math.round(words / 220));
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function loadVersion() {
  // Cache-busting: stamp with epoch; a new build -> new version -> SW picks up fresh assets.
  return String(Date.now());
}

function build() {
  // Clean dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const version = loadVersion();
  const articles = [];

  function processEntry(entry, lang, sourcePath) {
    const absPath = path.resolve(REPO_ROOT, sourcePath);
    if (!fs.existsSync(absPath)) {
      console.warn(`[skip] ${sourcePath} not found`);
      return null;
    }
    const rawMd = fs.readFileSync(absPath, 'utf8');
    const md = preprocess(rawMd, sourcePath);
    const id = entry.id || slugify(path.basename(sourcePath, path.extname(sourcePath)));
    const title = entry.title || extractTitle(md, id);
    const subtitle = entry.subtitle || extractSubtitle(md);
    const html = marked.parse(md);
    const plain = stripTags(html);
    const words = wordCount(plain);
    const toc = headingsToToc(md);

    return {
      id,
      title,
      subtitle,
      category: entry.category,
      tags: entry.tags || [],
      source: sourcePath,
      lang,
      words,
      readMinutes: estimateReadMinutes(words),
      toc,
      html,
    };
  }

  for (const entry of CATALOG.entries) {
    // Default language article
    const defaultArticle = processEntry(entry, 'en', entry.source);
    if (!defaultArticle) continue;

    const languages = ['en'];
    fs.writeFileSync(
      path.join(DATA_DIR, `${defaultArticle.id}.json`),
      JSON.stringify(defaultArticle)
    );

    const title = { en: defaultArticle.title };
    const subtitle = { en: defaultArticle.subtitle };

    // Internationalized variants
    if (entry.i18n) {
      for (const [lang, sourcePath] of Object.entries(entry.i18n)) {
        const variant = processEntry(entry, lang, sourcePath);
        if (variant) {
          languages.push(lang);
          title[lang] = variant.title;
          subtitle[lang] = variant.subtitle;
          fs.writeFileSync(
            path.join(DATA_DIR, `${variant.id}.${lang}.json`),
            JSON.stringify(variant)
          );
        }
      }
    }

    const meta = {
      id: defaultArticle.id,
      title,
      subtitle,
      category: defaultArticle.category,
      tags: defaultArticle.tags,
      words: defaultArticle.words,
      readMinutes: defaultArticle.readMinutes,
      languages,
      featured: !!entry.featured,
    };
    articles.push(meta);
  }

  // Library manifest: compact metadata (no html bodies) for fast first paint.
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    categories: CATALOG.categories,
    languages: CATALOG.languages || {},
    articles,
  };
  fs.writeFileSync(path.join(DATA_DIR, 'library.json'), JSON.stringify(manifest, null, 2));

  // Copy static src -> dist, substituting __VERSION__ placeholder.
  for (const name of fs.readdirSync(SRC)) {
    const s = path.join(SRC, name);
    const d = path.join(DIST, name);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else if (/\.(html|js|css|webmanifest)$/.test(name)) {
      const content = fs.readFileSync(s, 'utf8').replaceAll('__VERSION__', version);
      fs.writeFileSync(d, content);
    } else {
      fs.copyFileSync(s, d);
    }
  }

  // Self-host force-graph so the entity graph keeps working offline and is
  // not held hostage to CDN availability or TLS hiccups at unpkg.
  const fgSrc = path.join(ROOT, 'node_modules', 'force-graph', 'dist', 'force-graph.min.js');
  if (fs.existsSync(fgSrc)) {
    fs.mkdirSync(path.join(DIST, 'vendor'), { recursive: true });
    fs.copyFileSync(fgSrc, path.join(DIST, 'vendor', 'force-graph.min.js'));
  } else {
    console.warn('[warn] force-graph not in node_modules; entity graph will fall back to CDN');
  }

  console.log(`Built ${articles.length} articles. version=${version}`);
  console.log(`Output: ${path.relative(process.cwd(), DIST)}`);
}

build();
