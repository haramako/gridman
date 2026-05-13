---
kind: ref
external_path: src/types/
files:
  - schema.ts  # ColumnType・TableSchema・SchemaField 定義
  - view.ts    # FilterQuery・LookupQuery・UnionQuery・PageQuery 型
  - page.ts    # PageTemplate・PageBlock 型
  - row.ts     # Row・RowId・CellValue 型
---

Gridman の TypeScript 型定義。スキーマ・ビュークエリ・行データの型が中心で、フロントエンド全体の型安全性の基盤となる。
