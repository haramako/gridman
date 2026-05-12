import { describe, expect, it } from 'vitest'
import { applyLookup } from '@/domain/lookup'
import type { Row } from '@/types/row'
import type { TableSchema } from '@/types/schema'
import type { LookupViewQuery } from '@/types/view'

const makeRow = (id: string, order: number, fields: Record<string, unknown>): Row => ({
  _id: id,
  _order: order,
  ...fields,
})

const itemSchema: TableSchema = {
  name: 'item',
  displayName: 'アイテム',
  columns: [
    { key: 'name', displayName: '名前', type: 'string' },
    { key: 'categoryId', displayName: 'カテゴリID', type: 'ref', refTable: 'category' },
  ],
}

const categorySchema: TableSchema = {
  name: 'category',
  displayName: 'カテゴリ',
  columns: [
    { key: 'label', displayName: 'ラベル', type: 'string' },
    { key: 'color', displayName: '色', type: 'string' },
  ],
}

const itemTable = new Map<string, Row>([
  ['i1', makeRow('i1', 0, { name: 'Sword', categoryId: 'c1' })],
  ['i2', makeRow('i2', 1, { name: 'Shield', categoryId: 'c2' })],
  ['i3', makeRow('i3', 2, { name: 'Unknown', categoryId: undefined })],
])

const categoryTable = new Map<string, Row>([
  ['c1', makeRow('c1', 0, { label: 'Weapon', color: 'red' })],
  ['c2', makeRow('c2', 1, { label: 'Armor', color: 'blue' })],
])

const tables = new Map([
  ['item', itemTable],
  ['category', categoryTable],
])

const schemas = new Map([
  ['item', itemSchema],
  ['category', categorySchema],
])

const baseQuery: LookupViewQuery = {
  type: 'lookup',
  from: 'item',
  lookups: [{ column: 'categoryId', from: 'category', as: 'cat', fields: ['label'] }],
}

describe('applyLookup', () => {
  it('returns empty result when base schema is missing', () => {
    const query: LookupViewQuery = { type: 'lookup', from: 'missing', lookups: [] }
    const { rows, schema } = applyLookup(query, tables, schemas)
    expect(rows).toHaveLength(0)
    expect(schema.columns).toHaveLength(0)
  })

  it('returns empty result when base table is missing', () => {
    const onlySchemas = new Map([['item', itemSchema]])
    const emptyTables = new Map<string, Map<string, Row>>()
    const query: LookupViewQuery = { type: 'lookup', from: 'item', lookups: [] }
    const { rows } = applyLookup(query, emptyTables, onlySchemas)
    expect(rows).toHaveLength(0)
  })

  it('adds prefixed lookup columns to schema with readonly flag', () => {
    const { schema } = applyLookup(baseQuery, tables, schemas)
    const addedCol = schema.columns.find((c) => c.key === 'cat.label')
    expect(addedCol).toBeDefined()
    expect(addedCol?.readonly).toBe(true)
    expect(addedCol?.displayName).toBe('cat.ラベル')
  })

  it('preserves base schema columns without modification', () => {
    const { schema } = applyLookup(baseQuery, tables, schemas)
    const baseKeys = itemSchema.columns.map((c) => c.key)
    for (const key of baseKeys) {
      const col = schema.columns.find((c) => c.key === key)
      expect(col).toBeDefined()
      expect(col?.readonly).toBeUndefined()
    }
  })

  it('resolves referenced row fields', () => {
    const { rows } = applyLookup(baseQuery, tables, schemas)
    const sword = rows.find((r) => r._id === 'i1')
    expect(sword?.['cat.label']).toBe('Weapon')
  })

  it('sets null for rows with no matching reference', () => {
    const { rows } = applyLookup(baseQuery, tables, schemas)
    const unknown = rows.find((r) => r._id === 'i3')
    expect(unknown?.['cat.label']).toBeNull()
  })

  it('sets _sources with base and lookup ids', () => {
    const { rows } = applyLookup(baseQuery, tables, schemas)
    const sword = rows.find((r) => r._id === 'i1')
    expect((sword?._sources as Record<string, unknown>)?.['item']).toBe('i1')
    expect((sword?._sources as Record<string, unknown>)?.['category']).toBe('c1')
  })

  it('sets _sources lookup id to null when ref is missing', () => {
    const { rows } = applyLookup(baseQuery, tables, schemas)
    const unknown = rows.find((r) => r._id === 'i3')
    expect((unknown?._sources as Record<string, unknown>)?.['category']).toBeNull()
  })

  it('applies filter on base rows', () => {
    const query: LookupViewQuery = {
      ...baseQuery,
      filter: { column: 'name', op: 'eq', value: 'Sword' },
    }
    const { rows } = applyLookup(query, tables, schemas)
    expect(rows).toHaveLength(1)
    expect(rows[0]._id).toBe('i1')
  })

  it('sorts rows by _order', () => {
    const { rows } = applyLookup(baseQuery, tables, schemas)
    expect(rows[0]._id).toBe('i1')
    expect(rows[1]._id).toBe('i2')
    expect(rows[2]._id).toBe('i3')
  })

  it('skips lookup columns for missing ref schema', () => {
    const query: LookupViewQuery = {
      type: 'lookup',
      from: 'item',
      lookups: [{ column: 'categoryId', from: 'ghost', as: 'g', fields: ['x'] }],
    }
    const { schema } = applyLookup(query, tables, schemas)
    const keys = schema.columns.map((c) => c.key)
    expect(keys).not.toContain('g.x')
  })

  it('handles missing ref table gracefully, setting all fields to null', () => {
    const noCategory = new Map([['item', itemTable]])
    const { rows } = applyLookup(baseQuery, noCategory, schemas)
    for (const row of rows) {
      expect(row['cat.label']).toBeNull()
    }
  })

  it('only includes requested fields from lookup', () => {
    const query: LookupViewQuery = {
      type: 'lookup',
      from: 'item',
      lookups: [{ column: 'categoryId', from: 'category', as: 'cat', fields: ['label'] }],
    }
    const { schema } = applyLookup(query, tables, schemas)
    const keys = schema.columns.map((c) => c.key)
    expect(keys).toContain('cat.label')
    expect(keys).not.toContain('cat.color')
  })

  it('uses displayName from base schema in returned schema', () => {
    const { schema } = applyLookup(baseQuery, tables, schemas)
    expect(schema.displayName).toContain('アイテム')
  })
})
