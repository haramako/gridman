import { describe, expect, it } from 'vitest'
import { applyUnion } from '@/domain/union'
import type { Row } from '@/types/row'
import type { TableSchema } from '@/types/schema'
import type { UnionViewQuery } from '@/types/view'

const makeRow = (id: string, order: number, fields: Record<string, unknown>): Row => ({
  _id: id,
  _order: order,
  ...fields,
})

const heroSchema: TableSchema = {
  name: 'hero',
  displayName: 'ヒーロー',
  columns: [
    { key: 'name', displayName: '名前', type: 'string' },
    { key: 'hp', displayName: 'HP', type: 'integer' },
  ],
}

const enemySchema: TableSchema = {
  name: 'enemy',
  displayName: '敵',
  columns: [
    { key: 'name', displayName: '名前', type: 'string' },
    { key: 'atk', displayName: '攻撃', type: 'integer' },
  ],
}

const heroTable = new Map<string, Row>([
  ['h1', makeRow('h1', 0, { name: 'Hero A', hp: 100 })],
  ['h2', makeRow('h2', 1, { name: 'Hero B', hp: 80 })],
])

const enemyTable = new Map<string, Row>([
  ['e1', makeRow('e1', 0, { name: 'Enemy X', atk: 30 })],
])

const tables = new Map([
  ['hero', heroTable],
  ['enemy', enemyTable],
])

const schemas = new Map([
  ['hero', heroSchema],
  ['enemy', enemySchema],
])

describe('applyUnion', () => {
  it('merges rows from multiple sources', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero' }, { from: 'enemy' }],
    }
    const { rows } = applyUnion(query, tables, schemas)
    expect(rows).toHaveLength(3)
  })

  it('adds _source field to each row', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero' }, { from: 'enemy' }],
    }
    const { rows } = applyUnion(query, tables, schemas)
    const heroRows = rows.filter((r) => r._source === 'hero')
    const enemyRows = rows.filter((r) => r._source === 'enemy')
    expect(heroRows).toHaveLength(2)
    expect(enemyRows).toHaveLength(1)
  })

  it('returns merged schema with columns from all sources', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero' }, { from: 'enemy' }],
    }
    const { schema } = applyUnion(query, tables, schemas)
    const keys = schema.columns.map((c) => c.key)
    expect(keys).toContain('name')
    expect(keys).toContain('hp')
    expect(keys).toContain('atk')
  })

  it('respects column filtering per source', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero', columns: ['name'] }, { from: 'enemy' }],
    }
    const { schema } = applyUnion(query, tables, schemas)
    const keys = schema.columns.map((c) => c.key)
    expect(keys).not.toContain('hp')
    expect(keys).toContain('name')
    expect(keys).toContain('atk')
  })

  it('applies per-source filter', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [
        { from: 'hero', filter: { column: 'hp', op: 'gte', value: 90 } },
        { from: 'enemy' },
      ],
    }
    const { rows } = applyUnion(query, tables, schemas)
    const heroRows = rows.filter((r) => r._source === 'hero')
    expect(heroRows).toHaveLength(1)
    expect(heroRows[0].name).toBe('Hero A')
  })

  it('skips missing tables gracefully', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero' }, { from: 'nonexistent' }],
    }
    const { rows } = applyUnion(query, tables, schemas)
    expect(rows).toHaveLength(2)
  })

  it('skips missing schemas gracefully', () => {
    // Schema missing: ghost rows are still included (columns just aren't added to schema)
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero' }, { from: 'ghost' }],
    }
    const ghostTable = new Map([['g1', makeRow('g1', 0, { name: 'Ghost' })]])
    const tablesWithGhost = new Map([...tables, ['ghost', ghostTable]])
    const { rows, schema } = applyUnion(query, tablesWithGhost, schemas)
    expect(rows).toHaveLength(3)
    // Ghost columns not added to schema since schema is missing
    expect(schema.columns.map((c) => c.key)).not.toContain('ghost_only_col')
  })

  it('preserves row order from _order field', () => {
    const query: UnionViewQuery = {
      type: 'union',
      sources: [{ from: 'hero' }],
    }
    const { rows } = applyUnion(query, tables, schemas)
    expect(rows[0].name).toBe('Hero A')
    expect(rows[1].name).toBe('Hero B')
  })
})
