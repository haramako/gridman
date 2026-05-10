# データモデル

## プロジェクトフォルダの構造

```
my-project/
├── project.json          # プロジェクト設定
├── enemy.schema.json     # テーブルのカラム定義
├── enemy.jsonl           # テーブルデータ（1行1レコードのJSON）
├── item.schema.json
├── item.jsonl
└── boss_card.page.json   # ページテンプレート（任意）
```

`.spreadsheet/` サブディレクトリにまとめて置くことも可能（サーバーが自動判別）。

---

## project.json

```json
{
  "version": 1,
  "name": "モンスターデータ",
  "tables": ["enemy", "skill", "item"],
  "views": [
    {
      "id": "v1",
      "name": "炎属性の敵",
      "query": {
        "type": "filter",
        "from": "enemy",
        "filter": { "column": "element", "op": "eq", "value": "fire" }
      }
    }
  ],
  "enums": [
    { "name": "elementType", "values": ["fire", "ice", "thunder"] }
  ]
}
```

---

## スキーマ定義 (`*.schema.json`)

```json
{
  "name": "enemy",
  "displayName": "敵",
  "columns": [
    {
      "key": "name",
      "displayName": "名前",
      "type": "string",
      "isDisplayName": true,
      "validation": { "required": true, "maxLength": 50 }
    },
    {
      "key": "hp",
      "displayName": "HP",
      "type": "integer",
      "validation": { "min": 1, "max": 9999 }
    },
    {
      "key": "element",
      "displayName": "属性",
      "type": "enum",
      "enumRef": "elementType"
    },
    {
      "key": "dropItem",
      "displayName": "ドロップアイテム",
      "type": "ref",
      "refTable": "item"
    }
  ]
}
```

### カラム型一覧

| 型 | 説明 | 編集ウィジェット |
|---|---|---|
| `string` | テキスト | テキスト入力 |
| `integer` | 整数 | 数値入力 |
| `number` | 小数 | 数値入力 |
| `boolean` | 真偽値 | チェックボックス（クリックトグル） |
| `enum` | 選択肢 | セレクトボックス |
| `ref` | 他テーブル参照（外部キー） | セレクトボックス |
| `ref[]` | 他テーブル参照の配列 | タグリスト（ページビュー用） |
| `json` | JSON オブジェクト | サイドパネル（JsonEditorPanel） |
| `text` | 長文テキスト | 読み取り専用（省略表示） |
| `date` | 日付 | テキスト入力 |

### ColumnDef の主要フィールド

| フィールド | 型 | 内容 |
|---|---|---|
| `key` | string | フィールドキー（JSONL のプロパティ名） |
| `displayName` | string | 列ヘッダーに表示する名前 |
| `type` | ColumnType | 上記参照 |
| `isDisplayName` | boolean | `ref` 型で参照されたとき表示する列 |
| `enumValues` | string[] | enum の選択肢（スキーマ内定義） |
| `enumRef` | string | project.json の共有 enum 名 |
| `refTable` | string | `ref` 型の参照先テーブル名 |
| `readonly` | boolean | 編集不可（ルックアップ展開列など） |
| `validation` | ValidationRule | required / min / max / maxLength |

---

## テーブルデータ (`*.jsonl`)

1行1レコードの JSON Lines 形式。

```jsonl
{"_id":"e001","_order":1000,"name":"スライム","hp":30,"element":"water"}
{"_id":"e002","_order":2000,"name":"ゴブリン","hp":50,"element":"fire"}
```

### 内部フィールド

| フィールド | 型 | 内容 |
|---|---|---|
| `_id` | string | レコードの一意ID |
| `_order` | number | 表示順（1000刻み推奨、挿入余地を残すため） |
| `_invalid` | Record | バリデーション違反値の保持 `{ colKey: 入力値 }` |

`_invalid` はソフトバリデーションのキー概念。違反値を捨てずに `_invalid.hp = "abc"` のように保存し、`hp` フィールドは直前の正常値を維持する。

---

## ビュークエリ型

### FilterViewQuery

```ts
{
  type: 'filter',
  from: 'enemy',
  filter?: FilterExpr,   // 省略時は全件表示
  sort?: SortDef[],
  columns?: string[]     // 表示カラムを絞り込む（省略時は全カラム）
}
```

### UnionViewQuery

```ts
{
  type: 'union',
  sources: [
    { from: 'enemy', columns: ['name', 'hp'] },
    { from: 'boss',  columns: ['name', 'hp'], filter: { column: 'active', op: 'eq', value: true } }
  ]
}
```

### LookupViewQuery

```ts
{
  type: 'lookup',
  from: 'enemy',
  lookups: [
    { column: 'dropItem', from: 'item', as: 'drop', fields: ['name', 'price'] }
  ]
}
// → enemy の列 + drop_name, drop_price が追加される（readonly）
```

### FilterExpr

再帰的な条件式。

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

演算子: `eq` `neq` `gt` `gte` `lt` `lte` `contains` `startsWith` `isNull` `isNotNull`

---

## ページテンプレート (`*.page.json`)

```json
{
  "name": "ボス詳細",
  "table": "boss",
  "layout": [
    { "type": "field", "key": "name",    "label": "名前",   "widget": "text" },
    { "type": "field", "key": "hp",      "label": "HP",     "widget": "number" },
    { "type": "section", "label": "スキル", "children": [
      { "type": "field", "key": "skills", "label": "", "widget": "tag-list" }
    ]}
  ]
}
```
