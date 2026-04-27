import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/atlas-viewer')({
  component: AtlasViewerPage,
  head: () => ({
    meta: [
      { title: 'Atlas Viewer — WebGPU Molecular Visualization' },
      { name: 'description', content: 'Drag a LAMMPS dump file into your browser and get publication-quality 3D in two seconds. No install. No license.' },
      { property: 'og:title', content: 'Atlas Viewer — WebGPU Molecular Visualization' },
      { property: 'og:description', content: 'Drag a LAMMPS dump file into your browser and get publication-quality 3D in two seconds. No install. No license.' },
      { property: 'og:url', content: 'https://lupine.science/atlas-viewer' },
      { name: 'twitter:title', content: 'Atlas Viewer — WebGPU Molecular Visualization' },
      { name: 'twitter:description', content: 'Drag a LAMMPS dump file into your browser and get publication-quality 3D in two seconds. No install. No license.' },
    ],
  }),
})

function AtlasViewerPage() {
  const atoms = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    delay: `${Math.random() * 3}s`,
    opacity: 0.5 + Math.random() * 0.5,
  }))

  return (
    <PageShell
      kicker="ATLAS VIEWER // LIVE"
      title="WebGPU Molecular Visualization"
      subtitle="Drag a LAMMPS dump file into your browser and get publication-quality 3D in two seconds. No install. No license. No Python scripts."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-8">
        {/* Atom grid preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative rounded-2xl overflow-hidden flex items-center justify-center aspect-video"
          style={{
            background: 'var(--slate-800)',
            border: '1px solid var(--slate-700)',
          }}
        >
          <div
            className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-md"
            style={{
              color: 'var(--accent-cyan)',
              background: 'rgba(78, 205, 196, 0.1)',
              border: '1px solid rgba(78, 205, 196, 0.2)',
            }}
          >
            &#9679; Live
          </div>
          <div className="grid grid-cols-8 gap-1.5 max-w-[280px]">
            {atoms.map((atom) => (
              <div
                key={atom.id}
                className="w-full aspect-square rounded-full"
                style={{
                  animation: `atom-pulse 3s ease-in-out infinite`,
                  animationDelay: atom.delay,
                  opacity: atom.opacity,
                  background:
                    atom.id % 3 === 0
                      ? 'radial-gradient(circle at 35% 35%, var(--accent-cyan), #1a7a74)'
                      : atom.id % 2 === 0
                        ? 'radial-gradient(circle at 35% 35%, var(--violet-300), var(--violet-700))'
                        : 'radial-gradient(circle at 35% 35%, var(--lupine-400), var(--lupine-700))',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Feature list + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl mb-6">Features</h2>
          <ul className="space-y-4">
            {[
              'WebGPU rendering — 10M+ atoms at 60fps',
              'Rust/WASM parsers — 10x faster than JavaScript',
              'SSAO, depth of field, bloom — publication quality',
              'URL sharing — send a link, not a file',
              'Free forever — replaces $$/yr OVITO Pro seats',
              'WebCodecs video export — hardware-accelerated',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-[var(--on-surface-variant)]">
                <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: 'var(--accent-cyan)' }} />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="https://viewer.lupine.science"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-display text-sm uppercase tracking-widest hover:opacity-90 transition-opacity text-center"
            >
              Launch Atlas Viewer →
            </a>
            <a
              href="https://viewer.lupine.science?demo=1"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[var(--secondary)] text-[var(--secondary)] font-display text-sm uppercase tracking-widest hover:bg-[var(--secondary)] hover:text-[var(--on-secondary)] transition-colors text-center"
            >
              Try Demo
            </a>
            <a
              href="https://github.com/alexwelcing/lupine"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-display text-sm uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors text-center"
            >
              View Source
            </a>
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}
