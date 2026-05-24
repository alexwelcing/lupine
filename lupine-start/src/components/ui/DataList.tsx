import React from 'react'

// DataListContext carries the total column count so every cell and header-cell
// can independently compute its share of the table width.
export const DataListCtx = React.createContext<{ colCount: number }>({ colCount: 0 })

export function DataList({
  children,
  colCount = 0,
}: {
  children: React.ReactNode
  /** Number of columns — used to set consistent percentage widths on every cell. */
  colCount?: number
}) {
  return (
    <table className="w-full border-collapse glass-panel overflow-hidden">
      <colgroup>
        {Array.from({ length: colCount }, (_, i) => (
          <col key={i} style={{ width: `${100 / colCount}%` }} />
        ))}
      </colgroup>
      {children}
    </table>
  )
}

export function DataListHeader({ children }: { children: React.ReactNode }) {
  return (
    <DataListCtx.Provider value={{ colCount: 0 }}>
      <thead className="bg-[var(--surface-container)] border-b-[3px] border-[var(--primary)]">
        <tr>{children}</tr>
      </thead>
    </DataListCtx.Provider>
  )
}

export function DataListHeaderCell({ children }: { children: React.ReactNode }) {
  const { colCount } = React.useContext(DataListCtx)
  return (
    <th
      className="px-5 py-3 text-[var(--primary)] font-mono text-[11px] uppercase tracking-[0.08em] border-r border-[rgba(255,255,255,0.05)] last:border-r-0 whitespace-nowrap text-left overflow-hidden text-ellipsis"
      style={colCount > 0 ? { width: `${100 / colCount}%` } : undefined}
    >
      {children}
    </th>
  )
}

export function DataListRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)]/30 transition-colors last:border-b-0">{children}</tr>
}

export function DataListCell({ children, label }: { children: React.ReactNode; label?: string }) {
  const { colCount } = React.useContext(DataListCtx)
  return (
    <td
      className="px-5 py-4 border-r border-[rgba(255,255,255,0.05)] last:border-r-0 align-top overflow-hidden text-ellipsis"
      style={colCount > 0 ? { width: `${100 / colCount}%` } : undefined}
    >
      {label && (
        <span className="md:hidden text-[var(--primary)] font-mono text-[10px] uppercase tracking-[0.08em] mb-1.5 block">
          {label}
        </span>
      )}
      {children}
    </td>
  )
}