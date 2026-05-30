import { getEffectiveTableName, getRowOwnerTable } from '@/lib/viewRowSource';
import type { Row } from '@/types/row';
import { describe, expect, it } from 'vitest';

const plainRow: Row = { _id: 'r1', _order: 0 };
const originRow: Row = { _id: 'r1', _order: 0, _origin: { table: 'enemy', id: 'e1' } };

describe('getEffectiveTableName', () => {
  it('_origin があればそのテーブル名を返す', () => {
    expect(getEffectiveTableName(originRow, 'fallback')).toBe('enemy');
  });

  it('_origin が無ければ fallback を返す', () => {
    expect(getEffectiveTableName(plainRow, 'fallback')).toBe('fallback');
  });
});

describe('getRowOwnerTable', () => {
  it('_origin があればそのテーブル名を返す', () => {
    expect(getRowOwnerTable(originRow, 'fallback')).toBe('enemy');
  });

  it('_origin が無ければ fallback を返す', () => {
    expect(getRowOwnerTable(plainRow, 'fallback')).toBe('fallback');
  });

  it('row が undefined なら fallback を返す', () => {
    expect(getRowOwnerTable(undefined, 'fallback')).toBe('fallback');
  });
});
