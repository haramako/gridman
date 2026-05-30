# Data Model

Gridman のデータはすべて **ローカルファイルシステム** に保存される。git で差分管理しやすいよう JSONL + JSON Schema 形式を採用している。

## プロジェクトフォルダの構造

```
my-project/
├── project.json          # プロジェクト設定（テーブル名・ビュー・enums）
├── enemy.schema.json     # テーブルのカラム定義
├── enemy.jsonl           # テーブルデータ（1行1レコードのJSON）
├── item.schema.json
├── item.jsonl
└── boss_card.page.json   # ページテンプレート（任意）
```

`.spreadsheet/` サブディレクトリにまとめて置くことも可能（サーバーが自動判別）。

## サブページ

- [[Project_Format]] — project.json の構造（テーブル・ビュー・enums）
- [[Schema_Definition]] — *.schema.json・カラム型一覧・ColumnDef フィールド
- [[Table_Data]] — *.jsonl・内部フィールド（_id / _order / _invalid）・ソフトバリデーション
- [[View_Queries]] — SelectQuery / UnionQuery / PageViewQuery / FilterExpr

## 関連

- [[concepts/architecture/Domain_Logic]] — データを変換するドメイン関数
- [[concepts/architecture/Stores]] — フロントエンドでのデータ保持構造
