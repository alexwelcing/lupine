import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData, StackLayer } from './types'

/**
 * The matter stack as a vertical layer diagram. Top = applications,
 * bottom = physical reality. Lupine occupies the validation /
 * error-correction substrate (layer 3) and is rendered with the brand
 * teal accent, a left "Lupine" tag, and a glow.
 *
 * Layers reveal bottom-up on scroll, so the reader sees the foundation
 * first and watches the higher layers settle on top of it.
 */

export function StackDiagram({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  // Render top -> bottom in DOM but reveal bottom -> top via animation delay.
  const layersTopDown = [...data.matter_stack].sort(
    (a, b) => b.layer_order - a.layer_order,
  )
  const maxOrder = Math.max(...layersTopDown.map((l) => l.layer_order))

  return (
    <div ref={ref} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        {layersTopDown.map((layer) => {
          // Reveal delay: bottom layer first.
          const revealOrder = maxOrder - layer.layer_order
          return <Layer key={layer.id} layer={layer} delay={0.1 + revealOrder * 0.18} inView={inView} />
        })}
      </div>

      <p className="text-xs text-[var(--on-surface-variant-mid)] font-mono mt-6 text-center">
        Top: surfaces that pay. Bottom: physical reality. Middle: the
        layer that makes the rest trustworthy.
      </p>
    </div>
  )
}

function Layer({
  layer,
  delay,
  inView,
}: {
  layer: StackLayer
  delay: number
  inView: boolean
}) {
  const isLupine = layer.is_lupine
  const isPhysical = layer.layer_order === 1
  const isApplications = layer.layer_order === 5

  return (
    <motion.div
      className="relative rounded-md border px-5 py-4"
      style={{
        background: isLupine
          ? 'linear-gradient(135deg, rgba(0,255,255,0.1) 0%, rgba(0,255,255,0.02) 100%)'
          : 'var(--surface-container-high)',
        borderColor: isLupine
          ? '#00ffff'
          : 'var(--outline)',
        boxShadow: isLupine ? '0 0 0 1px rgba(0,255,255,0.3), 0 8px 32px rgba(0,255,255,0.1)' : 'none',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* "Lupine" tag on the substrate layer */}
      {isLupine && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: '#00ffff', color: '#000000' }}
        >
          Lupine
        </span>
      )}

      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-xs uppercase tracking-widest"
            style={{
              color: isLupine ? '#00ffff' : 'var(--on-surface-variant)',
            }}
          >
            L{layer.layer_order}
          </span>
          <h4
            className="text-lg font-semibold tracking-tight"
            style={{ color: isLupine ? '#ffffff' : 'var(--on-surface)' }}
          >
            {layer.layer_name}
          </h4>
        </div>
      </div>

      <p
        className="text-base leading-relaxed mt-2"
        style={{
          color: isLupine ? 'rgba(255,255,255,0.9)' : 'var(--on-surface)',
        }}
      >
        {layer.description}
      </p>

      <p
        className="text-sm leading-relaxed mt-3 font-mono"
        style={{
          color: isLupine
            ? '#00ffff'
            : 'var(--on-surface-variant)',
        }}
      >
        {layer.examples}
      </p>
    </motion.div>
  )
}
