import DialogFooter from '@/components/ui/DialogFooter';
import DialogShell from '@/components/ui/DialogShell';
import { makeId } from '@/lib/utils';
import type { ColumnDef, TableSchema } from '@/types/schema';
import type { SelectQuery, ViewDefinition } from '@/types/view';
import { useState } from 'react';

interface LookupDef {
  id: string;
  column: string;
  from: string;
  as: string;
  fields: string[];
}

interface Props {
  schemas: Map<string, TableSchema>;
  tables: string[];
  editView?: ViewDefinition;
  onSave: (view: ViewDefinition) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function LookupViewDialog({
  schemas,
  tables,
  editView,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const existing = editView?.query.type === 'select' ? (editView.query as SelectQuery) : undefined;

  const [name, setName] = useState(editView?.name ?? '');
  const [fromTable, setFromTable] = useState(existing?.from ?? tables[0] ?? '');
  const [lookups, setLookups] = useState<LookupDef[]>(() => {
    if (existing?.joins && existing.joins.length > 0) {
      return existing.joins.map((l) => ({ id: makeId(), ...l }));
    }
    return [];
  });

  const baseSchema = schemas.get(fromTable);
  const refColumns: ColumnDef[] =
    baseSchema?.columns.filter((c) => c.type === 'ref' || c.type === 'ref[]') ?? [];

  const addLookup = () => {
    const firstRef = refColumns[0];
    if (!firstRef) return;
    const refTable = firstRef.refTable ?? tables[0] ?? '';
    setLookups((prev) => [
      ...prev,
      {
        id: makeId(),
        column: firstRef.key,
        from: refTable,
        as: firstRef.key,
        fields: [],
      },
    ]);
  };

  const removeLookup = (id: string) => {
    setLookups((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLookup = (id: string, patch: Partial<Omit<LookupDef, 'id'>>) => {
    setLookups((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        if (patch.column !== undefined) {
          const col = baseSchema?.columns.find((c) => c.key === patch.column);
          updated.from = col?.refTable ?? tables[0] ?? '';
          updated.as = patch.column;
          updated.fields = [];
        }
        return updated;
      })
    );
  };

  const toggleField = (lookupId: string, fieldKey: string) => {
    setLookups((prev) =>
      prev.map((l) => {
        if (l.id !== lookupId) return l;
        const fields = l.fields.includes(fieldKey)
          ? l.fields.filter((f) => f !== fieldKey)
          : [...l.fields, fieldKey];
        return { ...l, fields };
      })
    );
  };

  const handleFromTableChange = (table: string) => {
    setFromTable(table);
    setLookups([]);
  };

  const handleSave = () => {
    if (!name.trim() || !fromTable) return;
    const query: SelectQuery = {
      type: 'select',
      from: fromTable,
      joins: lookups.map(({ column, from, as: asVal, fields }) => ({
        column,
        from,
        as: asVal,
        fields,
      })),
    };
    onSave({ id: editView?.id ?? makeId(), name: name.trim(), query });
    onClose();
  };

  const canSave =
    name.trim() && fromTable && lookups.length > 0 && lookups.every((l) => l.fields.length > 0);

  const footer = (
    <DialogFooter
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      onDelete={
        editView && onDelete
          ? () => {
              onDelete(editView.id);
              onClose();
            }
          : undefined
      }
    />
  );

  return (
    <DialogShell
      title={editView ? 'ルックアップビューを編集' : 'ルックアップビューを作成'}
      width="w-[600px]"
      maxHeight="max-h-[85vh]"
      onClose={onClose}
      footer={footer}
    >
      {/* Name */}
      <div className="flex items-center gap-2">
        <label htmlFor="lookup-name" className="w-20 text-muted-foreground shrink-0">
          ビュー名
        </label>
        <input
          id="lookup-name"
          className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 敵一覧（アイテム展開）"
          autoFocus
        />
      </div>

      {/* Base table */}
      <div className="flex items-center gap-2">
        <label htmlFor="lookup-table" className="w-20 text-muted-foreground shrink-0">
          ベーステーブル
        </label>
        <select
          id="lookup-table"
          className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none"
          value={fromTable}
          onChange={(e) => handleFromTableChange(e.target.value)}
        >
          {tables.map((t) => (
            <option key={t} value={t}>
              {schemas.get(t)?.displayName ?? t}
            </option>
          ))}
        </select>
      </div>

      {/* Lookup definitions */}
      <div>
        <div className="mb-2 text-muted-foreground">展開する参照列</div>
        {refColumns.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">
            このテーブルには ref 型のカラムがありません
          </div>
        ) : (
          <div className="space-y-3">
            {lookups.map((lookup) => {
              const refSchema = schemas.get(lookup.from);
              const refCols = refSchema?.columns ?? [];
              return (
                <div key={lookup.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {/* Column selector */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">参照列</div>
                        <select
                          className="w-full border rounded px-2 py-1 text-xs focus:outline-none"
                          value={lookup.column}
                          onChange={(e) => updateLookup(lookup.id, { column: e.target.value })}
                        >
                          {refColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* From table */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">参照先テーブル</div>
                        <select
                          className="w-full border rounded px-2 py-1 text-xs focus:outline-none"
                          value={lookup.from}
                          onChange={(e) =>
                            updateLookup(lookup.id, { from: e.target.value, fields: [] })
                          }
                        >
                          {tables.map((t) => (
                            <option key={t} value={t}>
                              {schemas.get(t)?.displayName ?? t}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Alias */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">エイリアス</div>
                        <input
                          className="w-full border rounded px-2 py-1 text-xs focus:outline-none"
                          value={lookup.as}
                          onChange={(e) => updateLookup(lookup.id, { as: e.target.value })}
                          placeholder="エイリアス"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive text-xs px-1 shrink-0"
                      onClick={() => removeLookup(lookup.id)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Field selection */}
                  {refCols.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">展開するフィールド</div>
                      <div className="flex flex-wrap gap-1">
                        {refCols.map((col) => {
                          const checked = lookup.fields.includes(col.key);
                          return (
                            <label
                              key={col.key}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs cursor-pointer select-none ${
                                checked
                                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                                  : 'hover:bg-accent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={() => toggleField(lookup.id, col.key)}
                              />
                              {col.displayName}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {refColumns.length > 0 && (
          <button
            type="button"
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={addLookup}
          >
            + 参照列を追加
          </button>
        )}
      </div>
    </DialogShell>
  );
}
