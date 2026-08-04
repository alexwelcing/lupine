import type { SeoEducationKind } from '../landing/SeoEducationPage';
import { slugifySavedViewTitle } from '../savedViews';

export function currentHashRoute() {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.replace(/^#/, '').trim();
  return hash.startsWith('/') ? hash : '/';
}

export function currentPathRoute() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

export function normalizedPathRoute(route: string) {
  if (route === '/') return route;
  return route.replace(/\/+$/, '') || '/';
}

export function savedViewSlugFromRoute(route: string): string | null {
  const routePath = route.split('?')[0] || '/';
  if (!routePath.startsWith('/view/')) return null;
  try {
    return slugifySavedViewTitle(decodeURIComponent(routePath.slice('/view/'.length)));
  } catch {
    return null;
  }
}

export const SEO_EDUCATION_ROUTES: Record<string, SeoEducationKind> = {
  '/study/organic-functional-groups': 'functional-groups',
  '/study/functional-group-examples': 'functional-group-examples',
  '/study/organic-chemistry-3d-molecule-viewer': 'ochem-viewer',
  '/materials/omol25': 'omol25',
  '/materials/omol25-molecule-geometry': 'omol25-geometry',
  '/materials/million-atom-viewer': 'million-atom-viewer',
};

export function isTestbedRoute(search = typeof window === 'undefined' ? '' : window.location.search) {
  return new URLSearchParams(search).has('testbed');
}

export function isEmojiRoute(hashRoute = currentHashRoute(), search = typeof window === 'undefined' ? '' : window.location.search) {
  return new URLSearchParams(search).has('emoji') || hashRoute.split('?')[0] === '/system/emoji';
}

export function isMcpViewerRoute(hashPath: string, search = typeof window === 'undefined' ? '' : window.location.search) {
  return hashPath === '/mcp' || new URLSearchParams(search).has('mcp');
}
