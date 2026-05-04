import { createContext, useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { useSelectionStore } from '@/stores/selection.store'
import { applySort } from '@/domain/filter'
import DataRow from './DataRow'
import type { TableSchema, ColumnDef } from '@/types/schema'
import type { Row } from '@/types/row'
import type { SelectionBounds, CellPosition } from '@/stores/selection.store'
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
  onCellMouseDown: (e: React.MouseEvent, pos: CellPosition) => void
}

const GridContext = createContext<GridContextValue>({
  navigate: () => {},
  selectionBounds: null,
  focusContainer: () => {},
  filteredRows: [],
  columns: [],
  readOnly: false,
  onCellMouseDown: () => {},
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
  selectedRowIds: Set<string>
  onSelectRow: (id: string) => void
  onSelectRows: (ids: string[]) => void
  onClearSelection: () => void
  readOnly?: boolean
}

export default function SpreadsheetGrid({
  tableName,
  schema,
  rows,
  filter,
  sortDefs,
  selectedRowIds,
  onSelectRow,
  onSelectRows,
  onClearSelection,
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

  const colWidthMapRef = useRef<Record<string, number>>(
    Object.fromEntries(schema.columns.map((col) => [col.key, DEFAULT_COL_WIDTH[col.type] ?? 150]))
  )

  const [colWidths, setColWidths] = useState<number[]>(() =>
    schema.columns.map((col) => DEFAULT_COL_WIDTH[col.type] ?? 150)
  )

  // Sync colWidths when schema columns change (e.g., after adding/removing columns in the schema editor)
  useEffect(() => {
    setColWidths(
      schema.columns.map((col) => {
        const existing = colWidthMapRef.current[col.key]
        if (existing !== undefined) return existing
        const def = DEFAULT_COL_WIDTH[col.type] ?? 150
        colWidthMapRef.current[col.key] = def
        return def
      })
    )
  }, [schema.columns])

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
    colKey: string
    startX: number
    startWidth: number
  } | null>(null)

  // Row drag selection state
  const dragStartRowIndex = useRef<number | null>(null)
  const dragCurrentRowIndex = useRef<number | null>(null)

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      dragState.current = {
        colIndex,
        colKey: schema.columns[colIndex]?.key ?? '',
        startX: e.clientX,
        startWidth: colWidths[colIndex],
      }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return
        const delta = ev.clientX - dragState.current.startX
        const newWidth = Math.max(MIN_COL_WIDTH, dragState.current.startWidth + delta)
        const { colIndex: idx, colKey: key } = dragState.current
        setColWidths((prev) => {
          const next = [...prev]
          next[idx] = newWidth
          if (key) colWidthMapRef.current[key] = newWidth
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
    [colWidths, schema.columns]
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

  // Row drag selection handlers
  const handleRowNumberMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      e.preventDefault()
      const row = filteredRows[rowIndex]
      if (!row) return
      const rowId = row._id as string

      // If Ctrl/Cmd key is pressed, add/remove from selection
      if (e.ctrlKey || e.metaKey) {
        if (selectedRowIds.has(rowId)) {
          const newIds = new Set(selectedRowIds)
          newIds.delete(rowId)
          onSelectRows([...newIds])
        } else {
          onSelectRow(rowId)
        }
        return
      }

      // Start drag selection
      dragStartRowIndex.current = rowIndex
      dragCurrentRowIndex.current = rowIndex
      onClearSelection()
      onSelectRow(rowId)

      const onMouseMove = (ev: MouseEvent) => {
        // Check if mouse is over a row number cell
        const target = document.elementFromPoint(ev.clientX, ev.clientY)
        const rowCell = target?.closest('[data-row-index]')
        if (!rowCell) return
        const idx = parseInt(rowCell.getAttribute('data-row-index') || '', 10)
        if (isNaN(idx) || idx === dragCurrentRowIndex.current) return
        dragCurrentRowIndex.current = idx

        // Select all rows between start and current
        const start = Math.min(dragStartRowIndex.current!, idx)
        const end = Math.max(dragStartRowIndex.current!, idx)
        const ids: string[] = []
        for (let i = start; i <= end; i++) {
          const r = filteredRows[i]
          if (r) ids.push(r._id as string)
        }
        onSelectRows(ids)
      }

      const onMouseUp = () => {
        dragStartRowIndex.current = null
        dragCurrentRowIndex.current = null
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }

      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'default'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [filteredRows, selectedRowIds, onSelectRow, onSelectRows, onClearSelection]
  )

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
  // Data edge helpers (Ctrl+Arrow jump)
  // ---------------------------------------------------------------------------

  const findDataEdgeRow = useCallback(
    (_startIdx: number, _colKey: string, direction: 'up' | 'down'): number => {
      const rows = filteredRows
      if (direction === 'down') {
        return Math.max(0, rows.length - 1)
      } else {
        return 0
      }
    },
    [filteredRows]
  )

  const findDataEdgeCol = useCallback(
    (_row: Row, _startColKey: string, direction: 'left' | 'right'): string => {
      const cols = schema.columns
      if (direction === 'right') {
        return cols[cols.length - 1]?.key ?? _startColKey
      } else {
        return cols[0]?.key ?? _startColKey
      }
    },
    [schema.columns]
  )

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const focusContainer = useCallback(() => {
    containerRef.current?.focus()
  }, [])

  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, pos: CellPosition) => {
      if (e.button !== 0) return
      if (e.shiftKey) {
        extendCursor(pos)
      } else {
        setCursor(pos)
      }
      focusContainer()
      document.body.style.userSelect = 'none'

      const onMouseMove = (ev: MouseEvent) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY)
        const td = el?.closest('[data-row-id]') as HTMLElement | null
        if (!td) return
        const rowId = td.getAttribute('data-row-id')
        const colKey = td.getAttribute('data-col-key')
        if (!rowId || !colKey) return
        extendCursor({ rowId, colKey, tableName: pos.tableName })
      }

      const onMouseUp = () => {
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [setCursor, extendCursor, focusContainer]
  )

  const navigate = useCallback(
    (fromRowId: string, fromColKey: string, dr: number, dc: number) => {
      if (filteredRows.length === 0) return
      const rowIdx = filteredRows.findIndex((r) => (r._id as string) === fromRowId)
      const colIdx = schema.columns.findIndex((c) => c.key === fromColKey)

      const newRowIdx = Math.max(0, Math.min(filteredRows.length - 1, rowIdx + dr))
      const newColIdx = Math.max(0, Math.min(schema.columns.length - 1, colIdx + dc))

      const newRow = filteredRows[newRowIdx]
      const newCol = schema.columns[newColIdx]
      const navSources = newRow._sources as Record<string, unknown> | undefined
      const rowTableName =
        (newRow._source as string) ?? (navSources ? Object.keys(navSources)[0] : undefined) ?? tableName

      setCursor({ rowId: newRow._id as string, colKey: newCol.key, tableName: rowTableName })
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

  const applyPastedText = useCallback((text: string) => {
    if (readOnly) return
    const { cursor: cur } = useSelectionStore.getState()
    if (!cur) return

    const cursorRowIdx = displayRows.findIndex((r) => (r._id as string) === cur.rowId)
    const cursorColIdx = schema.columns.findIndex((c) => c.key === cur.colKey)
    if (cursorRowIdx === -1 || cursorColIdx === -1) return

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
  }, [readOnly, displayRows, schema.columns, tableName, updateCell])

  // Global paste listener — fires even when focus is not on the grid container,
  // and uses clipboardData (no HTTPS/permission required unlike clipboard.readText).
  useEffect(() => {
    const onDocumentPaste = (e: ClipboardEvent) => {
      const { cursor: cur, editingCell } = useSelectionStore.getState()
      if (!cur || editingCell) return
      // Don't intercept pastes into other editable elements on the page.
      const activeEl = document.activeElement
      if (
        activeEl &&
        activeEl !== document.body &&
        activeEl !== containerRef.current &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      ) return
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (text) applyPastedText(text)
    }
    document.addEventListener('paste', onDocumentPaste)
    return () => document.removeEventListener('paste', onDocumentPaste)
  }, [applyPastedText])

  const handlePaste = useCallback(async () => {
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      return
    }
    applyPastedText(text)
  }, [applyPastedText])

  // ---------------------------------------------------------------------------
  // Cut
  // ---------------------------------------------------------------------------

  const handleCut = useCallback(async () => {
    if (readOnly) return

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

    // Build TSV data for clipboard (same as handleCopy)
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

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
    } catch {
      // clipboard access denied
      return
    }

    // Clear the selected cells
    for (let ri = minRow; ri <= maxRow; ri++) {
      const row = displayRows[ri]
      for (let ci = minCol; ci <= maxCol; ci++) {
        const col = schema.columns[ci]
        // Skip read-only columns and types that shouldn't be cleared directly
        if (col.readonly || col.type === 'json' || col.type === 'text' || col.type === 'boolean') continue

        const emptyVal = col.type === 'integer' || col.type === 'number' ? 0 : ''
        updateCell((row._source as string) ?? tableName, row._id as string, col.key, emptyVal)
      }
    }
  }, [displayRows, schema.columns, tableName, readOnly, updateCell])

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

      // Ctrl+X / Cmd+X: cut selected cells (copy + clear)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault()
        handleCut()
        return
      }

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

      // Ctrl+Arrow: jump to data edge
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId)

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault()
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'up')
              const edgeRow = filteredRows[edgeRowIdx]
              const navSources = edgeRow._sources as Record<string, unknown> | undefined
              const rowTableName =
                (edgeRow._source as string) ?? (navSources ? Object.keys(navSources)[0] : undefined) ?? tableName
              setCursor({ rowId: edgeRow._id as string, colKey: cur.colKey, tableName: rowTableName })
              setEditing(null)
              containerRef.current?.focus()
            }
            return

          case 'ArrowDown':
            e.preventDefault()
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'down')
              const edgeRow = filteredRows[edgeRowIdx]
              const navSources = edgeRow._sources as Record<string, unknown> | undefined
              const rowTableName =
                (edgeRow._source as string) ?? (navSources ? Object.keys(navSources)[0] : undefined) ?? tableName
              setCursor({ rowId: edgeRow._id as string, colKey: cur.colKey, tableName: rowTableName })
              setEditing(null)
              containerRef.current?.focus()
            }
            return

          case 'ArrowLeft':
            e.preventDefault()
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx]
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'left')
              setCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName })
              setEditing(null)
              containerRef.current?.focus()
            }
            return

          case 'ArrowRight':
            e.preventDefault()
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx]
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'right')
              setCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName })
              setEditing(null)
              containerRef.current?.focus()
            }
            return
        }
      }

      // Ctrl+Shift+Arrow: extend selection to data edge
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId)

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault()
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'up')
              extendCursor({ rowId: filteredRows[edgeRowIdx]._id as string, colKey: cur.colKey, tableName: cur.tableName })
            }
            return

          case 'ArrowDown':
            e.preventDefault()
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'down')
              extendCursor({ rowId: filteredRows[edgeRowIdx]._id as string, colKey: cur.colKey, tableName: cur.tableName })
            }
            return

          case 'ArrowLeft':
            e.preventDefault()
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx]
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'left')
              extendCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName })
            }
            return

          case 'ArrowRight':
            e.preventDefault()
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx]
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'right')
              extendCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName })
            }
            return
        }
      }

      // Ctrl+A: select all cells
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'a') {
        e.preventDefault()

        // Select all rows visually
        const allRowIds = filteredRows.map((row) => row._id as string)
        onSelectRows(allRowIds)

        // Set cell selection range from first to last cell
        if (filteredRows.length > 0 && schema.columns.length > 0) {
          const firstRow = filteredRows[0]
          const lastRow = filteredRows[filteredRows.length - 1]
          const firstCol = schema.columns[0]
          const lastCol = schema.columns[schema.columns.length - 1]

          setCursor({
            rowId: firstRow._id as string,
            colKey: firstCol.key,
            tableName: tableName,
          })
          extendCursor({
            rowId: lastRow._id as string,
            colKey: lastCol.key,
            tableName: tableName,
          })
        }

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

        case 'PageUp':
          e.preventDefault()
          navigate(cur.rowId, cur.colKey, -Math.floor(containerHeight / ROW_HEIGHT), 0)
          break

        case 'PageDown':
          e.preventDefault()
          navigate(cur.rowId, cur.colKey, Math.floor(containerHeight / ROW_HEIGHT), 0)
          break

        case 'Home':
          e.preventDefault()
          if (schema.columns.length > 0) {
            setCursor({ rowId: cur.rowId, colKey: schema.columns[0].key, tableName: cur.tableName })
          }
          break

        case 'End':
          e.preventDefault()
          if (schema.columns.length > 0) {
            setCursor({
              rowId: cur.rowId,
              colKey: schema.columns[schema.columns.length - 1].key,
              tableName: cur.tableName,
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
    [filteredRows, schema.columns, tableName, containerHeight, navigate, setCursor, extendCursor, setEditing, startEditWithInput, updateCell, handleCopy, handlePaste, handleCut, findDataEdgeRow, findDataEdgeCol]
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
    () => ({ navigate, selectionBounds, focusContainer, filteredRows, columns: schema.columns, readOnly: readOnly ?? false, onCellMouseDown: handleCellMouseDown }),
    [navigate, selectionBounds, focusContainer, filteredRows, schema.columns, readOnly, handleCellMouseDown]
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
                  isSelected={selectedRowIds.has(row._id as string)}
                  onSelect={() => {
                    const rowId = row._id as string
                    if (selectedRowIds.has(rowId)) {
                      const newIds = new Set(selectedRowIds)
                      newIds.delete(rowId)
                      onSelectRows([...newIds])
                    } else {
                      onSelectRow(rowId)
                    }
                  }}
                  onRowNumberMouseDown={handleRowNumberMouseDown}
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
