# Summary: JsonEditorPanel + SearchPage

**ソース**: `src/components/editor/JsonEditorPanel.tsx`, `src/pages/SearchPage.tsx`

## JsonEditorPanel の要点

`useSelectionStore.jsonPanelCell` で開閉を管理する 300px サイドパネル。`json` 型セルをクリックすると開く。`JSON.parse` バリデーション付き。`updateCell` 経由なので Undo/Redo 対象。

## SearchPage の要点

全テーブル・全カラムを対象とした全文検索（大文字小文字無視・300ms デバウンス）。結果をテーブルごとにグルーピング表示し、クリックでエディタに遷移。クエリは `useViewStore` に保持され、ページをまたいで残る。

## 関連ページ

- [[concepts/Json_Editor]]
- [[concepts/Search]]
