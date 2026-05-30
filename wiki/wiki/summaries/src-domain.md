# src-domain — ドメインロジック

> ソース: [[raw/refs/src-domain]] (`src/domain/`)

UI にも Zustand にも依存しない純粋関数群。データ変換・ビュー演算・コマンドパターン・バリデーションを担う。

---

## commands.ts — Undo/Redo 基盤

`Command` インターフェース（`execute`, `undo`, `description`）と `CommandHistory` クラスを定義する。

```ts
interface Command { execute(): void; undo(): void; description: string }

class CommandHistory {
  execute(cmd): void  // 実行して undoStack に積む（redoStack はクリア）
  undo(): void        // undoStack から pop して cmd.undo()
  redo(): void        // redoStack から pop して cmd.execute()
  clear(): void       // loadProject 時に呼ばれる
}
```

組み込みコマンド:
- `EditCellCommand` — 1 セル値変更（`setter` / `getter` の関数ペアで構成）
- `CompositeCommand` — 複数コマンドを 1 ステップにまとめ、undo は逆順実行

`commandHistory` はモジュールスコープのシングルトン。`useCommandHistoryStore` がこれを Zustand に橋渡しし React コンポーネントが `canUndo`/`canRedo` を購読できる。

---

## filter.ts — フィルター・ソート

```ts
applyFilter(rows: Row[], expr: FilterExpr): Row[]
applySort(rows: Row[], sorts: SortDef[]): Row[]
```

`FilterExpr` は再帰的な差別化共用体:
- `{ op: 'and'|'or', conditions: FilterExpr[] }` — 複合条件
- `{ column, op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'contains'|'startsWith', value }` — 比較
- `{ column, op: 'isNull'|'isNotNull' }` — null チェック

文字列比較は `.toLowerCase()` で大文字小文字無視。数値比較は `Number()` 変換後に実施。

---

## select.ts — SelectQuery 評価（filter + lookup 統合）

```ts
applySelect(query: SelectQuery, tables, schemas): { rows: Row[], schema: TableSchema }
```

`joins` 無し＝旧 filter（ベース表の実スキーマ・素のベース行をそのまま返す）。`joins` 有り＝旧 lookup（`joins` 配列で指定した参照先テーブルのフィールドを `as.field` 形式の `readonly: true` 列として展開）。joins 有りの行には `_origin = { table, id }`（ベース行の出自）を付与し、編集の書き戻し先を示す。

> 2026-05-30 のビュークエリ統合で旧 `lookup.ts`（`applyLookup`）は本ファイルに吸収・削除された。

---

## union.ts — ユニオン縦結合

```ts
applyUnion(query: UnionQuery, tables, schemas): { rows: Row[], schema: TableSchema }
```

複数ソーステーブルの行を縦に結合する。列は先頭ソースの順序を基準に、後続ソースの新規列を末尾追加。各行に `_origin = { table, id }` を付与し、元テーブルへの編集・削除の書き戻しに使う。

---

## validator.ts

```ts
coerceToType(value: unknown, type: ColumnType): unknown  // 型強制変換
validateCell(value: unknown, col: ColumnDef): ValidationError | null
```

バリデーション違反は**ソフトエラー**として扱われる。値を捨てずに `row._invalid[colKey]` に保存し、正常フィールドはそのまま維持。セルは ⚠ マーク表示のまま保存できる。

---

## 関連

- [[concepts/architecture/Domain_Logic]] — このモジュール群の概要とコード例
- [[concepts/Undo_Redo]] — CommandHistory の詳細
- [[concepts/data-model/View_Queries]] — FilterExpr / ViewQuery の型定義
- [[summaries/src-stores]] — `commandHistory` を呼び出すストア側の実装
