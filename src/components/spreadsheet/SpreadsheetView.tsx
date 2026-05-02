import { useState } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { useViewStore } from '@/stores/view.store'
import SpreadsheetGrid from './SpreadsheetGrid'
import type { TableSchema } from '@/types/schema'
import type { Row } from '@/types/row'

interface Props {
  tableName: string
  schema: TableSchema
  rows: Map<string, Row>
}

export default function SpreadsheetView({ tableName, schema, rows }: Props) {
  const { addRow, deleteRow } = useProjectStore()
  const { filter, setFilter } = useViewStore()
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 bg-background">
        <input
          className="border rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="フィルター..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="flex-1" />
        <button
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={() => addRow(tableName)}
        >
          + 行追加
        </button>
        <button
          className="px-3 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
          disabled={!selectedRowId}
          onClick={() => {
            if (selectedRowId) {
              deleteRow(tableName, selectedRowId)
              setSelectedRowId(null)
            }
          }}
        >
          − 行削除
        </button>
        <span className="text-xs text-muted-foreground">
          {rows.size} 行
        </span>
      </div>

      {/* Grid */}
      <SpreadsheetGrid
        tableName={tableName}
        schema={schema}
        rows={rows}
        filter={filter}
        selectedRowId={selectedRowId}
        onSelectRow={setSelectedRowId}
      />
    </div>
  )
}
