# 横断検索（Search）

`src/pages/SearchPage.tsx`。プロジェクト内の全テーブル・全カラムを対象とした全文検索ページ。

## アクセス方法

- `Ctrl+Shift+F` でエディタから遷移（`/search?project=...`）
- ヘッダーの「閉じる」または `navigate('/editor')` で戻る

## 検索の仕組み

300ms デバウンス後に `performSearch` が走る。

```ts
for (const [tableName, rowMap] of tables.entries()) {
  for (const [rowId, row] of rowMap.entries()) {
    for (const col of schema.columns) {
      const strValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
      if (strValue.toLowerCase().includes(lowerQuery)) → SearchResult
    }
  }
}
```

- 大文字小文字を無視（`.toLowerCase()`）
- `object` 型の値は `JSON.stringify` して文字列検索
- 値が 100 文字超の場合は末尾を `...` で省略して表示

## 結果の表示

`groupedResults`（`useMemo`）でテーブルごとにグルーピングして表示。クリック / Enter キーで `navigate('/editor?table=<tableName>')` に遷移。

## 状態管理

`useViewStore` に `searchQuery` / `searchResults` を保持。`clearSearch` でリセット。ページをまたいでクエリが保持されるので、エディタに戻って再び開くと前回のクエリが残る。

## 関連

- [[concepts/architecture/Stores]] — `useViewStore.searchQuery` / `searchResults`
- [[concepts/spreadsheet/Input_Behavior]] — `Ctrl+Shift+F` のキーバインド
