import { useMemo, useState, useRef, useCallback } from 'react'
import { useProjectStore } from '@/stores/project.store'
import DataRow from './DataRow'
import type { TableSchema } from '@/types/schema'
import type { Row } from '@/types/row'

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

const ROW_NUM_WIDTH = 40
const MIN_COL_WIDTH = 40

interface Props {
  tableName: string
  schema: TableSchema
  rows: Map<string, Row>
  filter: string
  selectedRowId: string | null
  onSelectRow: (id: string | null) => void
}

export default function SpreadsheetGrid({
  tableName,
  schema,
  rows,
  filter,
  selectedRowId,
  onSelectRow,
}: Props) {
  const { schemas, tables } = useProjectStore()

  const [colWidths, setColWidths] = useState<number[]>(() =>
    schema.columns.map((col) => DEFAULT_COL_WIDTH[col.type] ?? 150)
  )

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

  const totalWidth = ROW_NUM_WIDTH + colWidths.reduce((sum, w) => sum + w, 0)

  const sortedRows = useMemo(
    () =>
      [...rows.values()].sort((a, b) => (a._order as number) - (b._order as number)),
    [rows]
  )

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return sortedRows
    const q = filter.toLowerCase()
    return sortedRows.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [sortedRows, filter])

  return (
    <div className="flex-1 overflow-auto">
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
                className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground select-none overflow-hidden relative"
              >
                <span className="mr-1 opacity-60">{TYPE_ICON[col.type] ?? ''}</span>
                <span className="truncate">{col.displayName}</span>
                <div
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 hover:opacity-60"
                  onMouseDown={(e) => handleResizeMouseDown(e, i)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, i) => (
            <DataRow
              key={row._id as string}
              row={row}
              rowIndex={i + 1}
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
          ))}
          {filteredRows.length === 0 && (
            <tr>
              <td
                colSpan={schema.columns.length + 1}
                className="px-4 py-8 text-center text-muted-foreground text-sm"
              >
                {filter ? 'フィルター結果なし' : '行がありません'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
