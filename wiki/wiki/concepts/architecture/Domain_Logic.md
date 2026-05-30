# Domain Logic

`src/domain/` 配下のビュー変換・バリデーション・コマンドロジック。ストアはデータ保持に専念し、**データ変換はすべてここで行う**。

## ファイル構成

| ファイル | 役割 |
|----------|------|
| `validator.ts` | 入力値の型変換・バリデーション |
| `filter.ts` | FilterExpr の評価（`applyFilter`）・ソート（`applySort`） |
| `select.ts` | SelectQuery の評価（`applySelect`）— filter + lookup を統合 |
| `union.ts` | UnionQuery — 複数テーブルの縦結合 |
| `commands.ts` | Undo/Redo 基盤（CommandHistory / EditCellCommand） |
| `exportData.ts` | JSON / CSV エクスポート |

> 2026-05-30 のビュークエリ統合で、旧 `lookup.ts`（`applyLookup`）は `select.ts`（`applySelect`）に
> 吸収・削除された。`applySelect` は joins 無しで filter、joins 有りで lookup として振る舞う。

---

## validator.ts

```ts
coerceToType(value: unknown, type: ColumnType): unknown
// 例: coerceToType('42', 'integer') → 42
// 例: coerceToType('', 'integer')   → null

validateCell(value: unknown, col: ColumnDef): ValidationError | null
// required / min / max / maxLength を検証
// 違反 → _invalid に格納（ソフトバリデーション）
```

**ソフトバリデーション**: 違反値は捨てずに `row._invalid[colKey]` に保存。正常値フィールドはそのまま維持。セルに ⚠ マークで表示。

---

## filter.ts

```ts
applyFilter(rows: Row[], filter: FilterExpr): Row[]
applySort(rows: Row[], sort: SortDef[]): Row[]
```

`FilterExpr` は再帰的な条件式。演算子: `eq` `neq` `gt` `gte` `lt` `lte` `contains` `startsWith` `isNull` `isNotNull`。`and` / `or` で複合条件を構成できる。

→ 詳細: [[concepts/data-model/View_Queries]]

---

## select.ts / union.ts

```ts
applySelect(query: SelectQuery, tables, schemas): { rows: Row[]; schema: TableSchema }
// joins 無し: ベース表の実スキーマ・素のベース行を返す（編集はベース表へ直接）
// joins 有り: 参照先フィールドを `${as}.${field}` の readonly 列として展開し、
//   各行に _origin = { table, id }（ベース行の出自）を付与

applyUnion(query: UnionQuery, tables, schemas): { rows: Row[]; schema: TableSchema }
// 複数テーブルの行を縦に結合。各行に _origin で元テーブルを識別
```

`_origin` は編集・削除の書き戻し先を示す統一フィールド（旧 `_source`/`_sources` を一般化）。
解決は `lib/viewRowSource.ts` の `getRowOwnerTable` / `getEffectiveTableName`。

---

## commands.ts

Undo/Redo の基盤。詳細は [[concepts/Undo_Redo]] を参照。

```ts
interface Command { execute(): void; undo(): void; description: string }

class CommandHistory {
  execute(cmd): void  // cmd.execute() を呼び undoStack に積む
  undo(): void        // undoStack から取り出して cmd.undo()
  redo(): void        // redoStack から取り出して cmd.execute()
  clear(): void       // loadProject 時に呼ばれる
}

class EditCellCommand implements Command  // 1 セルの編集
class CompositeCommand implements Command // 複数コマンドをまとめて 1 ステップ
```

`commandHistory` はモジュールスコープのシングルトン（Zustand と独立）。

---

## 関連

- [[concepts/data-model/View_Queries]] — FilterExpr / SelectQuery / UnionQuery の型定義
- [[concepts/Undo_Redo]] — CommandHistory の詳細
- [[Stores]] — ストアからのドメイン関数呼び出し
- [[summaries/src-domain]] — ソースコードから読み解くドメイン関数の実装詳細
