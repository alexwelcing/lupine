import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData, QuantumUnlock } from './types'

/**
 * Phase-5 quantum-unlock visualization. Each unlock has a classical
 * baseline (what the materials layer is worth without quantum-engineered
 * physics) and a quantum-uplifted addressable (what it becomes once
 * quantum effects are routinely engineered). Bars show the multiplier
 * effect — classical bar in muted slate, the quantum extension in brand
 * teal/lavender, the multiplier annotated on the right.
 *
 * Unlocks are sorted by quantum_addressable descending so the largest
 * (fault-tolerant qubits, room-temp SC) lead.
 */

const ROW_TINT = '#c4b5fd' // phase-5 lavender

export function QuantumUnlocks({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const c = data.ceiling

  const sorted = [...c.quantum_unlocks].sort(
    (a, b) => b.quantum_addressable_usd_t - a.quantum_addressable_usd_t,
  )
  const maxAddressable = Math.max(...sorted.map((q) => q.quantum_addressable_usd_t))

  return (
    <div ref={ref} className="w-full">
      {/* Headline figure */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-8">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--tertiary)] mb-2">
            Phase-5 quantum-unlocked addressable economic activity · 2055
            maturity
          </div>
          <div className="text-6xl lg:text-7xl font-semibold leading-none">
            <span className="text-[var(--tertiary)]">
              ${(c.quantum_total_addressable_usd_b / 1000).toFixed(0)}T
            </span>
            <span className="text-[var(--on-surface-variant)] text-2xl lg:text-3xl ml-3 font-light">
              / year
            </span>
          </div>
          <div className="text-sm text-[var(--on-surface-variant)] mt-3 max-w-xl leading-relaxed">
            <strong className="text-[var(--secondary)]">
              {c.quantum_aggregate_uplift_x.toFixed(0)}× the classical
              baseline
            </strong>{' '}
            (~$
            {(c.quantum_total_classical_baseline_usd_b / 1000).toFixed(1)}T).
            Quantum-engineered materials don&apos;t just accelerate
            existing markets — they enable economic regimes the classical
            substrate could not produce. Fault-tolerant qubits, room-temp
            superconductors, commercial fusion, quantum sensors for
            medicine, post-CMOS spintronics, quantum-limit photovoltaics.
          </div>
        </div>
      </div>

      {/* Unlock bars */}
      <div className="flex flex-col gap-2.5">
        {sorted.map((q, i) => (
          <UnlockRow
            key={q.id}
            unlock={q}
            maxValue={maxAddressable}
            inView={inView}
            delay={0.1 + i * 0.06}
          />
        ))}
      </div>

      <p className="text-xs text-[var(--on-surface-variant-mid)] font-mono mt-6 max-w-3xl leading-relaxed">
        Multiplier = quantum-engineered addressable / classical baseline
        for the same materials layer. Aggregate uplift weighted across
        sectors:{' '}
        <strong className="text-[var(--secondary)]">
          {c.quantum_aggregate_uplift_x.toFixed(0)}×
        </strong>
        . Reference programs cited per unlock are real (Google Willow,
        Microsoft Majorana 1, CFS SPARC, Helion Polaris, DARPA TBONE,
        DOE BES quantum materials).
      </p>
    </div>
  )
}

function UnlockRow({
  unlock,
  maxValue,
  inView,
  delay,
}: {
  unlock: QuantumUnlock
  maxValue: number
  inView: boolean
  delay: number
}) {
  const classicalPct = (unlock.classical_baseline_usd_t / maxValue) * 100
  const quantumPct = (unlock.quantum_addressable_usd_t / maxValue) * 100

  return (
    <motion.div
      className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container)] overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 lg:gap-6 lg:items-center px-5 py-4">
        {/* Unlock name + materials layer */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <h4 className="text-base font-medium text-[var(--on-surface)] leading-tight">
              {unlock.unlock}
            </h4>
            <span
              className="font-mono text-[11px] uppercase tracking-widest flex-shrink-0"
              style={{ color: ROW_TINT }}
            >
              {unlock.quantum_uplift_x.toFixed(0)}×
            </span>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
            {unlock.materials_layer}
          </p>
          <p className="text-[10px] font-mono text-[var(--on-surface-variant-mid)] mt-1.5 truncate">
            {unlock.reference_program}
          </p>
        </div>

        {/* Classical → quantum bars */}
        <div className="lg:min-w-[280px] flex flex-col gap-1">
          <div className="relative h-3 bg-[var(--surface-container-low)] rounded-full overflow-hidden">
            {/* Classical baseline (slate) */}
            <motion.div
              className="absolute left-0 top-0 h-full"
              style={{ background: '#475569' }}
              initial={{ width: 0 }}
              animate={inView ? { width: `${classicalPct}%` } : { width: 0 }}
              transition={{ duration: 0.7, delay: delay + 0.1 }}
            />
            {/* Quantum uplift (lavender) */}
            <motion.div
              className="absolute top-0 h-full"
              style={{
                background: `linear-gradient(90deg, ${ROW_TINT}66 0%, ${ROW_TINT} 100%)`,
                left: `${classicalPct}%`,
              }}
              initial={{ width: 0 }}
              animate={
                inView
                  ? { width: `${quantumPct - classicalPct}%` }
                  : { width: 0 }
              }
              transition={{ duration: 0.9, delay: delay + 0.25 }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[var(--on-surface-variant-mid)] tabular-nums">
            <span>
              classical{' '}
              <span className="text-[var(--on-surface-variant)]">
                ${unlock.classical_baseline_usd_t.toFixed(2)}T
              </span>
            </span>
            <span>
              quantum-enabled{' '}
              <span style={{ color: ROW_TINT }}>
                ${unlock.quantum_addressable_usd_t.toFixed(1)}T
              </span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
