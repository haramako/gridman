# How-To: 新しい ColumnType を追加する

Gridman の型システムに新しいカラム型を追加する手順。
`ColumnType` は 10 種の文字列リテラル union で、各型の振る舞いは `columnTypeConfig.ts` に集約されている。

---

## 変更ファイルと手順

### Step 1: `src/types/schema.ts` — 型定義に追加

```ts
// 変更前
type ColumnType = 'string' | 'integer' | ... | 'date'

// 変更後（例：'url' 型を追加する場合）
type ColumnType = 'string' | 'integer' | ... | 'date' | 'url'
```

TypeScript の型エラーがこの変更を起点に連鎖する。エラーリストをチェックリストとして使える。

---

### Step 2: `src/lib/columnTypeConfig.ts` — 設定テーブルに追加（必須）

`COLUMN_TYPE_CONFIG: Record<ColumnType, ColumnTypeConfig>` の網羅性を維持する。
全 13 プロパティを埋める：

```ts
url: {
  icon: '🔗',
  defaultWidth: 200,
  filterOps: ['eq', 'neq', 'contains', 'startsWith', 'isNull', 'isNotNull'],
  filterValueWidget: 'text',
  defaultWidget: 'text',          // PageView でのデフォルトウィジェット
  emptyValue: '',
  gridReadonly: false,            // true にすると Cell でダブルクリック編集不可
  supportsKbdEdit: true,          // Enter キーで編集開始できるか
  supportsTypeToEdit: true,       // 文字入力で編集開始できるか
  hasEnumValues: false,
  hasRefTable: false,
  validationGroup: 'string',
},
```

**`gridReadonly: true` にする型**（グリッドで別 UI を使う場合）: 既存例は `json`（JsonEditorPanel）・`text`（読み取り専用 td）。

---

### Step 3: `src/components/spreadsheet/Cell.tsx` — レンダリング確認

`gridReadonly: false` で `supportsKbdEdit: true` / `supportsTypeToEdit: true` の型なら、
既存の `<input>` パスで処理されるため、**多くの場合追加分岐は不要**。

追加分岐が必要なケース:
- 専用 UI ウィジェット（ピッカーなど）が必要
- 表示フォーマットをカスタマイズしたい（URL をリンク表示など）

分岐を追加するなら `isEditing` の true/false ブロック内に条件を追加する。

---

### Step 4: `src/domain/validator.ts` — バリデーション追加（必要なら）

```ts
// coerceToType: 文字列→型変換
function coerceToType(value: unknown, type: ColumnType): unknown {
  switch (type) {
    case 'url': return String(value ?? '');
    // ...
  }
}

// validateCell: ValidationRule に基づく検証
// 'string' validationGroup に属するなら既存の maxLength チェックがそのまま使える
```

`validationGroup: 'string'` を設定した場合、`required` / `maxLength` の検証は自動的に動く。
型固有のバリデーション（URL 形式チェックなど）が必要なら `validateCell` に追加。

---

### Step 5: `src/domain/filter.ts` — フィルター演算子追加（必要なら）

`filterOps` に `columnTypeConfig.ts` で定義した演算子が `evalExpr` でサポートされているか確認する。
既存の `'contains'` / `'startsWith'` / `'isNull'` などは文字列型で共有できる。

新しい演算子（例：`'isValidUrl'`）を追加する場合は `evalExpr` の `switch` に分岐を追加する。

---

## 確認チェックリスト

- [ ] TypeScript のコンパイルエラーが消えた
- [ ] スキーマエディターで新型のカラムを作成できる（`COLUMN_TYPE_OPTIONS` に自動追加）
- [ ] グリッドでセルの表示・編集が意図通り動く
- [ ] フィルター UI で新型カラムのフィルターが使える
- [ ] `saveAll()` で保存後、リロードしてもデータが正しく読み戻せる

---

## 落とし穴

- `COLUMN_TYPE_CONFIG` に追加し忘れると `Record<ColumnType, ...>` が型エラーになるが、
  `as any` などで回避した場合は実行時に `undefined` 参照で壊れる
- `gridReadonly: true` にしたのに Cell 側の分岐を追加しないと、ダブルクリックで何も起きない無反応なセルになる

→ [[concepts/Gotchas]] — その他の落とし穴一覧

---

## 関連

- [[summaries/src-types]] — `ColumnType` の型定義本体
- [[summaries/src-lib]] — `COLUMN_TYPE_CONFIG` の全設定詳細
- [[concepts/data-model/Schema_Definition]] — カラム型の一覧と編集ウィジェット対応
- [[summaries/src-domain]] — `coerceToType` / `validateCell` の実装
