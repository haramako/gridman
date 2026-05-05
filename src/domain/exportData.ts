import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';

export function exportToJson(rows: Row[], schema: TableSchema): string {
  const keys = schema.columns.map((c) => c.key);
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = { _id: row._id };
    for (const key of keys) {
      obj[key] = row[key] ?? null;
    }
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(rows: Row[], schema: TableSchema): string {
  const columns = schema.columns;
  const header = columns.map((c) => escapeCell(c.displayName)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}
