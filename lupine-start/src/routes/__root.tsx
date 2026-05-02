import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Link } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import katexCss from 'katex/dist/katex.min.css?url'

const queryClient = new QueryClient()

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

function NotFoundComponent() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-32">
      <div className="text-center max-w-lg">
        <div className="font-mono text-xs font-semibold text-[var(--primary)] uppercase tracking-[0.3em] mb-6">404 — NOT FOUND</div>
        <h1 className="font-serif text-5xl lg:text-7xl mb-6 text-[var(--slate-100)]">Lost in the manifold.</h1>
        <p className="text-[var(--on-surface-variant)] text-lg mb-10 leading-relaxed">
          The page you requested does not exist in this configuration space.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-sans text-sm font-semibold uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity no-underline"
          >
            Return Home
          </Link>
          <Link
            to="/research"
            className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-sans text-sm font-semibold uppercase tracking-widest rounded-lg hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors no-underline"
          >
            Read the Research
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
      { title: 'Lupine Materials Science' },
      { name: 'description', content: 'Open-source materials science platform with 559 interatomic potentials, a WebGPU molecular viewer, and autonomous research intelligence. Built in Rust, Apache 2.0.' },
      { property: 'og:site_name', content: 'Lupine Materials Science' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: 'https://lupine.science/logo512.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://lupine.science/logo512.png' },
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
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap',
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
