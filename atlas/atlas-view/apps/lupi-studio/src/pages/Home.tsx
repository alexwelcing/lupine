import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Box,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useInView } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Lazy-load the heavy 3D viewer                                     */
/* ------------------------------------------------------------------ */
const MoleculeViewer = lazy(() => import('@/components/MoleculeViewer'));

/* ------------------------------------------------------------------ */
/*  Animation variants (Framer Motion)                                */
/* ------------------------------------------------------------------ */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: (staggerDelay: number = 0.08) => ({
    transition: { staggerChildren: staggerDelay },
  }),
};

/* ------------------------------------------------------------------ */
/*  Molecule data for featured cards                                  */
/* ------------------------------------------------------------------ */
const featuredMolecules = [
  { name: 'Caffeine', formula: 'C8H10N4O2', atoms: 24 },
  { name: 'Aspirin', formula: 'C9H8O4', atoms: 21 },
  { name: 'Dopamine', formula: 'C8H11NO2', atoms: 22 },
  { name: 'Diamond', formula: 'C', atoms: 512 },
  { name: 'Serotonin', formula: 'C10H12N2O', atoms: 25 },
  { name: 'THC', formula: 'C21H30O2', atoms: 53 },
];

const tickerItems = [
  'MIT Material Science',
  'NIST',
  'PubChem',
  'OpenBabel',
  'LAMMPS',
  'Materials Project',
  'AFLOW',
  'OQMD',
];

const pipelineSteps = [
  {
    number: '01',
    title: 'Describe Your Molecule',
    image: '/pipeline-step-1.jpg',
    description:
      'Enter a name, SMILES string, or describe it in natural language. Our NLP layer resolves ambiguity and identifies the target compound.',
  },
  {
    number: '02',
    title: 'Fetch 3D Coordinates',
    image: '/pipeline-step-2.jpg',
    description:
      "LUPI queries PubChem's 3D database or runs force-field optimization to generate accurate atom positions and bonding information.",
  },
  {
    number: '03',
    title: 'Interactive 3D Viewer',
    image: '/pipeline-step-3.jpg',
    description:
      'The molecule appears instantly in our WebGL viewer with CPK coloring, full orbital controls, bond visualization, and atom inspection.',
  },
  {
    number: '04',
    title: 'Save to Gallery',
    image: null,
    description:
      'Export as XYZ, SDF, or PNG. Save to your personal gallery or share via a permanent link. Every molecule gets a unique URL.',
  },
];

const featureCards = [
  {
    icon: MessageSquare,
    iconColor: '#7B5CFF',
    title: 'Describe in Plain English',
    body: "Type 'caffeine molecule' or 'the active compound in aspirin' \u2014 LUPI resolves it to the correct structure using PubChem and our AI pipeline.",
  },
  {
    icon: Box,
    iconColor: '#00E5FF',
    title: 'Real 3D Data, Not Approximations',
    body: 'Every molecule is fetched with verified 3D coordinates from PubChem or generated through validated force-field optimization. Publish-ready accuracy.',
  },
  {
    icon: Eye,
    iconColor: '#FF2E63',
    title: 'See It in Real-Time',
    body: 'Render immediately in our WebGL viewer with CPK coloring, bond detection, and orbital controls. Export as XYZ, SDF, or PNG with transparency.',
  },
];

/* ------------------------------------------------------------------ */
/*  InView wrapper for scroll animations                              */
/* ------------------------------------------------------------------ */
function AnimatedSection({
  children,
  className,
  variants = fadeInUp,
  delay = 0,
  custom,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: any;
  delay?: number;
  custom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-15% 0px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      custom={custom ?? delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Particle Field (Canvas)                                           */
/* ------------------------------------------------------------------ */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w: number;
    let h: number;

    interface Particle {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      alpha: number;
    }

    const particles: Particle[] = [];
    const COUNT = 120;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.3,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.15,
          alpha: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}

/* ================================================================== */
/*  HOME PAGE                                                         */
/* ================================================================== */
export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- GSAP ScrollTrigger: Pipeline Section ---- */
  useGSAP(
    () => {
      // Pipeline section scroll-driven reveals
      const pipelineCards = gsap.utils.toArray<HTMLElement>('.pipeline-card');
      const pipelineLines = gsap.utils.toArray<HTMLElement>('.pipeline-connector');

      pipelineCards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            end: 'top 50%',
            toggleActions: 'play none none none',
          },
          x: -30,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          delay: i * 0.1,
        });
      });

      pipelineLines.forEach((line) => {
        gsap.from(line, {
          scrollTrigger: {
            trigger: line,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 0.8,
          ease: 'power2.out',
        });
      });
    },
    { scope: containerRef }
  );

  /* ---- Hero Load Animation (GSAP) ---- */
  useGSAP(
    () => {
      const tl = gsap.timeline();

      // Label
      tl.from('.hero-label', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.6,
      });

      // Headline word-by-word
      tl.from(
        '.hero-word',
        {
          opacity: 0,
          y: 40,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
        },
        '-=0.2'
      );

      // Subheadline
      tl.from(
        '.hero-sub',
        {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
        },
        '-=0.3'
      );

      // CTAs
      tl.from(
        '.hero-cta',
        {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
        },
        '-=0.2'
      );

      // Stats
      tl.from(
        '.hero-stat',
        {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
        },
        '-=0.2'
      );
    },
    { scope: containerRef }
  );

  /* ---- Carousel Auto-scroll ---- */
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselPaused, setCarouselPaused] = useState(false);

  useEffect(() => {
    let rafId: number;
    let scrollPos = 0;

    const scroll = () => {
      if (carouselRef.current && !carouselPaused) {
        scrollPos += 0.5;
        const el = carouselRef.current;
        if (scrollPos >= el.scrollWidth - el.clientWidth) {
          scrollPos = 0;
        }
        el.scrollLeft = scrollPos;
      }
      rafId = requestAnimationFrame(scroll);
    };

    rafId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(rafId);
  }, [carouselPaused]);

  return (
    <div ref={containerRef}>
      {/* ============================================================== */}
      {/*  SECTION 1: HERO                                               */}
      {/* ============================================================== */}
      <section className="relative min-h-[100dvh] flex items-end overflow-hidden">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          poster="/hero-bg-particles.jpg"
        >
          <source src="/hero-molecule-orbit.mp4" type="video/mp4" />
        </video>

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, rgba(5,5,8,0.4) 50%, rgba(5,5,8,0.85) 100%)',
          }}
        />

        {/* Particle field on top */}
        <ParticleField />

        {/* 3D Molecule in center */}
        <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-[min(600px,90vw)] h-[min(500px,60vh)]">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-lupi-violet border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <MoleculeViewer
                autoRotate={true}
                interactive={true}
                showBonds={true}
                atomScale={1.0}
                className="w-full h-full"
              />
            </Suspense>
          </div>
        </div>

        {/* Hero content (bottom-left) */}
        <div className="relative z-[3] w-full px-6 lg:px-16 pb-16 lg:pb-24">
          <div className="max-w-content mx-auto">
            {/* Label */}
            <p className="hero-label text-caption text-[rgba(255,255,255,0.3)] uppercase tracking-[2px] mb-4">
              Model Context Protocol for Molecular Design
            </p>

            {/* Headline */}
            <h1 className="font-display text-hero mb-6">
              <span className="hero-word inline-block mr-[0.3em]">Atoms</span>
              <span className="hero-word inline-block mr-[0.3em]">at</span>
              <span className="hero-word inline-block mr-[0.3em]">the</span>
              <br />
              <span className="hero-word inline-block text-gradient-violet">command</span>
              <span className="hero-word inline-block mr-[0.3em]">of</span>
              <span className="hero-word inline-block text-gradient-violet">AI</span>
            </h1>

            {/* Subheadline */}
            <p className="hero-sub font-body text-lg text-[rgba(255,255,255,0.6)] max-w-[520px] mb-8">
              Describe any molecule in natural language. LUPI generates accurate 3D coordinates,
              renders it in real-time, and saves it to your gallery. The open protocol for
              AI-powered molecular visualization.
            </p>

            {/* CTA Group */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                to="/studio"
                className="hero-cta inline-flex items-center gap-2 px-6 py-3.5 bg-lupi-violet text-white font-body text-button rounded-lg hover:bg-[#8B6CFF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-glow-violet"
              >
                Launch Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/gallery"
                className="hero-cta inline-flex items-center gap-2 px-6 py-3.5 bg-transparent text-white font-body text-button rounded-lg border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200"
              >
                Explore Gallery
              </Link>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 lg:gap-10">
              {[
                { value: '12M+', label: 'Atoms Rendered' },
                { value: '50K+', label: 'Molecules Generated' },
                { value: '\u221E', label: 'Possibilities' },
              ].map((stat, i) => (
                <div key={i} className="hero-stat flex items-center gap-6 lg:gap-10">
                  <div>
                    <p className="font-display text-2xl lg:text-[32px] font-medium text-white">
                      {stat.value}
                    </p>
                    <p className="font-body text-sm text-[rgba(255,255,255,0.6)]">{stat.label}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden sm:block w-px h-10 bg-[rgba(255,255,255,0.1)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/*  SECTION 2: CLIENT TICKER / TRUST BAR                          */}
      {/* ============================================================== */}
      <AnimatedSection>
        <section className="w-full h-20 bg-[rgba(255,255,255,0.02)] border-y border-[rgba(255,255,255,0.04)] overflow-hidden flex items-center">
          <div className="max-w-content mx-auto px-6 w-full flex items-center gap-8">
            <p className="hidden lg:block text-caption text-[rgba(255,255,255,0.3)] uppercase tracking-[2px] shrink-0 whitespace-nowrap">
              Trusted by researchers at
            </p>
            <div className="overflow-hidden relative flex-1">
              <div className="flex animate-ticker-scroll whitespace-nowrap">
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span
                    key={i}
                    className="font-body text-sm text-[rgba(255,255,255,0.5)] mx-6 lg:mx-12"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ============================================================== */}
      {/*  SECTION 3: VALUE PROPOSITION                                  */}
      {/* ============================================================== */}
      <section className="section-padding">
        <div className="max-w-content mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-caption text-[rgba(255,255,255,0.3)] uppercase tracking-[2px] mb-4">
              Why LUPI
            </p>
            <h2 className="font-display text-h2 text-white mb-5">
              Molecular design,
              <br />
              rewritten for the AI era
            </h2>
            <p className="font-body text-lg text-[rgba(255,255,255,0.6)] max-w-[600px] mx-auto">
              From natural language to accurate 3D structures in seconds. No specialized software
              required.
            </p>
          </AnimatedSection>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-20% 0px' }}
            variants={staggerContainer}
            custom={0.15}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {featureCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  custom={i * 0.15}
                  className="group relative bg-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-8 hover:-translate-y-1 transition-all duration-300"
                  style={{
                    boxShadow: `0 0 0 0 transparent`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${card.iconColor}40`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${card.iconColor}20`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`;
                  }}
                >
                  {/* Gradient line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(90deg, ${card.iconColor} 0%, transparent 100%)`,
                    }}
                  />
                  <Icon className="w-8 h-8 mb-5" style={{ color: card.iconColor }} />
                  <h3 className="font-body text-h4 text-white mb-3">{card.title}</h3>
                  <p className="font-body text-body-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
                    {card.body}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ============================================================== */}
      {/*  SECTION 4: THE PIPELINE                                       */}
      {/* ============================================================== */}
      <section className="bg-surface py-16 lg:py-[120px] overflow-hidden">
        <div className="max-w-content mx-auto px-6 lg:px-16">
          <AnimatedSection className="text-center mb-16">
            <p className="text-caption text-[rgba(255,255,255,0.3)] uppercase tracking-[2px] mb-4">
              The Pipeline
            </p>
            <h2 className="font-display text-h2 text-white">
              From text to molecule
              <br />
              in three steps
            </h2>
          </AnimatedSection>

          {/* Pipeline steps - 4 columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {pipelineSteps.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line (between steps, desktop only) */}
                {i < pipelineSteps.length - 1 && (
                  <div
                    className="pipeline-connector hidden lg:block absolute top-12 -right-3 w-6 h-px bg-gradient-to-r from-lupi-violet/30 to-lupi-violet/30 z-10"
                  />
                )}

                <div className="pipeline-card">
                  {/* Number */}
                  <span className="font-display text-5xl text-lupi-violet opacity-30 block mb-3">
                    {step.number}
                  </span>

                  {/* Image (steps 1-3) */}
                  {step.image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] bg-surface-elevated aspect-[3/2]">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Gallery preview for step 4 */}
                  {!step.image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] bg-surface-elevated aspect-[3/2] p-3">
                      <div className="grid grid-cols-2 gap-1.5 h-full">
                        {featuredMolecules.slice(0, 4).map((mol, j) => (
                          <div
                            key={j}
                            className="bg-surface rounded flex items-center justify-center p-1"
                          >
                            <span className="text-caption text-[rgba(255,255,255,0.4)] text-center leading-tight">
                              {mol.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <h3 className="font-body text-lg font-medium text-white mb-2">{step.title}</h3>
                  <p className="font-body text-body-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/*  SECTION 5: FEATURED MOLECULES                                 */}
      {/* ============================================================== */}
      <section className="section-padding overflow-hidden">
        <div className="max-w-content mx-auto">
          <AnimatedSection className="flex items-end justify-between mb-12">
            <div>
              <p className="text-caption text-[rgba(255,255,255,0.3)] uppercase tracking-[2px] mb-4">
                Featured Molecules
              </p>
              <h2 className="font-display text-h2 text-white">
                A universe of structures
                <br />
                at your fingertips
              </h2>
            </div>
            <Link
              to="/gallery"
              className="hidden sm:inline-flex items-center gap-1 font-body text-sm text-lupi-violet hover:underline transition-all shrink-0"
            >
              View Full Gallery
              <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>

          {/* Horizontal scrolling carousel */}
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
          >
            {featuredMolecules.map((mol, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
                className="snap-start shrink-0 w-[280px] bg-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden hover:-translate-y-1 hover:border-[rgba(123,92,255,0.4)] hover:shadow-glow-violet transition-all duration-300 group"
              >
                {/* Molecule preview area */}
                <div className="h-[180px] bg-surface-elevated relative overflow-hidden">
                  <Suspense
                    fallback={
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-lupi-violet border-t-transparent rounded-full animate-spin" />
                      </div>
                    }
                  >
                    <MoleculeViewer
                      autoRotate={true}
                      interactive={false}
                      showBonds={true}
                      atomScale={0.8}
                      className="w-full h-full"
                    />
                  </Suspense>
                </div>

                {/* Card content */}
                <div className="p-4">
                  <h4 className="font-body text-h4 text-white mb-1">{mol.name}</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-caption text-lupi-violet bg-[rgba(123,92,255,0.1)] px-2 py-0.5 rounded">
                      {mol.formula}
                    </span>
                    <span className="font-body text-caption text-[rgba(255,255,255,0.3)]">
                      {mol.atoms} atoms
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-caption text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded">
                      PubChem
                    </span>
                    <Link
                      to="/gallery"
                      className="text-sm text-lupi-violet hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile link */}
          <div className="sm:hidden mt-6 text-center">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1 font-body text-sm text-lupi-violet hover:underline"
            >
              View Full Gallery
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/*  SECTION 6: MCP PROTOCOL TEASER                                */}
      {/* ============================================================== */}
      <section className="relative py-16 lg:py-[120px] overflow-hidden">
        {/* Subtle radial gradient background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(123,92,255,0.05) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-[1] max-w-content mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <AnimatedSection variants={staggerContainer} custom={0.1}>
              <motion.p
                variants={fadeInUp}
                custom={0}
                className="text-caption text-[rgba(255,255,255,0.3)] uppercase tracking-[2px] mb-4"
              >
                For Developers
              </motion.p>
              <motion.h2
                variants={fadeInUp}
                custom={0.1}
                className="font-display text-h2 text-white mb-6"
              >
                The MCP for
                <br />
                atomic views
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                custom={0.2}
                className="font-body text-base text-[rgba(255,255,255,0.6)] max-w-[480px] mb-8 leading-relaxed"
              >
                Integrate molecular generation into any AI agent. LUPI speaks the Model Context
                Protocol — describe a molecule, receive validated 3D coordinates. Build drug
                discovery tools, educational apps, or research pipelines.
              </motion.p>
              <motion.div variants={fadeInUp} custom={0.3}>
                <Link
                  to="/mcp"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-white font-body text-button rounded-lg border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200"
                >
                  Read the Protocol Spec
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </AnimatedSection>

            {/* Right: code block */}
            <AnimatedSection delay={0.3} variants={fadeInLeft}>
              <div className="bg-surface-elevated rounded-xl border border-[rgba(255,255,255,0.08)] p-6 overflow-x-auto">
                <pre className="font-mono text-code leading-relaxed">
                  <code>
                    <span className="text-[rgba(255,255,255,0.3)]">
                      {'// Any AI agent can generate molecules'}
                    </span>
                    {'\n'}
                    <span className="text-lupi-violet">{'const '}</span>
                    <span className="text-white">{'lupi '}</span>
                    <span className="text-[rgba(255,255,255,0.6)]">{'= '}</span>
                    <span className="text-lupi-violet">{'new '}</span>
                    <span className="text-lupi-cyan">{'MCPClient'}</span>
                    <span className="text-white">{'('}</span>
                    <span className="text-lupi-cyan">{'"lupi.design"'}</span>
                    <span className="text-white">{');'}</span>
                    {'\n\n'}
                    <span className="text-lupi-violet">{'const '}</span>
                    <span className="text-white">{'molecule '}</span>
                    <span className="text-[rgba(255,255,255,0.6)]">{'= '}</span>
                    <span className="text-lupi-violet">{'await '}</span>
                    <span className="text-white">{'lupi.'}</span>
                    <span className="text-lupi-violet">{'generate'}</span>
                    <span className="text-white">{'({'}</span>
                    {'\n  '}
                    <span className="text-white">{'input: '}</span>
                    <span className="text-lupi-cyan">{'"caffeine molecule"'}</span>
                    <span className="text-white">{','}</span>
                    {'\n  '}
                    <span className="text-white">{'format: '}</span>
                    <span className="text-lupi-cyan">{'"xyz"'}</span>
                    <span className="text-white">{','}</span>
                    {'\n  '}
                    <span className="text-white">{'quality: '}</span>
                    <span className="text-lupi-cyan">{'"high"'}</span>
                    {'\n'}
                    <span className="text-white">{'});'}</span>
                    {'\n\n'}
                    <span className="text-[rgba(255,255,255,0.3)]">
                      {'// Returns validated 3D coordinates'}
                    </span>
                    {'\n'}
                    <span className="text-white">{'viewer.'}</span>
                    <span className="text-lupi-violet">{'load'}</span>
                    <span className="text-white">{'(molecule.xyz);'}</span>
                  </code>
                </pre>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/*  SECTION 7: CTA BANNER + FOOTER                                */}
      {/* ============================================================== */}
      <section className="relative py-16 lg:py-20 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, #7B5CFF 0%, #6B4CEE 50%, #5B3CDD 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.3) 100%)',
          }}
        />
        <div className="relative z-[2] max-w-content mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="font-display text-3xl lg:text-4xl text-white mb-6"
          >
            Ready to design your first molecule?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: 0.15,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
          >
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-void-black font-body text-base font-medium rounded-lg hover:scale-105 hover:shadow-lg active:scale-[0.98] transition-all duration-200"
            >
              Launch Studio
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 font-body text-sm text-white/70"
          >
            Free. Open source. No account required.
          </motion.p>
        </div>
      </section>
    </div>
  );
}
