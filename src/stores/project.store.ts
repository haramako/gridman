import { commandHistory, CompositeCommand } from '@/domain/commands';
import type { Command } from '@/domain/commands';
import { coerceToType, validateCell } from '@/domain/validator';
import { LocalServerAdapter } from '@/fs/local-server';
import type { PageTemplate } from '@/types/page';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { ProjectConfig, ViewDefinition } from '@/types/view';
import {
  acquireLock,
  checkLock,
  clearDraft,
  deserializeTables,
  getTabId,
  loadDraft,
  releaseLock as releaseLockUtil,
  saveDraft,
  stealLock as stealLockUtil,
} from '@/utils/autoSave';
import type { SyncMessage } from '@/utils/autoSave';
import { create } from 'zustand';

const adapter = new LocalServerAdapter();

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const state = useProjectStore.getState();
    if (state.projectPath && state.writeMode) {
      saveDraft(state.projectPath, state.tables);
    }
  }, 500);
}

interface ProjectState {
  projectPath: string | null;
  project: ProjectConfig | null;
  tables: Map<string, Map<string, Row>>;
  schemas: Map<string, TableSchema>;
  isDirty: boolean;
  hasDraft: boolean;
  writeMode: boolean;
  lockHolderTabId: string | null;
  dirtyRowIds: Map<string, Set<string>>;
  dirtyCellIds: Map<string, Map<string, Set<string>>>;

  loadProject: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;
  saveTable: (name: string) => Promise<void>;
  saveProjectConfig: () => Promise<void>;
  addView: (view: ViewDefinition) => Promise<void>;
  updateView: (view: ViewDefinition) => Promise<void>;
  deleteView: (id: string) => Promise<void>;
  addPageTemplate: (template: PageTemplate & { id?: string }) => Promise<void>;
  deletePageTemplate: (name: string) => Promise<void>;
  readPageTemplate: (projectPath: string, name: string) => Promise<PageTemplate>;
  updateSchema: (tableName: string, schema: TableSchema) => Promise<void>;
  updateCell: (tableName: string, rowId: string, col: string, inputValue: unknown) => void;
  updateCells: (updates: { tableName: string; rowId: string; col: string; inputValue: unknown }[]) => void;
  addRow: (tableName: string) => void;
  addRowAfter: (tableName: string, afterRowId: string) => void;
  addRowBefore: (tableName: string, beforeRowId: string) => void;
  deleteRow: (tableName: string, rowId: string) => void;
  undo: () => void;
  redo: () => void;
  clearDraftState: () => void;
  syncDraftFromTab: (msg: SyncMessage) => void;
  releaseLock: () => void;
  stealLock: () => boolean;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function maxOrder(table: Map<string, Row>): number {
  let max = 0;
  for (const row of table.values()) {
    if ((row._order as number) > max) max = row._order as number;
  }
  return max;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  project: null,
  tables: new Map(),
  schemas: new Map(),
  isDirty: false,
  hasDraft: false,
  writeMode: false,
  lockHolderTabId: null,
  dirtyRowIds: new Map(),
  dirtyCellIds: new Map(),

  loadProject: async (path) => {
    const project = await adapter.readProjectConfig(path);
    const schemas = new Map<string, TableSchema>();
    const tables = new Map<string, Map<string, Row>>();

    await Promise.all(
      project.tables.map(async (name) => {
        const [schema, rows] = await Promise.all([
          adapter.readSchema(path, name),
          adapter.readTable(path, name),
        ]);
        schemas.set(name, schema);
        const tableMap = new Map<string, Row>();
        for (const row of rows) tableMap.set(row._id as string, row);
        tables.set(name, tableMap);
      })
    );

    const draft = loadDraft(path);
    let hasDraft = false;
    if (draft) {
      const draftTables = deserializeTables(draft.tables);
      for (const [tableName, draftTable] of draftTables.entries()) {
        const existing = tables.get(tableName);
        if (existing) {
          for (const [rowId, draftRow] of draftTable.entries()) {
            existing.set(rowId, draftRow);
          }
        }
      }
      hasDraft = true;
    }

    const lock = checkLock(path);
    let writeMode = false;
    let lockHolderTabId: string | null = null;
    if (!lock) {
      const acquired = acquireLock(path);
      if (acquired) {
        writeMode = true;
      }
    } else {
      if (lock.tabId === getTabId()) {
        writeMode = true;
      } else {
        lockHolderTabId = lock.tabId;
      }
    }

    commandHistory.clear();

    set({
      projectPath: path,
      project,
      schemas,
      tables,
      isDirty: false,
      hasDraft,
      writeMode,
      lockHolderTabId,
      dirtyRowIds: new Map(),
      dirtyCellIds: new Map(),
    });
  },

  saveProjectConfig: async () => {
    const { projectPath, project } = get();
    if (!projectPath || !project) return;
    await adapter.writeProjectConfig(projectPath, project);
  },

  addView: async (view) => {
    const { project, saveProjectConfig } = get();
    if (!project) return;
    const newProject = { ...project, views: [...project.views, view] };
    set({ project: newProject });
    await saveProjectConfig();
  },

  updateView: async (view) => {
    const { project, saveProjectConfig } = get();
    if (!project) return;
    const newProject = {
      ...project,
      views: project.views.map((v) => (v.id === view.id ? view : v)),
    };
    set({ project: newProject });
    await saveProjectConfig();
  },

  deleteView: async (id) => {
    const { project, saveProjectConfig } = get();
    if (!project) return;
    const newProject = { ...project, views: project.views.filter((v) => v.id !== id) };
    set({ project: newProject });
    await saveProjectConfig();
  },

  addPageTemplate: async (template) => {
    const { projectPath } = get();
    if (!projectPath) return;
    await adapter.writePageTemplate(projectPath, template.name, template);
  },

  deletePageTemplate: async (name) => {
    const { projectPath } = get();
    if (!projectPath) return;
    await adapter.deletePageTemplate(projectPath, name);
  },

  readPageTemplate: async (projectPath, name) => {
    return adapter.readPageTemplate(projectPath, name);
  },

  saveAll: async () => {
    const { project, saveTable } = get();
    if (!project) return;
    await Promise.all(project.tables.map((name) => saveTable(name)));
    const { projectPath } = get();
    if (projectPath) {
      clearDraft(projectPath);
      set({ hasDraft: false });
    }
  },

  saveTable: async (name) => {
    const { projectPath, tables, dirtyRowIds } = get();
    if (!projectPath) return;
    const table = tables.get(name);
    const dirty = dirtyRowIds.get(name);
    if (!table || !dirty || dirty.size === 0) return;

    const rows = [...dirty].map((id) => table.get(id)).filter((r): r is Row => r !== undefined);

    await adapter.patchTable(projectPath, name, rows);

    set((state) => {
      const newDirtyRowIds = new Map(state.dirtyRowIds);
      newDirtyRowIds.set(name, new Set());
      const newDirtyCellIds = new Map(state.dirtyCellIds);
      newDirtyCellIds.delete(name);
      const isDirty = [...newDirtyRowIds.values()].some((s) => s.size > 0);
      if (!isDirty) {
        if (state.projectPath) clearDraft(state.projectPath);
        return { dirtyRowIds: newDirtyRowIds, dirtyCellIds: newDirtyCellIds, isDirty: false, hasDraft: false };
      } else {
        return { dirtyRowIds: newDirtyRowIds, dirtyCellIds: newDirtyCellIds, isDirty: true };
      }
    });
  },

  updateSchema: async (tableName, schema) => {
    const { projectPath } = get();
    if (!projectPath) return;
    await adapter.writeSchema(projectPath, tableName, schema);
    set((s) => {
      const newSchemas = new Map(s.schemas);
      newSchemas.set(tableName, schema);
      return { schemas: newSchemas };
    });
  },

   updateCell: (tableName, rowId, col, inputValue) => {
     if (!get().writeMode) return;
     const state = get();
     const table = state.tables.get(tableName);
     const row = table?.get(rowId);
     const schema = state.schemas.get(tableName);
     const colDef = schema?.columns.find((c) => c.key === col);
     if (!table || !row || !colDef) return;

     const coerced = coerceToType(inputValue, colDef.type);
     const error = validateCell(coerced, colDef);

     let newRow: Row;
     if (error !== null) {
       const invalid = { ...(row._invalid ?? {}), [col]: inputValue };
       newRow = { ...row, _invalid: invalid };
     } else {
       const invalid = { ...(row._invalid ?? {}) };
       delete invalid[col];
       newRow = { ...row, [col]: coerced };
       if (Object.keys(invalid).length > 0) newRow._invalid = invalid;
       else delete newRow._invalid;
     }

     const prevRow = row;

     const applyRow = (r: Row) => {
       set((s) => {
         const t = s.tables.get(tableName);
         if (!t) return s;
         const newTable = new Map(t);
         newTable.set(rowId, r);
         const newTables = new Map(s.tables);
         newTables.set(tableName, newTable);
         const newDirtyRowIds = new Map(s.dirtyRowIds);
         const dirty = new Set(newDirtyRowIds.get(tableName) ?? []);
         dirty.add(rowId);
         newDirtyRowIds.set(tableName, dirty);
         const newDirtyCellIds = new Map(s.dirtyCellIds);
         const rowCells = new Map(newDirtyCellIds.get(tableName) ?? []);
         const cells = new Set(rowCells.get(rowId) ?? []);
         cells.add(col);
         rowCells.set(rowId, cells);
         newDirtyCellIds.set(tableName, rowCells);
         return { tables: newTables, dirtyRowIds: newDirtyRowIds, dirtyCellIds: newDirtyCellIds, isDirty: true, hasDraft: true };
       });
       scheduleAutoSave();
     };

     const cmd: Command = {
       description: 'セル編集',
       execute() {
         applyRow(newRow);
       },
       undo() {
         applyRow(prevRow);
       },
     };

     commandHistory.execute(cmd);
   },

   updateCells: (updates: { tableName: string; rowId: string; col: string; inputValue: unknown }[]) => {
     if (!get().writeMode) return;
     const cmds: Command[] = [];
     for (const { tableName, rowId, col, inputValue } of updates) {
       const state = get();
       const table = state.tables.get(tableName);
       const row = table?.get(rowId);
       const schema = state.schemas.get(tableName);
       const colDef = schema?.columns.find((c) => c.key === col);
       if (!table || !row || !colDef) continue;

       const coerced = coerceToType(inputValue, colDef.type);
       const error = validateCell(coerced, colDef);

       let newRow: Row;
       if (error !== null) {
         const invalid = { ...(row._invalid ?? {}), [col]: inputValue };
         newRow = { ...row, _invalid: invalid };
       } else {
         const invalid = { ...(row._invalid ?? {}) };
         delete invalid[col];
         newRow = { ...row, [col]: coerced };
         if (Object.keys(invalid).length > 0) newRow._invalid = invalid;
         else delete newRow._invalid;
       }

       const prevRow = row;

       const applyRow = (r: Row) => {
         set((s) => {
           const t = s.tables.get(tableName);
           if (!t) return s;
           const newTable = new Map(t);
           newTable.set(rowId, r);
           const newTables = new Map(s.tables);
           newTables.set(tableName, newTable);
           const newDirtyRowIds = new Map(s.dirtyRowIds);
           const dirty = new Set(newDirtyRowIds.get(tableName) ?? []);
           dirty.add(rowId);
           newDirtyRowIds.set(tableName, dirty);
           const newDirtyCellIds = new Map(s.dirtyCellIds);
           const rowCells = new Map(newDirtyCellIds.get(tableName) ?? []);
           const cells = new Set(rowCells.get(rowId) ?? []);
           cells.add(col);
           rowCells.set(rowId, cells);
           newDirtyCellIds.set(tableName, rowCells);
           return { tables: newTables, dirtyRowIds: newDirtyRowIds, dirtyCellIds: newDirtyCellIds, isDirty: true, hasDraft: true };
         });
         scheduleAutoSave();
       };

       cmds.push({
         description: 'セル編集',
         execute() {
           applyRow(newRow);
         },
         undo() {
           applyRow(prevRow);
         },
       });
     }
     if (cmds.length > 0) {
       commandHistory.execute(new CompositeCommand(cmds, '複数セルの編集'));
     }
   },

  addRow: (tableName) => {
    if (!get().writeMode) return;
    const { tables } = get();
    const table = tables.get(tableName);
    if (!table) return;

    const id = makeId();
    const order = maxOrder(table) + 1000;
    const newRow: Row = { _id: id, _order: order };

    const doAdd = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.set(id, newRow);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        const newDirtyRowIds = new Map(s.dirtyRowIds);
        const dirty = new Set(newDirtyRowIds.get(tableName) ?? []);
        dirty.add(id);
        newDirtyRowIds.set(tableName, dirty);
        return { tables: newTables, dirtyRowIds: newDirtyRowIds, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    const doDelete = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.delete(id);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        return { tables: newTables, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    const cmd: Command = {
      description: '行追加',
      execute() {
        doAdd();
      },
      undo() {
        doDelete();
      },
    };

    commandHistory.execute(cmd);
  },

  addRowAfter: (tableName, afterRowId) => {
    if (!get().writeMode) return;
    const { tables } = get();
    const table = tables.get(tableName);
    if (!table) return;

    const afterRow = table.get(afterRowId);
    if (!afterRow) return;

    const afterOrder = afterRow._order as number;
    let nextOrder = afterOrder + 2000;
    for (const row of table.values()) {
      const o = row._order as number;
      if (o > afterOrder && o < nextOrder) nextOrder = o;
    }

    const id = makeId();
    const order = (afterOrder + nextOrder) / 2;
    const newRow: Row = { _id: id, _order: order };

    const doAdd = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.set(id, newRow);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        const newDirtyRowIds = new Map(s.dirtyRowIds);
        const dirty = new Set(newDirtyRowIds.get(tableName) ?? []);
        dirty.add(id);
        newDirtyRowIds.set(tableName, dirty);
        return { tables: newTables, dirtyRowIds: newDirtyRowIds, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    const doDelete = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.delete(id);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        return { tables: newTables, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    commandHistory.execute({
      description: '行を下に追加',
      execute() {
        doAdd();
      },
      undo() {
        doDelete();
      },
    });
  },

  addRowBefore: (tableName, beforeRowId) => {
    if (!get().writeMode) return;
    const { tables } = get();
    const table = tables.get(tableName);
    if (!table) return;

    const beforeRow = table.get(beforeRowId);
    if (!beforeRow) return;

    const beforeOrder = beforeRow._order as number;
    let prevOrder = beforeOrder - 2000;
    for (const row of table.values()) {
      const o = row._order as number;
      if (o < beforeOrder && o > prevOrder) prevOrder = o;
    }

    const id = makeId();
    const order = (prevOrder + beforeOrder) / 2;
    const newRow: Row = { _id: id, _order: order };

    const doAdd = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.set(id, newRow);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        const newDirtyRowIds = new Map(s.dirtyRowIds);
        const dirty = new Set(newDirtyRowIds.get(tableName) ?? []);
        dirty.add(id);
        newDirtyRowIds.set(tableName, dirty);
        return { tables: newTables, dirtyRowIds: newDirtyRowIds, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    const doDelete = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.delete(id);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        return { tables: newTables, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    commandHistory.execute({
      description: '行を上に追加',
      execute() {
        doAdd();
      },
      undo() {
        doDelete();
      },
    });
  },

  deleteRow: (tableName, rowId) => {
    if (!get().writeMode) return;
    const { tables } = get();
    const table = tables.get(tableName);
    const row = table?.get(rowId);
    if (!table || !row) return;

    const doDelete = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.delete(rowId);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        return { tables: newTables, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    const doAdd = () => {
      set((s) => {
        const t = s.tables.get(tableName);
        if (!t) return s;
        const newTable = new Map(t);
        newTable.set(rowId, row);
        const newTables = new Map(s.tables);
        newTables.set(tableName, newTable);
        const newDirtyRowIds = new Map(s.dirtyRowIds);
        const dirty = new Set(newDirtyRowIds.get(tableName) ?? []);
        dirty.add(rowId);
        newDirtyRowIds.set(tableName, dirty);
        return { tables: newTables, dirtyRowIds: newDirtyRowIds, isDirty: true, hasDraft: true };
      });
      scheduleAutoSave();
    };

    const cmd: Command = {
      description: '行削除',
      execute() {
        doDelete();
      },
      undo() {
        doAdd();
      },
    };

    commandHistory.execute(cmd);
  },

  undo: () => {
    commandHistory.undo();
  },

  redo: () => {
    commandHistory.redo();
  },

  clearDraftState: () => {
    const { projectPath } = get();
    if (projectPath) {
      clearDraft(projectPath);
    }
    set({ hasDraft: false });
  },

  syncDraftFromTab: (msg) => {
    const { projectPath } = get();
    if (!projectPath || msg.projectPath !== projectPath) return;

    if (msg.type === 'lock-acquired') {
      set({ writeMode: false, lockHolderTabId: msg.tabId });
      return;
    }

    if (msg.type === 'lock-released') {
      set({ lockHolderTabId: null });
      return;
    }

    if (msg.type !== 'draft-updated') return;
    if (!msg.draft) return;

    const draftTables = deserializeTables(msg.draft.tables);
    set((s) => {
      const newTables = new Map(s.tables);
      const allDirtyIds = new Map<string, Set<string>>();

      for (const [tableName, draftTable] of draftTables.entries()) {
        const currentTable = s.tables.get(tableName);
        const mergedTable = new Map(currentTable?.entries() ?? []);
        const dirtyIds = new Set<string>();

        for (const [rowId, draftRow] of draftTable.entries()) {
          const currentRow = mergedTable.get(rowId);
          if (!currentRow || (currentRow._order as number) <= (draftRow._order as number)) {
            mergedTable.set(rowId, draftRow);
            dirtyIds.add(rowId);
          }
        }

        newTables.set(tableName, mergedTable);
        if (dirtyIds.size > 0) {
          allDirtyIds.set(tableName, dirtyIds);
        }
      }

      const hasAnyDirty = [...allDirtyIds.values()].some((s) => s.size > 0);
      return {
        tables: newTables,
        dirtyRowIds: new Map([...s.dirtyRowIds.entries(), ...allDirtyIds.entries()]),
        isDirty: hasAnyDirty || s.isDirty,
        hasDraft: true,
      };
    });
  },

  releaseLock: () => {
    const { projectPath } = get();
    if (!projectPath) return;
    releaseLockUtil(projectPath);
    set({ writeMode: false, lockHolderTabId: null });
  },

  stealLock: () => {
    const { projectPath } = get();
    if (!projectPath) return false;
    const ok = stealLockUtil(projectPath);
    if (ok) {
      set({ writeMode: true, lockHolderTabId: null });
    }
    return ok;
  },
}));
