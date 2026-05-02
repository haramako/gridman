import type { FilterExpr, SortDef } from '@/types/view'
import type { Row } from '@/types/row'

export function applyFilter(rows: Row[], expr: FilterExpr | undefined): Row[] {
  if (!expr) return rows
  return rows.filter((row) => evalExpr(row, expr))
}

function evalExpr(row: Row, expr: FilterExpr): boolean {
  if ('conditions' in expr) {
    return expr.op === 'and'
      ? expr.conditions.every((c) => evalExpr(row, c))
      : expr.conditions.some((c) => evalExpr(row, c))
  }
  const val = row[expr.column]
  if (expr.op === 'isNull') return val == null || val === ''
  if (expr.op === 'isNotNull') return val != null && val !== ''

  const { op } = expr
  const value = 'value' in expr ? expr.value : undefined
  const strVal = String(val ?? '').toLowerCase()
  const strValue = String(value ?? '').toLowerCase()
  if (op === 'contains') return strVal.includes(strValue)
  if (op === 'startsWith') return strVal.startsWith(strValue)
  if (op === 'eq') return String(val ?? '') === String(value ?? '')
  if (op === 'neq') return String(val ?? '') !== String(value ?? '')

  const numVal = Number(val)
  const numValue = Number(value)
  if (op === 'gt') return numVal > numValue
  if (op === 'gte') return numVal >= numValue
  if (op === 'lt') return numVal < numValue
  if (op === 'lte') return numVal <= numValue
  return true
}

export function applySort(rows: Row[], sorts: SortDef[] | undefined): Row[] {
  if (!sorts || sorts.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const { column, order } of sorts) {
      const av = a[column]
      const bv = b[column]
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av !== bv) return order === 'asc' ? av - bv : bv - av
      } else {
        const as = String(av ?? '')
        const bs = String(bv ?? '')
        if (as !== bs) return order === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
      }
    }
    return 0
  })
}
