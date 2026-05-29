import { formatCellValue } from '@/lib/formatCellValue';
import type { Row } from '@/types/row';
import type { ColumnDef, TableSchema } from '@/types/schema';
import { describe, expect, it } from 'vitest';

const col = (overrides: Partial<ColumnDef> = {}): ColumnDef => ({
  key: 'v',
  displayName: 'V',
  type: 'string',
  ...overrides,
});

const noSchemas = new Map<string, TableSchema>();
const noTables = new Map<string, Map<string, Row>>();

const itemSchema: TableSchema = {
  name: 'item',
  displayName: 'アイテム',
  columns: [
    { key: '_id', displayName: 'ID', type: 'string' },
    { key: 'name', displayName: '名前', type: 'string', isDisplayName: true },
  ],
};
const schemas = new Map<string, TableSchema>([['item', itemSchema]]);
const tables = new Map<string, Map<string, Row>>([
  [
    'item',
    new Map<string, Row>([
      ['i1', { _id: 'i1', _order: 0, name: 'ポーション' }],
      ['i2', { _id: 'i2', _order: 1, name: 'エリクサー' }],
    ]),
  ],
]);

describe('formatCellValue', () => {
  it('string はそのまま表示する', () => {
    expect(
      formatCellValue({ _id: 'r', _order: 0, v: 'スライム' }, col(), noSchemas, noTables)
    ).toBe('スライム');
  });

  it('null 値は空文字を返す', () => {
    expect(formatCellValue({ _id: 'r', _order: 0, v: null }, col(), noSchemas, noTables)).toBe('');
  });

  it('json 型は値があれば [JSON]、なければ空文字', () => {
    const c = col({ type: 'json' });
    expect(formatCellValue({ _id: 'r', _order: 0, v: { x: 1 } }, c, noSchemas, noTables)).toBe(
      '[JSON]'
    );
    expect(formatCellValue({ _id: 'r', _order: 0, v: null }, c, noSchemas, noTables)).toBe('');
  });

  it('boolean 型は true/false 文字列を返す', () => {
    const c = col({ type: 'boolean' });
    expect(formatCellValue({ _id: 'r', _order: 0, v: true }, c, noSchemas, noTables)).toBe('true');
    expect(formatCellValue({ _id: 'r', _order: 0, v: false }, c, noSchemas, noTables)).toBe(
      'false'
    );
  });

  it('text 型は40字を超えると切り詰める', () => {
    const c = col({ type: 'text' });
    const long = 'a'.repeat(50);
    expect(formatCellValue({ _id: 'r', _order: 0, v: long }, c, noSchemas, noTables)).toBe(
      `${'a'.repeat(40)}…`
    );
  });

  it('ref 型は参照先の表示名カラムで解決する', () => {
    const c = col({ type: 'ref', refTable: 'item' });
    expect(formatCellValue({ _id: 'r', _order: 0, v: 'i1' }, c, schemas, tables)).toBe(
      'ポーション'
    );
  });

  it('ref 型は解決できなければ ID をそのまま返す', () => {
    const c = col({ type: 'ref', refTable: 'item' });
    expect(formatCellValue({ _id: 'r', _order: 0, v: 'missing' }, c, schemas, tables)).toBe(
      'missing'
    );
  });

  it('ref[] 型は表示名をカンマ区切りで連結する', () => {
    const c = col({ type: 'ref[]', refTable: 'item' });
    expect(formatCellValue({ _id: 'r', _order: 0, v: ['i1', 'i2'] }, c, schemas, tables)).toBe(
      'ポーション, エリクサー'
    );
  });
});
