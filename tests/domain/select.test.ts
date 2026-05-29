import { applySelect } from '@/domain/select';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { SelectQuery } from '@/types/view';
import { describe, expect, it } from 'vitest';

const makeRow = (id: string, order: number, fields: Record<string, unknown>): Row => ({
  _id: id,
  _order: order,
  ...fields,
});

const itemSchema: TableSchema = {
  name: 'item',
  displayName: 'アイテム',
  columns: [
    { key: 'name', displayName: '名前', type: 'string' },
    { key: 'categoryId', displayName: 'カテゴリID', type: 'ref', refTable: 'category' },
  ],
};

const categorySchema: TableSchema = {
  name: 'category',
  displayName: 'カテゴリ',
  columns: [
    { key: 'label', displayName: 'ラベル', type: 'string' },
    { key: 'color', displayName: '色', type: 'string' },
  ],
};

const itemTable = new Map<string, Row>([
  ['i1', makeRow('i1', 0, { name: 'Sword', categoryId: 'c1' })],
  ['i2', makeRow('i2', 1, { name: 'Shield', categoryId: 'c2' })],
  ['i3', makeRow('i3', 2, { name: 'Unknown', categoryId: undefined })],
]);

const categoryTable = new Map<string, Row>([
  ['c1', makeRow('c1', 0, { label: 'Weapon', color: 'red' })],
  ['c2', makeRow('c2', 1, { label: 'Armor', color: 'blue' })],
]);

const tables = new Map([
  ['item', itemTable],
  ['category', categoryTable],
]);

const schemas = new Map([
  ['item', itemSchema],
  ['category', categorySchema],
]);

const joinQuery: SelectQuery = {
  type: 'select',
  from: 'item',
  joins: [{ column: 'categoryId', from: 'category', as: 'cat', fields: ['label'] }],
};

describe('applySelect — joins 無し（旧 filter）', () => {
  it('ベース表の実スキーマをそのまま返す', () => {
    const { schema } = applySelect({ type: 'select', from: 'item' }, tables, schemas);
    expect(schema).toBe(itemSchema);
  });

  it('_origin を付与しない（ベース行をそのまま編集）', () => {
    const { rows } = applySelect({ type: 'select', from: 'item' }, tables, schemas);
    expect(rows.every((r) => r._origin === undefined)).toBe(true);
  });

  it('filter を適用する', () => {
    const query: SelectQuery = {
      type: 'select',
      from: 'item',
      filter: { column: 'name', op: 'eq', value: 'Sword' },
    };
    const { rows } = applySelect(query, tables, schemas);
    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe('i1');
  });

  it('_order でソートされる', () => {
    const { rows } = applySelect({ type: 'select', from: 'item' }, tables, schemas);
    expect(rows.map((r) => r._id)).toEqual(['i1', 'i2', 'i3']);
  });

  it('ベース schema / table が無いとき空結果を返す', () => {
    const { rows, schema } = applySelect({ type: 'select', from: 'missing' }, tables, schemas);
    expect(rows).toHaveLength(0);
    expect(schema.columns).toHaveLength(0);
  });
});

describe('applySelect — joins 有り（旧 lookup）', () => {
  it('展開列を readonly で schema に追加する', () => {
    const { schema } = applySelect(joinQuery, tables, schemas);
    const addedCol = schema.columns.find((c) => c.key === 'cat.label');
    expect(addedCol).toBeDefined();
    expect(addedCol?.readonly).toBe(true);
    expect(addedCol?.displayName).toBe('cat.ラベル');
  });

  it('ベース schema 列は無変更で保持する', () => {
    const { schema } = applySelect(joinQuery, tables, schemas);
    for (const key of itemSchema.columns.map((c) => c.key)) {
      const col = schema.columns.find((c) => c.key === key);
      expect(col).toBeDefined();
      expect(col?.readonly).toBeUndefined();
    }
  });

  it('参照先のフィールドを解決する', () => {
    const { rows } = applySelect(joinQuery, tables, schemas);
    expect(rows.find((r) => r._id === 'i1')?.['cat.label']).toBe('Weapon');
  });

  it('参照先が無い行は null を設定する', () => {
    const { rows } = applySelect(joinQuery, tables, schemas);
    expect(rows.find((r) => r._id === 'i3')?.['cat.label']).toBeNull();
  });

  it('_origin にベース表とベース行 id を設定する', () => {
    const { rows } = applySelect(joinQuery, tables, schemas);
    const sword = rows.find((r) => r._id === 'i1');
    expect(sword?._origin).toEqual({ table: 'item', id: 'i1' });
  });

  it('参照先が無くても _origin はベース行を指す', () => {
    const { rows } = applySelect(joinQuery, tables, schemas);
    const unknown = rows.find((r) => r._id === 'i3');
    expect(unknown?._origin).toEqual({ table: 'item', id: 'i3' });
  });

  it('ベース行に filter を適用する', () => {
    const query: SelectQuery = {
      ...joinQuery,
      filter: { column: 'name', op: 'eq', value: 'Sword' },
    };
    const { rows } = applySelect(query, tables, schemas);
    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe('i1');
  });

  it('参照先 schema が無い join 列はスキップする', () => {
    const query: SelectQuery = {
      type: 'select',
      from: 'item',
      joins: [{ column: 'categoryId', from: 'ghost', as: 'g', fields: ['x'] }],
    };
    const { schema } = applySelect(query, tables, schemas);
    expect(schema.columns.map((c) => c.key)).not.toContain('g.x');
  });

  it('参照先テーブルが無いとき全フィールドを null にする', () => {
    const noCategory = new Map([['item', itemTable]]);
    const { rows } = applySelect(joinQuery, noCategory, schemas);
    for (const row of rows) {
      expect(row['cat.label']).toBeNull();
    }
  });

  it('指定したフィールドのみ展開する', () => {
    const { schema } = applySelect(joinQuery, tables, schemas);
    const keys = schema.columns.map((c) => c.key);
    expect(keys).toContain('cat.label');
    expect(keys).not.toContain('cat.color');
  });

  it('ベース schema の displayName を返り値 schema に含める', () => {
    const { schema } = applySelect(joinQuery, tables, schemas);
    expect(schema.displayName).toContain('アイテム');
  });
});
