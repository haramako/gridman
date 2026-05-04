import { exportToCsv, exportToJson } from '@/domain/exportData';
import { useProjectStore } from '@/stores/project.store';
import { useViewStore } from '@/stores/view.store';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { FilterViewQuery, LookupViewQuery, ViewDefinition } from '@/types/view';
import { useState } from 'react';
import SpreadsheetGrid from './SpreadsheetGrid';

interface Props {
  tableName: string;
  schema: TableSchema;
  rows: Map<string, Row>;
  activeView?: ViewDefinition;
  onEditView?: () => void;
  readOnly?: boolean;
}

export default function SpreadsheetView({
  tableName,
  schema,
  rows,
  activeView,
  onEditView,
  readOnly,
}: Props) {
  const { addRow, deleteRow } = useProjectStore();
  const { filter, setFilter, setActiveViewId } = useViewStore();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const viewQuery =
    activeView?.query.type === 'filter' ? (activeView.query as FilterViewQuery) : undefined;

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseName = schema.displayName ?? tableName;

  const handleExportJson = () => {
    const data = exportToJson([...rows.values()], schema);
    downloadFile(data, `${baseName}.json`, 'application/json');
  };

  const handleExportCsv = () => {
    const data = exportToCsv([...rows.values()], schema);
    downloadFile(data, `${baseName}.csv`, 'text/csv');
  };

  const isUnionView = activeView?.query.type === 'union';
  const isLookupView = activeView?.query.type === 'lookup';

  const viewIcon = isUnionView ? '⊕' : isLookupView ? '🔎' : '🔍';

  const handleDeleteRow = () => {
    if (selectedRowIds.size === 0) return;
    const ids = [...selectedRowIds];
    ids.forEach((rowId) => {
      let sourceTable = tableName;
      if (isUnionView) {
        sourceTable = (rows.get(rowId)?._source as string) ?? tableName;
      } else if (isLookupView) {
        const sources = rows.get(rowId)?._sources as Record<string, unknown> | undefined;
        const fromTable = (activeView!.query as LookupViewQuery).from;
        sourceTable = sources
          ? (sources[fromTable] as string)
            ? fromTable
            : tableName
          : tableName;
      }
      deleteRow(sourceTable, rowId);
    });
    setSelectedRowIds(new Set());
  };

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
            <span>
              {viewIcon} {activeView.name}
            </span>
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
        {!isUnionView && !isLookupView && (
          <button
            type="button"
            className="px-3 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
            disabled={readOnly}
            onClick={() => addRow(tableName)}
          >
            + 行追加
          </button>
        )}
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
          disabled={selectedRowIds.size === 0 || readOnly}
          onClick={handleDeleteRow}
        >
          − 行削除
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={handleExportJson}
          title="現在の行をJSONでエクスポート"
        >
          ↓ JSON
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={handleExportCsv}
          title="現在の行をCSVでエクスポート"
        >
          ↓ CSV
        </button>
        <span className="text-xs text-muted-foreground">
          {rows.size} 行{selectedRowIds.size > 0 && ` (${selectedRowIds.size} 選択中)`}
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
        selectedRowIds={selectedRowIds}
        onSelectRow={(id: string) => setSelectedRowIds(new Set([id]))}
        onSelectRows={(ids: string[]) => setSelectedRowIds(new Set(ids))}
        onClearSelection={() => setSelectedRowIds(new Set())}
        readOnly={readOnly}
      />
    </div>
  );
}
