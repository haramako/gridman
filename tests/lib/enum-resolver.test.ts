import { describe, expect, it } from 'vitest'
import { resolveEnumValues } from '@/lib/enum-resolver'
import type { ColumnDef } from '@/types/schema'
import type { ProjectConfig } from '@/types/view'

const makeProject = (enumDefs: Array<{ name: string; values: string[] }>): ProjectConfig => ({
  version: 1,
  name: 'test',
  tables: [],
  views: [],
  enums: enumDefs,
})

describe('resolveEnumValues', () => {
  it('returns inline enumValues when present', () => {
    const col: ColumnDef = { key: 'status', displayName: 'Status', type: 'enum', enumValues: ['a', 'b'] }
    expect(resolveEnumValues(col, null)).toEqual(['a', 'b'])
  })

  it('prefers inline enumValues over enumRef', () => {
    const project = makeProject([{ name: 'Colors', values: ['red', 'blue'] }])
    const col: ColumnDef = {
      key: 'status',
      displayName: 'Status',
      type: 'enum',
      enumValues: ['x', 'y'],
      enumRef: 'Colors',
    }
    expect(resolveEnumValues(col, project)).toEqual(['x', 'y'])
  })

  it('resolves enumRef from project enums', () => {
    const project = makeProject([{ name: 'Colors', values: ['red', 'blue'] }])
    const col: ColumnDef = { key: 'color', displayName: 'Color', type: 'enum', enumRef: 'Colors' }
    expect(resolveEnumValues(col, project)).toEqual(['red', 'blue'])
  })

  it('returns undefined when enumRef does not match any project enum', () => {
    const project = makeProject([{ name: 'Colors', values: ['red'] }])
    const col: ColumnDef = { key: 'size', displayName: 'Size', type: 'enum', enumRef: 'Sizes' }
    expect(resolveEnumValues(col, project)).toBeUndefined()
  })

  it('returns undefined when project is null and enumRef is set', () => {
    const col: ColumnDef = { key: 'x', displayName: 'X', type: 'enum', enumRef: 'Foo' }
    expect(resolveEnumValues(col, null)).toBeUndefined()
  })

  it('returns undefined when project has no enums array', () => {
    const project: ProjectConfig = { version: 1, name: 'test', tables: [], views: [] }
    const col: ColumnDef = { key: 'x', displayName: 'X', type: 'enum', enumRef: 'Foo' }
    expect(resolveEnumValues(col, project)).toBeUndefined()
  })

  it('returns undefined when column has neither enumValues nor enumRef', () => {
    const col: ColumnDef = { key: 'name', displayName: 'Name', type: 'string' }
    expect(resolveEnumValues(col, null)).toBeUndefined()
  })
})
