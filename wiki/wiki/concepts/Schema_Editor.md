# Schema Editor

`src/components/schema/SchemaEditorDialog.tsx`。テーブルのスキーマ（カラム定義）を GUI で編集するダイアログ。

## 概要

テーブルの `displayName` とカラム一覧を編集し、`*.schema.json` に保存する。**Undo/Redo 対象外** — `updateSchema` は `CommandHistory` を経由しない。

## `ColumnEditor` サブコンポーネント

各カラムを 1 行で表示し、▸ ボタンで詳細を展開できる。

**常時表示**: `key`（monospace）/ `displayName` / `type` セレクト / ▲▼ 並び替え / ✕ 削除

**展開時の追加設定**:

| 設定 | 条件 |
|---|---|
| `isDisplayName` チェックボックス | 常に表示（`ref` 型で参照されたとき表示する列） |
| `readonly` チェックボックス | 常に表示 |
| `enumRef` 入力 + `enumValues` テキストエリア | `type === 'enum'` のとき |
| `refTable` セレクト | `type === 'ref' \| 'ref[]'` のとき |
| バリデーション (`required` / `min` / `max` / `maxLength`) | 型に応じて表示 |

## 編集時の内部型

```ts
type EditingColumn = ColumnDef & { _tempId: string }
```

`_tempId` は React の key 管理用（カラムの並び替え・追加時に安定した識別子として使う）。保存時に `_tempId` を除去し、型に無関係なフィールド（`enumValues` / `refTable` 等）をクリアしてから `onSave` へ渡す。

## バリデーション (`canSave`)

`displayName.trim() !== ''` かつ全カラムの `key` と `displayName` が空でないときのみ保存可能。

## 関連

- [[concepts/data-model/Schema_Definition]] — `TableSchema` / `ColumnDef` の型定義
- [[concepts/Undo_Redo]] — `updateSchema` は対象外
