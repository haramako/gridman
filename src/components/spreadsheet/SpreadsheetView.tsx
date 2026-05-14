import ExportDialog from '@/components/export/ExportDialog';
import { getRowOwnerTable } from '@/lib/viewRowSource';
import { useProjectStore } from '@/stores/project.store';
import { useViewStore } from '@/stores/view.store';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { FilterViewQuery, LookupViewQuery, ViewDefinition } from '@/types/view';
import { useCallback, useState } from 'react';
import RowContextMenu from './RowContextMenu';
import type { ContextMenuEntry } from './RowContextMenu';
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
  const { addRow, addRowAfter, addRowBefore, deleteRow } = useProjectStore();
  const { filter, setFilter, setActiveViewId } = useViewStore();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(
    null
  );
  const [showExport, setShowExport] = useState(false);

  const viewQuery =
    activeView?.query.type === 'filter' ? (activeView.query as FilterViewQuery) : undefined;

  const isUnionView = activeView?.query.type === 'union';
  const isLookupView = activeView?.query.type === 'lookup';

  const viewIcon = isUnionView ? '⊕' : isLookupView ? '🔎' : '🔍';

  const visibleColumnKeys = viewQuery?.columns ?? null;

  const handleRowContextMenu = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  }, []);

  const contextMenuItems = useCallback((): ContextMenuEntry[] => {
    if (!contextMenu) return [];
    const { rowId } = contextMenu;
    const targetRowId = rowId;

    const getSourceTable = (id: string) => {
      const row = rows.get(id);
      if (isUnionView) return getRowOwnerTable(row, tableName, 'union');
      if (isLookupView && activeView) {
        const fromTable = (activeView.query as LookupViewQuery).from;
        return getRowOwnerTable(row, tableName, 'lookup', fromTable);
      }
      return tableName;
    };

    const idsToDelete =
      selectedRowIds.has(targetRowId) && selectedRowIds.size > 1
        ? [...selectedRowIds]
        : [targetRowId];

    const items: ContextMenuEntry[] = [];

    if (!isUnionView && !isLookupView && !readOnly) {
      items.push({
        label: '上に行を追加',
        onClick: () => addRowBefore(tableName, targetRowId),
      });
      items.push({
        label: '下に行を追加',
        onClick: () => addRowAfter(tableName, targetRowId),
      });
      items.push({ separator: true });
    }

    items.push({
      label: idsToDelete.length > 1 ? `${idsToDelete.length} 行を削除` : '行を削除',
      danger: true,
      disabled: readOnly,
      onClick: () => {
        for (const id of idsToDelete) deleteRow(getSourceTable(id), id);
        setSelectedRowIds(new Set());
      },
    });

    return items;
  }, [
    contextMenu,
    selectedRowIds,
    rows,
    tableName,
    isUnionView,
    isLookupView,
    activeView,
    readOnly,
    addRowBefore,
    addRowAfter,
    deleteRow,
  ]);

  const handleDeleteRow = () => {
    if (selectedRowIds.size === 0) return;
    const ids = [...selectedRowIds];
    for (const rowId of ids) {
      let sourceTable = tableName;
      if (isUnionView) {
        sourceTable = getRowOwnerTable(rows.get(rowId), tableName, 'union');
      } else if (isLookupView) {
        const fromTable = (activeView?.query as LookupViewQuery).from;
        sourceTable = getRowOwnerTable(rows.get(rowId), tableName, 'lookup', fromTable);
      }
      deleteRow(sourceTable, rowId);
    }
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
        <span className="text-xs text-muted-foreground">
          {rows.size} 行{selectedRowIds.size > 0 && ` (${selectedRowIds.size} 選択中)`}
        </span>
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={() => setShowExport(true)}
        >
          エクスポート
        </button>
      </div>

      {/* Grid */}
      <SpreadsheetGrid
        key={tableName}
        tableName={tableName}
        schema={schema}
        rows={rows}
        filter={filter}
        sortDefs={viewQuery?.sort}
        visibleColumnKeys={visibleColumnKeys}
        selectedRowIds={selectedRowIds}
        onSelectRow={(id: string) => setSelectedRowIds(new Set([id]))}
        onSelectRows={(ids: string[]) => setSelectedRowIds(new Set(ids))}
        onClearSelection={() => setSelectedRowIds(new Set())}
        onRowContextMenu={handleRowContextMenu}
        readOnly={readOnly}
      />

      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showExport && (
        <ExportDialog
          tableName={tableName}
          schema={schema}
          rows={rows}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
