import type { ReactNode } from 'react'

export interface BadgeProps {
  children: ReactNode
  variant?: 'verified' | 'validated' | 'benchmarked' | 'default' | 'error'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-none font-mono text-[9px] uppercase tracking-[0.1em]'
  
  let variantClass = ''
  switch (variant) {
    case 'verified':
      variantClass = 'bg-[var(--primary-container)] text-[var(--primary)] border border-[var(--primary)]/50'
      break
    case 'validated':
      variantClass = 'bg-[var(--secondary-container)] text-[var(--secondary)] border border-[var(--secondary)]/50'
      break
    case 'benchmarked':
      variantClass = 'bg-[rgba(255,255,255,0.1)] text-[var(--on-surface)] border border-[var(--outline-variant)]'
      break
    case 'error':
      variantClass = 'bg-[var(--error-container)] text-[var(--error)] border border-[var(--error)]/50'
      break
    default:
      variantClass = 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border border-[var(--outline-variant)]'
  }

  return (
    <span className={`${baseClass} ${variantClass} ${className}`}>
      {children}
    </span>
  )
}
