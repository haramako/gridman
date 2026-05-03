import { applyFilter } from './filter'
import type { Row } from '@/types/row'
import type { ColumnDef, TableSchema } from '@/types/schema'
import type { LookupViewQuery } from '@/types/view'

export function applyLookup(
  query: LookupViewQuery,
  tables: Map<string, Map<string, Row>>,
  schemas: Map<string, TableSchema>
): { rows: Row[]; schema: TableSchema } {
  const baseSchema = schemas.get(query.from)
  if (!baseSchema) {
    return { rows: [], schema: { name: '__lookup__', displayName: 'ルックアップ', columns: [] } }
  }

  const baseTable = tables.get(query.from)
  if (!baseTable) {
    return { rows: [], schema: { name: '__lookup__', displayName: 'ルックアップ', columns: [] } }
  }

  // Build merged column list: base columns + expanded lookup columns (readonly)
  const columns: ColumnDef[] = [...baseSchema.columns]

  for (const lookup of query.lookups) {
    const refSchema = schemas.get(lookup.from)
    if (!refSchema) continue
    for (const field of lookup.fields) {
      const refCol = refSchema.columns.find((c) => c.key === field)
      if (!refCol) continue
      columns.push({
        ...refCol,
        key: `${lookup.as}.${field}`,
        displayName: `${lookup.as}.${refCol.displayName}`,
        readonly: true,
      })
    }
  }

  // Build rows
  let baseRows = [...baseTable.values()].sort(
    (a, b) => (a._order as number) - (b._order as number)
  )
  if (query.filter) {
    baseRows = applyFilter(baseRows, query.filter)
  }

  const rows: Row[] = baseRows.map((row) => {
    const merged: Row = { ...row }
    const sources: Record<string, unknown> = { [query.from]: row._id }

    for (const lookup of query.lookups) {
      const refId = row[lookup.column] as string | undefined
      const refTable = tables.get(lookup.from)
      const refRow = refId ? refTable?.get(refId) : undefined

      sources[lookup.from] = refId ?? null

      for (const field of lookup.fields) {
        merged[`${lookup.as}.${field}`] = refRow ? refRow[field] : null
      }
    }

    merged._sources = sources
    return merged
  })

  const schema: TableSchema = {
    name: '__lookup__',
    displayName: `${baseSchema.displayName} (ルックアップ)`,
    columns,
  }

  return { rows, schema }
}
