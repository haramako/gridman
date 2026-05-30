# src-types — 型定義

> ソース: [[raw/refs/src-types]] (`src/types/`)

フロントエンド全体の型安全性の基盤。スキーマ・ビュークエリ・行データ・ページレイアウトを定義する。

---

## schema.ts

```ts
type ColumnType = 'string' | 'integer' | 'number' | 'boolean'
               | 'enum' | 'ref' | 'ref[]' | 'json' | 'text' | 'date'

type ColumnDef = {
  key: string;           // JSONL のプロパティ名
  displayName: string;
  type: ColumnType;
  validation?: ValidationRule;  // required / min / max / maxLength
  isDisplayName?: boolean;      // ref 参照時に表示する列
  enumValues?: string[];        // enum インライン定義
  enumRef?: string;             // project.json の共有 enum 参照
  refTable?: string;            // ref 型の参照先テーブル
  readonly?: boolean;           // lookup 展開列など
}

type TableSchema = { name: string; displayName: string; columns: ColumnDef[] }
```

`ColumnType` の 10 種が Gridman の型システムの中心。各型の振る舞い（フィルター演算子・デフォルトウィジェット・編集可否）は `src/lib/columnTypeConfig.ts` の `COLUMN_TYPE_CONFIG` に集約されている（[[summaries/src-lib]] 参照）。

---

## view.ts

ビュークエリと ProjectConfig を定義する。

**ViewQuery の多相型**:

```ts
type Join        = { column: string; from: string; as: string; fields: string[] }
type SelectQuery = { type: 'select'; from: string; filter?: FilterExpr; sort?: SortDef[];
                     columns?: string[]; joins?: Join[] }   // joins 無し=filter, 有り=lookup
type UnionQuery  = { type: 'union'; sources: Array<{ from, columns?, filter? }> }
type PageViewQuery = { type: 'page'; from: string; filter?: FilterExpr; pageLayout?: string }

type ViewQuery = SelectQuery | UnionQuery | PageViewQuery
```

> 2026-05-30 のビュークエリ統合で旧 `FilterViewQuery` / `LookupViewQuery` は `SelectQuery` に統合された。

`type` フィールドで switch/型絞り込みができる差別化共用体。`ViewDefinition` が `{ id, name, query: ViewQuery }` として `ProjectConfig.views[]` に格納される。

**FilterExpr**: 再帰的な差別化共用体。詳細は [[concepts/data-model/View_Queries]] 参照。

**ProjectConfig**: `project.json` に書き出されるルートオブジェクト。`tables`（テーブル名リスト）・`views`（ViewDefinition[]）・`enums`（SharedEnum[]）を持つ。

---

## row.ts

```ts
type Row = { _id: string; _order: number; _invalid?: Record<string, unknown>;
             _origin?: { table: string; id: string }; [key: string]: unknown }
```

システム予約フィールド:
- `_id`: 行 ID（6 文字の乱数文字列）
- `_order`: ソート順（数値、挿入位置計算に使用）
- `_invalid`: バリデーション違反値の保存場所
- `_origin`: ビュー（union / join）越しの行の出自 `{ table, id }`。編集の書き戻し先

---

## page.ts

PageTemplate（ページビューのレイアウト定義）と PageBlock（ウィジェット単位）を定義する。詳細は [[concepts/Page_View]] 参照。

---

## 関連

- [[concepts/data-model/Schema_Definition]] — ColumnType・ColumnDef の使われ方
- [[concepts/data-model/View_Queries]] — FilterExpr・各 ViewQuery の詳細
- [[summaries/src-lib]] — ColumnType ごとの設定を集約する columnTypeConfig
- [[summaries/src-domain]] — FilterExpr を評価する applyFilter
