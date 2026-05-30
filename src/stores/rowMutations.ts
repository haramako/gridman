import { coerceToType, validateCell } from '@/domain/validator';
import type { Row } from '@/types/row';
import type { ColumnDef } from '@/types/schema';

/**
 * 行データと dirty 追跡（保存対象）の状態。project.store の変更操作が共有する部分集合。
 * 各ヘルパは純粋関数で、変更後の partial state を返す（テーブル欠落時は null）。
 */
export type RowState = {
  tables: Map<string, Map<string, Row>>;
  dirtyRowIds: Map<string, Set<string>>;
  deletedRowIds: Map<string, Set<string>>;
  dirtyCellIds: Map<string, Map<string, Set<string>>>;
};

type DirtyFlags = { isDirty: true; hasDraft: true };
const DIRTY: DirtyFlags = { isDirty: true, hasDraft: true };

// ---- Map<string, Set<string>> の不変更新ヘルパ ----

function addToSetMap(
  map: Map<string, Set<string>>,
  key: string,
  value: string
): Map<string, Set<string>> {
  const next = new Map(map);
  const set = new Set(next.get(key) ?? []);
  set.add(value);
  next.set(key, set);
  return next;
}

function removeFromSetMap(
  map: Map<string, Set<string>>,
  key: string,
  value: string
): Map<string, Set<string>> {
  const next = new Map(map);
  const set = new Set(next.get(key) ?? []);
  set.delete(value);
  next.set(key, set);
  return next;
}

function setRowInTables(
  tables: RowState['tables'],
  tableName: string,
  rowId: string,
  row: Row
): RowState['tables'] | null {
  const table = tables.get(tableName);
  if (!table) return null;
  const newTable = new Map(table);
  newTable.set(rowId, row);
  const next = new Map(tables);
  next.set(tableName, newTable);
  return next;
}

function deleteRowInTables(
  tables: RowState['tables'],
  tableName: string,
  rowId: string
): RowState['tables'] | null {
  const table = tables.get(tableName);
  if (!table) return null;
  const newTable = new Map(table);
  newTable.delete(rowId);
  const next = new Map(tables);
  next.set(tableName, newTable);
  return next;
}

function addCellDirty(
  dirtyCellIds: RowState['dirtyCellIds'],
  tableName: string,
  rowId: string,
  col: string
): RowState['dirtyCellIds'] {
  const next = new Map(dirtyCellIds);
  const rowCells = new Map(next.get(tableName) ?? []);
  const cells = new Set(rowCells.get(rowId) ?? []);
  cells.add(col);
  rowCells.set(rowId, cells);
  next.set(tableName, rowCells);
  return next;
}

// ---- セル値の coerce / validate ----

/** セル値を coerce + validate し、_invalid を更新した新しい Row を返す（バリデーション違反値はソフト保存）。 */
export function computeCellRow(row: Row, col: string, inputValue: unknown, colDef: ColumnDef): Row {
  const coerced = coerceToType(inputValue, colDef.type);
  const error = validateCell(coerced, colDef);
  if (error !== null) {
    return { ...row, _invalid: { ...(row._invalid ?? {}), [col]: inputValue } };
  }
  const invalid = { ...(row._invalid ?? {}) };
  delete invalid[col];
  const newRow: Row = { ...row, [col]: coerced };
  newRow._invalid = Object.keys(invalid).length > 0 ? invalid : undefined;
  return newRow;
}

// ---- 変更操作（純粋な state トランスフォーム）----

/** セル編集を反映: テーブル更新 + dirtyRow + dirtyCell。 */
export function applyCellEdit(
  s: RowState,
  tableName: string,
  rowId: string,
  col: string,
  row: Row
) {
  const tables = setRowInTables(s.tables, tableName, rowId, row);
  if (!tables) return null;
  return {
    tables,
    dirtyRowIds: addToSetMap(s.dirtyRowIds, tableName, rowId),
    dirtyCellIds: addCellDirty(s.dirtyCellIds, tableName, rowId, col),
    ...DIRTY,
  };
}

/** 行を挿入（行追加の execute）: テーブル追加 + dirtyRow。 */
export function applyRowInsert(s: RowState, tableName: string, row: Row) {
  const tables = setRowInTables(s.tables, tableName, row._id as string, row);
  if (!tables) return null;
  return {
    tables,
    dirtyRowIds: addToSetMap(s.dirtyRowIds, tableName, row._id as string),
    ...DIRTY,
  };
}

/** 行を取り除く（行追加の undo）: テーブルから除去のみ。 */
export function applyRowDrop(s: RowState, tableName: string, rowId: string) {
  const tables = deleteRowInTables(s.tables, tableName, rowId);
  if (!tables) return null;
  return { tables, ...DIRTY };
}

/** 行を削除（行削除の execute）: テーブル除去 + deletedRowIds 追加 + dirtyRow 除去。 */
export function applyRowDelete(s: RowState, tableName: string, rowId: string) {
  const tables = deleteRowInTables(s.tables, tableName, rowId);
  if (!tables) return null;
  return {
    tables,
    deletedRowIds: addToSetMap(s.deletedRowIds, tableName, rowId),
    dirtyRowIds: removeFromSetMap(s.dirtyRowIds, tableName, rowId),
    ...DIRTY,
  };
}

/** 行を復元（行削除の undo）: テーブル再追加 + dirtyRow 追加 + deletedRowIds 除去。 */
export function applyRowRestore(s: RowState, tableName: string, row: Row) {
  const tables = setRowInTables(s.tables, tableName, row._id as string, row);
  if (!tables) return null;
  return {
    tables,
    dirtyRowIds: addToSetMap(s.dirtyRowIds, tableName, row._id as string),
    deletedRowIds: removeFromSetMap(s.deletedRowIds, tableName, row._id as string),
    ...DIRTY,
  };
}
