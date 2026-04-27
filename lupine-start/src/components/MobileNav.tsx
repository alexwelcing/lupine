import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { to: '/', label: 'Thesis' },
  { to: '/research', label: 'Research' },
  { to: '/live', label: 'Live Lab', live: true },
  { to: '/lab', label: 'Lab' },
  { to: '/investor-relations', label: 'Investor Relations' },
  { to: '/proof', label: 'Compliance' },
  { to: '/about', label: 'About', accent: true },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center text-[var(--on-surface)]"
        aria-label="Toggle menu"
      >
        <div className="w-5 h-4 relative flex flex-col justify-between">
          <span className={`block w-full h-px bg-current transition-transform duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block w-full h-px bg-current transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-full h-px bg-current transition-transform duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-[var(--surface-container-lowest)] border-l border-[var(--outline-variant)] z-50 flex flex-col pt-24 px-6 gap-2"
            >
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`block py-3 font-mono text-sm uppercase tracking-widest no-underline transition-colors ${
                      item.accent
                        ? 'text-[var(--secondary)] font-bold'
                        : item.live
                          ? 'text-[var(--primary)] flex items-center gap-2'
                          : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
                    }`}
                    activeProps={{ className: item.accent ? 'text-[var(--secondary)]' : 'text-[var(--primary)]' }}
                  >
                    {item.live && <span className="w-1.5 h-1.5 rounded-none bg-[var(--primary)] animate-[pulse-cyan_2s_infinite]" />}
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
