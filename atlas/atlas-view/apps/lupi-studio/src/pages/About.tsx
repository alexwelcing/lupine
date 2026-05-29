import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Unlock,
  Bot,
  Microscope,
  Github,
  Star,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Clock,
  Atom,
  type LucideIcon,
} from 'lucide-react';
import MoleculeViewer from '@/components/MoleculeViewer';
import type { MoleculeData } from '@/components/MoleculeViewer';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────── easing ─────────────────── */
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ═══════════════════════════════════════════════
   DIAMOND CRYSTAL LATTICE DATA (FCC)
   ═══════════════════════════════════════════════ */

function generateDiamondLattice(): MoleculeData {
  const a = 3.567;
  const atoms: { element: string; x: number; y: number; z: number }[] = [];
  const positions: [number, number, number][] = [];

  /* FCC lattice points + basis */
  const basis: [number, number, number][] = [
    [0, 0, 0],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
    [0.25, 0.25, 0.25],
    [0.75, 0.75, 0.25],
    [0.75, 0.25, 0.75],
    [0.25, 0.75, 0.75],
  ];

  for (let ix = 0; ix < 3; ix++) {
    for (let iy = 0; iy < 3; iy++) {
      for (let iz = 0; iz < 2; iz++) {
        for (const [bx, by, bz] of basis) {
          const x = (bx + ix) * a;
          const y = (by + iy) * a;
          const z = (bz + iz) * a;
          positions.push([x, y, z]);
        }
      }
    }
  }

  /* Deduplicate */
  const seen = new Set<string>();
  for (const [x, y, z] of positions) {
    const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      atoms.push({ element: 'C', x, y, z });
    }
  }

  /* Center the lattice */
  const cx = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
  const cy = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
  const cz = atoms.reduce((s, a) => s + a.z, 0) / atoms.length;

  return {
    atoms: atoms.map((a) => ({
      element: a.element,
      x: a.x - cx,
      y: a.y - cy,
      z: a.z - cz,
    })),
  };
}

const DIAMOND_DATA = generateDiamondLattice();

/* ═══════════════════════════════════════════════
   TIMELINE DATA
   ═══════════════════════════════════════════════ */

interface TimelineEvent {
  year: string;
  description: string;
  isActive: boolean;
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  { year: '2022', description: 'Lupine research program begins — ML interatomic potential error analysis', isActive: false },
  { year: '2023', description: 'LUPI (later LUPI) created — first 3D molecule viewer with XYZ support', isActive: false },
  { year: '2024', description: 'Gallery expands to 12 simulation domains — from proteins to nanotubes', isActive: false },
  { year: '2025', description: 'LUPI MCP Protocol launched — any AI agent can generate molecules', isActive: true },
];

/* ═══════════════════════════════════════════════
   PRINCIPLES DATA
   ═══════════════════════════════════════════════ */

interface Principle {
  icon: LucideIcon;
  title: string;
  body: string;
  color: string;
  borderColor: string;
}

const PRINCIPLES: Principle[] = [
  {
    icon: Unlock,
    title: 'Atomic Data Should Be Open',
    body: 'Every molecule in our gallery is sourced from open databases like PubChem and NIST. Every coordinate is verifiable. No black boxes, no proprietary locks.',
    color: '#7B5CFF',
    borderColor: 'border-b-[#7B5CFF]',
  },
  {
    icon: Bot,
    title: 'Built for AI Agents First',
    body: 'The MCP Protocol means LUPI isn\u2019t just a tool for humans \u2014 it\u2019s a capability any AI can invoke. Design molecules in conversation. Generate structures from research papers.',
    color: '#00E5FF',
    borderColor: 'border-b-[#00E5FF]',
  },
  {
    icon: Microscope,
    title: 'Rigor Without Complexity',
    body: 'We don\u2019t approximate. Every 3D coordinate comes from verified sources or validated force-field optimization. The same accuracy as specialized software, none of the friction.',
    color: '#FF2E63',
    borderColor: 'border-b-[#FF2E63]',
  },
];

/* ═══════════════════════════════════════════════
   TECH STACK DATA
   ═══════════════════════════════════════════════ */

interface TechItem {
  name: string;
  description: string;
  stat: string;
  dotColor: string;
}

const TECH_STACK: TechItem[][] = [
  [
    { name: 'PubChem', description: '3D coordinate database', stat: '50M+ compounds', dotColor: '#3050F8' },
    { name: 'NIST', description: 'Interatomic potentials', stat: 'Validated force fields', dotColor: '#909090' },
    { name: 'Open Babel', description: 'Format conversion', stat: 'XYZ \u2194 SDF \u2194 PDB', dotColor: '#FF8000' },
    { name: 'Cactus (NIH)', description: 'SMILES resolution', stat: 'Structure identification', dotColor: '#90E050' },
  ],
  [
    { name: 'Three.js', description: 'WebGL rendering', stat: 'Real-time 3D in browser', dotColor: '#FF0D0D' },
    { name: 'React Three Fiber', description: 'React integration', stat: 'Declarative 3D scenes', dotColor: '#00E5FF' },
    { name: 'LAMMPS', description: 'Molecular dynamics', stat: 'Simulation engine', dotColor: '#FFFF30' },
    { name: 'MCP Protocol', description: 'Agent interface', stat: 'Standardized AI communication', dotColor: '#7B5CFF' },
  ],
];

/* ═══════════════════════════════════════════════
   ROADMAP DATA
   ═══════════════════════════════════════════════ */

interface RoadmapItem {
  quarter: string;
  title: string;
  status: 'completed' | 'in-progress' | 'future';
  features: string[];
}

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    quarter: 'Q1 2025',
    title: 'Foundation',
    status: 'completed',
    features: ['MCP Protocol v1.0', 'PubChem integration', '12 simulation domains', 'Basic 3D viewer with CPK coloring'],
  },
  {
    quarter: 'Q2 2025',
    title: 'Expansion',
    status: 'in-progress',
    features: ['Natural language molecule generation', 'SMILES \u2192 3D pipeline', 'Gallery search and filtering', 'Export to XYZ, SDF, PNG'],
  },
  {
    quarter: 'Q3 2025',
    title: 'Intelligence',
    status: 'future',
    features: ['AI-powered molecular design suggestions', 'Force-field optimization for novel compounds', 'Batch generation API', 'Collaborative galleries'],
  },
  {
    quarter: 'Q4 2025',
    title: 'Ecosystem',
    status: 'future',
    features: ['Plugin marketplace (VMD, Avogadro, Blender)', 'Real-time MD simulation preview', 'VR/AR molecule viewing', 'Research paper \u2192 molecule extraction'],
  },
];

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

/* ─── Principle Card ─── */
function PrincipleCard({ principle, index }: { principle: Principle; index: number }) {
  const Icon = principle.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay: index * 0.15, ease }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className={`bg-surface border border-[rgba(255,255,255,0.06)] rounded-[14px] p-8 border-b-[3px] ${principle.borderColor} transition-all duration-300 hover:border-[rgba(255,255,255,0.15)]`}
    >
      <Icon className="w-9 h-9 mb-5" style={{ color: principle.color }} />
      <h3 className="font-body text-[20px] font-medium text-white mb-3">{principle.title}</h3>
      <p className="font-body text-body-sm text-[rgba(255,255,255,0.6)] leading-relaxed">{principle.body}</p>
    </motion.div>
  );
}

/* ─── Tech Item ─── */
function TechItemCard({ item, index }: { item: TechItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease }}
      whileHover={{ borderColor: `${item.dotColor}4D`, transition: { duration: 0.2 } }}
      className="bg-surface border border-[rgba(255,255,255,0.06)] rounded-[10px] p-5 transition-all duration-200"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.dotColor }} />
        <h4 className="font-body text-[16px] font-medium text-white">{item.name}</h4>
      </div>
      <p className="font-body text-[12px] text-[rgba(255,255,255,0.6)] mb-1">{item.description}</p>
      <p className="font-mono text-[12px] text-[rgba(255,255,255,0.3)]">{item.stat}</p>
    </motion.div>
  );
}

/* ─── Roadmap Item ─── */
function RoadmapItemCard({ item, index }: { item: RoadmapItem; index: number }) {
  const isLeft = index % 2 === 0;

  const StatusIcon =
    item.status === 'completed'
      ? CheckCircle2
      : item.status === 'in-progress'
      ? Loader2
      : Clock;

  const statusColor =
    item.status === 'completed'
      ? '#00E5FF'
      : item.status === 'in-progress'
      ? '#7B5CFF'
      : 'rgba(255,255,255,0.3)';

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      {/* Content side */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: index * 0.1, ease }}
        className={`${isLeft ? 'md:pr-12' : 'md:order-2 md:pl-12'}`}
      >
        <div className="bg-surface border border-[rgba(255,255,255,0.06)] rounded-xl p-6 hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-3">
            <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
            <span className="font-mono text-[13px] text-[rgba(255,255,255,0.3)]">{item.quarter}</span>
            <span className="font-body text-[16px] font-medium text-white">{item.title}</span>
          </div>
          <ul className="space-y-2">
            {item.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: statusColor }} />
                <span className="font-body text-[14px] text-[rgba(255,255,255,0.6)]">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Center dot (desktop) */}
      <div className={`hidden md:flex absolute left-1/2 top-6 -translate-x-1/2 z-10`}>
        <div
          className="w-4 h-4 rounded-full border-2 border-void-black"
          style={{ backgroundColor: statusColor }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN ABOUT PAGE
   ═══════════════════════════════════════════════ */

export default function About() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  /* GSAP ScrollTrigger for timeline line drawing */
  useGSAP(
    () => {
      if (!timelineRef.current) return;

      const line = timelineRef.current.querySelector('.timeline-line') as HTMLElement;
      if (!line) return;

      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: timelineRef.current,
            start: 'top 70%',
            end: 'bottom 30%',
            scrub: 1,
          },
        }
      );

      /* Animate timeline nodes sequentially */
      const nodes = timelineRef.current.querySelectorAll('.timeline-node');
      nodes.forEach((node, i) => {
        gsap.fromTo(
          node,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            delay: i * 0.1,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: node,
              start: 'top 80%',
              once: true,
            },
          }
        );
      });
    },
    { scope: timelineRef }
  );

  /* GSAP for story text paragraphs */
  useGSAP(
    () => {
      if (!storyRef.current) return;
      const paragraphs = storyRef.current.querySelectorAll('.story-paragraph');
      paragraphs.forEach((p, i) => {
        gsap.fromTo(
          p,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            delay: i * 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: p,
              start: 'top 85%',
              once: true,
            },
          }
        );
      });
    },
    { scope: storyRef }
  );

  return (
    <div className="min-h-[100dvh]">
      {/* ── Section 1: Hero with Diamond Lattice ── */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden">
        {/* 3D Diamond Background */}
        <div className="absolute inset-0 z-0">
          <MoleculeViewer
            moleculeData={DIAMOND_DATA}
            width="100%"
            height="100%"
            autoRotate={true}
            interactive={false}
            showBonds={true}
            atomScale={0.7}
          />
        </div>

        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to top, #050508 0%, transparent 40%, rgba(5,5,8,0.5) 100%)' }}
        />

        {/* Hero Content */}
        <div className="relative z-10 w-full px-6 pb-16">
          <div className="max-w-content mx-auto">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease }}
              className="inline-block font-body text-caption text-[rgba(255,255,255,0.3)] tracking-[2px] uppercase mb-4"
            >
              Our Mission
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6, ease }}
              className="font-display text-[48px] md:text-[72px] font-light text-white leading-[1.05] tracking-tight mb-6"
            >
              Open atoms
              <br />
              for open minds
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.2, ease }}
              className="font-body text-[18px] font-light text-[rgba(255,255,255,0.6)] max-w-[560px] mb-8 leading-relaxed"
            >
              LUPI extends the Lupine research program into an open platform where any AI can
              design, generate, and visualize molecular structures. We believe atomic data should
              be as accessible as text.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5, ease }}
              className="flex flex-wrap gap-4"
            >
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[rgba(255,255,255,0.15)] text-white font-body text-button rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.3)] transition-all duration-200"
              >
                Read the Research
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/alexwelcing/lupine"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[rgba(255,255,255,0.15)] text-white font-body text-button rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.3)] transition-all duration-200"
              >
                <Github className="w-4 h-4" />
                Contribute on GitHub
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 2: The Story ── */}
      <section className="py-section-mobile lg:py-section-desktop px-6">
        <div className="max-w-content mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-h2 text-white mb-12"
          >
            From Lupine to LUPI
          </motion.h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left Column — Narrative */}
            <div ref={storyRef} className="space-y-6">
              <p className="story-paragraph font-body text-body text-[rgba(255,255,255,0.6)] leading-relaxed">
                Lupine began as an open research program studying where and why interatomic
                potentials fail — and turning that error structure into something predictive. Built
                on LAMMPS simulations and the NIST interatomic potential database, it pushed the
                boundaries of materials science.
              </p>
              <p className="story-paragraph font-body text-body text-[rgba(255,255,255,0.6)] leading-relaxed">
                But molecular data remained locked behind specialized software, proprietary formats,
                and years of training. We asked: what if any AI could access atomic visualization as
                easily as it accesses text? What if molecules were just another modality in the Model
                Context Protocol?
              </p>
              <p className="story-paragraph font-body text-body text-[rgba(255,255,255,0.6)] leading-relaxed">
                LUPI is the answer. An open protocol and platform that bridges AI agents with
                verified molecular data. Natural language in, accurate 3D coordinates out. The same
                rigorous science, now accessible to every developer and every AI.
              </p>
            </div>

            {/* Right Column — Timeline */}
            <div ref={timelineRef} className="relative pl-8">
              {/* Vertical Line */}
              <div
                className="timeline-line absolute left-[5px] top-2 bottom-2 w-[1px] bg-lupi-violet origin-top"
              />

              <div className="space-y-10">
                {TIMELINE_EVENTS.map((event) => (
                  <div key={event.year} className="relative">
                    {/* Dot */}
                    <div
                      className={`timeline-node absolute left-[-28px] top-1 w-3 h-3 rounded-full border-2 border-void-black ${
                        event.isActive ? 'animate-pulse' : ''
                      }`}
                      style={{
                        backgroundColor: event.isActive ? '#7B5CFF' : 'rgba(123,92,255,0.4)',
                        boxShadow: event.isActive ? '0 0 12px rgba(123,92,255,0.6)' : 'none',
                      }}
                    />
                    <span className="font-display text-[16px] font-medium text-lupi-violet block mb-1">
                      {event.year}
                    </span>
                    <p className="font-body text-[13px] text-[rgba(255,255,255,0.6)]">
                      {event.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Principles ── */}
      <section
        className="py-section-mobile lg:py-section-desktop px-6"
        style={{ background: 'radial-gradient(ellipse at center, rgba(123,92,255,0.03) 0%, transparent 70%)' }}
      >
        <div className="max-w-content mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-h2 text-white text-center mb-3"
          >
            What we believe
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-body text-body text-[rgba(255,255,255,0.6)] text-center mb-12"
          >
            The principles that guide every design decision.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRINCIPLES.map((principle, i) => (
              <PrincipleCard key={principle.title} principle={principle} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Technology Stack ── */}
      <section className="py-section-mobile lg:py-section-desktop px-6">
        <div className="max-w-content mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-h2 text-white mb-3"
          >
            The technology
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-body text-body text-[rgba(255,255,255,0.6)] mb-12"
          >
            Open source tools, open data, open protocols.
          </motion.p>

          {/* Data Sources */}
          <div className="mb-6">
            <h3 className="font-body text-[13px] font-medium text-[rgba(255,255,255,0.4)] tracking-wider uppercase mb-4">
              Data Sources
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TECH_STACK[0].map((item, i) => (
                <TechItemCard key={item.name} item={item} index={i} />
              ))}
            </div>
          </div>

          {/* Rendering & Protocol */}
          <div>
            <h3 className="font-body text-[13px] font-medium text-[rgba(255,255,255,0.4)] tracking-wider uppercase mb-4">
              Rendering &amp; Protocol
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TECH_STACK[1].map((item, i) => (
                <TechItemCard key={item.name} item={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Roadmap ── */}
      <section className="py-section-mobile lg:py-section-desktop px-6">
        <div className="max-w-content mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-h2 text-white mb-12"
          >
            Roadmap
          </motion.h2>

          {/* Central Line (Desktop) */}
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2" style={{ background: 'linear-gradient(to bottom, #00E5FF, #7B5CFF, rgba(123,92,255,0.2))' }} />

            <div className="space-y-8">
              {ROADMAP_ITEMS.map((item, i) => (
                <RoadmapItemCard key={item.quarter} item={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: CTA Banner ── */}
      <section className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease }}
          className="max-w-content mx-auto bg-lupi-violet rounded-2xl p-10 md:p-16 text-center"
        >
          <h2 className="font-display text-[32px] font-light text-white mb-3">
            Join the open molecular revolution
          </h2>
          <p className="font-body text-[14px] text-white/70 mb-6">
            Open source. Open data. Open protocols.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#/studio"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-void-black font-body text-button rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg"
            >
              <Atom className="w-4 h-4" />
              Launch Studio
            </a>
            <a
              href="https://github.com/alexwelcing/lupine"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-body text-button rounded-full hover:bg-white/10 transition-all duration-200"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
              <span className="ml-1 px-2 py-0.5 bg-white text-void-black text-[11px] font-mono rounded-full">
                2.4k
              </span>
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
