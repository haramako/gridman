import type { Row } from '@/types/row';

/**
 * セルの編集・描画時に使う、行の実テーブル名を返す。
 * ビュー（union / join）越しの行は _origin にベース表を持つ。無ければ fallback。
 */
export function getEffectiveTableName(row: Row, fallback: string): string {
  return row._origin?.table ?? fallback;
}

/**
 * 行を変更（編集・削除）する際の所有テーブルを返す。
 * _origin があればそのベース表、無ければ fallback（テーブル直表示・join 無し select）。
 */
export function getRowOwnerTable(row: Row | undefined, fallback: string): string {
  return row?._origin?.table ?? fallback;
}
