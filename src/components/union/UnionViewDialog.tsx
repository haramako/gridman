import { useState } from 'react'
import type { TableSchema } from '@/types/schema'
import type { UnionViewQuery, ViewDefinition } from '@/types/view'

interface SourceRow {
  id: string
  from: string
  columns: string[]
}

function makeId() {
  return Math.random().toString(36).slice(2, 8)
}

interface Props {
  schemas: Map<string, TableSchema>
  tables: string[]
  editView?: ViewDefinition
  onSave: (view: ViewDefinition) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function UnionViewDialog({ schemas, tables, editView, onSave, onDelete, onClose }: Props) {
  const existing = editView?.query.type === 'union' ? (editView.query as UnionViewQuery) : undefined

  const [name, setName] = useState(editView?.name ?? '')
  const [sources, setSources] = useState<SourceRow[]>(() => {
    if (existing?.sources && existing.sources.length > 0) {
      return existing.sources.map((s) => ({
        id: makeId(),
        from: s.from,
        columns: s.columns ?? [],
      }))
    }
    return tables.slice(0, 2).map((t) => ({ id: makeId(), from: t, columns: [] }))
  })

  const addSource = () => {
    setSources((prev) => [...prev, { id: makeId(), from: tables[0] ?? '', columns: [] }])
  }

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
  }

  const updateSourceTable = (id: string, from: string) => {
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, from, columns: [] } : s))
  }

  const toggleColumn = (sourceId: string, colKey: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== sourceId) return s
        const cols = s.columns.includes(colKey)
          ? s.columns.filter((c) => c !== colKey)
          : [...s.columns, colKey]
        return { ...s, columns: cols }
      })
    )
  }

  const handleSave = () => {
    if (!name.trim() || sources.length === 0) return
    const query: UnionViewQuery = {
      type: 'union',
      sources: sources.map((s) => ({
        from: s.from,
        ...(s.columns.length > 0 ? { columns: s.columns } : {}),
      })),
    }
    onSave({ id: editView?.id ?? makeId(), name: name.trim(), query })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }}
    >
      <div className="bg-background rounded-lg border shadow-lg w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">
            {editView ? 'ユニオンビューを編集' : 'ユニオンビューを作成'}
          </span>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4 text-sm">
          {/* Name */}
          <div className="flex items-center gap-2">
            <label className="w-20 text-muted-foreground shrink-0">ビュー名</label>
            <input
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 全ユニット一覧"
              autoFocus
            />
          </div>

          {/* Sources */}
          <div>
            <div className="mb-2 text-muted-foreground">結合するテーブル</div>
            <div className="space-y-3">
              {sources.map((source, idx) => {
                const schema = schemas.get(source.from)
                const cols = schema?.columns ?? []
                const allSelected = source.columns.length === 0
                return (
                  <div key={source.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <select
                        className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none"
                        value={source.from}
                        onChange={(e) => updateSourceTable(source.id, e.target.value)}
                      >
                        {tables.map((t) => (
                          <option key={t} value={t}>{schemas.get(t)?.displayName ?? t}</option>
                        ))}
                      </select>
                      <button
                        className="text-muted-foreground hover:text-destructive text-xs px-1"
                        onClick={() => removeSource(source.id)}
                        disabled={sources.length <= 1}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Column selection */}
                    {cols.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">使用するカラム（未選択=すべて）</div>
                        <div className="flex flex-wrap gap-1">
                          {cols.map((col) => {
                            const checked = allSelected || source.columns.includes(col.key)
                            return (
                              <label
                                key={col.key}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs cursor-pointer select-none ${
                                  checked && !allSelected
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'hover:bg-accent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={!allSelected && source.columns.includes(col.key)}
                                  onChange={() => toggleColumn(source.id, col.key)}
                                />
                                {col.displayName}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={addSource}
            >
              + テーブルを追加
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div>
            {editView && onDelete && (
              <button
                className="text-sm text-destructive hover:underline"
                onClick={() => { onDelete(editView.id); onClose() }}
              >
                削除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded border text-sm hover:bg-accent" onClick={onClose}>
              キャンセル
            </button>
            <button
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-40"
              disabled={!name.trim() || sources.length === 0}
              onClick={handleSave}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
