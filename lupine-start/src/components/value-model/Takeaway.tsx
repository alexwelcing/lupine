import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Short, all-caps eyebrow (e.g. "TAKEAWAY", "THE MATH"). */
  label?: string
  /** Tone affects the left rule color. */
  tone?: 'neutral' | 'positive' | 'caution'
}

/**
 * A one-glance "you don't need to do this math in your head" callout.
 * Sits below each chart with a colored left rule, monospace eyebrow, and
 * the takeaway sentence(s) in body type. Animates in with the section.
 */
export function Takeaway({ children, label = 'TAKEAWAY', tone = 'neutral' }: Props) {
  const accent =
    tone === 'positive'
      ? 'border-l-[var(--secondary)]'
      : tone === 'caution'
        ? 'border-l-[#f59e0b]'
        : 'border-l-[var(--primary)]'
  return (
    <motion.div
      className={`mt-6 rounded-r border-l-4 ${accent} bg-[var(--surface-container)] px-5 py-4`}
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.45, delay: 0.1 }}
    >
      <div className="mono-label text-[var(--on-surface-variant-mid)] text-[10px] uppercase tracking-[0.2em] mb-1">
        {label}
      </div>
      <div className="text-[15px] text-[var(--on-surface)] leading-relaxed">
        {children}
      </div>
    </motion.div>
  )
}
