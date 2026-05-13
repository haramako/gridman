import type { PageLayoutItem, PageLayoutWidget, PageTemplate } from '@/types/page';
import type { TableSchema } from '@/types/schema';
import { useState } from 'react';

const WIDGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'number', label: '数値' },
  { value: 'select', label: 'セレクトボックス' },
  { value: 'checkbox', label: 'チェックボックス' },
  { value: 'table', label: 'テーブル' },
  { value: 'tag-list', label: 'タグリスト' },
  { value: 'json', label: 'JSON' },
];

interface Props {
  schema: TableSchema;
  tables: string[];
  schemas: Map<string, TableSchema>;
  editTemplate?: PageTemplate & { id?: string };
  onSave: (template: PageTemplate & { id?: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function PageTemplateDialog({
  schema,
  tables,
  schemas,
  editTemplate,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(editTemplate?.name ?? '');
  const [selectedTable, setSelectedTable] = useState(editTemplate?.table ?? schema.name);
  const [layout, setLayout] = useState<PageLayoutItem[]>(editTemplate?.layout ?? []);

  const currentSchema = schemas.get(selectedTable) ?? schema;
  const cols = currentSchema.columns;

  const addField = () => {
    const col = cols[0];
    if (!col) return;
    let widget: PageLayoutWidget = 'text';
    if (col.type === 'boolean') widget = 'checkbox';
    else if (col.type === 'integer' || col.type === 'number') widget = 'number';
    else if (col.type === 'enum') widget = 'select';
    else if (col.type === 'ref[]') widget = 'tag-list';
    else if (col.type === 'json') widget = 'json';
    setLayout([...layout, { type: 'field', key: col.key, label: col.displayName, widget }]);
  };

  const addSection = () => {
    setLayout([...layout, { type: 'section', label: '新しいセクション', children: [] }]);
  };

  const updateItem = (index: number, patch: Partial<PageLayoutItem>) => {
    setLayout(
      layout.map((item, i) => (i === index ? ({ ...item, ...patch } as PageLayoutItem) : item))
    );
  };

  const removeItem = (index: number) => {
    setLayout(layout.filter((_, i) => i !== index));
  };

  const resolveFieldUpdate = (key: string): Partial<PageLayoutItem> => {
    const col = cols.find((c) => c.key === key);
    if (!col) return {};
    let widget: PageLayoutWidget = 'text';
    if (col.type === 'boolean') widget = 'checkbox';
    else if (col.type === 'integer' || col.type === 'number') widget = 'number';
    else if (col.type === 'enum') widget = 'select';
    else if (col.type === 'ref[]') widget = 'tag-list';
    else if (col.type === 'json') widget = 'json';
    return { key, label: col.displayName, widget };
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const template: PageTemplate & { id?: string } = {
      id: editTemplate?.id,
      name: name.trim(),
      table: selectedTable,
      layout,
    };
    onSave(template);
    onClose();
  };

  const renderItemEditor = (
    item: PageLayoutItem,
    index: number,
    onUpdate: (patch: Partial<PageLayoutItem>) => void,
    onRemove: () => void,
  ): JSX.Element => {
    if (item.type === 'section') {
      return (
        <div key={index} className="border rounded p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={item.label ?? ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="セクション名"
            />
            <button
              type="button"
              className="ml-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              ✕
            </button>
          </div>
          <div className="pl-3 space-y-2">
            {(item.children ?? []).map((child, ci) =>
              renderItemEditor(
                child,
                ci,
                (patch) => {
                  const newChildren = (item.children ?? []).map((c, i) =>
                    i === ci ? ({ ...c, ...patch } as PageLayoutItem) : c
                  );
                  onUpdate({ children: newChildren });
                },
                () => {
                  const newChildren = (item.children ?? []).filter((_, i) => i !== ci);
                  onUpdate({ children: newChildren });
                },
              )
            )}
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              const newChildren = [
                ...(item.children ?? []),
                {
                  type: 'field' as const,
                  key: cols[0]?.key ?? '',
                  label: cols[0]?.displayName ?? '',
                  widget: 'text' as const,
                },
              ];
              onUpdate({ children: newChildren });
            }}
          >
            + フィールドを追加
          </button>
        </div>
      );
    }

    return (
      <div key={index} className="flex items-center gap-2 border rounded p-2 bg-background">
        <select
          className="border rounded px-1.5 py-1 text-xs focus:outline-none flex-1"
          value={item.key}
          onChange={(e) => onUpdate(resolveFieldUpdate(e.target.value))}
        >
          {cols.map((c) => (
            <option key={c.key} value={c.key}>
              {c.displayName}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-1.5 py-1 text-xs focus:outline-none w-32"
          value={item.widget}
          onChange={(e) => onUpdate({ widget: e.target.value as PageLayoutWidget })}
        >
          {WIDGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          className="border rounded px-1.5 py-1 text-xs focus:outline-none w-24"
          value={item.label ?? ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="ラベル"
        />
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }}
    >
      <div role="dialog" className="bg-background rounded-lg border shadow-lg w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">
            {editTemplate ? 'ページテンプレートを編集' : 'ページテンプレートを作成'}
          </span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4 text-sm">
          {/* Name */}
          <div className="flex items-center gap-2">
            <label htmlFor="template-name" className="w-24 text-muted-foreground shrink-0">
              テンプレート名
            </label>
            <input
              id="template-name"
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 敵詳細カード"
            />
          </div>

          {/* Table */}
          <div className="flex items-center gap-2">
            <label htmlFor="template-table" className="w-24 text-muted-foreground shrink-0">
              テーブル
            </label>
            <select
              id="template-table"
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setLayout([]);
              }}
            >
              {tables.map((t) => (
                <option key={t} value={t}>
                  {schemas.get(t)?.displayName ?? t}
                </option>
              ))}
            </select>
          </div>

          {/* Layout */}
          <div>
            <div className="text-muted-foreground mb-2">レイアウト</div>
            <div className="space-y-2">
              {layout.map((item, i) =>
                renderItemEditor(
                  item,
                  i,
                  (patch) => updateItem(i, patch),
                  () => removeItem(i),
                )
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={addField}
                disabled={cols.length === 0}
              >
                + フィールドを追加
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={addSection}
              >
                + セクションを追加
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div>
            {editTemplate && onDelete && (
              <button
                type="button"
                className="text-sm text-destructive hover:underline"
                onClick={() => {
                  if (editTemplate?.id) {
                    onDelete(editTemplate.id);
                    onClose();
                  }
                }}
              >
                削除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded border text-sm hover:bg-accent"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-40"
              disabled={!name.trim() || layout.length === 0}
              onClick={handleSave}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
