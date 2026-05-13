import { useState } from 'react'
import type { TableSchema } from '@/types/schema'
import type { UnionViewQuery, ViewDefinition } from '@/types/view'
import { makeId } from '@/lib/utils'
import DialogShell from '@/components/ui/DialogShell'
import DialogFooter from '@/components/ui/DialogFooter'

interface SourceRow {
  id: string
  from: string
  columns: string[]
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

  const footer = (
    <DialogFooter
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!name.trim() || sources.length === 0}
      onDelete={editView && onDelete ? () => { onDelete(editView.id); onClose() } : undefined}
    />
  )

  return (
    <DialogShell
      title={editView ? 'ユニオンビューを編集' : 'ユニオンビューを作成'}
      width="w-[560px]"
      onClose={onClose}
      footer={footer}
    >
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
    </DialogShell>
  )
}
