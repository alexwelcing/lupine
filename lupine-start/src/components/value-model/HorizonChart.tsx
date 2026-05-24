import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ArcPhase, ValueModelData } from './types'

/**
 * 30-year arc visualization. Redesigned as a bespoke 'Tactical Radar / Gantt' 
 * view to avoid text compression.
 * 
 * Each phase gets its own dedicated vertical lane (track). Typography is 
 * decoupled from the exact proportional duration of the phase to prevent 
 * squishing. A glowing vertical laser marks the present day.
 */

const PHASE_COLORS: Record<number, string> = {
  1: '#4ecdc4', // cyan — current phase
  2: '#3b82f6', // blue
  3: '#c4b5fd', // lavender
  4: '#f472b6', // pink — distant horizon
  5: '#fb923c', // amber — phase-5 quantum unlocks
}

const TIMELINE_START = 2025
const TIMELINE_END = 2080

export function HorizonChart({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const phases = [...data.thirty_year_arc].sort((a, b) => a.phase - b.phase)

  const yearToPct = (year: number) =>
    Math.max(0, Math.min(100, ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100))

  // Decade tick labels
  const decades = [2025, 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080]
  
  // A glowing playhead for today
  const CURRENT_YEAR = new Date().getFullYear()
  const currentYearPct = yearToPct(CURRENT_YEAR)

  return (
    <div ref={ref} className="w-full flex flex-col gap-16">
      
      {/* 
        THE TIMELINE GRID
        An interactive-feeling tactical radar view.
        Uses horizontal scrolling on very small devices.
      */}
      <div className="w-full overflow-x-auto hide-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
        <div className="min-w-[800px] lg:min-w-full relative py-8">
          
          {/* Subtle Radar Grid Background */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
               style={{
                 backgroundImage: 'linear-gradient(to right, var(--outline-variant) 1px, transparent 1px), linear-gradient(to bottom, var(--outline-variant) 1px, transparent 1px)',
                 backgroundSize: '8.333% 80px' // aligns with the 5-year ticks (5/60 = 8.333%)
               }}
          />

          {/* Top Year Axis */}
          <div className="relative h-8 border-b border-[var(--outline-variant)]">
            {decades.map((y) => (
              <div
                key={y}
                className="absolute bottom-2 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--on-surface-variant-mid)]"
                style={{ left: `${yearToPct(y)}%`, transform: 'translateX(-50%)' }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{y}</span>
                  <div className="w-px h-2 bg-[var(--outline-variant)] absolute -bottom-3"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Current Time Laser Playhead */}
          <motion.div 
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: `${currentYearPct}%` }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="w-px h-full bg-gradient-to-b from-[#4ecdc4] via-[#4ecdc4] to-transparent opacity-60 shadow-[0_0_8px_#4ecdc4]"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[200px] bg-gradient-to-b from-[#4ecdc4] to-transparent blur-3xl opacity-20"></div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[#4ecdc4] tracking-[0.08em] bg-[var(--surface-container)] px-2 py-0.5 border border-[#4ecdc4]/40 rounded shadow-[0_0_10px_rgba(78,205,196,0.2)]">
              TODAY
            </div>
          </motion.div>

          {/* Phase Tracks (Lanes) */}
          <div className="relative mt-8" style={{ height: phases.length * 90 }}>
            {phases.map((p, i) => {
              const left = yearToPct(p.start_year)
              const right = 100 - yearToPct(p.end_year)
              const color = PHASE_COLORS[p.phase] ?? '#94a3b8'
              const isCurrent = p.phase === 1

              return (
                <div 
                  key={p.id} 
                  className="absolute w-full"
                  style={{ top: i * 90 }}
                >
                  {/* The Track Container spanning the temporal duration */}
                  <div 
                    className="absolute h-full flex flex-col justify-end pb-3"
                    style={{ left: `${left}%`, right: `${right}%` }}
                  >
                    {/* Typography: sits above the line, decoupled from proportional width */}
                    <motion.div 
                      className="absolute bottom-6 left-0 whitespace-nowrap z-10"
                      initial={{ opacity: 0, y: 10 }}
                      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs uppercase tracking-[0.08em] drop-shadow-md" style={{ color }}>
                          Phase {p.phase}
                        </span>
                        <span className="text-base lg:text-lg font-medium text-[var(--on-surface)] tracking-tight drop-shadow-md">
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-sm bg-[#4ecdc4]/10 text-[#4ecdc4] border border-[#4ecdc4]/30 animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                    </motion.div>

                    {/* The Glowing Line / Ribbon */}
                    <div className="relative h-[3px] w-full bg-[var(--outline-variant)] rounded-full">
                      <motion.div 
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${color} 0%, ${color}40 100%)`,
                          boxShadow: `0 0 12px ${color}60, 0 0 24px ${color}30`,
                        }}
                        initial={{ scaleX: 0, transformOrigin: 'left' }}
                        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                        transition={{ duration: 1.4, delay: i * 0.15, ease: [0.22, 0.61, 0.36, 1] }}
                      />
                      {/* Left Terminal Dot */}
                      <motion.div 
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--surface-container)] border-[2px]"
                        style={{ borderColor: color, boxShadow: `0 0 10px ${color}` }}
                        initial={{ scale: 0 }}
                        animate={inView ? { scale: 1 } : { scale: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.15 }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Phase Detail Cards: capability + Lupine role + reference programs */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {phases.map((p, i) => (
          <PhaseCard key={p.id} phase={p} inView={inView} index={i} />
        ))}
      </div>
    </div>
  )
}

function PhaseCard({
  phase,
  inView,
  index,
}: {
  phase: ArcPhase
  inView: boolean
  index: number
}) {
  const color = PHASE_COLORS[phase.phase] ?? '#94a3b8'
  const isCurrent = phase.phase === 1
  return (
    <motion.div
      className="relative rounded-lg border bg-gradient-to-b from-[var(--surface-container)] to-transparent p-6 flex flex-col gap-4 overflow-hidden group"
      style={{
        borderColor: isCurrent ? `${color}55` : 'var(--outline-variant)',
        boxShadow: isCurrent ? `0 0 0 1px ${color}15` : 'none',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
    >
      {/* Ambient corner glow on hover */}
      <div 
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none"
        style={{ backgroundColor: color }}
      />
      
      <div className="flex flex-col gap-1 relative z-10">
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-xs uppercase tracking-[0.08em]"
            style={{ color }}
          >
            Phase {phase.phase}
          </span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--on-surface-variant-mid)] border border-[var(--outline-variant)] px-2 py-0.5 rounded-full bg-[var(--background)]">
            {phase.start_year}–{phase.end_year}
          </span>
        </div>
        <h3 className="text-xl text-[var(--on-surface)] font-semibold tracking-tight mt-2">
          {phase.name}
        </h3>
      </div>

      <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed relative z-10">
        {phase.capability}
      </p>

      <div className="mt-auto flex flex-col gap-4 relative z-10 pt-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
              Lupine&apos;s role
            </div>
          </div>
          <p className="text-sm text-[var(--on-surface)] leading-relaxed pl-3 border-l-2" style={{ borderColor: `${color}40` }}>
            {phase.lupine_role}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--outline-variant)]"></div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant-mid)]">
              Reference programs
            </div>
          </div>
          <p className="text-xs text-[var(--on-surface-variant-mid)] font-mono leading-relaxed pl-3 border-l-2 border-[var(--outline-variant)]/50">
            {phase.reference_programs}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
