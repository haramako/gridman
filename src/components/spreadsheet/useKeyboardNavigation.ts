import { COLUMN_TYPE_CONFIG } from '@/lib/columnTypeConfig';
import { useSelectionStore } from '@/stores/selection.store';
import type { CellPosition } from '@/stores/selection.store';
import type { Row } from '@/types/row';
import type { ColumnDef } from '@/types/schema';
import { useCallback, useEffect } from 'react';
import { ROW_HEIGHT } from './useVirtualScroll';

interface KeyboardNavigationProps {
  filteredRows: Row[];
  displayRows: Row[];
  visibleColumns: ColumnDef[];
  tableName: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerHeight: number;
  readOnly: boolean | undefined;
  cursor: CellPosition | null;
  setCursor: (pos: CellPosition) => void;
  extendCursor: (pos: CellPosition) => void;
  setEditing: (pos: CellPosition | null) => void;
  startEditWithInput: (pos: CellPosition, key: string) => void;
  updateCell: (tableName: string, rowId: string, colKey: string, value: unknown) => void;
  onSelectRows: (ids: string[]) => void;
}

export function useKeyboardNavigation({
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
}: KeyboardNavigationProps) {
  const findDataEdgeRow = useCallback(
    (startIdx: number, colKey: string, direction: 'up' | 'down'): number => {
      const step = direction === 'up' ? -1 : 1;
      const rows = filteredRows;
      let idx = startIdx + step;
      let lastDataIdx = startIdx;

      if (direction === 'down') {
        const currentHasData = rows[startIdx]?.[colKey] != null && rows[startIdx][colKey] !== '';
        if (currentHasData) {
          while (idx < rows.length) {
            const val = rows[idx][colKey];
            if (val == null || val === '') break;
            lastDataIdx = idx;
            idx += step;
          }
        } else {
          while (idx < rows.length) {
            const val = rows[idx][colKey];
            if (val != null && val !== '') {
              lastDataIdx = idx;
              break;
            }
            idx += step;
          }
        }
        if (lastDataIdx === startIdx && !currentHasData) {
          lastDataIdx = rows.length - 1;
        }
      } else {
        const currentHasData = rows[startIdx]?.[colKey] != null && rows[startIdx][colKey] !== '';
        if (currentHasData) {
          while (idx >= 0) {
            const val = rows[idx][colKey];
            if (val == null || val === '') break;
            lastDataIdx = idx;
            idx += step;
          }
        } else {
          while (idx >= 0) {
            const val = rows[idx][colKey];
            if (val != null && val !== '') {
              lastDataIdx = idx;
              break;
            }
            idx += step;
          }
        }
        if (lastDataIdx === startIdx && !currentHasData) {
          lastDataIdx = 0;
        }
      }

      return Math.max(0, Math.min(rows.length - 1, lastDataIdx));
    },
    [filteredRows]
  );

  const findDataEdgeCol = useCallback(
    (row: Row, startColKey: string, direction: 'left' | 'right'): string => {
      const cols = visibleColumns;
      const startIdx = cols.findIndex((c) => c.key === startColKey);
      if (startIdx === -1) return startColKey;

      const step = direction === 'left' ? -1 : 1;
      let idx = startIdx + step;
      let lastDataKey = startColKey;
      const currentHasData = row[startColKey] != null && row[startColKey] !== '';

      if (direction === 'right') {
        if (currentHasData) {
          while (idx < cols.length) {
            const val = row[cols[idx].key];
            if (val == null || val === '') break;
            lastDataKey = cols[idx].key;
            idx += step;
          }
        } else {
          while (idx < cols.length) {
            const val = row[cols[idx].key];
            if (val != null && val !== '') {
              lastDataKey = cols[idx].key;
              break;
            }
            idx += step;
          }
        }
        if (lastDataKey === startColKey && !currentHasData && idx >= cols.length) {
          lastDataKey = cols[cols.length - 1].key;
        }
      } else {
        if (currentHasData) {
          while (idx >= 0) {
            const val = row[cols[idx].key];
            if (val == null || val === '') break;
            lastDataKey = cols[idx].key;
            idx += step;
          }
        } else {
          while (idx >= 0) {
            const val = row[cols[idx].key];
            if (val != null && val !== '') {
              lastDataKey = cols[idx].key;
              break;
            }
            idx += step;
          }
        }
        if (lastDataKey === startColKey && !currentHasData && idx < 0) {
          lastDataKey = cols[0].key;
        }
      }

      return lastDataKey;
    },
    [visibleColumns]
  );

  const focusContainer = useCallback(() => {
    containerRef.current?.focus();
  }, [containerRef]);

  const navigate = useCallback(
    (fromRowId: string, fromColKey: string, dr: number, dc: number) => {
      if (filteredRows.length === 0) return;
      const rowIdx = filteredRows.findIndex((r) => (r._id as string) === fromRowId);
      const colIdx = visibleColumns.findIndex((c) => c.key === fromColKey);

      const newRowIdx = Math.max(0, Math.min(filteredRows.length - 1, rowIdx + dr));
      const newColIdx = Math.max(0, Math.min(visibleColumns.length - 1, colIdx + dc));

      const newRow = filteredRows[newRowIdx];
      const newCol = visibleColumns[newColIdx];
      const navSources = newRow._sources as Record<string, unknown> | undefined;
      const rowTableName =
        (newRow._source as string) ??
        (navSources ? Object.keys(navSources)[0] : undefined) ??
        tableName;

      setCursor({ rowId: newRow._id as string, colKey: newCol.key, tableName: rowTableName });
      setEditing(null);
      containerRef.current?.focus();
    },
    [filteredRows, visibleColumns, tableName, setCursor, setEditing, containerRef]
  );

  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, pos: CellPosition) => {
      if (e.button !== 0) return;
      if (e.shiftKey) {
        extendCursor(pos);
      } else {
        setCursor(pos);
      }
      focusContainer();
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev: MouseEvent) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const td = el?.closest('[data-row-id]') as HTMLElement | null;
        if (!td) return;
        const rowId = td.getAttribute('data-row-id');
        const colKey = td.getAttribute('data-col-key');
        if (!rowId || !colKey) return;
        extendCursor({ rowId, colKey, tableName: pos.tableName });
      };

      const onMouseUp = () => {
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [setCursor, extendCursor, focusContainer]
  );

  // Scroll to keep cursor row visible after navigation
  useEffect(() => {
    if (!cursor) return;
    const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cursor.rowId);
    if (rowIdx === -1) return;
    const el = containerRef.current;
    if (!el) return;
    const rowTop = rowIdx * ROW_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    const theadHeight = 34;
    const visibleTop = el.scrollTop;
    const visibleBottom = el.scrollTop + el.clientHeight - theadHeight;
    if (rowTop < visibleTop) {
      el.scrollTop = rowTop;
    } else if (rowBottom > visibleBottom) {
      el.scrollTop = rowBottom - (el.clientHeight - theadHeight);
    }
  }, [cursor, filteredRows, containerRef]);

  const handleCopy = useCallback(async () => {
    const { cursor: cur, anchorCell: anchor } = useSelectionStore.getState();
    if (!cur) return;

    const cursorRowIdx = displayRows.findIndex((r) => (r._id as string) === cur.rowId);
    const cursorColIdx = visibleColumns.findIndex((c) => c.key === cur.colKey);
    if (cursorRowIdx === -1 || cursorColIdx === -1) return;

    let minRow = cursorRowIdx;
    let maxRow = cursorRowIdx;
    let minCol = cursorColIdx;
    let maxCol = cursorColIdx;

    if (anchor && (anchor.rowId !== cur.rowId || anchor.colKey !== cur.colKey)) {
      const anchorRowIdx = displayRows.findIndex((r) => (r._id as string) === anchor.rowId);
      const anchorColIdx = visibleColumns.findIndex((c) => c.key === anchor.colKey);
      if (anchorRowIdx !== -1 && anchorColIdx !== -1) {
        minRow = Math.min(cursorRowIdx, anchorRowIdx);
        maxRow = Math.max(cursorRowIdx, anchorRowIdx);
        minCol = Math.min(cursorColIdx, anchorColIdx);
        maxCol = Math.max(cursorColIdx, anchorColIdx);
      }
    }

    const lines: string[] = [];
    for (let ri = minRow; ri <= maxRow; ri++) {
      const row = displayRows[ri];
      const cells: string[] = [];
      for (let ci = minCol; ci <= maxCol; ci++) {
        const col = visibleColumns[ci];
        const rawVal = row._invalid?.[col.key] !== undefined ? row._invalid[col.key] : row[col.key];
        cells.push(rawVal === null || rawVal === undefined ? '' : String(rawVal));
      }
      lines.push(cells.join('\t'));
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      // clipboard access denied
    }
  }, [displayRows, visibleColumns]);

  const applyPastedText = useCallback(
    (text: string) => {
      if (readOnly) return;
      const { cursor: cur } = useSelectionStore.getState();
      if (!cur) return;

      const cursorRowIdx = displayRows.findIndex((r) => (r._id as string) === cur.rowId);
      const cursorColIdx = visibleColumns.findIndex((c) => c.key === cur.colKey);
      if (cursorRowIdx === -1 || cursorColIdx === -1) return;

      const lines = text.split('\n');
      if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

      for (let ri = 0; ri < lines.length; ri++) {
        const rowIdx = cursorRowIdx + ri;
        if (rowIdx >= displayRows.length) break;

        const row = displayRows[rowIdx];
        const cells = lines[ri].split('\t');
        for (let ci = 0; ci < cells.length; ci++) {
          const colIdx = cursorColIdx + ci;
          if (colIdx >= visibleColumns.length) break;

          const col = visibleColumns[colIdx];
          if (COLUMN_TYPE_CONFIG[col.type].gridReadonly) continue;

          updateCell((row._source as string) ?? tableName, row._id as string, col.key, cells[ci]);
        }
      }
    },
    [readOnly, displayRows, visibleColumns, tableName, updateCell]
  );

  // Global paste listener
  useEffect(() => {
    const onDocumentPaste = (e: ClipboardEvent) => {
      const { cursor: cur, editingCell } = useSelectionStore.getState();
      if (!cur || editingCell) return;
      const activeEl = document.activeElement;
      if (
        activeEl &&
        activeEl !== document.body &&
        activeEl !== containerRef.current &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      )
        return;
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (text) applyPastedText(text);
    };
    document.addEventListener('paste', onDocumentPaste);
    return () => document.removeEventListener('paste', onDocumentPaste);
  }, [applyPastedText, containerRef]);

  const handleCut = useCallback(async () => {
    if (readOnly) return;

    const { cursor: cur, anchorCell: anchor } = useSelectionStore.getState();
    if (!cur) return;

    const cursorRowIdx = displayRows.findIndex((r) => (r._id as string) === cur.rowId);
    const cursorColIdx = visibleColumns.findIndex((c) => c.key === cur.colKey);
    if (cursorRowIdx === -1 || cursorColIdx === -1) return;

    let minRow = cursorRowIdx;
    let maxRow = cursorRowIdx;
    let minCol = cursorColIdx;
    let maxCol = cursorColIdx;

    if (anchor && (anchor.rowId !== cur.rowId || anchor.colKey !== cur.colKey)) {
      const anchorRowIdx = displayRows.findIndex((r) => (r._id as string) === anchor.rowId);
      const anchorColIdx = visibleColumns.findIndex((c) => c.key === anchor.colKey);
      if (anchorRowIdx !== -1 && anchorColIdx !== -1) {
        minRow = Math.min(cursorRowIdx, anchorRowIdx);
        maxRow = Math.max(cursorRowIdx, anchorRowIdx);
        minCol = Math.min(cursorColIdx, anchorColIdx);
        maxCol = Math.max(cursorColIdx, anchorColIdx);
      }
    }

    const lines: string[] = [];
    for (let ri = minRow; ri <= maxRow; ri++) {
      const row = displayRows[ri];
      const cells: string[] = [];
      for (let ci = minCol; ci <= maxCol; ci++) {
        const col = visibleColumns[ci];
        const rawVal = row._invalid?.[col.key] !== undefined ? row._invalid[col.key] : row[col.key];
        cells.push(rawVal === null || rawVal === undefined ? '' : String(rawVal));
      }
      lines.push(cells.join('\t'));
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      return;
    }

    for (let ri = minRow; ri <= maxRow; ri++) {
      const row = displayRows[ri];
      for (let ci = minCol; ci <= maxCol; ci++) {
        const col = visibleColumns[ci];
        const colCfg = COLUMN_TYPE_CONFIG[col.type];
        if (col.readonly || !colCfg.supportsKbdEdit) continue;
        updateCell(
          (row._source as string) ?? tableName,
          row._id as string,
          col.key,
          colCfg.emptyValue
        );
      }
    }
  }, [displayRows, visibleColumns, tableName, readOnly, updateCell]);

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const state = useSelectionStore.getState();
      const { cursor: cur, editingCell } = state;

      if (editingCell) return;
      if (!cur) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleCut();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId);

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'up');
              const edgeRow = filteredRows[edgeRowIdx];
              const navSources = edgeRow._sources as Record<string, unknown> | undefined;
              const rowTableName =
                (edgeRow._source as string) ??
                (navSources ? Object.keys(navSources)[0] : undefined) ??
                tableName;
              setCursor({
                rowId: edgeRow._id as string,
                colKey: cur.colKey,
                tableName: rowTableName,
              });
              setEditing(null);
              containerRef.current?.focus();
            }
            return;

          case 'ArrowDown':
            e.preventDefault();
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'down');
              const edgeRow = filteredRows[edgeRowIdx];
              const navSources = edgeRow._sources as Record<string, unknown> | undefined;
              const rowTableName =
                (edgeRow._source as string) ??
                (navSources ? Object.keys(navSources)[0] : undefined) ??
                tableName;
              setCursor({
                rowId: edgeRow._id as string,
                colKey: cur.colKey,
                tableName: rowTableName,
              });
              setEditing(null);
              containerRef.current?.focus();
            }
            return;

          case 'ArrowLeft':
            e.preventDefault();
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx];
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'left');
              setCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName });
              setEditing(null);
              containerRef.current?.focus();
            }
            return;

          case 'ArrowRight':
            e.preventDefault();
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx];
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'right');
              setCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName });
              setEditing(null);
              containerRef.current?.focus();
            }
            return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId);

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'up');
              extendCursor({
                rowId: filteredRows[edgeRowIdx]._id as string,
                colKey: cur.colKey,
                tableName: cur.tableName,
              });
            }
            return;

          case 'ArrowDown':
            e.preventDefault();
            if (rowIdx !== -1) {
              const edgeRowIdx = findDataEdgeRow(rowIdx, cur.colKey, 'down');
              extendCursor({
                rowId: filteredRows[edgeRowIdx]._id as string,
                colKey: cur.colKey,
                tableName: cur.tableName,
              });
            }
            return;

          case 'ArrowLeft':
            e.preventDefault();
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx];
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'left');
              extendCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName });
            }
            return;

          case 'ArrowRight':
            e.preventDefault();
            if (rowIdx !== -1) {
              const row = filteredRows[rowIdx];
              const edgeColKey = findDataEdgeCol(row, cur.colKey, 'right');
              extendCursor({ rowId: cur.rowId, colKey: edgeColKey, tableName: cur.tableName });
            }
            return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'a') {
        e.preventDefault();
        const allRowIds = filteredRows.map((row) => row._id as string);
        onSelectRows(allRowIds);
        if (filteredRows.length > 0 && visibleColumns.length > 0) {
          const firstRow = filteredRows[0];
          const lastRow = filteredRows[filteredRows.length - 1];
          const firstCol = visibleColumns[0];
          const lastCol = visibleColumns[visibleColumns.length - 1];
          setCursor({ rowId: firstRow._id as string, colKey: firstCol.key, tableName });
          extendCursor({ rowId: lastRow._id as string, colKey: lastCol.key, tableName });
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (e.shiftKey) {
            const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId);
            const newRowIdx = Math.max(0, rowIdx - 1);
            extendCursor({
              rowId: filteredRows[newRowIdx]._id as string,
              colKey: cur.colKey,
              tableName,
            });
          } else {
            navigate(cur.rowId, cur.colKey, -1, 0);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (e.shiftKey) {
            const rowIdx = filteredRows.findIndex((r) => (r._id as string) === cur.rowId);
            const newRowIdx = Math.min(filteredRows.length - 1, rowIdx + 1);
            extendCursor({
              rowId: filteredRows[newRowIdx]._id as string,
              colKey: cur.colKey,
              tableName,
            });
          } else {
            navigate(cur.rowId, cur.colKey, 1, 0);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            const colIdx = visibleColumns.findIndex((c) => c.key === cur.colKey);
            const newColIdx = Math.max(0, colIdx - 1);
            extendCursor({ rowId: cur.rowId, colKey: visibleColumns[newColIdx].key, tableName });
          } else {
            navigate(cur.rowId, cur.colKey, 0, -1);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            const colIdx = visibleColumns.findIndex((c) => c.key === cur.colKey);
            const newColIdx = Math.min(visibleColumns.length - 1, colIdx + 1);
            extendCursor({ rowId: cur.rowId, colKey: visibleColumns[newColIdx].key, tableName });
          } else {
            navigate(cur.rowId, cur.colKey, 0, 1);
          }
          break;

        case 'PageUp':
          e.preventDefault();
          navigate(cur.rowId, cur.colKey, -Math.floor(containerHeight / ROW_HEIGHT), 0);
          break;

        case 'PageDown':
          e.preventDefault();
          navigate(cur.rowId, cur.colKey, Math.floor(containerHeight / ROW_HEIGHT), 0);
          break;

        case 'Home':
          e.preventDefault();
          if (visibleColumns.length > 0) {
            setCursor({
              rowId: cur.rowId,
              colKey: visibleColumns[0].key,
              tableName: cur.tableName,
            });
          }
          break;

        case 'End':
          e.preventDefault();
          if (visibleColumns.length > 0) {
            setCursor({
              rowId: cur.rowId,
              colKey: visibleColumns[visibleColumns.length - 1].key,
              tableName: cur.tableName,
            });
          }
          break;

        case 'Delete':
        case 'Backspace': {
          if (readOnly) break;
          e.preventDefault();
          const colDef = visibleColumns.find((c) => c.key === cur.colKey);
          if (colDef && !colDef.readonly && COLUMN_TYPE_CONFIG[colDef.type].supportsKbdEdit) {
            updateCell(
              cur.tableName,
              cur.rowId,
              cur.colKey,
              COLUMN_TYPE_CONFIG[colDef.type].emptyValue
            );
          }
          break;
        }

        case 'Enter':
        case 'F2': {
          if (readOnly) break;
          e.preventDefault();
          const colDef = visibleColumns.find((c) => c.key === cur.colKey);
          if (colDef && !colDef.readonly && COLUMN_TYPE_CONFIG[colDef.type].supportsKbdEdit) {
            setEditing(cur);
          }
          break;
        }

        case 'Tab': {
          e.preventDefault();
          if (e.shiftKey) navigate(cur.rowId, cur.colKey, 0, -1);
          else navigate(cur.rowId, cur.colKey, 0, 1);
          break;
        }

        default:
          if (readOnly) break;
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const colDef = visibleColumns.find((c) => c.key === cur.colKey);
            if (colDef && !colDef.readonly && COLUMN_TYPE_CONFIG[colDef.type].supportsTypeToEdit) {
              startEditWithInput(cur, e.key);
            }
          }
      }
    },
    [
      filteredRows,
      visibleColumns,
      tableName,
      navigate,
      setCursor,
      extendCursor,
      setEditing,
      startEditWithInput,
      updateCell,
      handleCopy,
      handleCut,
      findDataEdgeRow,
      findDataEdgeCol,
      containerRef,
      containerHeight,
      readOnly,
      onSelectRows,
    ]
  );

  return { navigate, focusContainer, handleCellMouseDown, handleContainerKeyDown };
}
