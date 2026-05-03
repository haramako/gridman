import { useState } from 'react'
import type { ColumnDef, TableSchema } from '@/types/schema'
import type { FilterExpr, FilterViewQuery, ViewDefinition, ProjectConfig } from '@/types/view'
import { resolveEnumValues } from '@/lib/enum-resolver'

const OPS_STRING = ['eq', 'neq', 'contains', 'startsWith', 'isNull', 'isNotNull'] as const
const OPS_NUMBER = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull'] as const
const OPS_ENUM = ['eq', 'neq', 'isNull', 'isNotNull'] as const
const OPS_BOOL = ['eq', 'isNull', 'isNotNull'] as const

const OP_LABELS: Record<string, string> = {
  eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
  contains: '含む', startsWith: '始まる', isNull: 'が空', isNotNull: 'が空でない',
}

function opsForCol(col: ColumnDef): readonly string[] {
  if (col.type === 'integer' || col.type === 'number') return OPS_NUMBER
  if (col.type === 'boolean') return OPS_BOOL
  if (col.type === 'enum') return OPS_ENUM
  return OPS_STRING
}

interface CondRow { id: string; column: string; op: string; value: string }
interface SortRow { id: string; column: string; order: 'asc' | 'desc' }

function makeId() { return Math.random().toString(36).slice(2, 8) }

function buildFilterExpr(
  mode: 'and' | 'or',
  conds: CondRow[]
): FilterExpr | undefined {
  if (conds.length === 0) return undefined
  const conditions: FilterExpr[] = conds.map((c): FilterExpr =>
    c.op === 'isNull' || c.op === 'isNotNull'
      ? { column: c.column, op: c.op }
      : { column: c.column, op: c.op as 'eq', value: c.value }
  )
  if (conditions.length === 1) return conditions[0]
  return { op: mode, conditions }
}

interface Props {
  schemas: Map<string, TableSchema>
  tables: string[]
  project: ProjectConfig | null
  editView?: ViewDefinition
  onSave: (view: ViewDefinition) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function FilterViewDialog({ schemas, tables, project, editView, onSave, onDelete, onClose }: Props) {
  const existing = editView?.query.type === 'filter' ? (editView.query as FilterViewQuery) : undefined

  const [name, setName] = useState(editView?.name ?? '')
  const [fromTable, setFromTable] = useState(existing?.from ?? tables[0] ?? '')
  const [condMode, setCondMode] = useState<'and' | 'or'>(
    existing?.filter && 'conditions' in existing.filter ? existing.filter.op : 'and'
  )
  const [conds, setConds] = useState<CondRow[]>(() => {
    if (!existing?.filter) return []
    const exprs = 'conditions' in existing.filter
      ? existing.filter.conditions
      : [existing.filter]
    return exprs.map((e) => ({
      id: makeId(),
      column: 'column' in e ? e.column : '',
      op: e.op,
      value: 'value' in e ? String(e.value ?? '') : '',
    }))
  })
  const [sorts, setSorts] = useState<SortRow[]>(
    existing?.sort?.map((s) => ({ id: makeId(), ...s })) ?? []
  )

  const schema = schemas.get(fromTable)
  const cols = schema?.columns ?? []

  const addCond = () => {
    const col = cols[0]
    if (!col) return
    setConds((prev) => [...prev, { id: makeId(), column: col.key, op: opsForCol(col)[0], value: '' }])
  }

  const updateCond = (id: string, patch: Partial<CondRow>) =>
    setConds((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c))

  const removeCond = (id: string) => setConds((prev) => prev.filter((c) => c.id !== id))

  const addSort = () => {
    const col = cols[0]
    if (!col) return
    setSorts((prev) => [...prev, { id: makeId(), column: col.key, order: 'asc' }])
  }

  const updateSort = (id: string, patch: Partial<SortRow>) =>
    setSorts((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))

  const removeSort = (id: string) => setSorts((prev) => prev.filter((s) => s.id !== id))

  const needsValue = (op: string) => op !== 'isNull' && op !== 'isNotNull'

  const handleSave = () => {
    if (!name.trim()) return
    const query: FilterViewQuery = {
      type: 'filter',
      from: fromTable,
      filter: buildFilterExpr(condMode, conds),
      sort: sorts.length > 0 ? sorts.map(({ column, order }) => ({ column, order })) : undefined,
    }
    onSave({ id: editView?.id ?? makeId(), name: name.trim(), query })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg border shadow-lg w-[520px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">{editView ? 'ビューを編集' : 'ビューを作成'}</span>
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
              placeholder="例: fire属性の敵"
              autoFocus
            />
          </div>

          {/* Table */}
          <div className="flex items-center gap-2">
            <label className="w-20 text-muted-foreground shrink-0">テーブル</label>
            <select
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              value={fromTable}
              onChange={(e) => { setFromTable(e.target.value); setConds([]); setSorts([]) }}
            >
              {tables.map((t) => (
                <option key={t} value={t}>{schemas.get(t)?.displayName ?? t}</option>
              ))}
            </select>
          </div>

          {/* Filter conditions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-muted-foreground">フィルター</span>
              <select
                className="border rounded px-1.5 py-0.5 text-xs focus:outline-none"
                value={condMode}
                onChange={(e) => setCondMode(e.target.value as 'and' | 'or')}
              >
                <option value="and">AND（すべて）</option>
                <option value="or">OR（いずれか）</option>
              </select>
            </div>
            <div className="space-y-1.5">
              {conds.map((cond) => {
                const colDef = cols.find((c) => c.key === cond.column)
                const ops = colDef ? opsForCol(colDef) : OPS_STRING
                return (
                  <div key={cond.id} className="flex items-center gap-1.5">
                    {/* Column */}
                    <select
                      className="border rounded px-1.5 py-1 text-xs focus:outline-none w-28"
                      value={cond.column}
                      onChange={(e) => {
                        const newCol = cols.find((c) => c.key === e.target.value)
                        const newOp = newCol ? opsForCol(newCol)[0] : 'eq'
                        updateCond(cond.id, { column: e.target.value, op: newOp, value: '' })
                      }}
                    >
                      {cols.map((c) => (
                        <option key={c.key} value={c.key}>{c.displayName}</option>
                      ))}
                    </select>
                    {/* Op */}
                    <select
                      className="border rounded px-1.5 py-1 text-xs focus:outline-none w-24"
                      value={cond.op}
                      onChange={(e) => updateCond(cond.id, { op: e.target.value })}
                    >
                      {ops.map((op) => (
                        <option key={op} value={op}>{OP_LABELS[op] ?? op}</option>
                      ))}
                    </select>
                    {/* Value */}
                    {needsValue(cond.op) && (
                      colDef?.type === 'enum' ? (
                        <select
                          className="border rounded px-1.5 py-1 text-xs focus:outline-none flex-1"
                          value={cond.value}
                          onChange={(e) => updateCond(cond.id, { value: e.target.value })}
                        >
                          <option value="">-</option>
                          {(resolveEnumValues(colDef, project) ?? []).map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : colDef?.type === 'boolean' ? (
                        <select
                          className="border rounded px-1.5 py-1 text-xs focus:outline-none flex-1"
                          value={cond.value}
                          onChange={(e) => updateCond(cond.id, { value: e.target.value })}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          className="border rounded px-1.5 py-1 text-xs focus:outline-none flex-1"
                          value={cond.value}
                          onChange={(e) => updateCond(cond.id, { value: e.target.value })}
                          placeholder="値"
                        />
                      )
                    )}
                    {!needsValue(cond.op) && <div className="flex-1" />}
                    <button
                      className="text-muted-foreground hover:text-destructive text-xs px-1"
                      onClick={() => removeCond(cond.id)}
                    >✕</button>
                  </div>
                )
              })}
            </div>
            <button
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={addCond}
              disabled={cols.length === 0}
            >
              + 条件を追加
            </button>
          </div>

          {/* Sort */}
          <div>
            <div className="mb-2 text-muted-foreground">ソート</div>
            <div className="space-y-1.5">
              {sorts.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <select
                    className="border rounded px-1.5 py-1 text-xs focus:outline-none w-28"
                    value={s.column}
                    onChange={(e) => updateSort(s.id, { column: e.target.value })}
                  >
                    {cols.map((c) => (
                      <option key={c.key} value={c.key}>{c.displayName}</option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-1.5 py-1 text-xs focus:outline-none w-20"
                    value={s.order}
                    onChange={(e) => updateSort(s.id, { order: e.target.value as 'asc' | 'desc' })}
                  >
                    <option value="asc">昇順 ↑</option>
                    <option value="desc">降順 ↓</option>
                  </select>
                  <button
                    className="text-muted-foreground hover:text-destructive text-xs px-1"
                    onClick={() => removeSort(s.id)}
                  >✕</button>
                </div>
              ))}
            </div>
            <button
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={addSort}
              disabled={cols.length === 0}
            >
              + ソートを追加
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
              disabled={!name.trim()}
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
