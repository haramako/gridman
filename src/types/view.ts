export type FilterExpr =
  | { op: 'and' | 'or'; conditions: FilterExpr[] }
  | {
      column: string
      op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith'
      value: unknown
    }
  | { column: string; op: 'isNull' | 'isNotNull' }

export type SortDef = { column: string; order: 'asc' | 'desc' }

export type FilterViewQuery = {
  type: 'filter'
  from: string
  filter?: FilterExpr
  sort?: SortDef[]
  columns?: string[]
}

export type UnionViewQuery = {
  type: 'union'
  sources: Array<{ from: string; columns?: string[]; filter?: FilterExpr }>
}

export type LookupViewQuery = {
  type: 'lookup'
  from: string
  filter?: FilterExpr
  lookups: Array<{ column: string; from: string; as: string; fields: string[] }>
}

export type PageViewQuery = {
  type: 'page'
  from: string
  filter?: FilterExpr
}

export type ViewQuery = FilterViewQuery | UnionViewQuery | LookupViewQuery | PageViewQuery

export type ViewDefinition = {
  id: string
  name: string
  query: ViewQuery
}

export type ProjectConfig = {
  version: number
  name: string
  tables: string[]
  views: ViewDefinition[]
}
