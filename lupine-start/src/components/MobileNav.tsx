import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

interface NavItem {
  to: string
  label: string
  live?: boolean
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { to: '/', label: 'Home' },
      { to: '/research', label: 'Research' },
      { to: '/pilots', label: 'Pilots' },
      { to: '/live', label: 'Live Lab', live: true },
      { to: '/about', label: 'About' },
    ],
  },
  {
    label: 'MORE',
    items: [
      { to: '/lineage', label: 'Lineage' },
      { to: '/console', label: 'Research Console' },
      { to: '/atlas-viewer', label: 'Atlas Viewer' },
      { to: '/proof', label: 'Research Defense' },
      { to: '/process', label: 'Operating Report' },
      { to: '/investor-relations', label: 'Investor Brief' },
      { to: '/slideshow', label: 'Slideshow' },
      { to: '/ops', label: 'Ops Dashboard' },
    ],
  },
]

const MOBILE_NAV_OVERLAY_Z_INDEX = 55
const MOBILE_NAV_DRAWER_Z_INDEX = 60

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center text-[var(--on-surface)]"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <div className="w-5 h-4 relative flex flex-col justify-between">
          <span className={`block w-full h-px bg-current transition-transform duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block w-full h-px bg-current transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-full h-px bg-current transition-transform duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </div>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  style={{ zIndex: MOBILE_NAV_OVERLAY_Z_INDEX }}
                  onClick={() => setOpen(false)}
                />
                <motion.nav
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed top-0 right-0 bottom-0 w-[280px] bg-[var(--surface)] border-l border-[var(--outline-variant)] flex flex-col pt-24 px-6 gap-1 overflow-y-auto"
                  style={{ zIndex: MOBILE_NAV_DRAWER_Z_INDEX }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mobile navigation menu"
                >
                  {NAV_SECTIONS.map((section, si) => (
                    <div key={si}>
                      {section.label && (
                        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--on-surface-variant-mid)] mt-6 mb-2 px-1">
                          {section.label}
                        </div>
                      )}
                      {section.items.map((item, i) => (
                        <motion.div
                          key={item.to}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (si * section.items.length + i) * 0.04 + 0.1 }}
                        >
                          <Link
                            to={item.to}
                            onClick={() => setOpen(false)}
                            className={`py-3 px-1 font-mono text-lg uppercase tracking-[0.08em] no-underline transition-colors flex items-center gap-2 ${
                              item.live
                                ? 'text-[var(--primary)]'
                                : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
                            }`}
                          >
                            {item.live && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-[pulse-soft_3s_infinite]" />}
                            {item.label}
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </motion.nav>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
