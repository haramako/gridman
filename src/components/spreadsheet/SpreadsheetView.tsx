import { useState } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { useViewStore } from '@/stores/view.store'
import SpreadsheetGrid from './SpreadsheetGrid'
import type { TableSchema } from '@/types/schema'
import type { Row } from '@/types/row'
import type { FilterViewQuery, ViewDefinition } from '@/types/view'

interface Props {
  tableName: string
  schema: TableSchema
  rows: Map<string, Row>
  activeView?: ViewDefinition
  onEditView?: () => void
  readOnly?: boolean
}

export default function SpreadsheetView({ tableName, schema, rows, activeView, onEditView, readOnly }: Props) {
  const { addRow, deleteRow } = useProjectStore()
  const { filter, setFilter, setActiveViewId } = useViewStore()
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)

  const viewQuery = activeView?.query.type === 'filter'
    ? (activeView.query as FilterViewQuery)
    : undefined

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
        {activeView && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-sm text-blue-700">
            <span>🔍 {activeView.name}</span>
            <button
              type="button"
              className="ml-1 hover:text-blue-900"
              title="ビューを編集"
              onClick={onEditView}
            >
              ✏️
            </button>
            <button
              type="button"
              className="ml-0.5 hover:text-blue-900"
              title="ビューを閉じる"
              onClick={() => setActiveViewId(null)}
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1" />
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
          disabled={readOnly}
          onClick={() => addRow(tableName)}
        >
          + 行追加
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
          disabled={!selectedRowId || readOnly}
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
        key={tableName}
        tableName={tableName}
        schema={schema}
        rows={rows}
        filter={filter}
        sortDefs={viewQuery?.sort}
        selectedRowId={selectedRowId}
        onSelectRow={setSelectedRowId}
        readOnly={readOnly}
      />
    </div>
  )
}
