import { useMemo } from 'react'
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
      <table className="border-collapse text-sm" style={{ minWidth: 'max-content' }}>
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground w-10 text-center select-none">
              #
            </th>
            {schema.columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap select-none min-w-[120px]"
              >
                <span className="mr-1 opacity-60">{TYPE_ICON[col.type] ?? ''}</span>
                {col.displayName}
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
