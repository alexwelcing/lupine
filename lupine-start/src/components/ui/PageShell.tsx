import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageShellProps {
  children: ReactNode
  className?: string
  kicker?: string
  title?: string
  subtitle?: string
  hero?: boolean
}

export function PageShell({
  children,
  className = '',
  kicker,
  title,
  subtitle,
  hero = true,
}: PageShellProps) {
  return (
    <main className={`flex-1 pb-12 ${className}`}>
      {hero && (kicker || title) && (
        <section className="pt-[var(--section-pad-y)] pb-8 px-6 lg:px-12">
          <div className="container mx-auto max-w-7xl">
            {kicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-6"
              >
                <span className="status-pulse"></span>
                <span className="mono-label text-[var(--primary)] glow-primary tracking-[0.3em]">
                  {kicker}
                </span>
              </motion.div>
            )}
            {title && (
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl lg:text-6xl mb-6"
              >
                {title}
              </motion.h1>
            )}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[var(--on-surface-variant)] text-lg max-w-3xl leading-relaxed"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </section>
      )}
      <div className="px-6 lg:px-12">
        <div className="container mx-auto max-w-7xl">
          {children}
        </div>
      </div>
    </main>
  )
}
