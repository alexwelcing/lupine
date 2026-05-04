import type { Table } from '@tanstack/react-table'

/** Escape a single CSV field per RFC 4180 — quote if it contains commas, quotes, or newlines. */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value)
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

/** Resolve a column's header label, falling back to its id when the header isn't a string. */
function getHeaderLabel<T>(column: ReturnType<Table<T>['getVisibleLeafColumns']>[number]): string {
  const header = column.columnDef.header
  return typeof header === 'string' && header.length > 0 ? header : column.id
}

/** Convert a TanStack Table's filtered + sorted rows into an RFC 4180 CSV string. */
export function tableToCsv<T>(table: Table<T>): string {
  const columns = table.getVisibleLeafColumns()
  const headerRow = columns.map((column) => escapeCsvField(getHeaderLabel(column))).join(',')
  const dataRows = table.getFilteredRowModel().rows.map((row) =>
    columns.map((column) => escapeCsvField(row.getValue(column.id))).join(','),
  )
  return [headerRow, ...dataRows].join('\r\n')
}

/** Trigger a browser download of the given CSV text under the supplied filename. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Slugify a tab label for use in a filename: lowercase, hyphenated, alnum-only. */
function slugifyTabLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Format today's date as yyyy-mm-dd in local time. */
function formatIsoDate(date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Export a table's filtered + sorted rows as a downloaded CSV — preferred entry point. */
export function exportTableAsCsv<T>(table: Table<T>, tabLabel: string): void {
  const csv = tableToCsv(table)
  const slug = slugifyTabLabel(tabLabel) || 'export'
  const filename = `glim-${slug}-${formatIsoDate()}.csv`
  downloadCsv(csv, filename)
}
