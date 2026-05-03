import { describe, expect, it } from 'vitest'
import { applyFilter, applySort } from '@/domain/filter'
import type { Row } from '@/types/row'

const row = (fields: Record<string, unknown>): Row => ({
  _id: 'r1',
  _order: 0,
  ...fields,
})

const rows: Row[] = [
  { _id: '1', _order: 0, name: 'Alice', age: 30, score: 88.5 },
  { _id: '2', _order: 1, name: 'Bob', age: 25, score: 72.0 },
  { _id: '3', _order: 2, name: 'Charlie', age: 30, score: 95.0 },
  { _id: '4', _order: 3, name: 'Dave', age: null, score: null },
]

describe('applyFilter', () => {
  it('returns all rows when expr is undefined', () => {
    expect(applyFilter(rows, undefined)).toHaveLength(4)
  })

  describe('eq / neq', () => {
    it('filters by eq', () => {
      const result = applyFilter(rows, { column: 'name', op: 'eq', value: 'Alice' })
      expect(result.map((r) => r._id)).toEqual(['1'])
    })
    it('filters by neq', () => {
      const result = applyFilter(rows, { column: 'name', op: 'neq', value: 'Alice' })
      expect(result.map((r) => r._id)).toEqual(['2', '3', '4'])
    })
  })

  describe('numeric comparisons', () => {
    it('gt filters correctly', () => {
      const result = applyFilter(rows, { column: 'age', op: 'gt', value: 25 })
      expect(result.map((r) => r._id)).toEqual(['1', '3'])
    })
    it('gte includes boundary', () => {
      const result = applyFilter(rows, { column: 'age', op: 'gte', value: 30 })
      expect(result.map((r) => r._id)).toEqual(['1', '3'])
    })
    it('lt filters correctly', () => {
      // null coerces to Number(null)=0, which is < 30, so row4 is included
      const result = applyFilter(rows, { column: 'age', op: 'lt', value: 30 })
      expect(result.map((r) => r._id)).toEqual(['2', '4'])
    })
    it('lte includes boundary', () => {
      // null coerces to 0, which is <= 25
      const result = applyFilter(rows, { column: 'age', op: 'lte', value: 25 })
      expect(result.map((r) => r._id)).toEqual(['2', '4'])
    })
  })

  describe('string matching', () => {
    it('contains matches substring', () => {
      const result = applyFilter(rows, { column: 'name', op: 'contains', value: 'li' })
      expect(result.map((r) => r._id)).toEqual(['1', '3'])
    })
    it('startsWith matches prefix', () => {
      const result = applyFilter(rows, { column: 'name', op: 'startsWith', value: 'b' })
      expect(result.map((r) => r._id)).toEqual(['2'])
    })
    it('contains is case-insensitive', () => {
      const result = applyFilter(rows, { column: 'name', op: 'contains', value: 'ALICE' })
      expect(result.map((r) => r._id)).toEqual(['1'])
    })
  })

  describe('null checks', () => {
    it('isNull matches null values', () => {
      const result = applyFilter(rows, { column: 'age', op: 'isNull' })
      expect(result.map((r) => r._id)).toEqual(['4'])
    })
    it('isNotNull excludes null values', () => {
      const result = applyFilter(rows, { column: 'age', op: 'isNotNull' })
      expect(result.map((r) => r._id)).toEqual(['1', '2', '3'])
    })
  })

  describe('and / or', () => {
    it('and requires all conditions', () => {
      const result = applyFilter(rows, {
        op: 'and',
        conditions: [
          { column: 'age', op: 'eq', value: 30 },
          { column: 'score', op: 'gte', value: 90 },
        ],
      })
      expect(result.map((r) => r._id)).toEqual(['3'])
    })
    it('or matches any condition', () => {
      const result = applyFilter(rows, {
        op: 'or',
        conditions: [
          { column: 'name', op: 'eq', value: 'Alice' },
          { column: 'name', op: 'eq', value: 'Bob' },
        ],
      })
      expect(result.map((r) => r._id)).toEqual(['1', '2'])
    })
    it('nested and inside or', () => {
      const result = applyFilter(rows, {
        op: 'or',
        conditions: [
          { column: 'name', op: 'eq', value: 'Dave' },
          {
            op: 'and',
            conditions: [
              { column: 'age', op: 'eq', value: 25 },
              { column: 'name', op: 'eq', value: 'Bob' },
            ],
          },
        ],
      })
      expect(result.map((r) => r._id)).toEqual(['2', '4'])
    })
  })
})

describe('applySort', () => {
  it('returns same array reference when no sorts', () => {
    const result = applySort(rows, undefined)
    expect(result).toBe(rows)
  })

  it('sorts numbers ascending', () => {
    // null coerces to Number(null)=0, sorts before 25
    const result = applySort(rows, [{ column: 'age', order: 'asc' }])
    expect(result.map((r) => r.age)).toEqual([null, 25, 30, 30])
  })

  it('sorts numbers descending', () => {
    const result = applySort(rows, [{ column: 'score', order: 'desc' }])
    expect(result[0].score).toBe(95.0)
    expect(result[1].score).toBe(88.5)
  })

  it('sorts strings ascending', () => {
    const result = applySort(rows, [{ column: 'name', order: 'asc' }])
    expect(result.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Dave'])
  })

  it('sorts strings descending', () => {
    const result = applySort(rows, [{ column: 'name', order: 'desc' }])
    expect(result.map((r) => r.name)).toEqual(['Dave', 'Charlie', 'Bob', 'Alice'])
  })

  it('does not mutate original array', () => {
    const original = [...rows]
    applySort(rows, [{ column: 'name', order: 'desc' }])
    expect(rows.map((r) => r._id)).toEqual(original.map((r) => r._id))
  })

  it('uses secondary sort when primary values are equal', () => {
    const result = applySort(rows, [
      { column: 'age', order: 'asc' },
      { column: 'name', order: 'asc' },
    ])
    const age30 = result.filter((r) => r.age === 30)
    expect(age30.map((r) => r.name)).toEqual(['Alice', 'Charlie'])
  })
})
