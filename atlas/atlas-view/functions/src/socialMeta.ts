export interface SavedViewShareDoc {
  title?: unknown;
  slug?: unknown;
  visibility?: unknown;
  molecule?: unknown;
  view?: unknown;
}

export interface SavedViewShareModel {
  appUrl: string;
  description: string;
  imageAlt: string;
  imageUrl: string;
  pageTitle: string;
  robots: string;
  shareUrl: string;
  slug: string;
  title: string;
}

const DEFAULT_PUBLIC_ORIGIN = 'https://lupi.live';
const DEFAULT_SOCIAL_IMAGE = '/og-lupi.png';
const MAX_TITLE_LENGTH = 92;
const MAX_DESCRIPTION_LENGTH = 220;

export function savedViewSlugFromRequestPath(path: string): string | null {
  const match = path.match(/\/view\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return cleanSlug(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function buildSavedViewShareModel(
  slug: string,
  doc: SavedViewShareDoc,
  publicOrigin = DEFAULT_PUBLIC_ORIGIN,
): SavedViewShareModel {
  const clean = cleanSlug(stringField(doc.slug) || slug);
  const origin = normalizeOrigin(publicOrigin);
  const title = clip(cleanText(stringField(doc.title)) || titleFromSlug(clean), MAX_TITLE_LENGTH);
  const description = describeSavedView(doc);
  const shareUrl = `${origin}/view/${encodeURIComponent(clean)}`;
  const imageUrl = `${origin}${DEFAULT_SOCIAL_IMAGE}`;

  return {
    appUrl: `${origin}/#/view/${encodeURIComponent(clean)}`,
    description,
    imageAlt: `${title} in the Lupi molecular viewer.`,
    imageUrl,
    pageTitle: `${title} | Lupi`,
    robots: 'index,follow,max-image-preview:large',
    shareUrl,
    slug: clean,
    title,
  };
}

export function buildMissingViewShareModel(
  slug: string,
  publicOrigin = DEFAULT_PUBLIC_ORIGIN,
): SavedViewShareModel {
  const clean = cleanSlug(slug) || 'saved-view';
  const origin = normalizeOrigin(publicOrigin);
  return {
    appUrl: origin,
    description: 'Open shareable molecular and materials scenes in the browser with Lupi.',
    imageAlt: 'Lupi molecular viewer title card from Lupine Science.',
    imageUrl: `${origin}${DEFAULT_SOCIAL_IMAGE}`,
    pageTitle: 'Lupi saved view not found',
    robots: 'noindex,nofollow,max-image-preview:large',
    shareUrl: `${origin}/view/${encodeURIComponent(clean)}`,
    slug: clean,
    title: 'Lupi saved view not found',
  };
}

export function renderSavedViewShareHtml(model: SavedViewShareModel, redirectToApp = true): string {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: model.title,
    description: model.description,
    url: model.shareUrl,
    image: model.imageUrl,
    isPartOf: {
      '@type': 'WebApplication',
      name: 'Lupi',
      url: normalizeOrigin(new URL(model.shareUrl).origin),
      applicationCategory: 'Scientific visualization',
    },
  }, null, 2).replace(/</g, '\\u003c');

  const redirectScript = redirectToApp ? `
    <script>
      (() => {
        const ua = navigator.userAgent || '';
        const isPreviewBot = /(bot|crawler|spider|slurp|preview|facebookexternalhit|linkedinbot|twitterbot|discordbot|telegrambot|whatsapp|pinterest)/i.test(ua);
        if (!isPreviewBot) window.location.replace(${JSON.stringify(model.appUrl)});
      })();
    </script>` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(model.pageTitle)}</title>
  <meta name="description" content="${escapeHtml(model.description)}">
  <meta name="robots" content="${escapeHtml(model.robots)}">
  <meta name="theme-color" content="#06080d">
  <meta property="og:site_name" content="Lupi">
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(model.title)}">
  <meta property="og:description" content="${escapeHtml(model.description)}">
  <meta property="og:url" content="${escapeHtml(model.shareUrl)}">
  <meta property="og:image" content="${escapeHtml(model.imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(model.imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(model.imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(model.title)}">
  <meta name="twitter:description" content="${escapeHtml(model.description)}">
  <meta name="twitter:image" content="${escapeHtml(model.imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(model.imageAlt)}">
  <link rel="canonical" href="${escapeHtml(model.shareUrl)}">
  <script type="application/ld+json">
${indent(jsonLd, 4)}
  </script>
  <style>
    html, body { margin: 0; min-height: 100%; background: #06080d; color: #f4efe5; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
    section { width: min(620px, 100%); border: 1px solid rgba(244,239,229,.22); border-radius: 8px; padding: 20px; background: linear-gradient(145deg, rgba(6,8,8,.96), rgba(18,22,22,.94)); box-shadow: 0 28px 88px rgba(0,0,0,.42); }
    h1 { margin: 0 0 8px; font-size: clamp(24px, 6vw, 42px); line-height: 1.05; letter-spacing: 0; }
    p { margin: 0 0 16px; color: rgba(244,239,229,.72); font-size: 14px; line-height: 1.5; }
    a { display: inline-grid; place-items: center; min-height: 44px; padding: 0 16px; border-radius: 8px; color: #120c05; background: #f2aa45; font-weight: 800; text-decoration: none; font-size: 14px; }
    @media (max-width: 480px) {
      main { padding: 12px; }
      section { padding: 16px; }
    }
  </style>${redirectScript}
</head>
<body>
  <main>
    <section>
      <h1>${escapeHtml(model.title)}</h1>
      <p>${escapeHtml(model.description)}</p>
      <a href="${escapeHtml(model.appUrl)}">Open in Lupi</a>
    </section>
  </main>
</body>
</html>`;
}

function describeSavedView(doc: SavedViewShareDoc): string {
  const molecule = asRecord(doc.molecule);
  const view = asRecord(doc.view);
  const effects = asRecord(view?.effects);
  const material = asRecord(view?.material);

  const name = clip(cleanText(stringField(molecule?.name)), 72);
  const atoms = numberField(molecule?.atomCount);
  const frames = numberField(molecule?.totalFrames);
  const details = [
    atoms ? `${formatCount(atoms)} atoms` : null,
    frames && frames > 1 ? `${formatCount(frames)} frames` : null,
  ].filter(Boolean);

  const prefix = name ? `${name}: ` : '';
  const stats = details.length ? `${details.join(', ')} in ` : '';

  const isCinematic = effects?.postprocessPreset === 'cinematic';
  const isPicnic = material?.materialScene === 'picnic' || material?.environmentPreset === 'park';

  let suffix = 'a browser-shareable Lupi molecular view with a live 3D scene.';
  if (isCinematic && isPicnic) {
    suffix = 'a cinematic outdoor picnic scene in Lupi — perfect for sharing immersive molecular visuals.';
  } else if (isCinematic) {
    suffix = 'a cinematic Lupi view with depth-of-field and rich lighting for dramatic sharing.';
  } else if (isPicnic) {
    suffix = 'an outdoor park-style Lupi scene under natural lighting.';
  }

  return clip(
    `${prefix}${stats}${suffix}`,
    MAX_DESCRIPTION_LENGTH,
  );
}

function cleanSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'Lupi saved view';
}

function normalizeOrigin(value: string): string {
  return (value || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberField(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}...`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function indent(value: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return value.split('\n').map((line) => `${prefix}${line}`).join('\n');
}
