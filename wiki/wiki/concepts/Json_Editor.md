# JSON Editor Panel

`src/components/editor/JsonEditorPanel.tsx`。`json` 型カラムを編集するサイドパネル。

## 動作

- 幅 300px の `<aside>`。`useSelectionStore.jsonPanelCell` が `null` 以外のとき表示
- `jsonPanelCell` は `{ tableName, rowId, colKey }` — どのセルを編集中かを示す
- セルの値を `JSON.stringify(val, null, 2)` で `<textarea>` に展開
- 保存時に `JSON.parse` → 成功なら `updateCell`、失敗なら赤枠エラー表示
- 空文字列は `null` として保存
- Escape キーでキャンセル（パネルを閉じる）

## ストアとの連携

```ts
// 開く（Cell.tsx 側）
setJsonPanelCell({ tableName, rowId, colKey })

// 保存（JsonEditorPanel 側）
updateCell(tableName, rowId, colKey, parsedValue)
setJsonPanelCell(null)
```

`updateCell` 経由なので **Undo/Redo・ドラフト自動保存が通常通り動作する**。

## 関連

- [[concepts/architecture/Stores]] — `useSelectionStore.jsonPanelCell`
- [[concepts/spreadsheet/Cell_Editing]] — `json` 型セルのクリックでパネルが開く
- [[concepts/Undo_Redo]] — `updateCell` 経由なので Undo 対象
