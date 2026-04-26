import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Link } from '@tanstack/react-router'

import appCss from '../styles.css?url'

const queryClient = new QueryClient()

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

function NotFoundComponent() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="mono-label text-[var(--primary)] glow-primary mb-6 tracking-[0.3em]">404 — NOT FOUND</div>
        <h1 className="text-6xl lg:text-8xl mb-6">Lost in the manifold.</h1>
        <p className="text-[var(--on-surface-variant)] text-lg mb-10 leading-relaxed">
          The page you requested does not exist in this configuration space.
          It may have been removed, renamed, or never existed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-display text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Return to Thesis
          </Link>
          <Link
            to="/research"
            className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-display text-sm uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors"
          >
            Read the Manifesto
          </Link>
        </div>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Lupine Materials Science',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap',
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
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
