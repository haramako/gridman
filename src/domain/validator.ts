import type { ColumnDef, ColumnType } from '@/types/schema'

export type ValidationError = { rule: string; message: string }

export function coerceToType(value: unknown, type: ColumnType): unknown {
  const s = String(value ?? '')
  switch (type) {
    case 'integer': {
      if (s === '') return null
      const n = parseInt(s, 10)
      return isNaN(n) ? s : n
    }
    case 'number': {
      if (s === '') return null
      const n = parseFloat(s)
      return isNaN(n) ? s : n
    }
    case 'boolean':
      return value === true || s === 'true' || s === '1'
    default:
      return value
  }
}

export function validateCell(value: unknown, col: ColumnDef): ValidationError | null {
  const rule = col.validation
  if (!rule) return null

  const isEmpty = value === null || value === undefined || value === ''
  if (rule.required && isEmpty) {
    return { rule: 'required', message: `${col.displayName}は必須です` }
  }
  if (isEmpty) return null

  if (col.type === 'integer') {
    if (!Number.isInteger(Number(value))) {
      return { rule: 'type', message: '整数を入力してください' }
    }
    const n = Number(value)
    if (rule.min !== undefined && n < rule.min) {
      return { rule: 'min', message: `${rule.min}以上の値を入力してください` }
    }
    if (rule.max !== undefined && n > rule.max) {
      return { rule: 'max', message: `${rule.max}以下の値を入力してください` }
    }
  }

  if (col.type === 'number') {
    if (isNaN(Number(value))) {
      return { rule: 'type', message: '数値を入力してください' }
    }
    const n = Number(value)
    if (rule.min !== undefined && n < rule.min) {
      return { rule: 'min', message: `${rule.min}以上の値を入力してください` }
    }
    if (rule.max !== undefined && n > rule.max) {
      return { rule: 'max', message: `${rule.max}以下の値を入力してください` }
    }
  }

  if (col.type === 'string' && rule.maxLength !== undefined) {
    if (String(value).length > rule.maxLength) {
      return { rule: 'maxLength', message: `${rule.maxLength}文字以下で入力してください` }
    }
  }

  return null
}
