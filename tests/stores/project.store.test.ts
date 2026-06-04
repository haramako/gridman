import { commandHistory } from '@/domain/commands';
import { useProjectStore } from '@/stores/project.store';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const schema: TableSchema = {
  name: 'enemy',
  displayName: '敵',
  columns: [
    { key: 'name', displayName: '名前', type: 'string' },
    { key: 'hp', displayName: 'HP', type: 'integer' },
    { key: 'attack', displayName: '攻撃力', type: 'integer' },
  ],
};

function setupStore(rows: Row[]): void {
  const table = new Map(rows.map((r) => [r._id as string, r]));
  useProjectStore.setState({
    projectPath: null,
    project: null,
    tables: new Map([['enemy', table]]),
    schemas: new Map([['enemy', schema]]),
    writeMode: true,
    isDirty: false,
    dirtyRowIds: new Map(),
    deletedRowIds: new Map(),
    dirtyCellIds: new Map(),
  });
}

const getRow = (id: string): Row => useProjectStore.getState().tables.get('enemy')?.get(id) as Row;

beforeEach(() => {
  // scheduleAutoSave の setTimeout がテスト後に残らないよう fake timer 化
  vi.useFakeTimers();
  commandHistory.clear();
  setupStore([
    { _id: 'r1', _order: 0, name: 'スライム', hp: 10, attack: 3 },
    { _id: 'r2', _order: 1, name: 'ゴブリン', hp: 20, attack: 5 },
  ]);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('updateCells', () => {
  it('同一行の複数カラムを更新すると全カラムが反映される', () => {
    useProjectStore.getState().updateCells([
      { tableName: 'enemy', rowId: 'r1', col: 'hp', inputValue: '777' },
      { tableName: 'enemy', rowId: 'r1', col: 'attack', inputValue: '888' },
    ]);

    // 行全体置換でも最後のカラム以外が失われないこと（回帰ガード）
    expect(getRow('r1').hp).toBe(777);
    expect(getRow('r1').attack).toBe(888);
  });

  it('複数セルの編集が1回のUNDOでまとめて元に戻る', () => {
    useProjectStore.getState().updateCells([
      { tableName: 'enemy', rowId: 'r1', col: 'hp', inputValue: '777' },
      { tableName: 'enemy', rowId: 'r1', col: 'attack', inputValue: '888' },
    ]);

    commandHistory.undo();

    expect(getRow('r1').hp).toBe(10);
    expect(getRow('r1').attack).toBe(3);
    // CompositeCommand 1件として積まれるため、1回の undo で履歴が空になる
    expect(commandHistory.canUndo).toBe(false);
  });

  it('UNDO後のREDOで全カラムが再度反映される', () => {
    useProjectStore.getState().updateCells([
      { tableName: 'enemy', rowId: 'r1', col: 'hp', inputValue: '777' },
      { tableName: 'enemy', rowId: 'r1', col: 'attack', inputValue: '888' },
    ]);
    commandHistory.undo();
    commandHistory.redo();

    expect(getRow('r1').hp).toBe(777);
    expect(getRow('r1').attack).toBe(888);
  });

  it('複数行にまたがる更新も全行反映される', () => {
    useProjectStore.getState().updateCells([
      { tableName: 'enemy', rowId: 'r1', col: 'hp', inputValue: '100' },
      { tableName: 'enemy', rowId: 'r2', col: 'hp', inputValue: '200' },
    ]);

    expect(getRow('r1').hp).toBe(100);
    expect(getRow('r2').hp).toBe(200);
  });

  it('writeMode が false のときは何もしない', () => {
    useProjectStore.setState({ writeMode: false });
    useProjectStore
      .getState()
      .updateCells([{ tableName: 'enemy', rowId: 'r1', col: 'hp', inputValue: '777' }]);

    expect(getRow('r1').hp).toBe(10);
    expect(commandHistory.canUndo).toBe(false);
  });
});

describe('updateCell', () => {
  it('単一セルを更新し、UNDOで元に戻る', () => {
    useProjectStore.getState().updateCell('enemy', 'r1', 'hp', '42');
    expect(getRow('r1').hp).toBe(42);

    commandHistory.undo();
    expect(getRow('r1').hp).toBe(10);
  });

  it('writeMode が false のときは何もしない', () => {
    useProjectStore.setState({ writeMode: false });
    useProjectStore.getState().updateCell('enemy', 'r1', 'hp', '42');

    expect(getRow('r1').hp).toBe(10);
    expect(commandHistory.canUndo).toBe(false);
  });
});

describe('行の追加・削除（_order 計算と状態遷移）', () => {
  const allRows = (): Row[] => [...(useProjectStore.getState().tables.get('enemy')?.values() ?? [])];
  const ids = (): Set<string> => new Set(allRows().map((r) => r._id as string));
  const newRow = (prevIds: Set<string>): Row =>
    allRows().find((r) => !prevIds.has(r._id as string)) as Row;

  // order を 0 / 1000 / 2000 に並べ直して中点計算を検証しやすくする
  beforeEach(() => {
    setupStore([
      { _id: 'a', _order: 0, name: 'A', hp: 1, attack: 1 },
      { _id: 'b', _order: 1000, name: 'B', hp: 2, attack: 2 },
      { _id: 'c', _order: 2000, name: 'C', hp: 3, attack: 3 },
    ]);
  });

  it('addRow は末尾 order + 1000 で追加する', () => {
    const before = ids();
    useProjectStore.getState().addRow('enemy');
    expect(newRow(before)._order).toBe(3000);
  });

  it('addRowAfter は次の行との中点 order で追加する', () => {
    const before = ids();
    useProjectStore.getState().addRowAfter('enemy', 'a'); // a(0) と b(1000) の間
    expect(newRow(before)._order).toBe(500);
  });

  it('addRowAfter で末尾行の後ろは +2000 の中点になる', () => {
    const before = ids();
    useProjectStore.getState().addRowAfter('enemy', 'c'); // c(2000) の後ろ → (2000+4000)/2
    expect(newRow(before)._order).toBe(3000);
  });

  it('addRowBefore は前の行との中点 order で追加する', () => {
    const before = ids();
    useProjectStore.getState().addRowBefore('enemy', 'b'); // a(0) と b(1000) の間
    expect(newRow(before)._order).toBe(500);
  });

  it('addRowBefore で先頭行の前は -2000 の中点になる', () => {
    const before = ids();
    useProjectStore.getState().addRowBefore('enemy', 'a'); // a(0) の前 → (-2000+0)/2
    expect(newRow(before)._order).toBe(-1000);
  });

  it('追加行は UNDO で取り除かれる', () => {
    const before = ids();
    useProjectStore.getState().addRow('enemy');
    const added = newRow(before)._id as string;
    commandHistory.undo();
    expect(useProjectStore.getState().tables.get('enemy')?.has(added)).toBe(false);
  });

  it('deleteRow はテーブルから除去し deletedRowIds に追加する', () => {
    useProjectStore.getState().deleteRow('enemy', 'b');
    const state = useProjectStore.getState();
    expect(state.tables.get('enemy')?.has('b')).toBe(false);
    expect(state.deletedRowIds.get('enemy')?.has('b')).toBe(true);
    expect(state.isDirty).toBe(true);
  });

  it('削除行は UNDO で復元される', () => {
    useProjectStore.getState().deleteRow('enemy', 'b');
    commandHistory.undo();
    const state = useProjectStore.getState();
    expect(state.tables.get('enemy')?.get('b')?.name).toBe('B');
    expect(state.deletedRowIds.get('enemy')?.has('b')).toBe(false);
  });
});
