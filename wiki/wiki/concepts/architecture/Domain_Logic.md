# Domain Logic

`src/domain/` 配下のビュー変換・バリデーション・コマンドロジック。ストアはデータ保持に専念し、**データ変換はすべてここで行う**。

## ファイル構成

| ファイル | 役割 |
|----------|------|
| `validator.ts` | 入力値の型変換・バリデーション |
| `filter.ts` | FilterViewQuery の評価・ソート |
| `union.ts` | UnionViewQuery — 複数テーブルの縦結合 |
| `lookup.ts` | LookupViewQuery — 参照先フィールドの展開 |
| `commands.ts` | Undo/Redo 基盤（CommandHistory / EditCellCommand） |
| `exportData.ts` | JSON / CSV エクスポート |

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

## union.ts / lookup.ts

```ts
applyUnion(sources: UnionSource[], tables, schemas): Row[]
// 複数テーブルの行を縦に結合。_source フィールドで元テーブルを識別

applyLookup(query: LookupViewQuery, tables, schemas): Row[]
// 参照先フィールドを展開。drop_name, drop_price 等の readonly 列を追加
// _sources フィールドで元テーブルを識別（マルチソース対応）
```

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

- [[concepts/data-model/View_Queries]] — FilterExpr / UnionViewQuery / LookupViewQuery の型定義
- [[concepts/Undo_Redo]] — CommandHistory の詳細
- [[Stores]] — ストアからのドメイン関数呼び出し
- [[summaries/src-domain]] — ソースコードから読み解くドメイン関数の実装詳細
