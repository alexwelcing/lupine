import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
    if (stored) setTheme(stored)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme

    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    root.style.colorScheme = resolved
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  if (!mounted) return <div className="w-8 h-8" />

  const cycle = () => {
    setTheme((t) => (t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto'))
  }

  const icons = {
    auto: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20z" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
    light: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    dark: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  }

  const labels = { auto: 'Auto', light: 'Light', dark: 'Dark' }

  return (
    <button
      onClick={cycle}
      className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors border border-[var(--outline-variant)] hover:border-[var(--primary)]/30"
      title={`Theme: ${labels[theme]} (click to cycle)`}
      aria-label={`Current theme: ${labels[theme]}. Click to cycle.`}
    >
      {icons[theme]}
    </button>
  )
}
