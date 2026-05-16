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
      className={`min-w-[100vw] h-screen shrink-0 snap-start snap-always relative border-r border-[var(--outline-variant)] ${className}`}
    >
      <div 
        className="absolute inset-0 overflow-y-auto overflow-x-hidden px-6 lg:px-12"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0px, black 120px, black calc(100% - 120px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 120px, black calc(100% - 120px), transparent 100%)'
        }}
      >
        <div className="container mx-auto max-w-7xl relative z-10 w-full min-h-full flex flex-col justify-center pt-32 pb-36">
          {children}
        </div>
      </div>
    </section>
  )
}
