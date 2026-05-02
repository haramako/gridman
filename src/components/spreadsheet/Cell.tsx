import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { useSelectionStore } from '@/stores/selection.store'
import { validateCell, coerceToType } from '@/domain/validator'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@/types/schema'
import type { TableSchema } from '@/types/schema'
import type { Row } from '@/types/row'

interface Props {
  row: Row
  col: ColumnDef
  tableName: string
  schemas: Map<string, TableSchema>
  tables: Map<string, Map<string, Row>>
}

function getDisplayValue(
  row: Row,
  col: ColumnDef,
  schemas: Map<string, TableSchema>,
  tables: Map<string, Map<string, Row>>
): string {
  const rawValue = row[col.key]

  if (col.type === 'ref' && col.refTable) {
    const refTable = tables.get(col.refTable)
    const refSchema = schemas.get(col.refTable)
    const displayCol = refSchema?.columns.find((c) => c.isDisplayName)
    const refRow = refTable?.get(rawValue as string)
    if (refRow && displayCol) return String(refRow[displayCol.key] ?? '')
    return rawValue != null ? String(rawValue) : ''
  }

  if (col.type === 'json') return rawValue != null ? '[JSON]' : ''
  if (col.type === 'text') {
    const s = String(rawValue ?? '')
    return s.length > 40 ? s.slice(0, 40) + '…' : s
  }

  return rawValue != null ? String(rawValue) : ''
}

export default function Cell({ row, col, tableName, schemas, tables }: Props) {
  const { cursor, editingCell, setCursor, setEditing } = useSelectionStore()
  const { updateCell, dirtyRowIds } = useProjectStore()
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  const rowId = row._id as string
  const isSelected = cursor?.rowId === rowId && cursor?.colKey === col.key
  const isEditing = editingCell?.rowId === rowId && editingCell?.colKey === col.key
  const isDirty = dirtyRowIds.get(tableName)?.has(rowId) ?? false
  const isInvalid = row._invalid?.[col.key] !== undefined

  const displayValue = isInvalid
    ? String(row._invalid![col.key] ?? '')
    : getDisplayValue(row, col, schemas, tables)

  const currentEditValue = isInvalid
    ? String(row._invalid![col.key] ?? '')
    : String(row[col.key] ?? '')

  const [editValue, setEditValue] = useState(currentEditValue)

  useEffect(() => {
    if (isEditing) {
      setEditValue(currentEditValue)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isEditing])

  const errorMessage = isInvalid
    ? validateCell(coerceToType(row._invalid![col.key], col.type), col)?.message
    : null

  const commitEdit = (val: string) => {
    updateCell(tableName, rowId, col.key, val)
    setEditing(null)
  }

  const cancelEdit = () => setEditing(null)

  const startEdit = () => {
    if (col.type === 'json' || col.type === 'text') return
    setCursor({ rowId, colKey: col.key, tableName })
    setEditing({ rowId, colKey: col.key, tableName })
  }

  // boolean: click to toggle
  if (col.type === 'boolean') {
    return (
      <td
        className={cn(
          'border-b border-r px-2 py-0.5 cursor-pointer select-none',
          isDirty && !isInvalid && 'bg-yellow-50',
          isInvalid && 'ring-1 ring-inset ring-red-400',
          isSelected && 'ring-2 ring-inset ring-blue-400'
        )}
        onClick={() => {
          setCursor({ rowId, colKey: col.key, tableName })
          updateCell(tableName, rowId, col.key, !row[col.key])
        }}
      >
        <span className="text-base leading-none">{row[col.key] ? '✓' : ''}</span>
      </td>
    )
  }

  // readonly types
  if (col.type === 'json' || col.type === 'text') {
    return (
      <td
        className={cn(
          'border-b border-r px-2 py-0.5 text-muted-foreground whitespace-nowrap',
          isSelected && 'ring-2 ring-inset ring-blue-400'
        )}
        onClick={() => setCursor({ rowId, colKey: col.key, tableName })}
      >
        {displayValue}
      </td>
    )
  }

  if (isEditing) {
    if (col.type === 'enum' && col.enumValues) {
      return (
        <td className="border-b border-r p-0">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full h-full px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit(editValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(editValue)
              if (e.key === 'Escape') cancelEdit()
            }}
          >
            <option value="">-</option>
            {col.enumValues.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </td>
      )
    }

    if (col.type === 'ref' && col.refTable) {
      const refTable = tables.get(col.refTable)
      const refSchema = schemas.get(col.refTable)
      const displayCol = refSchema?.columns.find((c) => c.isDisplayName)
      const refRows = refTable
        ? [...refTable.values()].sort((a, b) => (a._order as number) - (b._order as number))
        : []

      return (
        <td className="border-b border-r p-0">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full h-full px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit(editValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(editValue)
              if (e.key === 'Escape') cancelEdit()
            }}
          >
            <option value="">-</option>
            {refRows.map((r) => (
              <option key={r._id as string} value={r._id as string}>
                {displayCol ? String(r[displayCol.key] ?? r._id) : String(r._id)}
              </option>
            ))}
          </select>
        </td>
      )
    }

    return (
      <td className="border-b border-r p-0">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="w-full px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(editValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit(editValue)
            if (e.key === 'Escape') cancelEdit()
            if (e.key === 'Tab') { e.preventDefault(); commitEdit(editValue) }
          }}
        />
      </td>
    )
  }

  return (
    <td
      className={cn(
        'border-b border-r px-2 py-0.5 whitespace-nowrap cursor-default select-none overflow-hidden truncate',
        isDirty && !isInvalid && 'bg-yellow-50',
        isInvalid && 'ring-1 ring-inset ring-red-400 bg-red-50',
        isSelected && !isInvalid && 'ring-2 ring-inset ring-blue-400'
      )}
      title={errorMessage ?? undefined}
      onClick={() => setCursor({ rowId, colKey: col.key, tableName })}
      onDoubleClick={startEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'F2') startEdit()
      }}
      tabIndex={isSelected ? 0 : -1}
    >
      {isInvalid && <span className="mr-1 text-red-500">⚠</span>}
      {displayValue}
    </td>
  )
}
