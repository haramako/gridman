import {
  type RowState,
  applyCellEdit,
  applyRowDelete,
  applyRowDrop,
  applyRowInsert,
  applyRowRestore,
  computeCellRow,
} from '@/stores/rowMutations';
import type { Row } from '@/types/row';
import type { ColumnDef } from '@/types/schema';
import { describe, expect, it } from 'vitest';

const makeState = (rows: Row[]): RowState => ({
  tables: new Map([['enemy', new Map(rows.map((r) => [r._id as string, r]))]]),
  dirtyRowIds: new Map(),
  deletedRowIds: new Map(),
  dirtyCellIds: new Map(),
});

const row = (id: string, fields: Record<string, unknown> = {}): Row => ({
  _id: id,
  _order: 0,
  ...fields,
});

// ---- computeCellRow ----

describe('computeCellRow', () => {
  const intCol: ColumnDef = { key: 'hp', displayName: 'HP', type: 'integer' };

  it('正常値は coerce して反映し _invalid を持たない', () => {
    const result = computeCellRow(row('r1', { hp: 0 }), 'hp', '42', intCol);
    expect(result.hp).toBe(42);
    expect(result._invalid).toBeUndefined();
  });

  it('バリデーション違反値は _invalid にソフト保存する', () => {
    const col: ColumnDef = {
      key: 'hp',
      displayName: 'HP',
      type: 'integer',
      validation: { min: 10 },
    };
    const result = computeCellRow(row('r1', { hp: 50 }), 'hp', '5', col);
    expect(result._invalid?.hp).toBe('5');
  });

  it('正常値で更新すると既存の _invalid[col] は消える', () => {
    const result = computeCellRow(
      row('r1', { hp: 50, _invalid: { hp: 'bad' } }),
      'hp',
      '99',
      intCol
    );
    expect(result.hp).toBe(99);
    expect(result._invalid).toBeUndefined();
  });

  it('他カラムの _invalid は維持する', () => {
    const result = computeCellRow(
      row('r1', { hp: 50, _invalid: { name: 'bad' } }),
      'hp',
      '99',
      intCol
    );
    expect(result._invalid?.name).toBe('bad');
  });
});

// ---- applyCellEdit ----

describe('applyCellEdit', () => {
  it('テーブル更新 + dirtyRow + dirtyCell を立てる', () => {
    const s = makeState([row('r1', { hp: 1 })]);
    const next = applyCellEdit(s, 'enemy', 'r1', 'hp', row('r1', { hp: 2 }));
    expect(next).not.toBeNull();
    expect(next?.tables.get('enemy')?.get('r1')?.hp).toBe(2);
    expect(next?.dirtyRowIds.get('enemy')?.has('r1')).toBe(true);
    expect(next?.dirtyCellIds.get('enemy')?.get('r1')?.has('hp')).toBe(true);
    expect(next?.isDirty).toBe(true);
  });

  it('元の state を変更しない（不変更新）', () => {
    const s = makeState([row('r1', { hp: 1 })]);
    applyCellEdit(s, 'enemy', 'r1', 'hp', row('r1', { hp: 2 }));
    expect(s.tables.get('enemy')?.get('r1')?.hp).toBe(1);
    expect(s.dirtyRowIds.size).toBe(0);
  });

  it('存在しないテーブルなら null', () => {
    const s = makeState([row('r1')]);
    expect(applyCellEdit(s, 'missing', 'r1', 'hp', row('r1'))).toBeNull();
  });
});

// ---- applyRowInsert / applyRowDrop ----

describe('applyRowInsert / applyRowDrop', () => {
  it('insert は行追加 + dirtyRow', () => {
    const s = makeState([]);
    const next = applyRowInsert(s, 'enemy', row('new'));
    expect(next?.tables.get('enemy')?.has('new')).toBe(true);
    expect(next?.dirtyRowIds.get('enemy')?.has('new')).toBe(true);
  });

  it('drop は行除去のみ（dirty 系は partial に含めない）', () => {
    const s = makeState([row('r1')]);
    const next = applyRowDrop(s, 'enemy', 'r1');
    expect(next?.tables.get('enemy')?.has('r1')).toBe(false);
    // dirtyRowIds / deletedRowIds は返り値に含まない（ストア側の既存値を維持）
    expect(next).not.toHaveProperty('dirtyRowIds');
    expect(next).not.toHaveProperty('deletedRowIds');
  });
});

// ---- applyRowDelete / applyRowRestore ----

describe('applyRowDelete / applyRowRestore', () => {
  it('delete はテーブル除去 + deletedRowIds 追加 + dirtyRow 除去', () => {
    const s = makeState([row('r1')]);
    s.dirtyRowIds.set('enemy', new Set(['r1']));
    const next = applyRowDelete(s, 'enemy', 'r1');
    expect(next?.tables.get('enemy')?.has('r1')).toBe(false);
    expect(next?.deletedRowIds.get('enemy')?.has('r1')).toBe(true);
    expect(next?.dirtyRowIds.get('enemy')?.has('r1')).toBe(false);
  });

  it('restore はテーブル再追加 + dirtyRow 追加 + deletedRowIds 除去', () => {
    const s = makeState([]);
    s.deletedRowIds.set('enemy', new Set(['r1']));
    const next = applyRowRestore(s, 'enemy', row('r1', { hp: 7 }));
    expect(next?.tables.get('enemy')?.get('r1')?.hp).toBe(7);
    expect(next?.dirtyRowIds.get('enemy')?.has('r1')).toBe(true);
    expect(next?.deletedRowIds.get('enemy')?.has('r1')).toBe(false);
  });
});
