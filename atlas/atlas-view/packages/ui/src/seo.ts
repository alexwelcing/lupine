import { useEffect } from 'react';

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  jsonLd?: unknown;
}

export const SITE_ORIGIN = 'https://lupi.live';
export const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/og-lupi.png`;
export const MASSIVE_LATTICE_IMAGE = `${SITE_ORIGIN}/gallery/snapshots/massive_1m.jpg`;

const ORGANIZATION_JSON_LD = {
  '@type': 'Organization',
  '@id': 'https://lupine.science/#organization',
  name: 'Lupine Science',
  url: 'https://lupine.science',
  description: 'Lupine Science builds scientific tools for molecular and materials visualization.',
};

export const HOME_SEO: SeoConfig = {
  title: 'Lupi - 1M Atom Molecular Viewer',
  description:
    'Visualize million-atom molecular scenes, organic chemistry functional groups, OMol25 geometries, and materials science structures in the browser.',
  canonicalPath: '/',
  image: DEFAULT_SOCIAL_IMAGE,
  imageAlt: 'Lupi molecular viewer title card from Lupine Science.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION_JSON_LD,
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: 'Lupi',
        url: SITE_ORIGIN,
        publisher: { '@id': 'https://lupine.science/#organization' },
        description:
          'Interactive molecular and materials science viewer with large atomistic scenes, functional group study examples, and OMol25 search.',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_ORIGIN}/#software`,
        name: 'Lupi',
        url: SITE_ORIGIN,
        applicationCategory: 'Scientific visualization',
        operatingSystem: 'Web',
        publisher: { '@id': 'https://lupine.science/#organization' },
        description:
          'Browser-native molecular viewer for atomistic structures, organic chemistry examples, materials datasets, and publication exports.',
      },
      {
        '@type': 'Dataset',
        '@id': `${SITE_ORIGIN}/#structure-gallery`,
        name: 'Lupi molecular structure gallery',
        url: `${SITE_ORIGIN}/#gallery`,
        creator: { '@id': 'https://lupine.science/#organization' },
        description:
          'A curated gallery of molecules, materials structures, trajectories, and OMol25-linked examples for browser visualization.',
      },
    ],
  },
};

export const MASSIVE_LATTICE_SEO: SeoConfig = {
  title: '1M Copper Lattice Scene - Lupi Molecular Viewer',
  description:
    'Open a 953,312-atom FCC copper lattice in Lupi and inspect a browser-controlled materials science scale-test scene.',
  canonicalPath: '/scenes/1m-copper-lattice',
  image: MASSIVE_LATTICE_IMAGE,
  imageAlt: 'A nearly million-atom FCC copper lattice rendered in the Lupi molecular viewer.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION_JSON_LD,
      {
        '@type': 'WebPage',
        '@id': `${SITE_ORIGIN}/scenes/1m-copper-lattice#webpage`,
        name: '1M Copper Lattice Scene',
        url: `${SITE_ORIGIN}/scenes/1m-copper-lattice`,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        publisher: { '@id': 'https://lupine.science/#organization' },
        description:
          'A public Lupi scene page for opening and understanding a 953,312-atom FCC copper lattice scale test.',
      },
      {
        '@type': 'Dataset',
        '@id': `${SITE_ORIGIN}/scenes/1m-copper-lattice#dataset`,
        name: '953,312-atom FCC copper lattice',
        url: `${SITE_ORIGIN}/?sim=massive_1m`,
        creator: { '@id': 'https://lupine.science/#organization' },
        description:
          'Generated FCC copper scale-test geometry packaged as a Lupi loadable scene for browser molecular visualization.',
        variableMeasured: ['atom positions', 'element identity'],
      },
    ],
  },
};

export function useSeo(config: SeoConfig) {
  useEffect(() => {
    applySeo(config);
  }, [config]);
}

function applySeo(config: SeoConfig) {
  const canonical = absoluteUrl(config.canonicalPath);
  const image = absoluteUrl(config.image ?? DEFAULT_SOCIAL_IMAGE);
  const imageAlt = config.imageAlt ?? 'Lupi molecular viewer from Lupine Science.';

  document.title = config.title;
  upsertMeta('name', 'description', config.description);
  upsertMeta('property', 'og:site_name', 'Lupine Science');
  upsertMeta('property', 'og:type', config.type ?? 'website');
  upsertMeta('property', 'og:title', config.title);
  upsertMeta('property', 'og:description', config.description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:alt', imageAlt);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', config.title);
  upsertMeta('name', 'twitter:description', config.description);
  upsertMeta('name', 'twitter:image', image);
  upsertCanonical(canonical);
  upsertRouteJsonLd(config.jsonLd);
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_ORIGIN}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertRouteJsonLd(jsonLd: unknown) {
  let element = document.getElementById('lupi-route-jsonld') as HTMLScriptElement | null;
  if (!jsonLd) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('script');
    element.id = 'lupi-route-jsonld';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(jsonLd);
}
