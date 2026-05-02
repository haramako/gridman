# ビューシステム

## 概要

「ビュー」は同一データセットを異なる切り口で見るための仕組み。
生のテーブルデータに変更は加えず、表示・編集の窓口として機能する。

```
テーブル (enemy.jsonl) ──┐
テーブル (boss.jsonl)  ──┤── ViewQuery ──→ ViewResult (ITable相当)
テーブル (item.jsonl)  ──┘
```

---

## ビューの種類

### 1. フィルタービュー (Filter View)
単一テーブルに条件を適用したビュー。

```json
{
  "type": "filter",
  "from": "enemy",
  "filter": {
    "op": "and",
    "conditions": [
      { "column": "element", "op": "eq", "value": "fire" },
      { "column": "hp", "op": "gte", "value": 100 }
    ]
  },
  "sort": [{ "column": "hp", "order": "desc" }]
}
```

**編集可能性:** ✅ フィルタ対象テーブルに直接書き戻せるため、常に編集可能

---

### 2. ユニオンビュー (Union View)
複数テーブルの行を縦に結合したビュー。SQLの UNION に相当。

```json
{
  "type": "union",
  "sources": [
    { "from": "enemy", "columns": ["name", "hp", "attack"] },
    { "from": "boss",  "columns": ["name", "hp", "attack"] }
  ]
}
```

**編集可能性:** ✅ 各行はどのテーブル由来か (`_source`) を保持するため、元テーブルに書き戻せる

**表示例:**
```
| _source | name        | hp   | attack |
|---------|-------------|------|--------|
| enemy   | スライム    | 10   | 3      |
| enemy   | ゴブリン    | 25   | 8      |
| boss    | 魔王        | 5000 | 200    |
```

`_source` 列はデフォルト非表示にしてもよい。

---

### 3. ルックアップビュー (Lookup View)
参照先テーブルの列を展開して表示するビュー。SQLの LEFT JOIN 相当。

```json
{
  "type": "lookup",
  "from": "enemy",
  "lookups": [
    {
      "column": "dropItemId",    // enemy側の参照カラム
      "from": "item",            // 参照先テーブル
      "as": "dropItem",          // プレフィックス
      "fields": ["name", "type"] // 展開する列
    }
  ]
}
```

**表示例:**
```
| name    | hp  | dropItemId | dropItem.name   | dropItem.type |
|---------|-----|------------|-----------------|---------------|
| スライム | 10  | x1y2       | 回復ポーション  | consumable    |
```

**編集可能性:** △ `enemy` テーブルの列は編集可能。`dropItem.*` 列は読み取り専用（元テーブルへの意図せぬ変更を防ぐ）

---

### 4. ページビュー (Page View)
1レコードを1ページ（カード）として表示するビュー。HyperCard的な表示。

```json
{
  "type": "page",
  "from": "enemy",
  "filter": null,
  "pageLayout": "default"
}
```

**表示例:**

```
┌─────────────────────────────────────────────────┐
│  ← 前   ゴブリン (2 / 50)   次 →               │
├──────────────┬──────────────────────────────────┤
│  名前        │  ゴブリン                        │
│  HP          │  25                              │
│  攻撃力      │  8                               │
│  属性        │  なし                            │
│  ドロップ    │  ┌────────────────────────┐      │
│              │  │ アイテム   確率         │      │
│              │  │ 鉄の剣     10%          │      │
│              │  └────────────────────────┘      │
│  スキル      │  [突き] [防御崩し]               │
└──────────────┴──────────────────────────────────┘
```

**編集可能性:** ✅ 各フィールドはインライン編集可能

---

## ビュークエリの型定義

```typescript
type ViewQuery =
  | FilterViewQuery
  | UnionViewQuery
  | LookupViewQuery
  | PageViewQuery

type FilterViewQuery = {
  type: 'filter'
  from: string           // テーブル名
  filter?: FilterExpr
  sort?: SortDef[]
  columns?: string[]     // 表示する列（省略時は全列）
}

type UnionViewQuery = {
  type: 'union'
  sources: Array<{
    from: string
    columns?: string[]
    filter?: FilterExpr
  }>
}

type LookupViewQuery = {
  type: 'lookup'
  from: string
  filter?: FilterExpr
  lookups: Array<{
    column: string       // 参照元カラム
    from: string         // 参照先テーブル
    as: string           // 展開時のプレフィックス
    fields: string[]     // 展開する列
  }>
}

type PageViewQuery = {
  type: 'page'
  from: string
  filter?: FilterExpr
}

// フィルター条件
type FilterExpr =
  | { op: 'and' | 'or'; conditions: FilterExpr[] }
  | { column: string; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith'; value: unknown }
  | { column: string; op: 'isNull' | 'isNotNull' }

type SortDef = { column: string; order: 'asc' | 'desc' }
```

---

## ビューの編集可能性ルール

| ビュー種別 | 編集可否 | 書き戻し先 |
|-----------|---------|-----------|
| フィルタービュー | ✅ 常に可 | 元テーブル |
| ユニオンビュー | ✅ 行ごとに可 | 各行の`_source`テーブル |
| ルックアップビュー | △ 元テーブル列のみ可 | `from`テーブル |
| ページビュー | ✅ 常に可 | 元テーブル |

**ユニオンビューで列が不一致の場合:** 対象テーブルに存在しない列は `null` 表示で編集不可。

---

## テーブル横断検索

```
検索クエリ: "ドラゴン"
    ↓
全テーブルの全列を対象にインデックス検索
    ↓
結果:
  enemy / _id:xyz / name: "ドラゴン"       ← 完全一致
  skill / _id:abc / description: "ドラゴンキラー"  ← 部分一致
  item  / _id:def / name: "ドラゴンの牙"    ← 部分一致
```

実装方針:
- 初回: 全テーブルをメモリ上にロードしてインメモリ検索
- データ量が多い場合: lunr.js や fuse.js などの軽量検索ライブラリを検討
- 検索結果クリックで該当テーブル・行にジャンプ

---

## ビュー定義のUI

ビューはコードではなくGUIで定義できるようにする（`project.json` には自動出力）。

```
┌─────────────────────────────────────────────────┐
│ ビュー編集                                       │
├──────────────────────────────────────────────────┤
│ ビュー名: [火属性エネミー            ]           │
│ 種別: [フィルタービュー ▼]                       │
│                                                  │
│ ソース: [enemy ▼]                                │
│                                                  │
│ フィルター条件:                                  │
│  [element ▼] [eq ▼] [fire    ]  [× 削除]        │
│  [hp      ▼] [gte▼] [100     ]  [× 削除]        │
│  [+ 条件追加]                                    │
│                                                  │
│ 表示列: [✓ name] [✓ hp] [✓ attack] [□ drops]   │
│                                                  │
│ [キャンセル]                    [保存]           │
└──────────────────────────────────────────────────┘
```
