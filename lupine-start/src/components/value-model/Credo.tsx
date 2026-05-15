import { motion } from 'framer-motion'
import type { ValueModelData } from './types'

/**
 * The credo block — what we believe, written as opinionated declarative
 * statements rather than feature copy or pitch language.
 *
 * Each line stagger-reveals on scroll-in. Numbered, generous leading,
 * the title is heavy-weight serif-italic (the brand's "manifesto" voice
 * already used in eyebrow italics), the body sits in the same calm body
 * tone the rest of the page uses.
 */

export function Credo({ data }: { data: ValueModelData }) {
  return (
    <div className="max-w-4xl mx-auto">
      <ol className="flex flex-col gap-12">
        {data.credo.map((line, i) => (
          <motion.li
            key={line.id}
            className="grid grid-cols-[auto_1fr] gap-x-6 lg:gap-x-10 gap-y-3"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.6, delay: 0.05 + i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* Number column — narrow, mono, slightly muted */}
            <div className="font-mono text-base lg:text-lg text-[var(--on-surface-variant-mid)] tabular-nums pt-1 lg:pt-2">
              {String(line.order).padStart(2, '0')}
            </div>

            {/* Body column — title + body */}
            <div className="min-w-0">
              <h3 className="text-2xl lg:text-3xl mb-3 leading-[1.2]">
                <em className="italic text-[var(--secondary)] font-normal">
                  {line.title}
                </em>
              </h3>
              <p className="font-serif italic text-xl lg:text-2xl text-[var(--on-surface-variant)] leading-snug">
                {line.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}
