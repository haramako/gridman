import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project.store';
import type { PageLayoutItem, PageTemplate } from '@/types/page';
import type { Row } from '@/types/row';
import type { ColumnDef } from '@/types/schema';
import type { TableSchema } from '@/types/schema';

interface Props {
  template: PageTemplate;
  row: Row;
  tableName: string;
  schema: TableSchema;
  schemas: Map<string, TableSchema>;
  tables: Map<string, Map<string, Row>>;
  currentIndex?: number;
  totalRows?: number;
  onNavigate?: (index: number) => void;
}

function getDisplayValue(
  row: Row,
  col: ColumnDef,
  schemas: Map<string, TableSchema>,
  tables: Map<string, Map<string, Row>>
): string {
  const rawValue = row[col.key];

  if (col.type === 'ref' && col.refTable) {
    const refTable = tables.get(col.refTable);
    const refSchema = schemas.get(col.refTable);
    const displayCol = refSchema?.columns.find((c) => c.isDisplayName);
    const refRow = refTable?.get(rawValue as string);
    if (refRow && displayCol) return String(refRow[displayCol.key] ?? '');
    return rawValue != null ? String(rawValue) : '';
  }

  if (col.type === 'json') return rawValue != null ? '[JSON]' : '';
  if (col.type === 'boolean') return rawValue ? 'true' : 'false';
  if (col.type === 'text' || col.type === 'string') {
    const s = String(rawValue ?? '');
    return s.length > 40 ? s.slice(0, 40) + '…' : s;
  }

  return rawValue != null ? String(rawValue) : '';
}

function getRefDisplayValue(
  row: Row,
  col: ColumnDef,
  schemas: Map<string, TableSchema>,
  tables: Map<string, Map<string, Row>>
): string {
  if (col.type === 'ref[]' && col.refTable) {
    const refTable = tables.get(col.refTable);
    const refSchema = schemas.get(col.refTable);
    const displayCol = refSchema?.columns.find((c) => c.isDisplayName);
    const ids = (row[col.key] as string[]) ?? [];
    return ids
      .map((id) => {
        const refRow = refTable?.get(id);
        return refRow && displayCol ? String(refRow[displayCol.key] ?? id) : id;
      })
      .join(', ');
  }
  return '';
}

export default function PageView({ template, row, tableName, schema, schemas, tables, currentIndex, totalRows, onNavigate }: Props) {
  const { updateCell } = useProjectStore();
  const rowId = row._id as string;

  const renderField = (item: Extract<PageLayoutItem, { type: 'field' }>, col: ColumnDef) => {
    const value = row[col.key];
    const isInvalid = row._invalid?.[col.key] !== undefined;
    const displayValue = isInvalid
      ? String(row._invalid![col.key] ?? '')
      : col.type === 'ref[]'
        ? getRefDisplayValue(row, col, schemas, tables)
        : getDisplayValue(row, col, schemas, tables);

    const handleChange = (newValue: unknown) => {
      updateCell(tableName, rowId, col.key, newValue);
    };

    switch (item.widget) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleChange(e.target.checked)}
            className="h-4 w-4"
          />
        );

      case 'select':
        if (col.enumValues) {
          return (
            <select
              value={String(value ?? '')}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-</option>
              {col.enumValues.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          );
        }
        break;

      case 'number':
        return (
          <input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        );

      case 'table':
        if (Array.isArray(value)) {
          const rows = (value as Record<string, unknown>[]) ?? [];
          const columns = item.columns ?? Object.keys(rows[0] ?? {});
          return (
            <div className="border rounded overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    {columns.map((colKey) => (
                      <th key={colKey} className="px-2 py-1 text-left font-medium">{colKey}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={Math.random()} className="border-t">
                      {columns.map((colKey) => (
                        <td key={colKey} className="px-2 py-1">{String(r[colKey] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        break;

      case 'tag-list':
        if (col.type === 'ref[]' && col.refTable) {
          const ids = (value as string[]) ?? [];
          return (
            <div className="flex flex-wrap gap-1">
              {ids.map((id) => {
                const refTable = tables.get(col.refTable!);
                const refSchema = schemas.get(col.refTable!);
                const displayCol = refSchema?.columns.find((c) => c.isDisplayName);
                const refRow = refTable?.get(id);
                const label = refRow && displayCol ? String(refRow[displayCol.key] ?? id) : id;
                return (
                  <span
                    key={id}
                    className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          );
        }
        break;

      case 'json':
        return (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(value, null, 2)}
          </pre>
        );
    }

    return (
      <input
        type="text"
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  };

  const renderItem = (item: PageLayoutItem, depth = 0): JSX.Element | null => {
    if (item.type === 'section') {
      return (
        <div key={JSON.stringify(item)} className={cn('space-y-2', depth === 0 && 'mt-4 first:mt-0')}>
          {item.label && (
            <h4 className="text-sm font-semibold text-foreground border-b pb-1">
              {item.label}
            </h4>
          )}
          <div className="space-y-3 pl-3">
            {item.children.map((child) => renderItem(child, depth + 1))}
          </div>
        </div>
      );
    }

    const col = schema.columns.find((c) => c.key === item.key);
    if (!col) return null;

    const isInvalid = row._invalid?.[col.key] !== undefined;

    return (
      <div key={item.key} className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {item.label ?? col.displayName}
        </label>
        <div className={cn(isInvalid && 'ring-1 ring-inset ring-red-400 rounded')}>
          {renderField(item as Extract<PageLayoutItem, { type: 'field' }>, col)}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Navigation header */}
      {totalRows !== undefined && totalRows > 1 && (
        <div className="mb-4 pb-3 border-b flex items-center justify-between">
          <button
            className="px-2 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
            disabled={currentIndex === 0}
            onClick={() => onNavigate?.(currentIndex! - 1)}
          >
            ← 前へ
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex !== undefined ? currentIndex + 1 : '-'} / {totalRows}
          </span>
          <button
            className="px-2 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
            disabled={currentIndex === totalRows - 1}
            onClick={() => onNavigate?.(currentIndex! + 1)}
          >
            次へ →
          </button>
        </div>
      )}

      <div className="mb-4 pb-3 border-b">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <p className="text-sm text-muted-foreground">
          {schema.displayName ?? template.table} - {rowId}
        </p>
      </div>
      <div className="space-y-4">{template.layout.map((item) => renderItem(item, 0))}</div>
    </div>
  );
}
