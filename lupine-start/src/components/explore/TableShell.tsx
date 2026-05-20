// Generic TanStack Table shell used by the /console explorer.
// Built-in: global filter, sortable columns, pagination, column visibility
// toggle, per-column filters, row expansion (inline JSON), CSV export.
import { useState, useMemo, useEffect, Fragment } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
  type ExpandedState,
} from '@tanstack/react-table'
import { PerColumnFilter } from './PerColumnFilter'
import { exportTableAsCsv } from './csv'

interface TableShellProps<T> {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  searchPlaceholder?: string
  initialPageSize?: number
  // Tab label used for CSV filename + the empty-state copy.
  tabLabel: string
  // Initial global-filter seed (used for cross-tab drill).
  initialGlobalFilter?: string
  // Default sort applied on first render; user can resort via header click.
  initialSorting?: SortingState
  // Columns hidden by default (toggleable via the cols menu).
  initialColumnVisibility?: VisibilityState
}

export function TableShell<T extends object>({
  data,
  columns,
  isLoading,
  isError,
  errorMessage,
  searchPlaceholder = 'search…',
  initialPageSize = 25,
  tabLabel,
  initialGlobalFilter = '',
  initialSorting,
  initialColumnVisibility,
}: TableShellProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility ?? {})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [showColMenu, setShowColMenu] = useState(false)
  const [showFilterRow, setShowFilterRow] = useState(false)

  // Re-seed when caller changes the drill target (different hypothesis id)
  useEffect(() => {
    setGlobalFilter(initialGlobalFilter)
  }, [initialGlobalFilter])

  // Add an _expand display column at the start so every row can be drilled into.
  const expandableColumns = useMemo<ColumnDef<T, unknown>[]>(() => [
    {
      id: '_expand',
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded() }}
          className="font-mono text-[10px] text-[var(--on-surface-variant)] hover:text-[var(--primary)] w-5"
          aria-label={row.getIsExpanded() ? 'collapse row' : 'expand row'}
        >
          {row.getIsExpanded() ? '▾' : '▸'}
        </button>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    ...columns,
  ], [columns])

  const table = useReactTable({
    data,
    columns: expandableColumns,
    state: { sorting, globalFilter, columnVisibility, columnFilters, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: { pagination: { pageSize: initialPageSize } },
    globalFilterFn: 'includesString',
  })

  if (isLoading) {
    return (
      <div className="glass-panel p-12 text-center">
        <p className="mono-label text-[var(--on-surface-variant)]">loading…</p>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="glass-panel p-8 border-l-2 border-[var(--error)]">
        <p className="mono-label text-[var(--error)] mb-2">failed to load</p>
        <p className="text-sm font-mono text-[var(--on-surface-variant)]">
          {errorMessage ?? 'unknown error'}
        </p>
      </div>
    )
  }

  const allLeafColumns = table.getAllLeafColumns().filter(c => c.id !== '_expand')

  return (
    <div className="glass-panel overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--outline-variant)]">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--surface-container-high)] border border-[var(--outline-variant)] text-sm text-[var(--on-surface)] focus:border-[var(--primary)] outline-none rounded"
            style={{ width: '260px' }}
          />
          <button
            onClick={() => setShowFilterRow(v => !v)}
            className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 border transition-colors ${
              showFilterRow
                ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)]'
                : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]'
            }`}
            title="toggle per-column filters"
          >
            filters {columnFilters.length > 0 && `(${columnFilters.length})`}
          </button>
          {/* column-visibility menu */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu(v => !v)}
              className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 border border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]"
              title="toggle column visibility"
            >
              cols ({allLeafColumns.filter(c => c.getIsVisible()).length}/{allLeafColumns.length})
            </button>
            {showColMenu && (
              <div
                className="absolute left-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--outline-variant)] shadow-lg p-2 min-w-[200px] max-h-[400px] overflow-y-auto"
                onMouseLeave={() => setShowColMenu(false)}
              >
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--outline-variant)]">
                  <button
                    onClick={() => table.toggleAllColumnsVisible(true)}
                    className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 border border-[var(--outline-variant)] hover:border-[var(--primary)]"
                  >
                    show all
                  </button>
                  <button
                    onClick={() => table.toggleAllColumnsVisible(false)}
                    className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 border border-[var(--outline-variant)] hover:border-[var(--primary)]"
                  >
                    hide all
                  </button>
                </div>
                {allLeafColumns.map(col => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--surface-container-high)]/40 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                    />
                    <span className="font-mono text-xs">
                      {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-[var(--on-surface-variant)] flex-wrap">
          <span>
            <b className="text-[var(--on-surface)]">{table.getFilteredRowModel().rows.length}</b> rows
          </span>
          <span>·</span>
          <span>page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}</span>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-0.5 border border-[var(--outline-variant)] disabled:opacity-30 hover:border-[var(--primary)] transition-colors"
          >
            prev
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-0.5 border border-[var(--outline-variant)] disabled:opacity-30 hover:border-[var(--primary)] transition-colors"
          >
            next
          </button>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="bg-[var(--surface-container-high)] border border-[var(--outline-variant)] px-1 py-0.5 text-xs"
          >
            {[10, 25, 50, 100, 250].map(n => (
              <option key={n} value={n}>{n}/page</option>
            ))}
          </select>
          <button
            onClick={() => exportTableAsCsv(table, tabLabel)}
            className="px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors uppercase tracking-[0.08em]"
            title="download visible + filtered rows as CSV"
          >
            csv
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="evidence-table w-full">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <Fragment key={hg.id}>
                <tr>
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={`text-left ${h.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' && <span className="text-[var(--primary)]">↑</span>}
                        {h.column.getIsSorted() === 'desc' && <span className="text-[var(--primary)]">↓</span>}
                      </span>
                    </th>
                  ))}
                </tr>
                {showFilterRow && (
                  <tr>
                    {hg.headers.map(h => (
                      <th key={h.id + '-filter'} className="py-1">
                        {h.column.getCanFilter() && h.column.id !== '_expand' && (
                          <PerColumnFilter column={h.column} table={table} />
                        )}
                      </th>
                    ))}
                  </tr>
                )}
              </Fragment>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <Fragment key={row.id}>
                <tr
                  className="hover:bg-[var(--surface-container-high)]/30 transition-colors cursor-pointer"
                  onClick={() => row.toggleExpanded()}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr className="bg-[var(--surface-container-high)]/20">
                    <td colSpan={row.getVisibleCells().length} className="p-4">
                      <pre className="text-[10px] font-mono text-[var(--on-surface-variant)] whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
                        {JSON.stringify(row.original, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={expandableColumns.length} className="text-center py-12 text-[var(--on-surface-variant)] italic">
                  no rows match
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
