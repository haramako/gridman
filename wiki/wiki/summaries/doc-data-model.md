# Summary: doc/data-model（データモデル）

**ソース**: `raw/notes/data-model.md`

## 要点

プロジェクトフォルダは `project.json` + `*.schema.json` + `*.jsonl` + オプションの `*.page.json` で構成される。

**ファイル形式**:
- `project.json` — テーブル一覧・ビュー定義・共有 enum
- `*.schema.json` — カラム定義（型・バリデーション・参照先）
- `*.jsonl` — テーブルデータ（1行1レコード JSON Lines）
- `*.page.json` — ページビューレイアウトテンプレート

**特殊フィールド** (`_id`, `_order`, `_invalid`):
- `_invalid` がソフトバリデーションのキー: 違反値を捨てずに `_invalid.<key>` に保存し、元のフィールドは直前の正常値を維持する

**カラム型**: `string` / `integer` / `number` / `boolean` / `enum` / `ref` / `ref[]` / `json` / `text` / `date`

**ビュークエリ型**: `filter`（絞り込み）/ `union`（縦結合）/ `lookup`（参照展開）

`FilterExpr` は再帰的な条件式で `and`/`or` のネストが可能。

## 関連ページ

- [[concepts/data-model/Project_Format]]
- [[concepts/data-model/Schema_Definition]]
- [[concepts/data-model/Table_Data]]
- [[concepts/data-model/View_Queries]]
