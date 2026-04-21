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

// Ensure each rendered heading has an id matching slugify(text) so TOC anchors work.
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  const plain = stripTags(text);
  const id = slugify(plain);
  return `<h${level} id="${id}">${text}</h${level}>`;
};
renderer.table = (header, body) => {
  return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};
marked.setOptions({ renderer, headerIds: false, mangle: false, gfm: true, breaks: false });

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

  for (const entry of CATALOG.entries) {
    const absPath = path.resolve(REPO_ROOT, entry.source);
    if (!fs.existsSync(absPath)) {
      console.warn(`[skip] ${entry.source} not found`);
      continue;
    }
    const md = fs.readFileSync(absPath, 'utf8');
    const id = entry.id || slugify(path.basename(entry.source, path.extname(entry.source)));
    const title = entry.title || extractTitle(md, id);
    const subtitle = entry.subtitle || extractSubtitle(md);
    const html = marked.parse(md);
    const plain = stripTags(html);
    const words = wordCount(plain);
    const toc = headingsToToc(md);

    const article = {
      id,
      title,
      subtitle,
      category: entry.category,
      tags: entry.tags || [],
      source: entry.source,
      words,
      readMinutes: estimateReadMinutes(words),
      toc,
      html,
    };
    articles.push(article);

    fs.writeFileSync(
      path.join(DATA_DIR, `${id}.json`),
      JSON.stringify(article)
    );
  }

  // Library manifest: compact metadata (no html bodies) for fast first paint.
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    categories: CATALOG.categories,
    articles: articles.map(({ html, toc, ...meta }) => meta),
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

  console.log(`Built ${articles.length} articles. version=${version}`);
  console.log(`Output: ${path.relative(process.cwd(), DIST)}`);
}

build();
