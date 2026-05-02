export type ColumnType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'ref'
  | 'ref[]'
  | 'json'
  | 'text'
  | 'date'

export type ValidationRule = {
  required?: boolean
  min?: number
  max?: number
  maxLength?: number
}

export type ColumnDef = {
  key: string
  displayName: string
  type: ColumnType
  validation?: ValidationRule
  isDisplayName?: boolean
  enumValues?: string[]
  refTable?: string
}

export type TableSchema = {
  name: string
  displayName: string
  columns: ColumnDef[]
}
