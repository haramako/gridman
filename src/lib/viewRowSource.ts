import type { Row } from '@/types/row';

/**
 * Returns the effective table name for a row when rendering cells.
 * Union rows carry _source (the origin table); lookup rows carry _sources (tableName → rowId map).
 */
export function getEffectiveTableName(row: Row, fallback: string): string {
  if (row._source) return row._source as string;
  if (row._sources) {
    const keys = Object.keys(row._sources as Record<string, unknown>);
    if (keys.length > 0) return keys[0];
  }
  return fallback;
}

/**
 * Returns the table that owns a row for mutation purposes (e.g. delete).
 * viewType must be 'union' or 'lookup'. fromTable is required for lookup views.
 */
export function getRowOwnerTable(
  row: Row | undefined,
  fallback: string,
  viewType: 'union' | 'lookup',
  fromTable?: string
): string {
  if (!row) return fallback;
  if (viewType === 'union') return (row._source as string | undefined) ?? fallback;
  const sources = row._sources as Record<string, unknown> | undefined;
  if (sources && fromTable && sources[fromTable]) return fromTable;
  return fallback;
}
