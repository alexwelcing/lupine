export function currentHashRoute() {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.replace(/^#/, '').trim();
  return hash.startsWith('/') ? hash : '/';
}
