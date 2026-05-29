import { VIEW_TYPE_CONFIG } from '@/lib/viewTypeConfig';
import { describe, expect, it } from 'vitest';

describe('VIEW_TYPE_CONFIG', () => {
  it('全ビュー種別にアイコンが定義されている', () => {
    for (const type of ['filter', 'union', 'lookup', 'page'] as const) {
      expect(VIEW_TYPE_CONFIG[type].icon).toBeTruthy();
    }
  });

  it('既存の種別→アイコンのマッピングを保持する', () => {
    expect(VIEW_TYPE_CONFIG.filter.icon).toBe('🔍');
    expect(VIEW_TYPE_CONFIG.union.icon).toBe('⊕');
    expect(VIEW_TYPE_CONFIG.lookup.icon).toBe('🔎');
    expect(VIEW_TYPE_CONFIG.page.icon).toBe('🔍');
  });
});
