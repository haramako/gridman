import { useState, useRef, useEffect, useCallback } from 'react'
import type { ColumnDef } from '@/types/schema'
import { COLUMN_TYPE_CONFIG } from '@/lib/columnTypeConfig'

const MIN_COL_WIDTH = 40

export function useColumnResize(visibleColumns: ColumnDef[], allColumns: ColumnDef[]) {
  const colWidthMapRef = useRef<Record<string, number>>(
    Object.fromEntries(allColumns.map((col) => [col.key, COLUMN_TYPE_CONFIG[col.type].defaultWidth]))
  )

  const [colWidths, setColWidths] = useState<number[]>(() =>
    visibleColumns.map((col) => COLUMN_TYPE_CONFIG[col.type].defaultWidth)
  )

  useEffect(() => {
    setColWidths(visibleColumns.map((col) => COLUMN_TYPE_CONFIG[col.type].defaultWidth))
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
