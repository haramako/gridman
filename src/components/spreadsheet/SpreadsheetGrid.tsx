import { createContext, useContext, useMemo, useState, useRef, useCallback } from 'react'
import { useProjectStore } from '@/stores/project.store'
import { useSelectionStore } from '@/stores/selection.store'
import { applySort } from '@/domain/filter'
import DataRow from './DataRow'
import { useColumnResize } from './useColumnResize'
import { useVirtualScroll } from './useVirtualScroll'
import { useKeyboardNavigation } from './useKeyboardNavigation'
import { COLUMN_TYPE_CONFIG } from '@/lib/columnTypeConfig'
import type { TableSchema, ColumnDef } from '@/types/schema'
import type { Row } from '@/types/row'
import type { SelectionBounds, CellPosition } from '@/stores/selection.store'
import type { SortDef } from '@/types/view'

const ROW_NUM_WIDTH = 40;

// ---------------------------------------------------------------------------
// Grid context: shared with Cell components for navigation and selection range
// ---------------------------------------------------------------------------

type GridContextValue = {
  navigate: (fromRowId: string, fromColKey: string, dr: number, dc: number) => void
  selectionBounds: SelectionBounds | null
  focusContainer: () => void
  filteredRows: Row[]
  columns: ColumnDef[]
  readOnly: boolean
  onCellMouseDown: (e: React.MouseEvent, pos: CellPosition) => void
}

const GridContext = createContext<GridContextValue>({
  navigate: () => {},
  selectionBounds: null,
  focusContainer: () => {},
  filteredRows: [],
  columns: [],
  readOnly: false,
  onCellMouseDown: () => {},
})

export const useGridContext = () => useContext(GridContext);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  tableName: string;
  schema: TableSchema;
  rows: Map<string, Row>;
  filter: string;
  sortDefs?: SortDef[];
  visibleColumnKeys?: string[] | null;
  selectedRowIds: Set<string>;
  onSelectRow: (id: string) => void;
  onSelectRows: (ids: string[]) => void;
  onClearSelection: () => void;
  onRowContextMenu?: (e: React.MouseEvent, rowId: string) => void;
  readOnly?: boolean;
}

export default function SpreadsheetGrid({
  tableName,
  schema,
  rows,
  filter,
  sortDefs,
  visibleColumnKeys,
  selectedRowIds,
  onSelectRow,
  onSelectRows,
  onClearSelection,
  onRowContextMenu,
  readOnly,
}: Props) {
  const { schemas, tables, updateCell, project } = useProjectStore();
  const { cursor, anchorCell, setCursor, extendCursor, setEditing, startEditWithInput } =
    useSelectionStore();

  // Compute visible columns based on visibleColumnKeys
  const visibleColumns = useMemo(() => {
    if (!visibleColumnKeys) return schema.columns
    return schema.columns.filter((col) => visibleColumnKeys.includes(col.key))
  }, [schema.columns, visibleColumnKeys])

  const { colWidths, handleResizeMouseDown } = useColumnResize(visibleColumns, schema.columns)

  const [sort, setSort] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({
    col: null,
    dir: 'asc',
  });

  const handleHeaderClick = useCallback((colKey: string) => {
    setSort((prev) => {
      if (prev.col === colKey) {
        return { col: colKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { col: colKey, dir: 'asc' };
    });
  }, []);

  // Row drag selection state
  const dragStartRowIndex = useRef<number | null>(null);
  const dragCurrentRowIndex = useRef<number | null>(null);

  const totalWidth = ROW_NUM_WIDTH + colWidths.reduce((sum, w) => sum + w, 0);


  const sortedRows = useMemo(() => {
    const arr = [...rows.values()];
    if (sortDefs && sortDefs.length > 0) return applySort(arr, sortDefs);
    return arr.sort((a, b) => (a._order as number) - (b._order as number));
  }, [rows, sortDefs]);

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return sortedRows;
    const q = filter.toLowerCase();
    return sortedRows.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q)
      )
    );
  }, [sortedRows, filter]);

  // Row drag selection handlers
  const handleRowNumberMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      e.preventDefault();
      const row = filteredRows[rowIndex];
      if (!row) return;
      const rowId = row._id as string;

      // If Ctrl/Cmd key is pressed, add/remove from selection
      if (e.ctrlKey || e.metaKey) {
        if (selectedRowIds.has(rowId)) {
          const newIds = new Set(selectedRowIds);
          newIds.delete(rowId);
          onSelectRows([...newIds]);
        } else {
          onSelectRow(rowId);
        }
        return;
      }

      // Start drag selection
      dragStartRowIndex.current = rowIndex;
      dragCurrentRowIndex.current = rowIndex;
      onClearSelection();
      onSelectRow(rowId);

      const onMouseMove = (ev: MouseEvent) => {
        // Check if mouse is over a row number cell
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const rowCell = target?.closest('[data-row-index]');
        if (!rowCell) return;
        const idx = Number.parseInt(rowCell.getAttribute('data-row-index') || '', 10);
        if (isNaN(idx) || idx === dragCurrentRowIndex.current) return;
        dragCurrentRowIndex.current = idx;

        // Select all rows between start and current
        const start = Math.min(dragStartRowIndex.current!, idx);
        const end = Math.max(dragStartRowIndex.current!, idx);
        const ids: string[] = [];
        for (let i = start; i <= end; i++) {
          const r = filteredRows[i];
          if (r) ids.push(r._id as string);
        }
        onSelectRows(ids);
      };

      const onMouseUp = () => {
        dragStartRowIndex.current = null;
        dragCurrentRowIndex.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'default';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [filteredRows, selectedRowIds, onSelectRow, onSelectRows, onClearSelection]
  );

  const displayRows = useMemo(() => {
    if (!sort.col) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sort.col!];
      const bv = b[sort.col!];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sort]);

  const { containerRef, containerHeight, startIndex, endIndex, topPad, bottomPad, onScroll } =
    useVirtualScroll(displayRows.length)
  const visibleRows = displayRows.slice(startIndex, endIndex + 1);

  const { navigate, focusContainer, handleCellMouseDown, handleContainerKeyDown } =
    useKeyboardNavigation({
      filteredRows,
      displayRows,
      visibleColumns,
      tableName,
      containerRef,
      containerHeight,
      readOnly,
      cursor,
      setCursor,
      extendCursor,
      setEditing,
      startEditWithInput,
      updateCell,
      onSelectRows,
    })

  // ---------------------------------------------------------------------------
  // Selection bounds for range highlighting
  // ---------------------------------------------------------------------------

  const selectionBounds = useMemo<SelectionBounds | null>(() => {
    if (!cursor || !anchorCell) return null;
    if (cursor.rowId === anchorCell.rowId && cursor.colKey === anchorCell.colKey) return null;

    const cursorRowIdx = filteredRows.findIndex((r) => (r._id as string) === cursor.rowId)
    const anchorRowIdx = filteredRows.findIndex((r) => (r._id as string) === anchorCell.rowId)
    const cursorColIdx = visibleColumns.findIndex((c) => c.key === cursor.colKey)
    const anchorColIdx = visibleColumns.findIndex((c) => c.key === anchorCell.colKey)

    if (cursorRowIdx === -1 || anchorRowIdx === -1) return null;

    return {
      minRow: Math.min(cursorRowIdx, anchorRowIdx),
      maxRow: Math.max(cursorRowIdx, anchorRowIdx),
      minCol: Math.min(cursorColIdx, anchorColIdx),
      maxCol: Math.max(cursorColIdx, anchorColIdx),
    }
  }, [cursor, anchorCell, filteredRows, visibleColumns])

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const gridContextValue = useMemo<GridContextValue>(
    () => ({ navigate, selectionBounds, focusContainer, filteredRows, columns: visibleColumns, readOnly: readOnly ?? false, onCellMouseDown: handleCellMouseDown }),
    [navigate, selectionBounds, focusContainer, filteredRows, visibleColumns, readOnly, handleCellMouseDown]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Create a filtered schema with only visible columns for DataRow
  const visibleSchema = useMemo(() => ({
    ...schema,
    columns: visibleColumns,
  }), [schema, visibleColumns])

  return (
    <GridContext.Provider value={gridContextValue}>
      <div
        ref={containerRef}
        tabIndex={0}
        className="flex-1 overflow-auto outline-none"
        onScroll={onScroll}
        onKeyDown={handleContainerKeyDown}
      >
        <table
          className="border-collapse text-sm"
          style={{ tableLayout: 'fixed', width: totalWidth }}
        >
          <colgroup>
            <col style={{ width: ROW_NUM_WIDTH }} />
            {visibleColumns.map((col, i) => (
              <col key={col.key} style={{ width: colWidths[i] }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground text-center select-none overflow-hidden">
                #
              </th>
              {visibleColumns.map((col, i) => (
                <th
                  key={col.key}
                  className="border-b border-r bg-muted px-2 py-1 text-left font-medium text-muted-foreground select-none overflow-hidden relative cursor-pointer hover:bg-accent/50"
                  onClick={() => handleHeaderClick(col.key)}
                >
                  <span className="mr-1 opacity-60">{COLUMN_TYPE_CONFIG[col.type].icon}</span>
                  <span className="truncate">{col.displayName}</span>
                  {sort.col === col.key && (
                    <span className="ml-1 opacity-80">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                  )}
                  <div
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 hover:opacity-60"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeMouseDown(e, i);
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topPad > 0 && (
              <tr style={{ height: topPad }}>
                <td colSpan={visibleColumns.length + 1} />
              </tr>
            )}
            {visibleRows.length > 0 ? (
              visibleRows.map((row, i) => (
                <DataRow
                  key={row._id as string}
                  row={row}
                  rowIndex={startIndex + i + 1}
                  gridRowIndex={startIndex + i}
                  tableName={tableName}
                  schema={visibleSchema}
                  schemas={schemas}
                  tables={tables}
                  project={project}
                  isSelected={selectedRowIds.has(row._id as string)}
                  onSelect={() => {
                    const rowId = row._id as string;
                    if (selectedRowIds.has(rowId)) {
                      const newIds = new Set(selectedRowIds);
                      newIds.delete(rowId);
                      onSelectRows([...newIds]);
                    } else {
                      onSelectRow(rowId);
                    }
                  }}
                  onRowNumberMouseDown={handleRowNumberMouseDown}
                  onRowContextMenu={onRowContextMenu}
                  readOnly={readOnly}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  {filter ? 'フィルター結果なし' : '行がありません'}
                </td>
              </tr>
            )}
            {bottomPad > 0 && (
              <tr style={{ height: bottomPad }}>
                <td colSpan={visibleColumns.length + 1} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GridContext.Provider>
  );
}
