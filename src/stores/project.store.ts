import { CompositeCommand, commandHistory } from '@/domain/commands';
import type { Command } from '@/domain/commands';
import { useCommandHistoryStore } from '@/stores/commandHistoryStore';
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
  stealLock as stealLockUtil,
} from '@/utils/autoSave';
import type { SyncMessage } from '@/utils/autoSave';
import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import { createAdapter, getAdapter, loadProjectData, scheduleAutoSave } from './persistence';
import {
  applyCellEdit,
  applyRowDelete,
  applyRowDrop,
  applyRowInsert,
  applyRowRestore,
  computeCellRow,
} from './rowMutations';

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
  deletedRowIds: Map<string, Set<string>>;
  dirtyCellIds: Map<string, Map<string, Set<string>>>;
  adapterType: 'server' | 'file-system-access';

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
  updateCells: (
    updates: { tableName: string; rowId: string; col: string; inputValue: unknown }[]
  ) => void;
  addRow: (tableName: string) => void;
  addRowAfter: (tableName: string, afterRowId: string) => void;
  addRowBefore: (tableName: string, beforeRowId: string) => void;
  deleteRow: (tableName: string, rowId: string) => void;
  clearDraftState: () => void;
  syncDraftFromTab: (msg: SyncMessage) => void;
  releaseLock: () => void;
  stealLock: () => boolean;
  setAdapter: (
    type: 'server' | 'file-system-access',
    dirHandle?: FileSystemDirectoryHandle
  ) => void;
}

type SetState = StoreApi<ProjectState>['setState'];
type GetState = StoreApi<ProjectState>['getState'];

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

/** コマンドを実行し、Undo/Redo の購読状態を同期する。 */
function runCommand(cmd: Command) {
  commandHistory.execute(cmd);
  useCommandHistoryStore.getState().sync();
}

// ---- Undo/Redo 対応コマンドのファクトリ（変更操作の重複を集約）----

function cellEditCommand(
  set: SetState,
  get: GetState,
  tableName: string,
  rowId: string,
  col: string,
  newRow: Row,
  prevRow: Row
): Command {
  const apply = (r: Row) => {
    set((st) => applyCellEdit(st, tableName, rowId, col, r) ?? {});
    scheduleAutoSave(get);
  };
  return { description: 'セル編集', execute: () => apply(newRow), undo: () => apply(prevRow) };
}

function rowAddCommand(
  set: SetState,
  get: GetState,
  tableName: string,
  row: Row,
  description: string
): Command {
  return {
    description,
    execute: () => {
      set((st) => applyRowInsert(st, tableName, row) ?? {});
      scheduleAutoSave(get);
    },
    undo: () => {
      set((st) => applyRowDrop(st, tableName, row._id as string) ?? {});
      scheduleAutoSave(get);
    },
  };
}

function rowDeleteCommand(set: SetState, get: GetState, tableName: string, row: Row): Command {
  return {
    description: '行削除',
    execute: () => {
      set((st) => applyRowDelete(st, tableName, row._id as string) ?? {});
      scheduleAutoSave(get);
    },
    undo: () => {
      set((st) => applyRowRestore(st, tableName, row) ?? {});
      scheduleAutoSave(get);
    },
  };
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
  deletedRowIds: new Map(),
  dirtyCellIds: new Map(),
  adapterType: 'server',

  loadProject: async (path) => {
    const { project, schemas, tables } = await loadProjectData(path);

    const draft = loadDraft(path);
    let hasDraft = false;
    if (draft) {
      const draftTables = deserializeTables(draft.tables);
      for (const [tableName, draftTable] of draftTables.entries()) {
        if (tables.has(tableName)) {
          tables.set(tableName, draftTable);
        }
      }
      hasDraft = true;
    }

    const lock = checkLock(path);
    let writeMode = false;
    let lockHolderTabId: string | null = null;
    if (!lock) {
      if (acquireLock(path)) writeMode = true;
    } else if (lock.tabId === getTabId()) {
      writeMode = true;
    } else {
      lockHolderTabId = lock.tabId;
    }

    commandHistory.clear();
    useCommandHistoryStore.getState().sync();

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
      deletedRowIds: new Map(),
      dirtyCellIds: new Map(),
    });
  },

  saveProjectConfig: async () => {
    const { projectPath, project } = get();
    if (!projectPath || !project) return;
    await getAdapter().writeProjectConfig(projectPath, project);
  },

  addView: async (view) => {
    const { project, saveProjectConfig } = get();
    if (!project) return;
    set({ project: { ...project, views: [...project.views, view] } });
    await saveProjectConfig();
  },

  updateView: async (view) => {
    const { project, saveProjectConfig } = get();
    if (!project) return;
    set({
      project: { ...project, views: project.views.map((v) => (v.id === view.id ? view : v)) },
    });
    await saveProjectConfig();
  },

  deleteView: async (id) => {
    const { project, saveProjectConfig } = get();
    if (!project) return;
    set({ project: { ...project, views: project.views.filter((v) => v.id !== id) } });
    await saveProjectConfig();
  },

  addPageTemplate: async (template) => {
    const { projectPath } = get();
    if (!projectPath) return;
    await getAdapter().writePageTemplate(projectPath, template.name, template);
  },

  deletePageTemplate: async (name) => {
    const { projectPath } = get();
    if (!projectPath) return;
    await getAdapter().deletePageTemplate(projectPath, name);
  },

  readPageTemplate: async (projectPath, name) => {
    return getAdapter().readPageTemplate(projectPath, name);
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
    const { projectPath, tables, dirtyRowIds, deletedRowIds } = get();
    if (!projectPath) return;
    const table = tables.get(name);
    const dirty = dirtyRowIds.get(name);
    const deleted = deletedRowIds.get(name);
    if (!table || ((!dirty || dirty.size === 0) && (!deleted || deleted.size === 0))) return;

    const rows = [...(dirty ?? [])]
      .map((id) => table.get(id))
      .filter((r): r is Row => r !== undefined);
    const deletedIds = [...(deleted ?? [])];

    await getAdapter().patchTable(projectPath, name, rows, deletedIds);

    set((state) => {
      const newDirtyRowIds = new Map(state.dirtyRowIds);
      newDirtyRowIds.set(name, new Set());
      const newDirtyCellIds = new Map(state.dirtyCellIds);
      newDirtyCellIds.delete(name);
      const newDeletedRowIds = new Map(state.deletedRowIds);
      newDeletedRowIds.set(name, new Set());
      const isDirty =
        [...newDirtyRowIds.values()].some((s) => s.size > 0) ||
        [...newDeletedRowIds.values()].some((s) => s.size > 0);
      if (!isDirty) {
        if (state.projectPath) clearDraft(state.projectPath);
        return {
          dirtyRowIds: newDirtyRowIds,
          dirtyCellIds: newDirtyCellIds,
          deletedRowIds: newDeletedRowIds,
          isDirty: false,
          hasDraft: false,
        };
      }
      return {
        dirtyRowIds: newDirtyRowIds,
        dirtyCellIds: newDirtyCellIds,
        deletedRowIds: newDeletedRowIds,
        isDirty: true,
      };
    });
  },

  updateSchema: async (tableName, schema) => {
    const { projectPath } = get();
    if (!projectPath) return;
    await getAdapter().writeSchema(projectPath, tableName, schema);
    set((s) => {
      const newSchemas = new Map(s.schemas);
      newSchemas.set(tableName, schema);
      return { schemas: newSchemas };
    });
  },

  updateCell: (tableName, rowId, col, inputValue) => {
    if (!get().writeMode) return;
    const s = get();
    const row = s.tables.get(tableName)?.get(rowId);
    const colDef = s.schemas.get(tableName)?.columns.find((c) => c.key === col);
    if (!row || !colDef) return;
    const newRow = computeCellRow(row, col, inputValue, colDef);
    runCommand(cellEditCommand(set, get, tableName, rowId, col, newRow, row));
  },

  updateCells: (updates) => {
    if (!get().writeMode) return;
    const s = get();
    const cmds: Command[] = [];
    // 同一行に複数カラムを編集する場合、各コマンドは行全体を置換するため、
    // 直前の編集結果を基点に積み上げないと最後のカラム以外の変更が失われる。
    const rowCache = new Map<string, Row>();
    for (const { tableName, rowId, col, inputValue } of updates) {
      const key = `${tableName} ${rowId}`;
      const baseRow = rowCache.get(key) ?? s.tables.get(tableName)?.get(rowId);
      const colDef = s.schemas.get(tableName)?.columns.find((c) => c.key === col);
      if (!baseRow || !colDef) continue;
      const newRow = computeCellRow(baseRow, col, inputValue, colDef);
      rowCache.set(key, newRow);
      cmds.push(cellEditCommand(set, get, tableName, rowId, col, newRow, baseRow));
    }
    if (cmds.length > 0) {
      runCommand(new CompositeCommand(cmds, '複数セルの編集'));
    }
  },

  addRow: (tableName) => {
    if (!get().writeMode) return;
    const table = get().tables.get(tableName);
    if (!table) return;
    const row: Row = { _id: makeId(), _order: maxOrder(table) + 1000 };
    runCommand(rowAddCommand(set, get, tableName, row, '行追加'));
  },

  addRowAfter: (tableName, afterRowId) => {
    if (!get().writeMode) return;
    const table = get().tables.get(tableName);
    const afterRow = table?.get(afterRowId);
    if (!table || !afterRow) return;

    const afterOrder = afterRow._order as number;
    let nextOrder = afterOrder + 2000;
    for (const r of table.values()) {
      const o = r._order as number;
      if (o > afterOrder && o < nextOrder) nextOrder = o;
    }
    const row: Row = { _id: makeId(), _order: (afterOrder + nextOrder) / 2 };
    runCommand(rowAddCommand(set, get, tableName, row, '行を下に追加'));
  },

  addRowBefore: (tableName, beforeRowId) => {
    if (!get().writeMode) return;
    const table = get().tables.get(tableName);
    const beforeRow = table?.get(beforeRowId);
    if (!table || !beforeRow) return;

    const beforeOrder = beforeRow._order as number;
    let prevOrder = beforeOrder - 2000;
    for (const r of table.values()) {
      const o = r._order as number;
      if (o < beforeOrder && o > prevOrder) prevOrder = o;
    }
    const row: Row = { _id: makeId(), _order: (prevOrder + beforeOrder) / 2 };
    runCommand(rowAddCommand(set, get, tableName, row, '行を上に追加'));
  },

  deleteRow: (tableName, rowId) => {
    if (!get().writeMode) return;
    const row = get().tables.get(tableName)?.get(rowId);
    if (!row) return;
    runCommand(rowDeleteCommand(set, get, tableName, row));
  },

  clearDraftState: () => {
    const { projectPath } = get();
    if (projectPath) clearDraft(projectPath);
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
    if (msg.type !== 'draft-updated' || !msg.draft) return;

    const draftTables = deserializeTables(msg.draft.tables);
    set((s) => {
      const newTables = new Map(s.tables);
      const allDirtyIds = new Map<string, Set<string>>();

      for (const [tableName, draftTable] of draftTables.entries()) {
        const currentTable = s.tables.get(tableName);
        const mergedTable = new Map(currentTable?.entries() ?? []);
        const dirtyIds = new Set<string>();
        for (const [rowId, draftRow] of draftTable.entries()) {
          mergedTable.set(rowId, draftRow);
          dirtyIds.add(rowId);
        }
        newTables.set(tableName, mergedTable);
        if (dirtyIds.size > 0) allDirtyIds.set(tableName, dirtyIds);
      }

      const hasAnyDirty = [...allDirtyIds.values()].some((set) => set.size > 0);
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
    if (ok) set({ writeMode: true, lockHolderTabId: null });
    return ok;
  },

  setAdapter: (type, dirHandle) => {
    set({ adapterType: createAdapter(type, dirHandle) });
  },
}));
