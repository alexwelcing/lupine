import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export interface SectionProps {
  children: ReactNode
  id?: string
  className?: string
  bg?: 'default' | 'light' | 'dark'
}

export function Section({ children, id, className = '', bg = 'default' }: SectionProps) {
  let bgClass = ''
  if (bg === 'light') bgClass = 'bg-[var(--surface-container-low)]'
  if (bg === 'dark') bgClass = 'bg-[var(--surface-container-lowest)]'

  return (
    <section id={id} className={`relative py-[120px] px-6 lg:px-12 z-10 ${bgClass} ${className}`}>
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
          }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  )
}

export function SectionHeader({ title, label, description, centered = false }: { title: string, label: string, description?: string, centered?: boolean }) {
  return (
    <div className={`mb-16 ${centered ? 'text-center flex flex-col items-center' : ''}`}>
      <span className="mono-label text-[var(--secondary)] mb-4 block">{label}</span>
      <h2 className="text-4xl lg:text-5xl mb-6">{title}</h2>
      {description && (
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
          {description}
        </p>
      )}
    </div>
  )
}
