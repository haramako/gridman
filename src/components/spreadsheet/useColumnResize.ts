import { useState, useRef, useEffect, useCallback } from 'react'
import type { ColumnDef } from '@/types/schema'

export const DEFAULT_COL_WIDTH: Record<string, number> = {
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

const MIN_COL_WIDTH = 40

export function useColumnResize(visibleColumns: ColumnDef[], allColumns: ColumnDef[]) {
  const colWidthMapRef = useRef<Record<string, number>>(
    Object.fromEntries(allColumns.map((col) => [col.key, DEFAULT_COL_WIDTH[col.type] ?? 150]))
  )

  const [colWidths, setColWidths] = useState<number[]>(() =>
    visibleColumns.map((col) => DEFAULT_COL_WIDTH[col.type] ?? 150)
  )

  useEffect(() => {
    setColWidths(visibleColumns.map((col) => DEFAULT_COL_WIDTH[col.type] ?? 150))
  }, [visibleColumns])

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      const dragState = {
        colIndex,
        colKey: visibleColumns[colIndex]?.key ?? '',
        startX: e.clientX,
        startWidth: colWidths[colIndex],
      }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - dragState.startX
        const newWidth = Math.max(MIN_COL_WIDTH, dragState.startWidth + delta)
        const { colIndex: idx, colKey: key } = dragState
        setColWidths((prev) => {
          const next = [...prev]
          next[idx] = newWidth
          if (key) colWidthMapRef.current[key] = newWidth
          return next
        })
      }

      const onMouseUp = () => {
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [colWidths, visibleColumns]
  )

  return { colWidths, handleResizeMouseDown }
}
