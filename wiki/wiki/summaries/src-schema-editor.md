# Summary: src/components/schema/SchemaEditorDialog

**ソース**: `src/components/schema/SchemaEditorDialog.tsx`

## 要点

`*.schema.json` を GUI で編集するダイアログ。`ColumnEditor` サブコンポーネントでカラムを 1 行ずつ編集、▸ で詳細展開。

内部では `_tempId` を付与した `EditingColumn` 型で状態管理し、保存時に除去。型ごとの余分フィールドもクリア（非 `enum` なら `enumValues` を削除等）。

**Undo/Redo 対象外** — `updateSchema` は `CommandHistory` を経由しない。

## 関連ページ

- [[concepts/Schema_Editor]]
- [[concepts/data-model/Schema_Definition]]
