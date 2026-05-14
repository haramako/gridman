import type { ColumnDef, ColumnType, TableSchema, ValidationRule } from '@/types/schema';
import { useState } from 'react';
import { COLUMN_TYPE_CONFIG, COLUMN_TYPE_OPTIONS } from '@/lib/columnTypeConfig';
import DialogShell from '@/components/ui/DialogShell';
import DialogFooter from '@/components/ui/DialogFooter';

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

type EditingColumn = ColumnDef & { _tempId: string };

function colToEditing(col: ColumnDef): EditingColumn {
  return { ...col, _tempId: makeId() };
}

interface Props {
  tableName: string;
  schema: TableSchema;
  tables: string[];
  onSave: (schema: TableSchema) => void;
  onClose: () => void;
}

export default function SchemaEditorDialog({ tableName, schema, tables, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState(schema.displayName);
  const [columns, setColumns] = useState<EditingColumn[]>(() => schema.columns.map(colToEditing));

  const updateCol = (tempId: string, patch: Partial<EditingColumn>) => {
    setColumns((prev) => prev.map((c) => (c._tempId === tempId ? { ...c, ...patch } : c)));
  };

  const removeCol = (tempId: string) => {
    setColumns((prev) => prev.filter((c) => c._tempId !== tempId));
  };

  const addCol = () => {
    setColumns((prev) => [
      ...prev,
      { _tempId: makeId(), key: '', displayName: '', type: 'string' },
    ]);
  };

  const moveCol = (tempId: string, dir: -1 | 1) => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c._tempId === tempId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const updateValidation = (tempId: string, patch: Partial<ValidationRule>) => {
    setColumns((prev) =>
      prev.map((c) => {
        if (c._tempId !== tempId) return c;
        const v = { ...(c.validation ?? {}), ...patch };
        for (const k of Object.keys(v)) {
          if ((v as Record<string, unknown>)[k] === undefined)
            delete (v as Record<string, unknown>)[k];
        }
        return { ...c, validation: Object.keys(v).length > 0 ? v : undefined };
      })
    );
  };

  const canSave =
    displayName.trim() !== '' &&
    columns.every((c) => c.key.trim() !== '' && c.displayName.trim() !== '');

  const handleSave = () => {
    const cols: ColumnDef[] = columns.map(({ _tempId: _t, ...rest }) => {
      const col = { ...rest };
      if (!COLUMN_TYPE_CONFIG[col.type].hasEnumValues) {
        col.enumValues = undefined;
        col.enumRef = undefined;
      }
      if (!COLUMN_TYPE_CONFIG[col.type].hasRefTable) {
        col.refTable = undefined;
      }
      return col;
    });
    onSave({ name: tableName, displayName: displayName.trim(), columns: cols });
    onClose();
  };

  const footer = (
    <DialogFooter
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
    />
  );

  return (
    <DialogShell
      title={`スキーマ編集 — ${tableName}`}
      width="w-[680px]"
      maxHeight="max-h-[85vh]"
      onClose={onClose}
      footer={footer}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="schema-display-name" className="w-28 text-muted-foreground shrink-0">
          テーブル表示名
        </label>
        <input
          id="schema-display-name"
          className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">カラム</span>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={addCol}
          >
            + カラムを追加
          </button>
        </div>

        <div className="space-y-3">
          {columns.map((col, idx) => (
            <ColumnEditor
              key={col._tempId}
              col={col}
              idx={idx}
              total={columns.length}
              tables={tables}
              onUpdate={(patch) => updateCol(col._tempId, patch)}
              onUpdateValidation={(patch) => updateValidation(col._tempId, patch)}
              onRemove={() => removeCol(col._tempId)}
              onMove={(dir) => moveCol(col._tempId, dir)}
            />
          ))}
        </div>

        {columns.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">カラムがありません</p>
        )}
      </div>
    </DialogShell>
  );
}

interface ColumnEditorProps {
  col: EditingColumn;
  idx: number;
  total: number;
  tables: string[];
  onUpdate: (patch: Partial<EditingColumn>) => void;
  onUpdateValidation: (patch: Partial<ValidationRule>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function ColumnEditor({
  col,
  idx,
  total,
  tables,
  onUpdate,
  onUpdateValidation,
  onRemove,
  onMove,
}: ColumnEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const hasError = col.key.trim() === '' || col.displayName.trim() === '';

  return (
    <div className={`border rounded p-2 ${hasError ? 'border-destructive' : ''}`}>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs leading-none px-0.5 disabled:opacity-30"
            onClick={() => onMove(-1)}
            disabled={idx === 0}
            title="上へ"
          >
            ▲
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs leading-none px-0.5 disabled:opacity-30"
            onClick={() => onMove(1)}
            disabled={idx === total - 1}
            title="下へ"
          >
            ▼
          </button>
        </div>

        <input
          className="w-28 border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          value={col.key}
          onChange={(e) => onUpdate({ key: e.target.value })}
          placeholder="key"
          title="カラムキー"
          aria-label="カラムキー"
        />
        <input
          className="flex-1 border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={col.displayName}
          onChange={(e) => onUpdate({ displayName: e.target.value })}
          placeholder="表示名"
          title="表示名"
          aria-label="表示名"
        />
        <select
          className="border rounded px-1.5 py-0.5 text-xs focus:outline-none"
          value={col.type}
          onChange={(e) => onUpdate({ type: e.target.value as ColumnType })}
          title="型"
          aria-label="型"
        >
          {COLUMN_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs px-1"
          onClick={() => setExpanded((v) => !v)}
          title="詳細"
        >
          {expanded ? '▾' : '▸'}
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive text-xs px-1"
          onClick={onRemove}
          title="削除"
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div className="mt-2 pl-6 space-y-1.5 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={col.isDisplayName ?? false}
                onChange={(e) => onUpdate({ isDisplayName: e.target.checked || undefined })}
              />
              表示名カラム
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={col.readonly ?? false}
                onChange={(e) => onUpdate({ readonly: e.target.checked || undefined })}
              />
              読み取り専用
            </label>
          </div>

          {COLUMN_TYPE_CONFIG[col.type].hasEnumValues && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`enum-ref-${col._tempId}`}
                  className="w-20 text-muted-foreground shrink-0"
                >
                  enumRef
                </label>
                <input
                  id={`enum-ref-${col._tempId}`}
                  className="flex-1 border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                  value={col.enumRef ?? ''}
                  onChange={(e) => onUpdate({ enumRef: e.target.value || undefined })}
                  placeholder="共有enum名（省略可）"
                />
              </div>
              <div className="flex items-start gap-2">
                <label
                  htmlFor={`enum-values-${col._tempId}`}
                  className="w-20 text-muted-foreground shrink-0 pt-0.5"
                >
                  値リスト
                </label>
                <textarea
                  id={`enum-values-${col._tempId}`}
                  className="flex-1 border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring font-mono resize-y"
                  rows={3}
                  value={(col.enumValues ?? []).join('\n')}
                  onChange={(e) =>
                    onUpdate({
                      enumValues: e.target.value
                        .split('\n')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="1行1値"
                />
              </div>
            </div>
          )}

          {COLUMN_TYPE_CONFIG[col.type].hasRefTable && (
            <div className="flex items-center gap-2">
              <label
                htmlFor={`ref-table-${col._tempId}`}
                className="w-20 text-muted-foreground shrink-0"
              >
                参照テーブル
              </label>
              <select
                id={`ref-table-${col._tempId}`}
                className="flex-1 border rounded px-1.5 py-0.5 focus:outline-none"
                value={col.refTable ?? ''}
                onChange={(e) => onUpdate({ refTable: e.target.value || undefined })}
              >
                <option value="">（選択）</option>
                {tables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t pt-1.5">
            <span className="text-muted-foreground">バリデーション</span>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={col.validation?.required ?? false}
                  onChange={(e) => onUpdateValidation({ required: e.target.checked || undefined })}
                />
                必須
              </label>
              {COLUMN_TYPE_CONFIG[col.type].validationGroup === 'number' && (
                <>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">min</span>
                    <input
                      type="number"
                      className="w-16 border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={col.validation?.min ?? ''}
                      onChange={(e) =>
                        onUpdateValidation({
                          min: e.target.value !== '' ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">max</span>
                    <input
                      type="number"
                      className="w-16 border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={col.validation?.max ?? ''}
                      onChange={(e) =>
                        onUpdateValidation({
                          max: e.target.value !== '' ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                </>
              )}
              {COLUMN_TYPE_CONFIG[col.type].validationGroup === 'string' && (
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground">maxLength</span>
                  <input
                    type="number"
                    className="w-16 border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    value={col.validation?.maxLength ?? ''}
                    onChange={(e) =>
                      onUpdateValidation({
                        maxLength: e.target.value !== '' ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
