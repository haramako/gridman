# View Queries

ビュークエリはデータを変換して表示する仕組み。`project.json` の `views` 配列に保存され、ドメイン関数が変換を行う。

## FilterViewQuery

テーブルの行をフィルタリング・ソート・列絞り込みして表示する。最もシンプルなビュー型。

```ts
{
  type: 'filter',
  from: 'enemy',
  filter?: FilterExpr,     // 省略時は全件表示
  sort?: SortDef[],
  columns?: string[]       // 表示カラムを絞り込む（省略時は全カラム）
}
```

## UnionViewQuery

複数テーブルの行を縦結合して 1 つのビューとして表示する。

```ts
{
  type: 'union',
  sources: [
    { from: 'enemy', columns: ['name', 'hp'] },
    { from: 'boss',  columns: ['name', 'hp'], filter: { column: 'active', op: 'eq', value: true } }
  ]
}
```

結合結果の各行には `_source` フィールドで元テーブル名が付与される。

## LookupViewQuery

参照先テーブルのフィールドを展開して追加カラムとして表示する（SQL の JOIN に相当）。

```ts
{
  type: 'lookup',
  from: 'enemy',
  lookups: [
    { column: 'dropItem', from: 'item', as: 'drop', fields: ['name', 'price'] }
  ]
}
// → enemy の列 + drop_name, drop_price が追加される（readonly 列）
```

展開列は `readonly: true` で編集不可。各行の `_sources` フィールドで元テーブルを識別。

## FilterExpr

再帰的な条件式。単一条件と複合条件（and / or）をネストできる。

```ts
// 単一条件
{ column: 'hp', op: 'gte', value: 100 }
{ column: 'name', op: 'contains', value: '竜' }
{ column: 'element', op: 'isNull' }

// 複合条件
{ op: 'and', conditions: [
  { column: 'hp', op: 'gte', value: 100 },
  { column: 'element', op: 'eq', value: 'fire' }
]}
```

**演算子一覧**

| 演算子 | 意味 |
|--------|------|
| `eq` / `neq` | 等しい / 等しくない |
| `gt` / `gte` / `lt` / `lte` | 比較 |
| `contains` | 文字列に含む |
| `startsWith` | 文字列で始まる |
| `isNull` / `isNotNull` | null チェック |
| `and` / `or` | 複合条件 |

## SortDef

```ts
interface SortDef {
  column: string
  direction: 'asc' | 'desc'
}
```

列ヘッダークリックで `direction` がトグルされる。

## 関連

- [[concepts/architecture/Domain_Logic]] — applyFilter / applyUnion / applyLookup の実装
- [[Project_Format]] — ビュー定義の保存場所
