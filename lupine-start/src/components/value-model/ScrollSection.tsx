import { motion, useInView } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  id?: string
  className?: string
  /** Slide direction on entry */
  from?: 'bottom' | 'left' | 'right'
}

/**
 * Scrollytelling section wrapper.
 *
 * Uses Framer Motion's `useInView` (no scrollama dependency) to trigger
 * entry animations the first time the section enters the viewport.
 * Children become the animated subject; provide them with their own
 * inner motion.div if you want staggered reveals.
 */
export function ScrollSection({ children, id, className = '', from = 'bottom' }: Props) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const initial =
    from === 'left'
      ? { opacity: 0, x: -40 }
      : from === 'right'
        ? { opacity: 0, x: 40 }
        : { opacity: 0, y: 40 }

  return (
    <motion.section
      ref={ref}
      id={id}
      className={`relative py-[100px] px-6 lg:px-12 ${className}`}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : initial}
      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="container mx-auto max-w-7xl">{children}</div>
    </motion.section>
  )
}
