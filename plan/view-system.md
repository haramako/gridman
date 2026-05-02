# ビューシステム

## 概要

「ビュー」は同一データセットを異なる切り口で見るための仕組み。
生のテーブルデータに変更は加えず、表示・編集の窓口として機能する。

```
テーブル (enemy.jsonl) ──┐
テーブル (boss.jsonl)  ──┤── ViewQuery ──→ ITable（表示用）
テーブル (item.jsonl)  ──┘
```

---

## ビューの種類

### 1. フィルタービュー

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

### 2. ユニオンビュー

複数テーブルの行を縦に結合したビュー（SQL の UNION に相当）。

```json
{
  "type": "union",
  "sources": [
    { "from": "enemy", "columns": ["name", "hp", "attack"] },
    { "from": "boss",  "columns": ["name", "hp", "attack"] }
  ]
}
```

**編集可能性:** ✅ 各行は `_source` で元テーブルを保持するため書き戻し可能

---

### 3. ルックアップビュー

参照先テーブルの列を展開するビュー（SQL の LEFT JOIN に相当）。

```json
{
  "type": "lookup",
  "from": "enemy",
  "lookups": [
    {
      "column": "dropItemId",
      "from": "item",
      "as": "dropItem",
      "fields": ["name", "type"]
    }
  ]
}
```

**編集可能性:** △ `enemy` 列は編集可能。展開した `dropItem.*` 列は読み取り専用

---

### 4. ページビュー

1レコードを1ページ（カード）として表示するビュー。

```json
{
  "type": "page",
  "from": "enemy",
  "filter": null,
  "pageLayout": "default"
}
```

**編集可能性:** ✅ 各フィールドはインライン編集可能

---

## ビューの編集可能性ルール

| ビュー種別 | 編集可否 | 書き戻し先 |
|-----------|---------|-----------|
| フィルタービュー | ✅ | 元テーブル |
| ユニオンビュー | ✅ 行ごとに可 | 各行の `_source` テーブル |
| ルックアップビュー | ✅ 元テーブル列のみ | `_sources` マッピングで特定 |
| ページビュー | ✅ | 元テーブル |

---

## ルックアップビューの書き戻し機構

各ビュー行は `_sources` マッピングを内部保持する。

```typescript
type ViewRow = {
  name: "ゴブリン"
  "item.name": "鉄の剣"

  // 書き戻し用マッピング（内部保持・非表示）
  _sources: {
    enemy: "e001",
    item:  "i001",
  }
}
```

### 共有参照の警告

同一の参照先行を複数の行が参照している場合、ルックアップビュー経由の編集はすべての参照元に伝搬する。編集開始時に警告を表示する。

```
⚠ "鉄の剣" は 3箇所で参照されています。変更はすべての参照先に反映されます。
```

---

## クエリ型定義

```typescript
type ViewQuery =
  | FilterViewQuery
  | UnionViewQuery
  | LookupViewQuery
  | PageViewQuery

type FilterViewQuery = {
  type: 'filter'
  from: string
  filter?: FilterExpr
  sort?: SortDef[]
  columns?: string[]
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
    column: string
    from: string
    as: string
    fields: string[]
  }>
}

type PageViewQuery = {
  type: 'page'
  from: string
  filter?: FilterExpr
}

type FilterExpr =
  | { op: 'and' | 'or'; conditions: FilterExpr[] }
  | { column: string; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith'; value: unknown }
  | { column: string; op: 'isNull' | 'isNotNull' }

type SortDef = { column: string; order: 'asc' | 'desc' }
```

---

## テーブル横断検索（Phase 2）

```
検索クエリ: "ドラゴン"
    ↓
全テーブルの全列を対象にインメモリ検索
    ↓
結果:
  enemy / name: "ドラゴン"
  skill / description: "ドラゴンキラー"
  item  / name: "ドラゴンの牙"
```

データ量が多い場合は lunr.js / fuse.js などの軽量検索ライブラリを検討。
検索結果クリックで該当テーブル・行にジャンプ。

---

## フェーズ別実装スコープ

| ビュー種別 | Phase |
|-----------|-------|
| テーブル直接表示（ビュー定義なし） | Phase 1 |
| フィルタービュー（GUI定義・保存）| Phase 2 |
| ユニオンビュー | Phase 2 |
| テーブル横断検索 | Phase 2 |
| ルックアップビュー経由の編集 | Phase 3 |
| ページ/カードビュー | Phase 3 |
