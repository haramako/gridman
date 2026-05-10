# Summary: src/components/filter|union|lookup（View Dialogs）

**ソース**: `src/components/filter/FilterViewDialog.tsx`, `union/UnionViewDialog.tsx`, `lookup/LookupViewDialog.tsx`

## 要点

3 ダイアログとも `ViewDefinition` を構築して `onSave` コールバックで返す共通パターン。

**FilterViewDialog**: テーブル + フィルター条件（AND/OR）+ ソート + 表示列を設定。カラム型ごとに使用可能オペレーターが異なる（数値は `gt/gte/lt/lte` も可）。`enum` 型には `resolveEnumValues` でセレクトを表示。

**UnionViewDialog**: 複数テーブルを縦結合。各ソースのカラムを選択可能（空 = 全カラム）。

**LookupViewDialog**: ベーステーブルの `ref`/`ref[]` カラムを展開。`as`（エイリアス）と `fields`（展開フィールド）を指定。`fields` は 1 件以上必須。

保存は `project.json` の `views` 配列へ。Undo 対象外。

## 関連ページ

- [[concepts/View_Dialogs]]
- [[concepts/data-model/View_Queries]]
