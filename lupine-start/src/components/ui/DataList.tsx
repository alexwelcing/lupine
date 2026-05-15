import React from 'react'

export function DataList({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col glass-panel overflow-hidden">
      {children}
    </div>
  )
}

export function DataListHeader({ children, gridCols }: { children: React.ReactNode; gridCols: string }) {
  return (
    <div className={`hidden md:grid ${gridCols} bg-[var(--surface-container)] border-b-[3px] border-[var(--primary)]`}>
      {children}
    </div>
  )
}

export function DataListHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-3 text-[var(--primary)] font-mono text-[11px] uppercase tracking-widest border-r border-[rgba(255,255,255,0.05)] last:border-r-0 whitespace-nowrap">
      {children}
    </div>
  )
}

export function DataListRow({ children, gridCols }: { children: React.ReactNode; gridCols: string }) {
  return (
    <div className={`flex flex-col md:grid ${gridCols} border-b border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)]/30 transition-colors last:border-b-0`}>
      {children}
    </div>
  )
}

export function DataListCell({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="px-5 py-4 border-b md:border-b-0 border-[rgba(255,255,255,0.05)] md:border-r last:border-b-0 last:border-r-0 flex flex-col justify-start">
      {label && (
        <span className="md:hidden text-[var(--primary)] font-mono text-[10px] uppercase tracking-widest mb-1.5 block">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
