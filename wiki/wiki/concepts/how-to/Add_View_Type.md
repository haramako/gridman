# How-To: 新しいビュー種別を追加する

`ViewQuery` の差別化共用体に新しい型を追加する手順。
既存の 4 種（filter / union / lookup / page）を参考にする。

---

## 変更ファイルと手順

### Step 1: `src/types/view.ts` — 型定義に追加

```ts
// 新しいViewQueryの型を定義
type MyViewQuery = {
  type: 'my-view';
  from: string;         // ベーステーブル
  // ... 型固有のフィールド
}

// ViewQuery union に追加
type ViewQuery = FilterViewQuery | UnionViewQuery | LookupViewQuery | PageViewQuery | MyViewQuery
```

TypeScript の型エラーが switch の欠落箇所を教えてくれる。

---

### Step 2: `src/domain/` — ビュー計算関数を作成

```ts
// src/domain/my-view.ts（新規ファイル）
export function applyMyView(
  query: MyViewQuery,
  tables: Map<string, Map<string, Row>>,
  schemas: Map<string, TableSchema>
): { rows: Row[]; schema: TableSchema } {
  // ベーステーブルを取得して変換・結合ロジックを実装
  const baseRows = Array.from(tables.get(query.from)?.values() ?? []);
  const baseSchema = schemas.get(query.from)!;
  // ...
  return { rows, schema };
}
```

既存の参考実装:
- 単テーブルフィルター → `filter.ts` の `applyFilter`
- 複数テーブル縦結合 → `union.ts` の `applyUnion`
- 外部キー展開 → `lookup.ts` の `applyLookup`

---

### Step 3: `src/stores/project.store.ts` — ビュー計算を統合

プロジェクトストア内でビューの rows を計算しているセクションに分岐を追加する。
`activeViewId` のビュー定義を読み、`query.type` で switch して対応する関数を呼ぶ。

```ts
case 'my-view':
  return applyMyView(query as MyViewQuery, tables, schemas);
```

正確な追加箇所は `project.store.ts` の `getViewRows` または類似のセレクター関数を検索する。

---

### Step 4: `src/pages/EditorPage.tsx` — レンダリング分岐を追加

`activeView.query.type` で SpreadsheetView と PageView を切り替えているセクションに追加:

```tsx
// 新ビューがスプレッドシートで表示する場合
case 'my-view':
  return <SpreadsheetView ... />;

// 新ビューが専用 UI の場合
case 'my-view':
  return <MyView query={query} />;
```

---

### Step 5: `src/components/` — 作成ダイアログを追加（任意）

サイドバーから新ビューを作成できるようにする場合は、既存ダイアログ（`FilterViewDialog.tsx` など）を参考に作成する。

ダイアログでは:
1. ユーザーが設定を入力
2. `ViewQuery` オブジェクトを組み立て
3. `useProjectStore` の `addView(definition)` を呼ぶ

---

### Step 6: `server/index.ts` / `server/db-server.ts` — 変更不要

ビュー定義は `project.json` の `views[]` に格納されるため、サーバー側は変更不要。  
`PUT /api/project` で `ProjectConfig`（`views[]` を含む）ごと保存される。

---

## 確認チェックリスト

- [ ] TypeScript のコンパイルエラーが消えた
- [ ] 新ビューを `project.json` の `views` に手動追加して、正しく表示される
- [ ] サイドバーからビューを選択したとき正しいコンポーネントがレンダリングされる
- [ ] 他のビュー種別の表示が壊れていない（regression チェック）
- [ ] E2E テストが通る

---

## 落とし穴

- `ViewQuery` union を更新したが `switch` の各所に `case 'my-view':` を追加し忘れると TypeScript が警告する（exhaustive check）
- `applyMyView` が `_source` / `_sources` フィールドを付ける場合、Cell コンポーネントのシステム予約フィールド扱いを確認する（→ [[concepts/Gotchas]] #8）

---

## 関連

- [[summaries/src-types]] — `ViewQuery` 差別化共用体の型定義
- [[summaries/src-domain]] — `applyFilter` / `applyLookup` / `applyUnion` の実装パターン
- [[concepts/data-model/View_Queries]] — 各ビュークエリの意味と構造
- [[summaries/src-stores]] — ストアでのビュー計算の統合箇所
- [[concepts/how-to/Add_Column_Type]] — 型システム拡張の別レシピ
