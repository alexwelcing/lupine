import { type ReactNode } from 'react'

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
 * Converted to static horizontal snap-scroll section.
 */
export function ScrollSection({ children, id, className = '' }: Props) {
  return (
    <section
      id={id}
      className={`min-w-[100vw] h-screen shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden relative flex flex-col justify-center px-6 lg:px-12 border-r border-[var(--outline-variant)] ${className}`}
    >
      <div className="container mx-auto max-w-7xl relative z-10 w-full">{children}</div>
    </section>
  )
}
