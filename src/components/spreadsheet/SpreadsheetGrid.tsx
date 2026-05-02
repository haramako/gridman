import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { applySort } from '@/domain/filter'
import DataRow from './DataRow'
import type { TableSchema } from '@/types/schema'
import type { Row } from '@/types/row'
import type { SortDef } from '@/types/view'

const TYPE_ICON: Record<string, string> = {
  string: '🔤',
  integer: '🔢',
  number: '🔢',
  boolean: '☑',
  enum: '📋',
  ref: '🔗',
  'ref[]': '🔗',
  json: '{}',
  text: '📝',
  date: '📅',
}

const DEFAULT_COL_WIDTH: Record<string, number> = {
  boolean: 60,
  integer: 100,
  number: 100,
  enum: 120,
  ref: 160,
  'ref[]': 160,
  json: 80,
  text: 200,
  date: 120,
  string: 150,
}

const ROW_HEIGHT = 28
const ROW_NUM_WIDTH = 40
const MIN_COL_WIDTH = 40
const OVERSCAN = 5

interface Props {
  tableName: string
  schema: TableSchema
  rows: Map<string, Row>
  filter: string
  sortDefs?: SortDef[]
  selectedRowId: string | null
  onSelectRow: (id: string | null) => void
}

export default function SpreadsheetGrid({
  tableName,
  schema,
  rows,
  filter,
  sortDefs,
  selectedRowId,
  onSelectRow,
}: Props) {
  const { schemas, tables } = useProjectStore()

  const [colWidths, setColWidths] = useState<number[]>(() =>
    schema.columns.map((col) => DEFAULT_COL_WIDTH[col.type] ?? 150)
  )

  const [sort, setSort] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({
    col: null,
    dir: 'asc',
  })

  const handleHeaderClick = useCallback((colKey: string) => {
    setSort((prev) => {
      if (prev.col === colKey) {
        return { col: colKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { col: colKey, dir: 'asc' }
    })
  }, [])

  const dragState = useRef<{
    colIndex: number
    startX: number
    startWidth: number
  } | null>(null)

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      dragState.current = {
        colIndex,
        startX: e.clientX,
        startWidth: colWidths[colIndex],
      }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return
        const delta = ev.clientX - dragState.current.startX
        const newWidth = Math.max(MIN_COL_WIDTH, dragState.current.startWidth + delta)
        setColWidths((prev) => {
          const next = [...prev]
          next[dragState.current!.colIndex] = newWidth
          return next
        })
      }

      const onMouseUp = () => {
        dragState.current = null
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [colWidths]
  )

  // Virtual scroll
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const totalWidth = ROW_NUM_WIDTH + colWidths.reduce((sum, w) => sum + w, 0)

  const sortedRows = useMemo(() => {
    const arr = [...rows.values()]
    if (sortDefs && sortDefs.length > 0) return applySort(arr, sortDefs)
    return arr.sort((a, b) => (a._order as number) - (b._order as number))
  }, [rows, sortDefs])

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return sortedRows
    const q = filter.toLowerCase()
    return sortedRows.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [sortedRows, filter])

  const displayRows = useMemo(() => {
    if (!sort.col) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const av = a[sort.col!]
      const bv = b[sort.col!]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filteredRows, sort])

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    displayRows.length - 1,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  )
  const visibleRows = displayRows.slice(startIndex, endIndex + 1)
  const topPad = startIndex * ROW_HEIGHT
  const bottomPad = Math.max(0, (displayRows.length - 1 - endIndex) * ROW_HEIGHT)

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <table
        className="border-collapse text-sm"
        style={{ tableLayout: 'fixed', width: totalWidth }}
      >
        <colgroup>
          <col style={{ width: ROW_NUM_WIDTH }} />
          {schema.columns.map((col, i) => (
            <col key={col.key} style={{ width: colWidths[i] }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground text-center select-none overflow-hidden">
              #
            </th>
            {schema.columns.map((col, i) => (
              <th
                key={col.key}
                className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground select-none overflow-hidden relative cursor-pointer hover:bg-accent/50"
                onClick={() => handleHeaderClick(col.key)}
              >
                <span className="mr-1 opacity-60">{TYPE_ICON[col.type] ?? ''}</span>
                <span className="truncate">{col.displayName}</span>
                {sort.col === col.key && (
                  <span className="ml-1 opacity-80">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                )}
                <div
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 hover:opacity-60"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleResizeMouseDown(e, i)
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {topPad > 0 && (
            <tr style={{ height: topPad }}>
              <td colSpan={schema.columns.length + 1} />
            </tr>
          )}
          {visibleRows.length > 0 ? (
            visibleRows.map((row, i) => (
              <DataRow
                key={row._id as string}
                row={row}
                rowIndex={startIndex + i + 1}
                tableName={tableName}
                schema={schema}
                schemas={schemas}
                tables={tables}
                isSelected={selectedRowId === (row._id as string)}
                onSelect={() =>
                  onSelectRow(
                    selectedRowId === (row._id as string) ? null : (row._id as string)
                  )
                }
              />
            ))
          ) : (
            <tr>
              <td
                colSpan={schema.columns.length + 1}
                className="px-4 py-8 text-center text-muted-foreground text-sm"
              >
                {filter ? 'フィルター結果なし' : '行がありません'}
              </td>
            </tr>
          )}
          {bottomPad > 0 && (
            <tr style={{ height: bottomPad }}>
              <td colSpan={schema.columns.length + 1} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
