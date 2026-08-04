import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '../apps/web');
const distRoot = path.join(appRoot, 'dist');
const manifestPath = path.resolve(scriptDir, '../packages/ui/src/seo-routes.json');
const routeManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const routes = Object.values(routeManifest.routes);

const indexPath = path.join(distRoot, 'index.html');
const baseHtml = await readFile(indexPath, 'utf8');

for (const route of routes) {
  const routeHtml = injectSeo(baseHtml, route, routeManifest);
  if (route.canonicalPath === '/') {
    await writeFile(indexPath, routeHtml);
    continue;
  }

  const routeDir = path.join(distRoot, ...route.canonicalPath.split('/').filter(Boolean));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), routeHtml);
}

console.log(`Generated static SEO HTML for ${routes.length} Lupi routes.`);

function injectSeo(html, route, manifest) {
  const canonical = absoluteUrl(route.canonicalPath, manifest.siteOrigin);
  const image = absoluteUrl(route.image ?? manifest.defaultSocialImage, manifest.siteOrigin);
  const imageAlt = route.imageAlt ?? 'Lupi molecular viewer from Lupine Science.';

  let next = html;
  next = replaceTitle(next, route.title);
  next = upsertMeta(next, 'name', 'description', route.description);
  next = upsertMeta(next, 'name', 'robots', 'index,follow,max-image-preview:large');
  next = upsertMeta(next, 'property', 'og:site_name', 'Lupine Science');
  next = upsertMeta(next, 'property', 'og:locale', 'en_US');
  next = upsertMeta(next, 'property', 'og:type', route.type ?? 'website');
  next = upsertMeta(next, 'property', 'og:title', route.title);
  next = upsertMeta(next, 'property', 'og:description', route.description);
  next = upsertMeta(next, 'property', 'og:url', canonical);
  next = upsertMeta(next, 'property', 'og:image', image);
  next = upsertMeta(next, 'property', 'og:image:alt', imageAlt);
  next = upsertMeta(next, 'name', 'twitter:card', 'summary_large_image');
  next = upsertMeta(next, 'name', 'twitter:title', route.title);
  next = upsertMeta(next, 'name', 'twitter:description', route.description);
  next = upsertMeta(next, 'name', 'twitter:image', image);
  next = upsertMeta(next, 'name', 'twitter:image:alt', imageAlt);
  next = upsertCanonical(next, canonical);
  next = upsertJsonLd(next, route.jsonLd);
  return next;
}

function absoluteUrl(pathOrUrl, siteOrigin) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteOrigin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function replaceTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  return html.replace(/<title>[\s\S]*?<\/title>/i, tag);
}

function upsertMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
  const regex = new RegExp(`<meta\\s+[^>]*${attribute}=["']${escapeRegExp(key)}["'][^>]*>`, 'i');
  if (regex.test(html)) return html.replace(regex, tag);
  return insertBeforeHeadClose(html, `  ${tag}\n`);
}

function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  const regex = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  if (regex.test(html)) return html.replace(regex, tag);
  return insertBeforeHeadClose(html, `  ${tag}\n`);
}

function upsertJsonLd(html, jsonLd) {
  if (!jsonLd) return html;
  const json = JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c');
  const tag = `<script id="lupi-route-jsonld" type="application/ld+json">\n${indent(json, 2)}\n  </script>`;
  const regex = /<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/i;
  if (regex.test(html)) return html.replace(regex, tag);
  return insertBeforeHeadClose(html, `  ${tag}\n`);
}

function insertBeforeHeadClose(html, insertion) {
  return html.replace(/<\/head>/i, `${insertion}</head>`);
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
