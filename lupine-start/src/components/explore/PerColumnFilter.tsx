import { useMemo } from 'react'
import type { Column, Table } from '@tanstack/react-table'

interface PerColumnFilterProps<T> {
  column: Column<T, unknown>
  table: Table<T>
}

const DROPDOWN_THRESHOLD = 12
const MAX_DROPDOWN_OPTIONS = 50

const controlStyle: React.CSSProperties = {
  width: 100,
  height: 22,
  fontSize: 11,
  padding: '0 6px',
  background: 'var(--surface-container-high)',
  color: 'var(--on-surface, inherit)',
  border: '1px solid var(--outline-variant)',
  borderRadius: 4,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  outline: 'none',
  boxSizing: 'border-box',
}

function toKey(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function applyFocusStyle(e: React.FocusEvent<HTMLSelectElement | HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--primary)'
}

function applyBlurStyle(e: React.FocusEvent<HTMLSelectElement | HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--outline-variant)'
}

export function PerColumnFilter<T>({ column, table }: PerColumnFilterProps<T>) {
  const id = column.id
  const skip = !column.getCanFilter() || id === 'open' || id.startsWith('_')

  const preFilteredRows = table.getPreFilteredRowModel().flatRows

  const { uniqueEntries, totalUnique } = useMemo(() => {
    if (skip) return { uniqueEntries: [] as Array<[string, number]>, totalUnique: 0 }

    const counts = new Map<string, number>()
    for (const row of preFilteredRows) {
      const raw = row.getValue(id)
      const key = toKey(raw)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const sortedByCount = Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })

    return {
      uniqueEntries: sortedByCount,
      totalUnique: counts.size,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, id, preFilteredRows])

  if (skip) return null

  const filterValue = column.getFilterValue()
  const useDropdown = totalUnique > 0 && totalUnique <= DROPDOWN_THRESHOLD

  if (useDropdown) {
    const options = uniqueEntries
      .slice(0, MAX_DROPDOWN_OPTIONS)
      .slice()
      .sort((a, b) => a[0].localeCompare(b[0]))
    const truncated = uniqueEntries.length > MAX_DROPDOWN_OPTIONS
    const currentValue = filterValue === undefined || filterValue === null ? '' : String(filterValue)

    return (
      <select
        value={currentValue}
        onChange={(e) => {
          const v = e.target.value
          column.setFilterValue(v === '' ? undefined : v)
        }}
        onClick={(e) => e.stopPropagation()}
        onFocus={applyFocusStyle}
        onBlur={applyBlurStyle}
        style={controlStyle}
        aria-label={`Filter ${id}`}
      >
        <option value="">—</option>
        {options.map(([value, count]) => (
          <option key={value} value={value}>
            {(value === '' ? '∅' : value) + ` (${count})`}
          </option>
        ))}
        {truncated && (
          <option disabled value="__truncated__">
            …
          </option>
        )}
      </select>
    )
  }

  const currentText =
    filterValue === undefined || filterValue === null ? '' : String(filterValue)

  return (
    <input
      type="text"
      value={currentText}
      onChange={(e) => {
        const v = e.target.value
        column.setFilterValue(v === '' ? undefined : v)
      }}
      onClick={(e) => e.stopPropagation()}
      onFocus={applyFocusStyle}
      onBlur={applyBlurStyle}
      placeholder="—"
      style={controlStyle}
      aria-label={`Filter ${id}`}
    />
  )
}
