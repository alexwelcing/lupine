import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="min-h-screen pt-[var(--section-pad-y)] pb-12">
      <div className="container mx-auto max-w-5xl px-6 lg:px-12">
        <div className="mb-16">
          <div className="mono-label text-[var(--secondary)] mb-6 tracking-[0.3em]">
            ABOUT
          </div>
          <h1 className="text-5xl lg:text-6xl mb-6">
            A small starter with room to grow.
          </h1>
          <p className="text-[var(--on-surface-variant)] text-lg max-w-3xl leading-relaxed">
            TanStack Start gives you type-safe routing, server functions, and
            modern SSR defaults. Use this as a clean foundation, then layer in
            your own routes, styling, and add-ons.
          </p>
        </div>

        <div className="glass-panel p-8 md:p-12">
          <h2 className="text-2xl mb-4">What is Lupine?</h2>
          <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
            Lupine is a unified computational materials science platform. We are building
            the first open-source stack that combines quantum DFT, machine-learned
            interatomic potentials, and billion-atom molecular dynamics in a single
            Rust codebase — from electrons to engineering insights in one command.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              { label: 'DFT', desc: 'Plane-wave density functional theory' },
              { label: 'ML Potentials', desc: 'Neural network force fields' },
              { label: 'MD', desc: 'Billion-atom molecular dynamics' },
            ].map((item) => (
              <div key={item.label} className="glass-panel-elevated p-6">
                <div className="mono-label text-[var(--primary)] mb-2">{item.label}</div>
                <p className="text-sm text-[var(--on-surface-variant)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
