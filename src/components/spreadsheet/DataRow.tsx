import Cell from './Cell'
import type { TableSchema } from '@/types/schema'
import type { ProjectConfig } from '@/types/view'
import type { Row } from '@/types/row'

interface Props {
  row: Row
  rowIndex: number
  gridRowIndex: number
  tableName: string
  schema: TableSchema
  schemas: Map<string, TableSchema>
  tables: Map<string, Map<string, Row>>
  project: ProjectConfig | null
  isSelected: boolean
  onSelect: () => void
  readOnly?: boolean
}

export default function DataRow({
  row,
  rowIndex,
  gridRowIndex,
  tableName,
  schema,
  schemas,
  tables,
  project,
  isSelected,
  onSelect,
  readOnly,
}: Props) {
  const effectiveTableName = (row._source as string) ?? tableName
  return (
    <tr className={isSelected ? 'bg-blue-50' : 'hover:bg-muted/30'}>
      <td
        className="border-b border-r px-2 py-0.5 text-center text-muted-foreground text-xs select-none cursor-pointer w-10"
        onClick={onSelect}
      >
        {rowIndex}
      </td>
      {schema.columns.map((col, colIndex) => (
        <Cell
          key={col.key}
          row={row}
          col={col}
          colIndex={colIndex}
          gridRowIndex={gridRowIndex}
          tableName={effectiveTableName}
          schemas={schemas}
          tables={tables}
          project={project}
          readOnly={readOnly}
        />
      ))}
    </tr>
  )
}
