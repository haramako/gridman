# View Dialogs

フィルター / ユニオン / ルックアップ ビューを作成・編集する 3 つのダイアログ。すべて `ViewDefinition` を構築して `onSave` コールバックで返す共通パターンを持つ。

## 共通構造

```ts
interface Props {
  schemas: Map<string, TableSchema>
  tables: string[]
  editView?: ViewDefinition   // 編集モード時に渡す
  onSave: (view: ViewDefinition) => void
  onDelete?: (id: string) => void
  onClose: () => void
}
```

- `editView` が渡されれば編集モード（タイトルとデータを既存値で初期化）
- Escape キーで閉じる（`onKeyDown` で `e.stopPropagation()` してグリッドに伝播しない）
- 保存先は `project.json` の `views` 配列（`useProjectStore.saveView` 経由）

---

## FilterViewDialog

`src/components/filter/FilterViewDialog.tsx`

`FilterViewQuery`（テーブル絞り込み・ソート・列選択）を構築する。

**内部状態**:

| state | 型 | 用途 |
|---|---|---|
| `fromTable` | string | 対象テーブル |
| `condMode` | `'and' \| 'or'` | 複数条件の結合方式 |
| `conds` | `CondRow[]` | フィルター条件 |
| `sorts` | `SortRow[]` | ソート定義 |
| `visibleColumns` | `Set<string>` | 表示列（空 = 全列表示） |

**型ごとの使用可能オペレーター**:

| カラム型 | 使用可能 op |
|---|---|
| `string` / `text` | eq, neq, contains, startsWith, isNull, isNotNull |
| `integer` / `number` | eq, neq, gt, gte, lt, lte, isNull, isNotNull |
| `enum` | eq, neq, isNull, isNotNull |
| `boolean` | eq, isNull, isNotNull |

`enum` 型の値入力には `resolveEnumValues(colDef, project)` で選択肢を取得（`enumRef` / `enumValues` を解決）。

**`buildFilterExpr`**: `CondRow[]` → `FilterExpr`。条件が 1 つなら単一条件、複数なら `{ op: 'and'|'or', conditions: [...] }` に変換。

---

## UnionViewDialog

`src/components/union/UnionViewDialog.tsx`

`UnionViewQuery`（複数テーブルの縦結合）を構築する。

- デフォルトで先頭 2 テーブルをソースとして初期化
- テーブルを変えるとカラム選択がリセット
- カラム選択: `columns: []`（空）= そのテーブルの全カラムを使用

---

## LookupViewDialog

`src/components/lookup/LookupViewDialog.tsx`

`LookupViewQuery`（参照列の展開）を構築する。

- ベーステーブルの `ref` / `ref[]` カラムのみ展開対象に表示
- 各ルックアップ定義: `{ column, from, as, fields[] }`
  - `as` はエイリアス（展開後の列プレフィックス）
  - `fields` は 1 件以上の選択が必須（`canSave` でチェック）
- ベーステーブルを変更するとルックアップ定義がリセット

---

## 関連

- [[concepts/data-model/View_Queries]] — FilterExpr / UnionViewQuery / LookupViewQuery の型定義
- [[concepts/architecture/Stores]] — `useProjectStore.saveView` での保存
- [[concepts/data-model/Project_Format]] — `views` 配列の保存場所
