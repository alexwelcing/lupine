import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/about')({
  component: About,
  head: () => ({
    meta: [
      { title: 'About — Lupine Materials Science' },
      { name: 'description', content: 'Lupine is a unified computational materials science platform combining quantum DFT, ML potentials, and billion-atom MD in a single Rust codebase.' },
    ],
  }),
})

function About() {
  return (
    <PageShell
      kicker="ABOUT"
      title="A small starter with room to grow."
      subtitle="TanStack Start gives you type-safe routing, server functions, and modern SSR defaults. Use this as a clean foundation, then layer in your own routes, styling, and add-ons."
      className="[&>div]:max-w-5xl"
    >
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

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-8">
          <h3 className="text-xl mb-4">The Stack</h3>
          <ul className="space-y-3 text-[var(--on-surface-variant)] text-sm">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-[var(--primary)]" />
              Rust + WASM for compute-heavy parsers
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-[var(--primary)]" />
              WebGPU for GPU-accelerated rendering
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-[var(--primary)]" />
              TanStack Start + React for the frontend
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-[var(--primary)]" />
              Cloudflare Workers + D1 for edge data
            </li>
          </ul>
        </div>
        <div className="glass-panel p-8">
          <h3 className="text-xl mb-4">The Mission</h3>
          <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed">
            Every nation needs sovereign materials simulation infrastructure. Lupine
            replaces the fractured proprietary stack with a single, auditable,
            open-source codebase — accelerating discovery at the speed of software.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
