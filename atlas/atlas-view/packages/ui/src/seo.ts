import { useEffect } from 'react';
import seoRoutes from './seo-routes.json';

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  jsonLd?: unknown;
}

interface SeoRouteManifest {
  siteOrigin: string;
  defaultSocialImage: string;
  routes: Record<string, SeoConfig>;
}

const SEO_ROUTE_MANIFEST = seoRoutes as SeoRouteManifest;

export const SITE_ORIGIN = SEO_ROUTE_MANIFEST.siteOrigin;
export const DEFAULT_SOCIAL_IMAGE = SEO_ROUTE_MANIFEST.defaultSocialImage;
export const HOME_SEO = SEO_ROUTE_MANIFEST.routes.home;
export const MASSIVE_LATTICE_SEO = SEO_ROUTE_MANIFEST.routes.massiveLattice;
export const FUNCTIONAL_GROUPS_SEO = SEO_ROUTE_MANIFEST.routes.functionalGroups;
export const FUNCTIONAL_GROUP_EXAMPLES_SEO = SEO_ROUTE_MANIFEST.routes.functionalGroupExamples;
export const OCHEM_VIEWER_SEO = SEO_ROUTE_MANIFEST.routes.ochemViewer;
export const OMOL25_SEO = SEO_ROUTE_MANIFEST.routes.omol25;
export const OMOL25_GEOMETRY_SEO = SEO_ROUTE_MANIFEST.routes.omol25Geometry;
export const MILLION_ATOM_VIEWER_SEO = SEO_ROUTE_MANIFEST.routes.millionAtomViewer;

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
  upsertMeta('property', 'og:locale', 'en_US');
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
  upsertMeta('name', 'twitter:image:alt', imageAlt);
  upsertMeta('name', 'robots', 'index,follow,max-image-preview:large');
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
