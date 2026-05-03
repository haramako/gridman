import { createContext, useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { useSelectionStore } from '@/stores/selection.store'
import { applySort } from '@/domain/filter'
import DataRow from './DataRow'
import type { TableSchema, ColumnDef } from '@/types/schema'
import type { Row } from '@/types/row'
import type { SelectionBounds } from '@/stores/selection.store'
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

// ---------------------------------------------------------------------------
// Grid context: shared with Cell components for navigation and selection range
// ---------------------------------------------------------------------------

type GridContextValue = {
  navigate: (fromRowId: string, fromColKey: string, dr: number, dc: number) => void
  selectionBounds: SelectionBounds | null
  focusContainer: () => void
  filteredRows: Row[]
  columns: ColumnDef[]
  readOnly: boolean
}

const GridContext = createContext<GridContextValue>({
  navigate: () => {},
  selectionBounds: null,
  focusContainer: () => {},
  filteredRows: [],
  columns: [],
  readOnly: false,
})

export const useGridContext = () => useContext(GridContext)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  tableName: string
  schema: TableSchema
  rows: Map<string, Row>
  filter: string
  sortDefs?: SortDef[]
  selectedRowId: string | null
  onSelectRow: (id: string | null) => void
  readOnly?: boolean
}

export default function SpreadsheetGrid({
  tableName,
  schema,
  rows,
  filter,
  sortDefs,
  selectedRowId,
  onSelectRow,
  readOnly,
}: Props) {
  const { schemas, tables, updateCell, project } = useProjectStore()
  const {
    cursor,
    anchorCell,
    setCursor,
    extendCursor,
    setEditing,
    startEditWithInput,
  } = useSelectionStore()

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

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const focusContainer = useCallback(() => {
    containerRef.current?.focus()
  }, [])

  const navigate = useCallback(
    (fromRowId: string, fromColKey: string, dr: number, dc: number) => {
      if (filteredRows.length === 0) return
      const rowIdx = filteredRows.findIndex((r) => (r._id as string) === fromRowId)
      const colIdx = schema.columns.findIndex((c) => c.key === fromColKey)

      const newRowIdx = Math.max(0, Math.min(filteredRows.length - 1, rowIdx + dr))
      const newColIdx = Math.max(0, Math.min(schema.columns.length - 1, colIdx + dc))

      const newRow = filteredRows[newRowIdx]
      const newCol = schema.columns[newColIdx]

      setCursor({ rowId: newRow._id as string, colKey: newCol.key, tableName })
      setEditing(null)
      containerRef.current?.focus()
    },
    [filteredRows, schema.columns, tableName, setCursor, setEditing]
  )

  // Scroll to keep cursor row visible after navigation
  useEffect(() => {
    if (!cursor) return
    const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cursor.rowId)
    if (rowIdx === -1) return
    const el = containerRef.current
    if (!el) return
    const rowTop = rowIdx * ROW_HEIGHT
    const rowBottom = rowTop + ROW_HEIGHT
    // Account for sticky thead height (~34px)
    const theadHeight = 34
    const visibleTop = el.scrollTop
    const visibleBottom = el.scrollTop + el.clientHeight - theadHeight
    if (rowTop < visibleTop) {
      el.scrollTop = rowTop
    } else if (rowBottom > visibleBottom) {
      el.scrollTop = rowBottom - (el.clientHeight - theadHeight)
    }
  }, [cursor, filteredRows])

  // ---------------------------------------------------------------------------
  // Copy & Paste
  // ---------------------------------------------------------------------------

  const handleCopy = useCallback(async () => {
    const { cursor: cur, anchorCell } = useSelectionStore.getState()
    if (!cur) return

    const cursorRowIdx = displayRows.findIndex((r) => (r._id as string) === cur.rowId)
    const cursorColIdx = schema.columns.findIndex((c) => c.key === cur.colKey)
    if (cursorRowIdx === -1 || cursorColIdx === -1) return

    let minRow = cursorRowIdx
    let maxRow = cursorRowIdx
    let minCol = cursorColIdx
    let maxCol = cursorColIdx

    if (anchorCell && (anchorCell.rowId !== cur.rowId || anchorCell.colKey !== cur.colKey)) {
      const anchorRowIdx = displayRows.findIndex((r) => (r._id as string) === anchorCell.rowId)
      const anchorColIdx = schema.columns.findIndex((c) => c.key === anchorCell.colKey)
      if (anchorRowIdx !== -1 && anchorColIdx !== -1) {
        minRow = Math.min(cursorRowIdx, anchorRowIdx)
        maxRow = Math.max(cursorRowIdx, anchorRowIdx)
        minCol = Math.min(cursorColIdx, anchorColIdx)
        maxCol = Math.max(cursorColIdx, anchorColIdx)
      }
    }

    const lines: string[] = []
    for (let ri = minRow; ri <= maxRow; ri++) {
      const row = displayRows[ri]
      const cells: string[] = []
      for (let ci = minCol; ci <= maxCol; ci++) {
        const col = schema.columns[ci]
        const rawVal =
          row._invalid?.[col.key] !== undefined ? row._invalid[col.key] : row[col.key]
        cells.push(rawVal === null || rawVal === undefined ? '' : String(rawVal))
      }
      lines.push(cells.join('\t'))
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
    } catch {
      // clipboard access denied
    }
  }, [displayRows, schema.columns])

  const handlePaste = useCallback(async () => {
    const { cursor: cur } = useSelectionStore.getState()
    if (!cur) return

    const cursorRowIdx = displayRows.findIndex((r) => (r._id as string) === cur.rowId)
    const cursorColIdx = schema.columns.findIndex((c) => c.key === cur.colKey)
    if (cursorRowIdx === -1 || cursorColIdx === -1) return

    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      return
    }

    const lines = text.split('\n')
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

    for (let ri = 0; ri < lines.length; ri++) {
      const rowIdx = cursorRowIdx + ri
      if (rowIdx >= displayRows.length) break

      const row = displayRows[rowIdx]
      const cells = lines[ri].split('\t')
      for (let ci = 0; ci < cells.length; ci++) {
        const colIdx = cursorColIdx + ci
        if (colIdx >= schema.columns.length) break

        const col = schema.columns[colIdx]
        if (col.type === 'json' || col.type === 'text') continue

        updateCell((row._source as string) ?? tableName, row._id as string, col.key, cells[ci])
      }
    }
  }, [displayRows, schema.columns, tableName, updateCell])

  // ---------------------------------------------------------------------------
  // Grid-level keyboard handler (non-edit mode)
  // ---------------------------------------------------------------------------

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const state = useSelectionStore.getState()
      const { cursor: cur, editingCell } = state

      // Let edit-mode key events be handled by the input/select in Cell
      if (editingCell) return
      if (!cur) return

      // Ctrl+C / Cmd+C: copy selected cells as TSV
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        handleCopy()
        return
      }

      // Ctrl+V / Cmd+V: paste TSV into cells starting at cursor
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        handlePaste()
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (e.shiftKey) {
            const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId)
            const newRowIdx = Math.max(0, rowIdx - 1)
            extendCursor({ rowId: filteredRows[newRowIdx]._id as string, colKey: cur.colKey, tableName })
          } else {
            navigate(cur.rowId, cur.colKey, -1, 0)
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (e.shiftKey) {
            const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId)
            const newRowIdx = Math.min(filteredRows.length - 1, rowIdx + 1)
            extendCursor({ rowId: filteredRows[newRowIdx]._id as string, colKey: cur.colKey, tableName })
          } else {
            navigate(cur.rowId, cur.colKey, 1, 0)
          }
          break

        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) {
            const colIdx = schema.columns.findIndex((c) => c.key === cur.colKey)
            const newColIdx = Math.max(0, colIdx - 1)
            extendCursor({ rowId: cur.rowId, colKey: schema.columns[newColIdx].key, tableName })
          } else {
            navigate(cur.rowId, cur.colKey, 0, -1)
          }
          break

        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) {
            const colIdx = schema.columns.findIndex((c) => c.key === cur.colKey)
            const newColIdx = Math.min(schema.columns.length - 1, colIdx + 1)
            extendCursor({ rowId: cur.rowId, colKey: schema.columns[newColIdx].key, tableName })
          } else {
            navigate(cur.rowId, cur.colKey, 0, 1)
          }
          break

        case 'Home':
          e.preventDefault()
          if (schema.columns.length > 0) {
            setCursor({ rowId: cur.rowId, colKey: schema.columns[0].key, tableName })
          }
          break

        case 'End':
          e.preventDefault()
          if (schema.columns.length > 0) {
            setCursor({
              rowId: cur.rowId,
              colKey: schema.columns[schema.columns.length - 1].key,
              tableName,
            })
          }
          break

        case 'Delete':
        case 'Backspace': {
          if (readOnly) break
          e.preventDefault()
          const colDef = schema.columns.find((c) => c.key === cur.colKey)
          if (colDef && !colDef.readonly && colDef.type !== 'json' && colDef.type !== 'text' && colDef.type !== 'boolean') {
            const emptyVal = colDef.type === 'integer' || colDef.type === 'number' ? 0 : ''
            updateCell(cur.tableName, cur.rowId, cur.colKey, emptyVal)
          }
          break
        }

        case 'Enter':
        case 'F2': {
          if (readOnly) break
          e.preventDefault()
          const colDef = schema.columns.find((c) => c.key === cur.colKey)
          if (colDef && !colDef.readonly && colDef.type !== 'json' && colDef.type !== 'text' && colDef.type !== 'boolean') {
            setEditing(cur)
          }
          break
        }

        case 'Tab': {
          e.preventDefault()
          if (e.shiftKey) navigate(cur.rowId, cur.colKey, 0, -1)
          else navigate(cur.rowId, cur.colKey, 0, 1)
          break
        }

        default:
          if (readOnly) break
          // Printable characters (IME-off / single char): type-to-edit
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const colDef = schema.columns.find((c) => c.key === cur.colKey)
            if (
              colDef &&
              !colDef.readonly &&
              colDef.type !== 'json' &&
              colDef.type !== 'text' &&
              colDef.type !== 'boolean' &&
              colDef.type !== 'ref' &&
              colDef.type !== 'ref[]' &&
              colDef.type !== 'enum'
            ) {
              startEditWithInput(cur, e.key)
            }
          }
      }
    },
    [filteredRows, schema.columns, tableName, navigate, setCursor, extendCursor, setEditing, startEditWithInput, updateCell, handleCopy, handlePaste]
  )

  // ---------------------------------------------------------------------------
  // Selection bounds for range highlighting
  // ---------------------------------------------------------------------------

  const selectionBounds = useMemo<SelectionBounds | null>(() => {
    if (!cursor || !anchorCell) return null
    if (cursor.rowId === anchorCell.rowId && cursor.colKey === anchorCell.colKey) return null

    const cursorRowIdx = filteredRows.findIndex((r) => (r._id as string) === cursor.rowId)
    const anchorRowIdx = filteredRows.findIndex((r) => (r._id as string) === anchorCell.rowId)
    const cursorColIdx = schema.columns.findIndex((c) => c.key === cursor.colKey)
    const anchorColIdx = schema.columns.findIndex((c) => c.key === anchorCell.colKey)

    if (cursorRowIdx === -1 || anchorRowIdx === -1) return null

    return {
      minRow: Math.min(cursorRowIdx, anchorRowIdx),
      maxRow: Math.max(cursorRowIdx, anchorRowIdx),
      minCol: Math.min(cursorColIdx, anchorColIdx),
      maxCol: Math.max(cursorColIdx, anchorColIdx),
    }
  }, [cursor, anchorCell, filteredRows, schema.columns])

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const gridContextValue = useMemo<GridContextValue>(
    () => ({ navigate, selectionBounds, focusContainer, filteredRows, columns: schema.columns, readOnly: readOnly ?? false }),
    [navigate, selectionBounds, focusContainer, filteredRows, schema.columns, readOnly]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <GridContext.Provider value={gridContextValue}>
      <div
        ref={containerRef}
        tabIndex={0}
        className="flex-1 overflow-auto outline-none"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        onKeyDown={handleContainerKeyDown}
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
                  gridRowIndex={startIndex + i}
                  tableName={tableName}
                  schema={schema}
                  schemas={schemas}
                  tables={tables}
                  project={project}
                  isSelected={selectedRowId === (row._id as string)}
                  onSelect={() =>
                    onSelectRow(
                      selectedRowId === (row._id as string) ? null : (row._id as string)
                    )
                  }
                  readOnly={readOnly}
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
    </GridContext.Provider>
  )
}
