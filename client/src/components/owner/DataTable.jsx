import React from 'react'

const DataTable = ({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  loading,
  emptyMessage = 'No data found',
}) => {
  const handleSort = (key) => {
    if (!key || !onSort) return
    if (sortBy === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'desc')
    }
  }

  const SortIcon = ({ columnKey }) => {
    if (!columnKey) return null
    if (sortBy !== columnKey) return <span className="text-[var(--admin-muted)] ml-1 opacity-50">↕</span>
    return <span className="text-[var(--admin-primary)] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="table-scroll">
        <table className="w-full border-collapse text-left text-sm text-[var(--admin-ink-secondary)] max-lg:min-w-[720px]">
          <thead className="text-[var(--admin-muted)] bg-[var(--admin-table-head)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none hover:bg-[var(--admin-hover)]' : ''}`}
                  onClick={() => col.sortable && handleSort(col.sortKey || col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.sortKey || col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                  <div className="mx-auto max-w-sm space-y-2">
                    <div className="admin-skeleton h-3 w-full" />
                    <div className="admin-skeleton h-3 w-4/5 mx-auto" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row._id || index}
                  className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-hover)] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
