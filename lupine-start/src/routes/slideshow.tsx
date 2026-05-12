// /slideshow — auto-advancing image slideshow over the ~100 MiniMax-
// generated stills in the worker's R2 slideshow/ prefix. Pulls live
// manifest from /research/slideshow.json so freshly-generated images
// land in the carousel without redeploying.
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

const WORKER = import.meta.env.VITE_GLIM_THINK_URL ?? 'https://glim-think-v1.aw-ab5.workers.dev'
const ADVANCE_MS_DEFAULT = 5500

interface SlideshowImage {
  slug: string
  category: string
  palette: string
  aspect: string
  prompt: string
  r2_url: string | null
  status: string
  latency_ms: number | null
  created_at: string
  completed_at: string | null
}

interface ManifestResponse {
  images: SlideshowImage[]
  totals: { total: number; complete: number; failed: number; pending: number }
  generated_at: string
}

export const Route = createFileRoute('/slideshow')({
  component: SlideshowPage,
  head: () => ({
    meta: [
      { title: 'Slideshow — Lupine Materials Science' },
      {
        name: 'description',
        content:
          'Generative image collection from the GLIM research engine — element portraits, crystal structures, manifold geometry, agent topology, and lupine-brand visuals across 100+ MiniMax stills.',
      },
    ],
  }),
})

const CATEGORY_LABELS: Record<string, string> = {
  elements: 'Elements',
  crystal: 'Crystal Structures',
  manifold: 'Manifold Geometry',
  causal: 'Causal Inference',
  architecture: 'Architecture',
  electronic: 'Electronic Structure',
  brand: 'Lupine Brand',
  abstract: 'Abstract / Glimmer',
  cinematic: 'Cinematic Science',
  process: 'Research Process',
}

function SlideshowPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['slideshow-manifest'],
    queryFn: async () => {
      const res = await fetch(`${WORKER}/research/slideshow.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.json() as Promise<ManifestResponse>
    },
    refetchInterval: 20_000, // pulse every 20s while images are still being generated
  })

  const allImages = data?.images ?? []
  const completed = useMemo(
    () => allImages.filter(i => i.status === 'complete' && i.r2_url),
    [allImages],
  )
  const categories = useMemo(() => {
    const set = new Set(completed.map(i => i.category))
    return ['all', ...Array.from(set).sort()]
  }, [completed])

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const filtered = useMemo(
    () => activeCategory === 'all' ? completed : completed.filter(i => i.category === activeCategory),
    [completed, activeCategory],
  )

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const advanceMs = ADVANCE_MS_DEFAULT
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIndex(0)
  }, [activeCategory])

  useEffect(() => {
    if (paused || filtered.length <= 1) return
    timerRef.current = setTimeout(() => {
      setIndex(i => (i + 1) % filtered.length)
    }, advanceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [index, paused, filtered.length, advanceMs])

  const next = () => setIndex(i => (i + 1) % Math.max(1, filtered.length))
  const prev = () => setIndex(i => (i - 1 + filtered.length) % Math.max(1, filtered.length))

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      else if (e.key.toLowerCase() === 'p') { setPaused(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="mono-label text-[var(--on-surface-variant)]">loading manifest…</p>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-8 border-l-2 border-[var(--error)]">
          <p className="mono-label text-[var(--error)] mb-2">failed to load slideshow</p>
          <p className="font-mono text-sm text-[var(--on-surface-variant)]">{(error as Error)?.message ?? 'unknown error'}</p>
        </div>
      </div>
    )
  }

  const totals = data!.totals
  const current = filtered[index]

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)] flex flex-col">
      {/* header */}
      <header className="px-6 lg:px-12 py-4 border-b border-[var(--outline-variant)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4 flex-wrap">
          <h1 className="font-display text-lg uppercase tracking-widest">
            Slideshow
          </h1>
          <span className="font-mono text-xs text-[var(--on-surface-variant)]">
            <b className="text-[var(--secondary)]">{totals.complete}</b> / {totals.total} ready
            {totals.pending > 0 && <> · <span className="text-[var(--primary)]">{totals.pending} generating</span></>}
            {totals.failed > 0 && <> · <span className="text-[var(--error)]">{totals.failed} failed</span></>}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
                activeCategory === c
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)]'
                  : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]'
              }`}
            >
              {c === 'all' ? `all · ${completed.length}` : `${CATEGORY_LABELS[c] ?? c} · ${completed.filter(i => i.category === c).length}`}
            </button>
          ))}
        </div>
      </header>

      {/* hero */}
      <section className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        <div
          className="flex-1 relative bg-[var(--surface-container-lowest)] flex items-center justify-center p-6 lg:p-12"
          onClick={next}
          style={{ cursor: 'pointer', minHeight: '50vh' }}
        >
          {current ? (
            <img
              key={current.slug}
              src={current.r2_url ?? ''}
              alt={current.prompt}
              className="max-w-full max-h-[80vh] object-contain animate-[fadein_0.6s_ease-out]"
              style={{ boxShadow: '0 12px 60px rgba(0,0,0,0.4)' }}
            />
          ) : completed.length === 0 ? (
            <div className="text-center max-w-md">
              <p className="mono-label text-[var(--primary)] mb-4">slideshow generating</p>
              <p className="text-[var(--on-surface-variant)] text-sm">
                {totals.pending} images currently rendering via MiniMax. They'll appear here as
                they land — page polls every 20s.
              </p>
            </div>
          ) : (
            <p className="mono-label text-[var(--on-surface-variant)]">no images in this category</p>
          )}
          {filtered.length > 1 && current && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest text-[var(--on-surface-variant)] bg-[var(--surface)]/80 backdrop-blur px-3 py-1 rounded">
              {index + 1} / {filtered.length}
            </div>
          )}
        </div>

        {/* side panel */}
        {current && (
          <aside className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-[var(--outline-variant)] p-6 overflow-y-auto bg-[var(--surface)]">
            <div className="mb-4">
              <span
                className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                {CATEGORY_LABELS[current.category] ?? current.category}
              </span>
            </div>
            <h2 className="font-display text-2xl mb-4 leading-tight">{current.slug}</h2>
            <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-6">
              {current.prompt}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono text-[var(--on-surface-variant)] mb-6 pt-4 border-t border-[var(--outline-variant)]">
              <dt>aspect</dt><dd className="text-[var(--on-surface)]">{current.aspect}</dd>
              <dt>palette</dt><dd className="text-[var(--on-surface)]">{current.palette}</dd>
              <dt>latency</dt><dd className="text-[var(--on-surface)]">{current.latency_ms ? `${(current.latency_ms / 1000).toFixed(1)}s` : '—'}</dd>
              <dt>made</dt><dd className="text-[var(--on-surface)]">{current.completed_at?.slice(0, 16).replace('T', ' ')}</dd>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={prev}
                aria-label="previous"
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-[var(--outline-variant)] hover:border-[var(--primary)]"
              >
                ◀ prev
              </button>
              <button
                onClick={() => setPaused(p => !p)}
                aria-label={paused ? 'play' : 'pause'}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border ${
                  paused
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)]'
                    : 'border-[var(--outline-variant)] hover:border-[var(--primary)]'
                }`}
              >
                {paused ? '▶ play' : '❚❚ pause'}
              </button>
              <button
                onClick={next}
                aria-label="next"
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-[var(--outline-variant)] hover:border-[var(--primary)]"
              >
                next ▶
              </button>
              <a
                href={current.r2_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-[var(--outline-variant)] hover:border-[var(--primary)] no-underline"
              >
                open ↗
              </a>
            </div>

            <p className="mt-4 text-[10px] font-mono text-[var(--on-surface-variant)]">
              <kbd>←</kbd>/<kbd>→</kbd> navigate · <kbd>p</kbd> pause/play · click image for next
            </p>
          </aside>
        )}
      </section>

      {/* thumbnail strip */}
      {filtered.length > 1 && (
        <footer className="border-t border-[var(--outline-variant)] overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-min">
            {filtered.map((img, i) => (
              <button
                key={img.slug}
                onClick={() => setIndex(i)}
                aria-label={`go to ${img.slug}`}
                className={`relative flex-shrink-0 transition-opacity ${
                  i === index ? 'opacity-100 ring-2' : 'opacity-50 hover:opacity-80'
                }`}
                style={{ height: 64 }}
              >
                <img
                  src={img.r2_url ?? ''}
                  alt={img.slug}
                  className="h-full w-auto"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </footer>
      )}

      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: scale(0.985); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
