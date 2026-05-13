import { useState } from 'react'
import type { TableSchema } from '@/types/schema'
import type { FilterExpr, FilterViewQuery, ViewDefinition, ProjectConfig } from '@/types/view'
import { resolveEnumValues } from '@/lib/enum-resolver'
import { COLUMN_TYPE_CONFIG } from '@/lib/columnTypeConfig'
import { makeId } from '@/lib/utils'
import DialogShell from '@/components/ui/DialogShell'
import DialogFooter from '@/components/ui/DialogFooter'

const OP_LABELS: Record<string, string> = {
  eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
  contains: '含む', startsWith: '始まる', isNull: 'が空', isNotNull: 'が空でない',
}

interface CondRow { id: string; column: string; op: string; value: string }
interface SortRow { id: string; column: string; order: 'asc' | 'desc' }

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
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const cols = existing?.columns ? new Set(existing.columns) : null
    return cols ?? new Set<string>()
  })

  const schema = schemas.get(fromTable)
  const cols = schema?.columns ?? []

  const addCond = () => {
    const col = cols[0]
    if (!col) return
    setConds((prev) => [...prev, { id: makeId(), column: col.key, op: COLUMN_TYPE_CONFIG[col.type].filterOps[0], value: '' }])
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

  const toggleColumn = (colKey: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.size === 0) {
        const allCols = cols.map((c) => c.key)
        allCols.forEach((k) => next.add(k))
        next.delete(colKey)
      } else {
        if (next.has(colKey)) {
          next.delete(colKey)
        } else {
          next.add(colKey)
        }
      }
      return next
    })
  }

  const handleSave = () => {
    if (!name.trim()) return
    const hasColumnFilter = visibleColumns.size > 0
    const query: FilterViewQuery = {
      type: 'filter',
      from: fromTable,
      filter: buildFilterExpr(condMode, conds),
      sort: sorts.length > 0 ? sorts.map(({ column, order }) => ({ column, order })) : undefined,
      columns: hasColumnFilter ? [...visibleColumns] : undefined,
    }
    onSave({ id: editView?.id ?? makeId(), name: name.trim(), query })
    onClose()
  }

  const footer = (
    <DialogFooter
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!name.trim()}
      onDelete={editView && onDelete ? () => { onDelete(editView.id); onClose() } : undefined}
    />
  )

  return (
    <DialogShell
      title={editView ? 'ビューを編集' : 'ビューを作成'}
      width="w-[520px]"
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
            const ops = colDef ? COLUMN_TYPE_CONFIG[colDef.type].filterOps : []
            return (
              <div key={cond.id} className="flex items-center gap-1.5">
                {/* Column */}
                <select
                  className="border rounded px-1.5 py-1 text-xs focus:outline-none w-28"
                  value={cond.column}
                  onChange={(e) => {
                    const newCol = cols.find((c) => c.key === e.target.value)
                    const newOp = newCol ? COLUMN_TYPE_CONFIG[newCol.type].filterOps[0] : 'eq'
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
                  colDef && COLUMN_TYPE_CONFIG[colDef.type].filterValueWidget === 'enum' ? (
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
                  ) : colDef && COLUMN_TYPE_CONFIG[colDef.type].filterValueWidget === 'boolean' ? (
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

      {/* Column visibility */}
      <div>
        <div className="mb-2 text-muted-foreground">表示列</div>
        <div className="flex flex-wrap gap-1.5">
          {cols.map((col) => {
            const isVisible = visibleColumns.size === 0 || visibleColumns.has(col.key)
            return (
              <button
                key={col.key}
                type="button"
                className={`px-2 py-0.5 rounded text-xs border ${
                  isVisible
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }`}
                onClick={() => toggleColumn(col.key)}
              >
                {isVisible ? '✓ ' : ''}{col.displayName}
              </button>
            )
          })}
        </div>
      </div>
    </DialogShell>
  )
}
