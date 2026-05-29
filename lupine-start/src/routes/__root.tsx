import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Link } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import katexCss from 'katex/dist/katex.min.css?url'

const queryClient = new QueryClient()

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`
const BRAND_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://lupine.science/#organization',
      name: 'Lupine Science',
      url: 'https://lupine.science',
      description: 'Lupine Science studies where interatomic potentials fail, why those failures have structure, and how that structure can guide correction.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://lupine.science/#website',
      name: 'Lupine Science',
      url: 'https://lupine.science',
      publisher: { '@id': 'https://lupine.science/#organization' },
      description: 'The public research-program entry point for Lupine Science.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://lupi.live/#software',
      name: 'LUPI',
      url: 'https://lupi.live',
      applicationCategory: 'Scientific visualization',
      operatingSystem: 'Web',
      publisher: { '@id': 'https://lupine.science/#organization' },
      description: 'Browser-native WebGPU viewer for atomistic evidence from Lupine Science.',
    },
  ],
})

function NotFoundComponent() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-32">
      <div className="text-center max-w-lg">
        <div className="font-mono text-xs text-[var(--primary)] uppercase tracking-[0.3em] mb-6">404 — NOT FOUND</div>
        <h1 className="font-serif tracking-tight text-5xl lg:text-7xl mb-8 leading-[1.05] text-[var(--on-surface)]">Off the ribbon.</h1>
        <p className="text-[var(--on-surface-variant)] text-lg mb-10 leading-relaxed">
          The page you requested is not in our manifest. It may have been retired, renamed, or never existed at all.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-sans text-sm font-semibold uppercase tracking-[0.08em] rounded-md hover:opacity-90 transition-opacity no-underline"
          >
            Return home
          </Link>
          <Link
            to="/research"
            className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-sans text-sm font-semibold uppercase tracking-[0.08em] rounded-md hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors no-underline"
          >
            Read the preprint
          </Link>
        </div>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Lupine Science - error geometry for interatomic potentials' },
      { name: 'description', content: 'Lupine Science is a public research program studying where interatomic potentials fail, why those failures have structure, and how that structure can guide correction.' },
      { name: 'application-name', content: 'Lupine Science' },
      { name: 'apple-mobile-web-app-title', content: 'Lupine Science' },
      { name: 'theme-color', content: '#0a1628' },
      { property: 'og:site_name', content: 'Lupine Science' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Lupine Science' },
      { property: 'og:description', content: 'A lab-facing research corpus for atomistic model trust: error geometry, claim lifecycle, LUPI evidence views, and agent-readable knowledge.' },
      { property: 'og:url', content: 'https://lupine.science/' },
      { property: 'og:image', content: 'https://lupine.science/og-lupine-science.png' },
      { property: 'og:image:alt', content: 'Lupine Science bluebonnet mark and wordmark.' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Lupine Science' },
      { name: 'twitter:description', content: 'Error geometry, inspectable evidence, and claim lifecycle for interatomic potentials.' },
      { name: 'twitter:image', content: 'https://lupine.science/og-lupine-science.png' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'stylesheet',
        href: katexCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: 'any',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'alternate',
        type: 'text/plain',
        title: 'Agent guide for Lupine Science',
        href: '/llms.txt',
      },
      {
        rel: 'alternate',
        type: 'text/plain',
        title: 'Full agent guide for Lupine Science',
        href: '/llms-full.txt',
      },
      {
        rel: 'alternate',
        type: 'application/json',
        title: 'Lupine Science brand metadata',
        href: '/brand.json',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
      },
      /* Self-hosted font preloads — eliminates FOUT for critical text */
      {
        rel: 'preload',
        href: '/fonts/RumelazGekinsa-Regular.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/RumelazGekinsa-Italic.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/CSClaireMono-Regular.otf',
        as: 'font',
        type: 'font/otf',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/CSClaireMono-Italic.otf',
        as: 'font',
        type: 'font/otf',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  notFoundComponent: NotFoundComponent,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const state = useRouterState()
  const isHome = state.location.pathname === '/'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: BRAND_JSON_LD }} />
        <HeadContent />
      </head>
      <body className="bg-[var(--surface)] text-[var(--on-surface-variant)] font-sans antialiased [overflow-wrap:anywhere] min-h-screen flex flex-col">
        <QueryClientProvider client={queryClient}>
          {!isHome && <Header />}
          {children}
          {!isHome && <Footer />}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
