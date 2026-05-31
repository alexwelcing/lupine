import { Link, createFileRoute } from '@tanstack/react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'

const HERO_PROOF_RAIL = [
  '14/15 IMMI elements stay on the ribbon',
  '3 confounded claims refuted in public',
  'Au foundation-MLIP escape remains open',
  'Every claim links back to inspectable evidence',
]

const LAB_QUESTIONS = [
  'Where does this potential fail?',
  'Is the failure low-rank or diffuse?',
  'Does a foundation MLIP inherit the same geometry?',
  'Which aggregate trends disappear after stratification?',
  'Can the evidence be inspected in the browser?',
  'What correction target follows from the evidence?',
]

const SCIENCE_SPINE = [
  {
    layer: 'Error geometry',
    question: 'Do prediction errors form stable low-dimensional structure across potentials, elements, and properties?',
    evidence: 'IMMI analysis, hyper-ribbon reports, LUPI evidence views',
  },
  {
    layer: 'Cross-MLIP transfer',
    question: 'Do foundation MLIPs inherit, rotate, or escape the error geometry found in classical potentials?',
    evidence: 'mlip_immi runs, cross-MLIP alignment payloads, conjecture ledger',
  },
  {
    layer: 'Causal validity',
    question: 'Which apparent model trends survive matched-sample tests, bootstrap controls, and confounder checks?',
    evidence: 'Refutation notes, Simpson checks, changelog entries',
  },
  {
    layer: 'Claim lifecycle',
    question: 'Can a claim move from proposed to supported, refuted, corrected, or open without losing provenance?',
    evidence: 'Lupine Library, CHANGELOG.md, glim-think ledger',
  },
]

const START_PATHS = [
  {
    title: 'Read the Library',
    body: 'Reports, status labels, refutations, formal notes, and the working changelog.',
    to: 'https://library.lupine.science',
    external: true,
  },
  {
    title: 'Inspect in LUPI',
    body: 'Structures, trajectories, galleries, and evidence routes in the browser-native viewer.',
    to: 'https://lupi.live',
    external: true,
  },
  {
    title: 'Review the research',
    body: 'The IMMI analysis, supported/refuted/open hypotheses, and causal geometry trail.',
    to: '/research',
  },
  {
    title: 'Watch the live lab',
    body: 'Broadcasts, source intake, claim movement, and operating cadence without a pitch-first surface.',
    to: '/live',
  },
]

const WATCH_SIGNALS = [
  'Claim status changes',
  'Research source intake',
  'Refutations and corrections',
  'LUPI evidence routes',
  'Library report updates',
  'Agent-readable files',
  'glim-think broadcasts',
]

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'Lupine Science - error geometry for interatomic potentials' },
      {
        name: 'description',
        content:
          'Lupine Science is a public research program studying where interatomic potentials fail, why those failures have structure, and how that structure can guide correction.',
      },
      { property: 'og:title', content: 'Lupine Science - error geometry for interatomic potentials' },
      {
        property: 'og:description',
        content:
          'A lab-facing research corpus for atomistic model trust: error geometry, claim lifecycle, LUPI evidence views, and agent-readable knowledge.',
      },
      { property: 'og:url', content: 'https://lupine.science/' },
    ],
  }),
})

function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">
      <Header />
      <main>
        <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden border-b border-[var(--outline-variant)]">
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--outline-variant) 38%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--outline-variant) 32%, transparent) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none border-t border-[var(--outline-variant)] bg-[linear-gradient(to_bottom,transparent,var(--surface-container-low))]" />

          <div className="container relative mx-auto max-w-7xl px-6 lg:px-12 py-7 lg:py-9">
            <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)] gap-7 lg:gap-10 items-center">
              <div className="relative z-10">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--primary)] mb-5">
                  Public research program
                </p>
                <h1 className="font-serif tracking-normal text-[clamp(3.05rem,11vw,4.2rem)] lg:text-[clamp(4.2rem,5.25vw,5.6rem)] leading-[0.9] text-[var(--on-surface)] max-w-5xl">
                  Error geometry for interatomic potentials.
                </h1>
                <p className="mt-5 text-base md:text-lg leading-relaxed text-[var(--on-surface-variant)] max-w-3xl">
                  Lupine Science studies where atomistic models fail, why those failures
                  have structure, and how that structure can guide correction. Built for
                  materials labs, MLIP builders, research software teams, and lab leaders
                  who need evidence they can inspect.
                </p>

                <div className="mt-7 flex flex-wrap gap-4">
                  <a
                    href="https://library.lupine.science"
                    className="inline-flex min-h-12 items-center justify-center px-6 py-3 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold no-underline hover:opacity-90 transition-opacity"
                  >
                    Read the Library
                  </a>
                  <a
                    href="https://lupi.live"
                    className="inline-flex min-h-12 items-center justify-center px-6 py-3 rounded-md border border-[var(--outline)] text-[var(--on-surface)] font-semibold no-underline hover:bg-[var(--surface-container-low)] transition-colors"
                  >
                    Open LUPI
                  </a>
                  <Link
                    to="/research"
                    className="inline-flex min-h-12 items-center justify-center px-6 py-3 rounded-md border border-[var(--outline-variant)] text-[var(--on-surface-variant)] font-semibold no-underline hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors"
                  >
                    Review the science
                  </Link>
                </div>
              </div>

              <HeroEvidenceTheater />
            </div>
          </div>
        </section>

        <section className="py-14 lg:py-18">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12 grid lg:grid-cols-[0.78fr_1.22fr] gap-10 lg:gap-14 items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--secondary)] mb-4">
                Why it matters
              </p>
              <h2 className="font-serif tracking-normal text-4xl lg:text-6xl leading-[1.02] mb-6">
                The hard question is not only which model is accurate.
              </h2>
              <p className="text-[var(--on-surface-variant)] leading-relaxed text-lg">
                A lab needs to know where a potential is unsafe to extrapolate,
                whether the failure is structured, which confounders have been
                checked, and what next experiment would change the claim status.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {LAB_QUESTIONS.map((question, index) => (
                <div
                  key={question}
                  className="group border border-[var(--outline-variant)] rounded-md p-5 bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] transition-colors"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--on-surface-variant-mid)] mb-4">
                    Q{String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="text-[var(--on-surface)] leading-relaxed">{question}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-16 lg:py-20 bg-[var(--surface-container-low)] border-y border-[var(--outline-variant)]">
          <div className="absolute inset-x-0 top-0 h-px bg-[var(--primary)] opacity-50" />
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-10 lg:gap-14 mb-10">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--primary)] mb-4">
                  Science spine
                </p>
                <h2 className="font-serif tracking-normal text-4xl lg:text-6xl leading-[1.02] mb-5">
                  The corpus behaves like a living instrument.
                </h2>
              </div>
              <p className="text-[var(--on-surface-variant)] leading-relaxed text-lg lg:text-xl max-w-3xl">
                The central object is not a leaderboard. It is the lifecycle of
                evidence: proposed claims, tests, refutations, corrections, and
                inspectable artifacts that survive beyond a single report.
              </p>
            </div>

            <div className="grid lg:grid-cols-4 gap-4">
              {SCIENCE_SPINE.map((item, index) => (
                <article
                  key={item.layer}
                  className="relative overflow-hidden border border-[var(--outline-variant)] rounded-md p-5 bg-[var(--surface)] min-h-[260px]"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[var(--primary)]" style={{ opacity: 0.25 + index * 0.15 }} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--secondary)] mb-8">
                    Layer {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="font-serif text-3xl leading-none text-[var(--on-surface)] mb-5">{item.layer}</h3>
                  <p className="text-sm leading-relaxed text-[var(--on-surface-variant)] mb-5">{item.question}</p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--secondary)] leading-relaxed">{item.evidence}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--secondary)] mb-4">
                  How to use it
                </p>
                <h2 className="font-serif tracking-normal text-4xl lg:text-6xl leading-[1.02] mb-5">
                  Start with the evidence trail.
                </h2>
                <p className="text-[var(--on-surface-variant)] leading-relaxed text-lg">
                  Researchers can read, inspect, reproduce, or extend the work.
                  Observers can watch the operating cadence without needing the
                  front door to become an investor deck.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {START_PATHS.map((path, index) => {
                  const content = (
                    <div className="h-full border border-[var(--outline-variant)] rounded-md p-5 bg-[var(--surface)] hover:bg-[var(--surface-container-low)] transition-colors">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--primary)] mb-5">
                        Route {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="font-semibold text-[var(--on-surface)] mb-3">{path.title}</h3>
                      <p className="text-sm leading-relaxed text-[var(--on-surface-variant)]">{path.body}</p>
                    </div>
                  )

                  return path.external ? (
                    <a key={path.title} href={path.to} className="no-underline">
                      {content}
                    </a>
                  ) : (
                    <Link key={path.title} to={path.to} className="no-underline">
                      {content}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20 bg-[var(--surface-container-low)] border-t border-[var(--outline-variant)]">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12 grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-14">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--primary)] mb-4">
                For collaborators and observers
              </p>
              <h2 className="font-serif tracking-normal text-4xl lg:text-6xl leading-[1.02] mb-5">
                Watch the work compound.
              </h2>
              <p className="text-[var(--on-surface-variant)] leading-relaxed text-lg">
                The strongest signal is not a claim that Lupine Science is always
                right. It is a visible system that can find where it was wrong,
                preserve the correction, and make the next run smarter.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {WATCH_SIGNALS.map((signal) => (
                <div key={signal} className="border border-[var(--outline-variant)] rounded-md px-4 py-3 bg-[var(--surface)]">
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function HeroEvidenceTheater() {
  return (
    <div className="relative z-10 w-full max-w-[720px] mx-auto lg:mx-0">
      <div className="relative overflow-hidden min-h-[250px] sm:min-h-[310px] lg:min-h-[480px] border-y lg:border border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--outline-variant) 42%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--outline-variant) 36%, transparent) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 760 520" role="img" aria-label="Abstract error geometry field">
          <defs>
            <linearGradient id="lupineRibbon" x1="96" x2="650" y1="424" y2="74" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--secondary)" stopOpacity="0.42" />
              <stop offset="0.45" stopColor="var(--primary)" stopOpacity="0.92" />
              <stop offset="1" stopColor="var(--violet-300)" stopOpacity="0.62" />
            </linearGradient>
          </defs>
          <path d="M70 392 C154 302, 232 390, 326 286 S485 86, 676 136" fill="none" stroke="url(#lupineRibbon)" strokeWidth="30" strokeLinecap="round" opacity="0.16" />
          <path d="M70 392 C154 302, 232 390, 326 286 S485 86, 676 136" fill="none" stroke="url(#lupineRibbon)" strokeWidth="5" strokeLinecap="round" />
          <path d="M74 438 C168 312, 272 358, 372 232 S544 68, 724 94" fill="none" stroke="var(--secondary)" strokeWidth="1.8" strokeDasharray="9 11" opacity="0.58" />
          <path d="M34 326 C142 254, 238 320, 334 252 S516 176, 724 216" fill="none" stroke="var(--on-surface-variant-mid)" strokeWidth="1.2" strokeDasharray="4 12" opacity="0.5" />
          <path d="M112 162 C206 210, 282 188, 364 148 S552 82, 700 310" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="2 14" opacity="0.36" />
          {[
            [92, 396],
            [146, 340],
            [210, 342],
            [286, 302],
            [340, 256],
            [398, 198],
            [468, 142],
            [548, 116],
            [650, 130],
            [612, 232],
            [456, 326],
            [278, 232],
            [192, 172],
            [704, 306],
          ].map(([cx, cy], index) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={index % 3 === 0 ? 7 : 4.5}
              fill={index % 4 === 0 ? 'var(--secondary)' : 'var(--primary)'}
              opacity={index % 5 === 0 ? 0.92 : 0.68}
            />
          ))}
        </svg>

        <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)]">Frontier claim field</p>
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">Where model trust becomes visible</p>
          </div>
          <span className="inline-flex h-3 w-3 rounded-full bg-[var(--primary)] animate-[pulse-soft_3s_ease-in-out_infinite]" />
        </div>

        <div className="absolute left-5 top-24 hidden lg:grid max-w-[250px] gap-3">
          {HERO_PROOF_RAIL.slice(0, 3).map((line, index) => (
            <p
              key={line}
              className="border-l border-[var(--primary)] pl-3 font-mono text-[9px] uppercase tracking-[0.1em] leading-relaxed text-[var(--on-surface-variant)]"
            >
              <span className="mr-2 text-[var(--secondary)]">{String(index + 1).padStart(2, '0')}</span>
              {line}
            </p>
          ))}
        </div>

        <img
          src="/assets/lupine-science-icon.png"
          alt="Lupine Science bluebonnet mark"
          className="absolute right-6 bottom-20 w-24 sm:w-32 lg:right-10 lg:bottom-20 lg:w-44 object-contain drop-shadow-xl"
        />

        <div className="absolute left-5 right-5 bottom-5 grid grid-cols-[1fr_auto] gap-4 items-end">
          <div className="border-l-2 border-[var(--primary)] pl-4">
            <p className="font-serif text-3xl sm:text-4xl lg:text-6xl leading-[0.9] text-[var(--on-surface)]">
              Claim pressure, not claim polish.
            </p>
            <p className="hidden sm:block mt-4 max-w-md text-sm leading-relaxed text-[var(--on-surface-variant)]">
              Supported, refuted, corrected, and open evidence stays in the same public field.
            </p>
          </div>
          <div className="hidden sm:block border border-[var(--outline-variant)] bg-[var(--surface)]/82 px-4 py-3 backdrop-blur-sm">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--on-surface-variant-mid)]">Next run</p>
            <p className="mt-2 font-serif text-3xl leading-none text-[var(--on-surface)]">queued</p>
          </div>
        </div>
      </div>
    </div>
  )
}
