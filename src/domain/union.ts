import type { Row } from '@/types/row';
import type { ColumnDef, TableSchema } from '@/types/schema';
import type { UnionViewQuery } from '@/types/view';
import { applyFilter } from './filter';

export function applyUnion(
  query: UnionViewQuery,
  tables: Map<string, Map<string, Row>>,
  schemas: Map<string, TableSchema>
): { rows: Row[]; schema: TableSchema } {
  const orderedKeys: string[] = [];
  const columnDefs = new Map<string, ColumnDef>();

  for (const source of query.sources) {
    const srcSchema = schemas.get(source.from);
    if (!srcSchema) continue;
    const cols = source.columns
      ? srcSchema.columns.filter((c) => source.columns?.includes(c.key))
      : srcSchema.columns;
    for (const col of cols) {
      if (!columnDefs.has(col.key)) {
        orderedKeys.push(col.key);
        columnDefs.set(col.key, col);
      }
    }
  }

  const unionColumns = orderedKeys.map((key) => columnDefs.get(key)!);

  const rows: Row[] = [];
  for (const source of query.sources) {
    const table = tables.get(source.from);
    if (!table) continue;
    let sourceRows = [...table.values()].sort(
      (a, b) => (a._order as number) - (b._order as number)
    );
    if (source.filter) {
      sourceRows = applyFilter(sourceRows, source.filter);
    }
    for (const row of sourceRows) {
      rows.push({ ...row, _source: source.from });
    }
  }

  const schema: TableSchema = {
    name: '__union__',
    displayName: 'ユニオン',
    columns: unionColumns,
  };

  return { rows, schema };
}
