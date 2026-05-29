export type Row = {
  _id: string;
  _order: number;
  _invalid?: Record<string, unknown>;
  /**
   * ビュー（union / join）越しの行が持つ出自。編集の書き戻し先となるベース表とその行 ID。
   * テーブル直表示や join 無し select では付与されない（fallback の tableName を使う）。
   */
  _origin?: { table: string; id: string };
  [key: string]: unknown;
};
