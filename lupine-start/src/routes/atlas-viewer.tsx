import { createFileRoute } from '@tanstack/react-router'
import { Section, SectionHeader } from '../components/ui/Section'
import { Card } from '../components/ui/Card'

export const Route = createFileRoute('/atlas-viewer')({
  component: AtlasViewerPage,
  head: () => ({
    meta: [
      { title: 'Atlas Viewer — WebGPU exploration of the audit layer' },
      { name: 'description', content: 'The browser-native interface for inspecting Lupine\'s cross-potential error manifold and your own MD trajectories side-by-side. WebGPU rendering of up to 10M atoms at 60fps. No install, no license. Drag a LAMMPS dump, XYZ, or PDB.' },
      { property: 'og:title', content: 'Atlas Viewer — WebGPU exploration of the audit layer' },
      { property: 'og:description', content: 'See the audit results and your own MD trajectories together, in the browser. WebGPU. No install. Apache 2.0.' },
      { property: 'og:url', content: 'https://lupine.science/atlas-viewer' },
    ],
  }),
})

/* ─── Data ─── */

const SUPPORTED_FORMATS = [
  { ext: '.lammpstrj', name: 'LAMMPS Trajectory', desc: 'Timestep-indexed atomic dumps from molecular dynamics runs' },
  { ext: '.dump', name: 'LAMMPS Dump', desc: 'Custom property exports from LAMMPS simulations' },
  { ext: '.xyz', name: 'XYZ', desc: 'Universal coordinate format used across chemistry and biology' },
  { ext: '.data', name: 'LAMMPS Data', desc: 'Full topology files with bonds, angles, and coefficients' },
  { ext: '.pdb', name: 'Protein Data Bank', desc: 'Standard format for biological macromolecules and proteins' },
  { ext: '.cif', name: 'Crystallographic', desc: 'Crystal structure data from X-ray and neutron diffraction' },
]

const USE_CASES = [
  {
    audience: 'Materials Scientists',
    icon: '⬡',
    problems: [
      'Inspect interatomic potential outputs without installing OVITO',
      'Compare defect structures across EAM, MEAM, and ML potentials',
      'Validate grain boundary configurations from LAMMPS simulations',
      'Share simulation snapshots with collaborators via URL',
    ],
    example: 'Drag your 500K-atom Cu–Zr metallic glass dump and see amorphous structure in seconds.',
  },
  {
    audience: 'Structural Biologists',
    icon: '🧬',
    problems: [
      'Visualize protein conformations from PDB files in the browser',
      'Inspect cryo-EM reconstructions without heavyweight desktop tools',
      'Render molecular surfaces at resolutions VMD struggles with',
      'Create publication figures with SSAO and depth-of-field effects',
    ],
    example: 'Open a 2M-atom ribosome PDB and orbit the structure at 60fps with ambient occlusion.',
  },
  {
    audience: 'Battery & Energy Researchers',
    icon: '⚡',
    problems: [
      'Visualize lithium migration pathways in cathode materials',
      'Inspect solid-electrolyte interface formation from MD trajectories',
      'Animate charge–discharge cycling across thousands of timesteps',
      'Share findings with PIs and funders without file attachments',
    ],
    example: 'Load a LiCoO₂ cathode trajectory and watch lithium intercalation frame by frame.',
  },
  {
    audience: 'Educators & Students',
    icon: '📐',
    problems: [
      'Demonstrate crystallography concepts with real atomic data',
      'Let students explore FCC, BCC, HCP structures interactively',
      'No departmental license needed — works on any laptop with a browser',
      'Embed viewer links in course materials and problem sets',
    ],
    example: 'Students open a SiC bulk crystal from a course URL and rotate it to identify lattice planes.',
  },
]

const COMPARISON = [
  { feature: 'Atom count at 60fps', ovito: '~500K', vmd: '~200K', atlas: '10M+' },
  { feature: 'Install required', ovito: 'Yes (250MB)', vmd: 'Yes (150MB)', atlas: 'None' },
  { feature: 'License cost', ovito: '$600/yr Pro', vmd: 'Free (academic)', atlas: 'Free forever' },
  { feature: 'Sharing', ovito: 'Export file', vmd: 'Export file', atlas: 'Send a URL' },
  { feature: 'GPU acceleration', ovito: 'OpenGL', vmd: 'OpenGL', atlas: 'WebGPU' },
  { feature: 'Video export', ovito: 'Software encode', vmd: 'Software encode', atlas: 'Hardware (WebCodecs)' },
  { feature: 'Parser speed', ovito: 'C++ native', vmd: 'C native', atlas: 'Rust/WASM (10x JS)' },
  { feature: 'Platform', ovito: 'Win/Mac/Linux', vmd: 'Win/Mac/Linux', atlas: 'Any browser' },
]

/* ─── Page ─── */
function AtlasViewerPage() {
  return (
    <main className="relative flex-1 bg-[var(--surface)] overflow-hidden">

      {/* ══ HERO ══ */}
      <section className="relative min-h-[90vh] flex flex-col justify-end overflow-hidden">
        {/* Background image */}
        <img
          src="/assets/lupine_lattice_crystal.png"
          alt="Lupine crystal lattice visualization"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient scrim for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/80 to-transparent lg:to-[#0a1628]/20" />

        {/* Content overlay */}
        <div className="relative z-10 container mx-auto max-w-7xl px-6 lg:px-12 pb-16 lg:pb-24 pt-[180px]">
          <div
            className="max-w-2xl"
          >
            <div className="mono-label text-[var(--accent-cyan)] mb-6 tracking-[0.3em]">ATLAS VIEWER · INSPECTION INTERFACE</div>
            <h1 className="font-serif tracking-tight text-5xl lg:text-7xl mb-8 leading-[1.05] text-[var(--on-surface)]">
              See your <em className="italic text-[var(--accent-cyan)]">trajectories</em>,<br />and the audit beside them.
            </h1>
            <p className="text-white/70 text-lg lg:text-xl mb-10 max-w-xl leading-relaxed font-light">
              The browser-native interface for inspecting Lupine's cross-potential error manifold next to your own MD runs. Drag a LAMMPS dump, XYZ, or PDB and get publication-quality 3D in two seconds. No install, no license, no Python scripts. Free during the pilot.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="https://lupinematerials.science"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3.5 bg-[var(--accent-cyan)] text-[#0a1628] font-sans text-sm font-semibold uppercase tracking-[0.08em] hover:opacity-90 transition-opacity no-underline"
              >
                Launch Viewer →
              </a>
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3.5 border border-white/40 text-white font-sans text-sm font-semibold uppercase tracking-[0.08em] hover:bg-white/10 transition-colors no-underline backdrop-blur-sm"
              >
                View Source
              </a>
            </div>
          </div>
        </div>

        {/* Bottom fade into content */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/30 to-transparent" />
      </section>

      {/* ══ THE PROBLEM ══ */}
      <Section bg="light">
        <div className="max-w-3xl mx-auto text-center">
          <span className="mono-label text-[var(--primary)] opacity-60 mb-8 block">THE PROBLEM</span>
          <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">
            Molecular visualization is stuck in 2005.
          </h2>
          <p className="text-[var(--on-surface-variant)] text-lg leading-relaxed mb-12">
            Every week, thousands of researchers finish a simulation, export a dump file, and then spend 30 minutes
            fighting OVITO licenses, VMD dependencies, or Python matplotlib scripts just to <em>look</em> at their atoms.
            The data is already computed. Why is seeing it the hardest part?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { label: 'Desktop lock-in', desc: 'OVITO and VMD require local installation, specific OS versions, and GPU driver compatibility.' },
              { label: 'License friction', desc: 'OVITO Pro is $600/year. Sharing requires everyone to have the same software installed.' },
              { label: 'Scale ceiling', desc: 'Most desktop tools start dropping frames above 500K atoms. Modern simulations routinely exceed 10M.' },
            ].map((item) => (
              <Card key={item.label} className="border-t-2 border-t-[var(--error)]">
                <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--error)] mb-3">{item.label}</div>
                <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ══ HOW IT WORKS ══ */}
      <Section>
        <SectionHeader
          label="How It Works"
          title="Three steps. Zero dependencies."
          description="Atlas Viewer is built on WebGPU and Rust/WASM. Your browser becomes a GPU-accelerated molecular workstation."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Drag & drop your file',
              desc: 'LAMMPS trajectories, XYZ coordinates, PDB structures, CIF crystals — Atlas parses them all with Rust/WASM parsers that run 10× faster than JavaScript.',
              accent: 'var(--accent-cyan)',
            },
            {
              step: '02',
              title: 'GPU renders instantly',
              desc: 'WebGPU instanced rendering places every atom on the GPU. SSAO, depth of field, and bloom give you publication-quality output without a render queue.',
              accent: 'var(--lupine-400)',
            },
            {
              step: '03',
              title: 'Share via URL',
              desc: 'Copy the link and send it to your advisor, your collaborator, or your funding body. They see exactly what you see — no file attachments, no software installs.',
              accent: 'var(--violet-300)',
            },
          ].map((item) => (
            <Card key={item.step} elevated>
              <div className="font-mono text-3xl mb-4" style={{ color: item.accent }}>{item.step}</div>
              <h3 className="text-xl font-semibold text-[var(--on-surface)] mb-3">{item.title}</h3>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ══ SUPPORTED FORMATS ══ */}
      <Section bg="light">
        <SectionHeader
          label="File Formats"
          title="Bring your own data."
          description="Atlas Viewer reads the formats researchers already produce. No conversion step, no intermediate scripts."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUPPORTED_FORMATS.map((f) => (
            <Card key={f.ext}>
              <code className="font-mono text-lg text-[var(--accent-cyan)] block mb-2">{f.ext}</code>
              <div className="text-sm font-semibold text-[var(--on-surface)] mb-1">{f.name}</div>
              <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--on-surface-variant)] italic">
            Need a format we don't support? <a href="https://github.com/alexwelcing/lupine/issues" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">Open an issue</a> — parsers are modular Rust crates and easy to add.
          </p>
        </div>
      </Section>

      {/* ══ WHO IT'S FOR ══ */}
      <Section>
        <SectionHeader
          label="Use Cases"
          title="Built for researchers, not render farms."
          description="Atlas Viewer solves different problems for different scientific communities — but the core value is the same: see your data faster."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {USE_CASES.map((uc) => (
            <Card key={uc.audience} elevated className="relative overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{uc.icon}</span>
                <h3 className="text-xl font-semibold text-[var(--on-surface)]">{uc.audience}</h3>
              </div>
              <ul className="space-y-2.5 mb-6">
                {uc.problems.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-[var(--on-surface-variant)]">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--accent-cyan)' }} />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4 border-t border-[var(--outline-variant)]">
                <p className="text-xs text-[var(--on-surface-variant)] italic leading-relaxed">
                  <span className="text-[var(--accent-cyan)] font-semibold not-italic">Example: </span>
                  {uc.example}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ══ COMPARISON TABLE ══ */}
      <Section bg="light">
        <SectionHeader
          label="Comparison"
          title="Atlas vs. the incumbents."
          description="Side-by-side with the tools most researchers currently use."
          centered
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] max-w-4xl mx-auto" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-container-high)' }}>
                {['Feature', 'OVITO', 'VMD', 'Atlas Viewer'].map((h, i) => (
                  <th
                    key={h}
                    className="text-left px-5 py-4 font-semibold text-[11px] uppercase tracking-[0.08em] border-b"
                    style={{
                      color: i === 3 ? 'var(--accent-cyan)' : 'var(--on-surface-variant)',
                      background: i === 3 ? 'rgba(78,205,196,0.06)' : undefined,
                      borderColor: 'var(--outline-variant)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, ri) => (
                <tr key={ri} className="hover:bg-[var(--surface-container-low)] transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--on-surface)]" style={{ borderBottom: '1px solid var(--outline-variant)' }}>{row.feature}</td>
                  <td className="px-5 py-3 text-[var(--on-surface-variant)]" style={{ borderBottom: '1px solid var(--outline-variant)' }}>{row.ovito}</td>
                  <td className="px-5 py-3 text-[var(--on-surface-variant)]" style={{ borderBottom: '1px solid var(--outline-variant)' }}>{row.vmd}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--accent-cyan)', background: 'rgba(78,205,196,0.04)', borderBottom: '1px solid var(--outline-variant)' }}>{row.atlas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ══ LAMMPS HOW-TO ══ */}
      <Section>
        <SectionHeader
          label="Quick Start"
          title="From simulation to visualization in 60 seconds."
        />
        <div className="max-w-3xl">
          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-3">1. Generate a compatible dump from LAMMPS</h3>
              <p className="text-sm text-[var(--on-surface-variant)] mb-4 leading-relaxed">
                Add a custom dump command to your LAMMPS input script. Atlas needs atom IDs, types, and Cartesian coordinates at minimum:
              </p>
              <Card className="font-mono text-sm !p-5 overflow-x-auto">
                <pre className="text-[var(--accent-cyan)]">
{`# In your LAMMPS input script:
dump  atlas all custom 1000 dump.lammpstrj id type x y z

# Optional: include velocities for kinetic energy coloring
dump  atlas all custom 1000 dump.lammpstrj id type x y z vx vy vz`}
                </pre>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-3">2. Open the viewer and drag your file</h3>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                Navigate to <a href="https://lupinematerials.science" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline font-medium">lupinematerials.science</a> and
                drag <code className="bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded text-[var(--accent-cyan)] text-xs">dump.lammpstrj</code> directly
                onto the canvas. The Rust/WASM parser ingests the file locally — <strong>nothing is uploaded to any server</strong>.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-3">3. Explore, screenshot, or share</h3>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                Orbit with mouse drag, zoom with scroll. Toggle SSAO and depth-of-field for publication quality. Export high-resolution screenshots or
                hardware-accelerated video via WebCodecs. Copy the URL to share with anyone — they don't need an account.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ══ TECHNICAL SPECS ══ */}
      <Section bg="light">
        <SectionHeader
          label="Under the Hood"
          title="How Atlas achieves 10M atoms at 60fps."
          centered
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Rendering', value: 'WebGPU', desc: 'Next-gen browser GPU API. Instanced sphere imposters with per-atom properties.' },
            { label: 'Parsing', value: 'Rust → WASM', desc: 'Zero-copy file parsing compiled to WebAssembly. 10× faster than JavaScript parsers.' },
            { label: 'Shading', value: 'WGSL', desc: 'Custom shaders for SSAO, bloom, depth of field. GPU-resident — no CPU readback.' },
            { label: 'Export', value: 'WebCodecs', desc: 'Hardware-accelerated video encoding. Render an animation without screen recording tools.' },
          ].map((s) => (
            <Card key={s.label}>
              <div className="mono-label text-[var(--on-surface-variant)] opacity-60 mb-2">{s.label}</div>
              <div className="text-xl font-bold text-[var(--on-surface)] mb-2">{s.value}</div>
              <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ══ CTA ══ */}
      <section className="relative text-center px-6 py-24 lg:py-32">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(78,205,196,0.06), transparent 70%)' }} />
        <div className="max-w-xl mx-auto relative z-10">
          <div>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">
              Stop installing.<br />Start <em className="italic text-[var(--accent-cyan)]">seeing</em>.
            </h2>
            <p className="text-[var(--on-surface-variant)] text-lg mb-10 leading-relaxed">
              Atlas Viewer is free, open-source, and runs entirely in your browser. Your data never leaves your machine.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="https://lupinematerials.science"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-[var(--accent-cyan)] text-[#0a1628] font-sans text-sm font-bold uppercase tracking-[0.08em] hover:opacity-90 transition-opacity no-underline"
              >
                Open Atlas Viewer
              </a>
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border border-[var(--primary)] text-[var(--primary)] font-sans text-sm font-bold uppercase tracking-[0.08em] hover:bg-[var(--primary)] hover:text-white transition-colors no-underline"
              >
                View Source
              </a>
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
