# Summary: doc/input-behavior（入力挙動）

**ソース**: `raw/notes/input-behavior.md`

## 要点

キーボード・マウス入力の仕様は概ね Excel に準拠。主な **意図的差異**:

| 操作 | Gridman | Excel |
|------|---------|-------|
| Enter（非編集モード） | **編集開始** | 下セルへ移動 |
| 列ヘッダークリック | **列ソート** | 列全体選択 |

**Enter が編集開始な理由**: ゲームデータ編集ではセル確認より編集頻度が高く、1 キーで編集に入れる方が効率的。

**Ctrl+V の実装**: `navigator.clipboard.readText()` は HTTPS 必須のため、`document` の `paste` イベントを使うグローバルリスナーで実装。

**読み取りモード** (`writeMode = false`): 他タブがロック保持中。選択・ナビ・コピーは可能、編集・行追加/削除は不可。

## 関連ページ

- [[concepts/spreadsheet/Input_Behavior]]
- [[concepts/Auto_Save_and_Draft]] — マルチタブロック
- [[concepts/Undo_Redo]] — Ctrl+Z / Ctrl+Y
