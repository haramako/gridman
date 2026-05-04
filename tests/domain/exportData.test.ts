import { describe, expect, it } from 'vitest'
import { exportToJson, exportToCsv } from '@/domain/exportData'
import type { Row } from '@/types/row'
import type { TableSchema } from '@/types/schema'

const schema: TableSchema = {
  name: 'enemy',
  displayName: '敵',
  columns: [
    { key: 'name', displayName: '名前', type: 'string', isDisplayName: true },
    { key: 'hp', displayName: 'HP', type: 'integer' },
    { key: 'element', displayName: '属性', type: 'enum' },
  ],
}

const rows: Row[] = [
  { _id: 'e001', _order: 1000, name: 'スライム', hp: 30, element: 'water' },
  { _id: 'e002', _order: 2000, name: 'ゴブリン', hp: 50, element: 'fire' },
]

describe('exportToJson', () => {
  it('exports rows as JSON array', () => {
    const result = JSON.parse(exportToJson(rows, schema))
    expect(result).toHaveLength(2)
  })

  it('includes _id in each record', () => {
    const result = JSON.parse(exportToJson(rows, schema))
    expect(result[0]._id).toBe('e001')
    expect(result[1]._id).toBe('e002')
  })

  it('includes schema column values', () => {
    const result = JSON.parse(exportToJson(rows, schema))
    expect(result[0].name).toBe('スライム')
    expect(result[0].hp).toBe(30)
    expect(result[0].element).toBe('water')
  })

  it('excludes internal fields _order and _invalid', () => {
    const result = JSON.parse(exportToJson(rows, schema))
    expect(result[0]._order).toBeUndefined()
    expect(result[0]._invalid).toBeUndefined()
  })

  it('uses null for missing column values', () => {
    const sparseRows: Row[] = [{ _id: 'e003', _order: 3000, name: 'スライム' }]
    const result = JSON.parse(exportToJson(sparseRows, schema))
    expect(result[0].hp).toBeNull()
    expect(result[0].element).toBeNull()
  })

  it('produces valid JSON string', () => {
    expect(() => JSON.parse(exportToJson(rows, schema))).not.toThrow()
  })
})

describe('exportToCsv', () => {
  it('first line contains column display names as header', () => {
    const result = exportToCsv(rows, schema)
    const [header] = result.split('\n')
    expect(header).toBe('名前,HP,属性')
  })

  it('exports correct number of data lines', () => {
    const result = exportToCsv(rows, schema)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3) // header + 2 data rows
  })

  it('exports row data in column order', () => {
    const result = exportToCsv(rows, schema)
    const lines = result.split('\n')
    expect(lines[1]).toBe('スライム,30,water')
    expect(lines[2]).toBe('ゴブリン,50,fire')
  })

  it('escapes commas in cell values', () => {
    const commaRows: Row[] = [{ _id: 'r1', _order: 0, name: 'A,B', hp: 10, element: 'fire' }]
    const result = exportToCsv(commaRows, schema)
    const lines = result.split('\n')
    expect(lines[1]).toContain('"A,B"')
  })

  it('escapes double quotes in cell values', () => {
    const quoteRows: Row[] = [{ _id: 'r1', _order: 0, name: 'A"B', hp: 10, element: 'fire' }]
    const result = exportToCsv(quoteRows, schema)
    const lines = result.split('\n')
    expect(lines[1]).toContain('"A""B"')
  })

  it('outputs empty string for null/undefined values', () => {
    const nullRows: Row[] = [{ _id: 'r1', _order: 0, name: 'X', hp: null, element: undefined }]
    const result = exportToCsv(nullRows, schema)
    const lines = result.split('\n')
    expect(lines[1]).toBe('X,,')
  })

  it('serializes object values as JSON in CSV (RFC4180 escaped)', () => {
    const jsonSchema: TableSchema = {
      name: 't',
      displayName: 'T',
      columns: [{ key: 'data', displayName: 'データ', type: 'json' }],
    }
    const objRows: Row[] = [{ _id: 'r1', _order: 0, data: { a: 1 } }]
    const result = exportToCsv(objRows, jsonSchema)
    const lines = result.split('\n')
    // JSON string contains quotes, so it's wrapped and quotes are doubled per RFC4180
    expect(lines[1]).toBe('"{""a"":1}"')
  })
})
