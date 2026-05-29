import type { Row } from '@/types/row';
import type { ColumnDef, TableSchema } from '@/types/schema';
import type { SelectQuery } from '@/types/view';
import { applyFilter, applySort } from './filter';

/**
 * SelectQuery を評価する。filter（joins 無し）と lookup（joins 有り）を統合した変換。
 * - joins 無し: ベース表の実スキーマをそのまま返し、行は素のベース行（編集はベース表へ直接）。
 * - joins 有り: 参照先フィールドを `${as}.${field}` の readonly 列として展開し、各行に _sources を付与。
 */
export function applySelect(
  query: SelectQuery,
  tables: Map<string, Map<string, Row>>,
  schemas: Map<string, TableSchema>
): { rows: Row[]; schema: TableSchema } {
  const baseSchema = schemas.get(query.from);
  const baseTable = tables.get(query.from);
  if (!baseSchema || !baseTable) {
    return { rows: [], schema: { name: query.from, displayName: query.from, columns: [] } };
  }

  let baseRows = [...baseTable.values()].sort(
    (a, b) => (a._order as number) - (b._order as number)
  );
  baseRows = applyFilter(baseRows, query.filter);
  baseRows = applySort(baseRows, query.sort);

  const joins = query.joins ?? [];
  if (joins.length === 0) {
    // filter 相当: 実スキーマ・素のベース行をそのまま返す
    return { rows: baseRows, schema: baseSchema };
  }

  // lookup 相当: 参照先フィールドを展開
  const columns: ColumnDef[] = [...baseSchema.columns];
  for (const join of joins) {
    const refSchema = schemas.get(join.from);
    if (!refSchema) continue;
    for (const field of join.fields) {
      const refCol = refSchema.columns.find((c) => c.key === field);
      if (!refCol) continue;
      columns.push({
        ...refCol,
        key: `${join.as}.${field}`,
        displayName: `${join.as}.${refCol.displayName}`,
        readonly: true,
      });
    }
  }

  const rows: Row[] = baseRows.map((row) => {
    const merged: Row = { ...row };
    const sources: Record<string, unknown> = { [query.from]: row._id };

    for (const join of joins) {
      const refId = row[join.column] as string | undefined;
      const refTable = tables.get(join.from);
      const refRow = refId ? refTable?.get(refId) : undefined;

      sources[join.from] = refId ?? null;

      for (const field of join.fields) {
        merged[`${join.as}.${field}`] = refRow ? refRow[field] : null;
      }
    }

    merged._sources = sources;
    return merged;
  });

  const schema: TableSchema = {
    name: '__select__',
    displayName: `${baseSchema.displayName} (ルックアップ)`,
    columns,
  };

  return { rows, schema };
}
