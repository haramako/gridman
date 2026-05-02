import { create } from 'zustand'
import { LocalServerAdapter } from '@/fs/local-server'
import { coerceToType, validateCell } from '@/domain/validator'
import type { Row } from '@/types/row'
import type { TableSchema } from '@/types/schema'
import type { ProjectConfig } from '@/types/view'

const adapter = new LocalServerAdapter()

interface ProjectState {
  projectPath: string | null
  project: ProjectConfig | null
  tables: Map<string, Map<string, Row>>
  schemas: Map<string, TableSchema>
  isDirty: boolean
  dirtyRowIds: Map<string, Set<string>>

  loadProject: (path: string) => Promise<void>
  saveAll: () => Promise<void>
  saveTable: (name: string) => Promise<void>
  updateCell: (tableName: string, rowId: string, col: string, inputValue: unknown) => void
  addRow: (tableName: string) => void
  deleteRow: (tableName: string, rowId: string) => void
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 8)
}

function maxOrder(table: Map<string, Row>): number {
  let max = 0
  for (const row of table.values()) {
    if ((row._order as number) > max) max = row._order as number
  }
  return max
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  project: null,
  tables: new Map(),
  schemas: new Map(),
  isDirty: false,
  dirtyRowIds: new Map(),

  loadProject: async (path) => {
    const project = await adapter.readProjectConfig(path)
    const schemas = new Map<string, TableSchema>()
    const tables = new Map<string, Map<string, Row>>()

    await Promise.all(
      project.tables.map(async (name) => {
        const [schema, rows] = await Promise.all([
          adapter.readSchema(path, name),
          adapter.readTable(path, name),
        ])
        schemas.set(name, schema)
        const tableMap = new Map<string, Row>()
        for (const row of rows) tableMap.set(row._id as string, row)
        tables.set(name, tableMap)
      })
    )

    set({
      projectPath: path,
      project,
      schemas,
      tables,
      isDirty: false,
      dirtyRowIds: new Map(),
    })
  },

  saveAll: async () => {
    const { project, saveTable } = get()
    if (!project) return
    await Promise.all(project.tables.map((name) => saveTable(name)))
  },

  saveTable: async (name) => {
    const { projectPath, tables, dirtyRowIds } = get()
    if (!projectPath) return
    const table = tables.get(name)
    const dirty = dirtyRowIds.get(name)
    if (!table || !dirty || dirty.size === 0) return

    const rows = [...dirty]
      .map((id) => table.get(id))
      .filter((r): r is Row => r !== undefined)

    await adapter.patchTable(projectPath, name, rows)

    const newDirtyRowIds = new Map(dirtyRowIds)
    newDirtyRowIds.set(name, new Set())
    const isDirty = [...newDirtyRowIds.values()].some((s) => s.size > 0)
    set({ dirtyRowIds: newDirtyRowIds, isDirty })
  },

  updateCell: (tableName, rowId, col, inputValue) => {
    set((state) => {
      const table = state.tables.get(tableName)
      const row = table?.get(rowId)
      const schema = state.schemas.get(tableName)
      const colDef = schema?.columns.find((c) => c.key === col)
      if (!table || !row || !colDef) return state

      const coerced = coerceToType(inputValue, colDef.type)
      const error = validateCell(coerced, colDef)

      let newRow: Row
      if (error !== null) {
        const invalid = { ...(row._invalid ?? {}), [col]: inputValue }
        newRow = { ...row, _invalid: invalid }
      } else {
        const invalid = { ...(row._invalid ?? {}) }
        delete invalid[col]
        newRow = { ...row, [col]: coerced }
        if (Object.keys(invalid).length > 0) newRow._invalid = invalid
        else delete newRow._invalid
      }

      const newTable = new Map(table)
      newTable.set(rowId, newRow)
      const newTables = new Map(state.tables)
      newTables.set(tableName, newTable)

      const newDirtyRowIds = new Map(state.dirtyRowIds)
      const dirty = new Set(newDirtyRowIds.get(tableName) ?? [])
      dirty.add(rowId)
      newDirtyRowIds.set(tableName, dirty)

      return { tables: newTables, dirtyRowIds: newDirtyRowIds, isDirty: true }
    })
  },

  addRow: (tableName) => {
    set((state) => {
      const table = state.tables.get(tableName)
      if (!table) return state

      const id = makeId()
      const order = maxOrder(table) + 1000
      const newRow: Row = { _id: id, _order: order }
      const newTable = new Map(table)
      newTable.set(id, newRow)
      const newTables = new Map(state.tables)
      newTables.set(tableName, newTable)

      const newDirtyRowIds = new Map(state.dirtyRowIds)
      const dirty = new Set(newDirtyRowIds.get(tableName) ?? [])
      dirty.add(id)
      newDirtyRowIds.set(tableName, dirty)

      return { tables: newTables, dirtyRowIds: newDirtyRowIds, isDirty: true }
    })
  },

  deleteRow: (tableName, rowId) => {
    set((state) => {
      const table = state.tables.get(tableName)
      if (!table) return state

      const newTable = new Map(table)
      newTable.delete(rowId)
      const newTables = new Map(state.tables)
      newTables.set(tableName, newTable)

      // 削除された行は dirty から外す（サーバー側で DELETE API が必要だが Phase 1 は全行上書き保存で対応）
      return { tables: newTables, isDirty: true }
    })
  },
}))
