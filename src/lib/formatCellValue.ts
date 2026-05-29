import type { Row } from '@/types/row';
import type { ColumnDef, TableSchema } from '@/types/schema';

const TRUNCATE_LIMIT = 40;

/** ref / ref[] の ID を参照先テーブルの表示名カラムで解決する。解決できなければ ID をそのまま返す。 */
function resolveRefName(
  id: string,
  refTable: string,
  schemas: Map<string, TableSchema>,
  tables: Map<string, Map<string, Row>>
): string {
  const table = tables.get(refTable);
  const schema = schemas.get(refTable);
  const displayCol = schema?.columns.find((c) => c.isDisplayName);
  const refRow = table?.get(id);
  if (refRow && displayCol) return String(refRow[displayCol.key] ?? id);
  return id;
}

/**
 * セルの生値を表示用文字列に整形する。グリッド（Cell）とカードビュー（PageView）で共通利用する。
 * 編集用の生値ではなく「表示専用」の文字列を返す点に注意（ref は表示名、json は `[JSON]` 等）。
 */
export function formatCellValue(
  row: Row,
  col: ColumnDef,
  schemas: Map<string, TableSchema>,
  tables: Map<string, Map<string, Row>>
): string {
  const rawValue = row[col.key];

  switch (col.type) {
    case 'ref':
      if (col.refTable && rawValue != null) {
        return resolveRefName(String(rawValue), col.refTable, schemas, tables);
      }
      break;
    case 'ref[]':
      if (col.refTable) {
        const ids = (rawValue as string[]) ?? [];
        return ids
          .map((id) => resolveRefName(id, col.refTable as string, schemas, tables))
          .join(', ');
      }
      break;
    case 'json':
      return rawValue != null ? '[JSON]' : '';
    case 'boolean':
      return rawValue ? 'true' : 'false';
    case 'text': {
      const s = String(rawValue ?? '');
      return s.length > TRUNCATE_LIMIT ? `${s.slice(0, TRUNCATE_LIMIT)}…` : s;
    }
  }

  return rawValue != null ? String(rawValue) : '';
}
