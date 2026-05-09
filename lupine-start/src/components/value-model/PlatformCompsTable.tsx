import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { PlatformComp, ValueModelData } from './types'

/**
 * Comparable platform-infrastructure companies with the two numbers that
 * matter for ceiling sizing: capture rate (% of ecosystem they earn) and
 * EV/Revenue multiple (what the public/private markets pay for that
 * position).
 *
 * Two median rows — modern platform infra (Cloudflare/Datadog/HF/etc)
 * and mature simulation/audit platforms (Synopsys/Cadence/ANSYS) — are
 * highlighted with brand-teal and sit at the bottom as the bracket the
 * model anchors against.
 */

export function PlatformCompsTable({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const comps = data.ceiling.platform_comps
  const constituents = comps.filter((c) => !c.id.startsWith('median-'))
  const medians = comps.filter((c) => c.id.startsWith('median-'))

  return (
    <div ref={ref} className="w-full">
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-[var(--on-surface-variant-mid)] font-mono uppercase tracking-widest text-[10px]">
              <th className="text-left py-3 px-3 border-b border-[var(--outline-variant)]">
                Platform
              </th>
              <th className="text-left py-3 px-3 border-b border-[var(--outline-variant)]">
                Category
              </th>
              <th className="text-right py-3 px-3 border-b border-[var(--outline-variant)]">
                Revenue ($B)
              </th>
              <th className="text-right py-3 px-3 border-b border-[var(--outline-variant)]">
                EV ($B)
              </th>
              <th className="text-right py-3 px-3 border-b border-[var(--outline-variant)]">
                EV / Rev
              </th>
              <th className="text-right py-3 px-3 border-b border-[var(--outline-variant)]">
                Ecosystem ($B)
              </th>
              <th className="text-right py-3 px-3 border-b border-[var(--outline-variant)]">
                Capture %
              </th>
            </tr>
          </thead>
          <tbody>
            {constituents.map((c, i) => (
              <CompRow key={c.id} comp={c} delay={0.05 + i * 0.04} inView={inView} />
            ))}
            {medians.length > 0 && (
              <tr>
                <td colSpan={7} className="pt-2 pb-1" />
              </tr>
            )}
            {medians.map((c, i) => (
              <CompRow
                key={c.id}
                comp={c}
                delay={0.05 + (constituents.length + i) * 0.04}
                inView={inView}
                isMedian
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-[var(--on-surface-variant-mid)] font-mono mt-4 max-w-3xl">
        Capture % = company revenue / ecosystem value the platform serves.
        Modern platform infra clusters around 0.05–0.30% capture; mature EDA
        (the closest direct analog to what audit substrate fully consolidated
        looks like) is 0.9–1.4%. The ceiling scenarios anchor on these
        bracket values.
      </div>
    </div>
  )
}

function CompRow({
  comp,
  delay,
  inView,
  isMedian = false,
}: {
  comp: PlatformComp
  delay: number
  inView: boolean
  isMedian?: boolean
}) {
  const isTeal = isMedian
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.35, delay }}
      className={
        isTeal
          ? 'bg-[rgba(78,205,196,0.06)] border-y border-[var(--secondary)]/40'
          : 'border-b border-[var(--outline-variant)]/40'
      }
    >
      <td className="py-2.5 px-3">
        <span
          className={
            isTeal
              ? 'font-medium text-[var(--secondary)]'
              : 'text-[var(--on-surface)]'
          }
        >
          {comp.company}
        </span>
      </td>
      <td className="py-2.5 px-3 text-[var(--on-surface-variant)] text-xs">
        {comp.category}
      </td>
      <td className="py-2.5 px-3 text-right text-[var(--on-surface-variant)] font-mono tabular-nums">
        {comp.revenue_usd_b > 0 ? `$${comp.revenue_usd_b.toFixed(1)}` : '—'}
      </td>
      <td className="py-2.5 px-3 text-right text-[var(--on-surface-variant)] font-mono tabular-nums">
        {comp.ev_usd_b > 0 ? `$${comp.ev_usd_b.toFixed(0)}` : '—'}
      </td>
      <td
        className={
          'py-2.5 px-3 text-right font-mono tabular-nums ' +
          (isTeal
            ? 'text-[var(--secondary)] font-semibold'
            : 'text-[var(--on-surface)]')
        }
      >
        {comp.ev_revenue_x > 0 ? `${comp.ev_revenue_x.toFixed(1)}x` : '—'}
      </td>
      <td className="py-2.5 px-3 text-right text-[var(--on-surface-variant-mid)] font-mono tabular-nums text-xs">
        {comp.ecosystem_value_usd_b > 0
          ? `$${comp.ecosystem_value_usd_b.toLocaleString()}`
          : '—'}
      </td>
      <td
        className={
          'py-2.5 px-3 text-right font-mono tabular-nums ' +
          (isTeal
            ? 'text-[var(--secondary)] font-semibold'
            : 'text-[var(--on-surface)]')
        }
      >
        {comp.capture_rate_pct > 0
          ? `${comp.capture_rate_pct.toFixed(2)}%`
          : '—'}
      </td>
    </motion.tr>
  )
}
