import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project.store';
import { useSelectionStore } from '@/stores/selection.store';
import type { Row } from '@/types/row';
import type { ColumnDef } from '@/types/schema';
import { useCallback, useEffect, useState } from 'react';

export default function JsonEditorPanel() {
  const jsonPanelCell = useSelectionStore((s) => s.jsonPanelCell);
  const setJsonPanelCell = useSelectionStore((s) => s.setJsonPanelCell);
  const { tables, schemas, updateCell } = useProjectStore();

  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const row: Row | undefined = jsonPanelCell
    ? tables.get(jsonPanelCell.tableName)?.get(jsonPanelCell.rowId)
    : undefined;
  const col: ColumnDef | undefined = jsonPanelCell
    ? schemas.get(jsonPanelCell.tableName)?.columns.find((c) => c.key === jsonPanelCell.colKey)
    : undefined;

  const close = useCallback(() => {
    setJsonPanelCell(null);
    setError(null);
  }, [setJsonPanelCell]);

  useEffect(() => {
    if (!jsonPanelCell || !row || !col) {
      setEditValue('');
      return;
    }
    const val = row[col.key];
    try {
      setEditValue(val != null ? JSON.stringify(val, null, 2) : '');
    } catch {
      setEditValue('');
    }
    setError(null);
  }, [jsonPanelCell, row, col]);

  if (!jsonPanelCell || !row || !col) return null;

  const handleSave = () => {
    if (!jsonPanelCell) return;
    const trimmed = editValue.trim();
    if (trimmed === '') {
      updateCell(jsonPanelCell.tableName, jsonPanelCell.rowId, col.key, null);
      close();
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      updateCell(jsonPanelCell.tableName, jsonPanelCell.rowId, col.key, parsed);
      setError(null);
      close();
    } catch (e) {
      setError(e instanceof SyntaxError ? e.message : 'Invalid JSON');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <aside className="w-[300px] border-l flex flex-col shrink-0 bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-semibold truncate">JSON 編集: {col.displayName}</span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-sm px-1"
          onClick={close}
        >
          ✕
        </button>
      </div>

      {/* Cell info */}
      <div className="px-3 py-1.5 border-b text-xs text-muted-foreground">{row._id as string}</div>

      {/* Editor */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        <textarea
          className={cn(
            'flex-1 w-full min-h-[200px] font-mono text-xs border rounded p-2 focus:outline-none focus:ring-1 focus:ring-ring resize-y',
            error && 'border-destructive focus:ring-destructive'
          )}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder='Enter JSON, e.g. {"key": "value"}'
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t flex justify-end gap-2">
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={close}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm hover:opacity-90"
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </aside>
  );
}
