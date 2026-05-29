import { coerceToType, validateCell } from '@/domain/validator';
import { COLUMN_TYPE_CONFIG } from '@/lib/columnTypeConfig';
import { resolveEnumValues } from '@/lib/enum-resolver';
import { formatCellValue } from '@/lib/formatCellValue';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project.store';
import { useSelectionStore } from '@/stores/selection.store';
import type { Row } from '@/types/row';
import type { ColumnDef } from '@/types/schema';
import type { TableSchema } from '@/types/schema';
import type { ProjectConfig } from '@/types/view';
import { useEffect, useRef, useState } from 'react';
import { useGridContext } from './SpreadsheetGrid';

interface Props {
  row: Row;
  col: ColumnDef;
  colIndex: number;
  gridRowIndex: number;
  tableName: string;
  schemas: Map<string, TableSchema>;
  tables: Map<string, Map<string, Row>>;
  project: ProjectConfig | null;
  readOnly?: boolean;
}

export default function Cell({
  row,
  col,
  colIndex,
  gridRowIndex,
  tableName,
  schemas,
  tables,
  project,
  readOnly,
}: Props) {
  const {
    cursor,
    editingCell,
    editInitialValue,
    setCursor,
    setEditing,
    clearEditInitialValue,
    setJsonPanelCell,
  } = useSelectionStore();
  const { updateCell, dirtyRowIds, dirtyCellIds } = useProjectStore();
  const resolvedEnumValues = resolveEnumValues(col, project);
  const { navigate, selectionBounds, focusContainer, onCellMouseDown } = useGridContext();
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const committedRef = useRef(false);

  const rowId = row._id as string;
  const isSelected = cursor?.rowId === rowId && cursor?.colKey === col.key;
  const isEditing = editingCell?.rowId === rowId && editingCell?.colKey === col.key;
  const isDirty =
    dirtyCellIds.get(tableName)?.get(rowId)?.has(col.key) ??
    dirtyRowIds.get(tableName)?.has(rowId) ??
    false;
  const isInvalid = row._invalid?.[col.key] !== undefined;

  // Check if this cell is inside a multi-cell selection range
  const isInRange =
    selectionBounds !== null &&
    gridRowIndex >= selectionBounds.minRow &&
    gridRowIndex <= selectionBounds.maxRow &&
    colIndex >= selectionBounds.minCol &&
    colIndex <= selectionBounds.maxCol;

  const displayValue = isInvalid
    ? String(row._invalid?.[col.key] ?? '')
    : formatCellValue(row, col, schemas, tables);

  const currentEditValue = isInvalid
    ? String(row._invalid?.[col.key] ?? '')
    : String(row[col.key] ?? '');

  const [editValue, setEditValue] = useState(currentEditValue);

  useEffect(() => {
    if (isEditing) {
      committedRef.current = false;
      if (editInitialValue !== null) {
        setEditValue(editInitialValue);
        clearEditInitialValue();
      } else {
        setEditValue(currentEditValue);
      }
      setTimeout(() => {
        const input = inputRef.current;
        if (input instanceof HTMLInputElement) {
          input.focus();
          // For type-to-edit the cursor ends up at end automatically;
          // for normal edit we also put cursor at end
          input.setSelectionRange(input.value.length, input.value.length);
        } else {
          input?.focus();
        }
      }, 0);
    }
  }, [isEditing, editInitialValue, clearEditInitialValue, currentEditValue]);

  const errorMessage = isInvalid
    ? validateCell(coerceToType(row._invalid?.[col.key], col.type), col)?.message
    : null;

  const commitEdit = (val: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    updateCell(tableName, rowId, col.key, val);
    setEditing(null);
  };

  const cancelEdit = () => {
    committedRef.current = true; // prevent onBlur from committing
    setEditing(null);
    focusContainer();
  };

  const startEdit = () => {
    if (COLUMN_TYPE_CONFIG[col.type].gridReadonly || col.readonly) return;
    setCursor({ rowId, colKey: col.key, tableName });
    setEditing({ rowId, colKey: col.key, tableName });
  };

  // boolean: click to toggle
  if (col.type === 'boolean') {
    return (
      <td
        data-row-id={rowId}
        data-col-key={col.key}
        className={cn(
          'border-b border-r px-2 py-0.5 cursor-pointer select-none',
          isDirty && !isInvalid && 'bg-yellow-50',
          isInvalid && 'ring-1 ring-inset ring-red-400',
          isInRange && 'bg-blue-100',
          isSelected && 'ring-2 ring-inset ring-blue-400',
          readOnly && 'cursor-default opacity-80'
        )}
        onMouseDown={(e) => onCellMouseDown(e, { rowId, colKey: col.key, tableName })}
        onClick={() => {
          if (readOnly) return;
          updateCell(tableName, rowId, col.key, !row[col.key]);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (readOnly) return;
            updateCell(tableName, rowId, col.key, !row[col.key]);
          }
        }}
      >
        <span className="text-base leading-none">{row[col.key] ? '✓' : ''}</span>
      </td>
    );
  }

  // readonly types (json, text, or explicitly readonly columns e.g. lookup expansions)
  if (COLUMN_TYPE_CONFIG[col.type].gridReadonly || col.readonly) {
    const isJsonClickable = col.type === 'json';
    return (
      <td
        data-row-id={rowId}
        data-col-key={col.key}
        className={cn(
          'border-b border-r px-2 py-0.5 text-muted-foreground whitespace-nowrap',
          isInRange && 'bg-blue-100',
          isSelected && 'ring-2 ring-inset ring-blue-400',
          isJsonClickable && 'cursor-pointer hover:bg-accent'
        )}
        onMouseDown={(e) => onCellMouseDown(e, { rowId, colKey: col.key, tableName })}
        onClick={() => {
          if (isJsonClickable) {
            setJsonPanelCell({ rowId, colKey: col.key, tableName });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isJsonClickable) {
              setJsonPanelCell({ rowId, colKey: col.key, tableName });
            }
          }
        }}
      >
        {displayValue}
      </td>
    );
  }

  if (isEditing) {
    if (col.type === 'enum' && resolvedEnumValues) {
      return (
        <td data-row-id={rowId} data-col-key={col.key} className="border-b border-r p-0">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full h-full px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              commitEdit(editValue);
              focusContainer();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                commitEdit(editValue);
                navigate(rowId, col.key, 1, 0);
              }
              if (e.key === 'Escape') cancelEdit();
              if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                commitEdit(editValue);
                if (e.shiftKey) navigate(rowId, col.key, 0, -1);
                else navigate(rowId, col.key, 0, 1);
              }
            }}
          >
            <option value="">-</option>
            {resolvedEnumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      );
    }

    if (col.type === 'ref' && col.refTable) {
      const refTable = tables.get(col.refTable);
      const refSchema = schemas.get(col.refTable);
      const displayCol = refSchema?.columns.find((c) => c.isDisplayName);
      const refRows = refTable
        ? [...refTable.values()].sort((a, b) => (a._order as number) - (b._order as number))
        : [];

      return (
        <td data-row-id={rowId} data-col-key={col.key} className="border-b border-r p-0">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full h-full px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              commitEdit(editValue);
              focusContainer();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                commitEdit(editValue);
                navigate(rowId, col.key, 1, 0);
              }
              if (e.key === 'Escape') cancelEdit();
              if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                commitEdit(editValue);
                if (e.shiftKey) navigate(rowId, col.key, 0, -1);
                else navigate(rowId, col.key, 0, 1);
              }
            }}
          >
            <option value="">-</option>
            {refRows.map((r) => (
              <option key={r._id as string} value={r._id as string}>
                {displayCol ? String(r[displayCol.key] ?? r._id) : String(r._id)}
              </option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td data-row-id={rowId} data-col-key={col.key} className="border-b border-r p-0">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="w-full px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            commitEdit(editValue);
            focusContainer();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              commitEdit(editValue);
              navigate(rowId, col.key, 1, 0);
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelEdit();
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              e.stopPropagation();
              commitEdit(editValue);
              if (e.shiftKey) navigate(rowId, col.key, 0, -1);
              else navigate(rowId, col.key, 0, 1);
            }
          }}
        />
      </td>
    );
  }

  return (
    <td
      data-row-id={rowId}
      data-col-key={col.key}
      className={cn(
        'border-b border-r px-2 py-0.5 whitespace-nowrap select-none overflow-hidden truncate',
        isDirty && !isInvalid && 'bg-yellow-50',
        isInvalid && 'ring-1 ring-inset ring-red-400 bg-red-50',
        isInRange && !isInvalid && 'bg-blue-100',
        isSelected && 'ring-2 ring-inset ring-blue-400',
        readOnly ? 'cursor-default opacity-80' : 'cursor-default'
      )}
      title={errorMessage ?? undefined}
      onMouseDown={(e) => onCellMouseDown(e, { rowId, colKey: col.key, tableName })}
      onDoubleClick={() => {
        if (!readOnly) startEdit();
      }}
    >
      {isInvalid && <span className="mr-1 text-red-500">⚠</span>}
      {displayValue}
    </td>
  );
}
