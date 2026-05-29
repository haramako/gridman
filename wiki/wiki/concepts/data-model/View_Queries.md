# View Queries

ビュークエリはデータを変換して表示する仕組み。`project.json` の `views` 配列に保存され、ドメイン関数が変換を行う。

> 2026-05-30 のビュークエリ統合（[[doc-discussions|view-query-unification]]）で、旧 `filter`/`lookup` は
> 単一の **`SelectQuery`** に統合された。`union` は `UnionQuery`、`page` は `PageViewQuery` として残る。

```ts
type ViewQuery = SelectQuery | UnionQuery | PageViewQuery;
```

## SelectQuery（旧 filter + lookup）

単一ベーステーブルの選択クエリ。**`joins` 無し＝旧 filter**（ベース表をそのまま編集）、
**`joins` 有り＝旧 lookup**（参照先フィールドを展開、展開列は readonly）。

```ts
{
  type: 'select',
  from: 'enemy',
  filter?: FilterExpr,     // 省略時は全件
  sort?: SortDef[],
  columns?: string[],      // 表示カラム絞り込み（省略時は全カラム）
  joins?: Join[]           // 省略 or 空 = フィルタのみ
}
```

### Join

参照先テーブルのフィールドを展開する。右辺は常に参照先の `_id`（**1:1 保証**）。

```ts
type Join = { column: string; from: string; as: string; fields: string[] }

// 例: enemy.dropItem が指す item の name/price を drop.name / drop.price として展開
{ column: 'dropItem', from: 'item', as: 'drop', fields: ['name', 'price'] }
// → enemy の列 + drop.name, drop.price（readonly 列）
```

`joins` を持つ行には `_origin = { table, id }` が付与され、編集の書き戻し先（ベース表とベース行）を示す。
展開列は readonly のため書き戻し対象外。詳細は [[concepts/Gotchas]] #8。

## UnionQuery（union）

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

各ソースは `{ from, columns?, filter? }`（`UnionSource`）。結合結果の各行には `_origin = { table, id }` が
付与され、元テーブルへの編集・削除の書き戻しに使う。列はキー基準でマージ（同名キーは先勝ち）。

## PageViewQuery（page）

カード型表示（[[concepts/Page_View]]）用。グリッド変換ではなく表示モードに近い。

```ts
{ type: 'page', from: 'enemy', filter?: FilterExpr, pageLayout?: string }
```

## FilterExpr

再帰的な条件式。単一条件と複合条件（and / or）をネストできる。

```ts
// 単一条件
{ column: 'hp', op: 'gte', value: 100 }
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
type SortDef = { column: string; order: 'asc' | 'desc' }
```

列ヘッダークリックで `order` がトグルされる。

## 関連

- [[concepts/architecture/Domain_Logic]] — applySelect / applyUnion の実装
- [[concepts/Gotchas]] — `_origin` 予約フィールド（#8）
- [[concepts/how-to/Add_View_Type]] — 新しいビュー種別の追加手順
- [[Project_Format]] — ビュー定義の保存場所
