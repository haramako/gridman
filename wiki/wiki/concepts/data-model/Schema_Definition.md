# Schema Definition

`*.schema.json` はテーブルのカラム定義ファイル。フロントエンドの編集 UI はこの定義を元に生成される。

## 構造

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

## カラム型一覧

| 型 | 説明 | 編集ウィジェット |
|----|------|----------------|
| `string` | テキスト | テキスト input |
| `integer` | 整数 | 数値 input |
| `number` | 小数 | 数値 input |
| `boolean` | 真偽値 | クリックトグル（td 自体がボタン） |
| `enum` | 選択肢 | select ボックス |
| `ref` | 他テーブル参照（外部キー） | select ボックス（参照先 displayName を表示） |
| `ref[]` | 他テーブル参照の配列 | タグリスト（ページビュー用） |
| `json` | JSON オブジェクト | サイドパネル（JsonEditorPanel） |
| `text` | 長文テキスト | 読み取り専用（省略表示、クリックで全文） |
| `date` | 日付 | テキスト input |

**注意**:
- `json` / `text` 型のセルはグリッドでダブルクリックしても編集モードにならない（別 UI）
- `boolean` はセル自体をクリックでトグル（`updateCell` が直接呼ばれる）

## ColumnDef の主要フィールド

| フィールド | 型 | 内容 |
|-----------|-----|------|
| `key` | string | JSONL のプロパティ名 |
| `displayName` | string | 列ヘッダー表示名 |
| `type` | ColumnType | 上記型一覧参照 |
| `isDisplayName` | boolean | `ref` 型で参照されたとき表示する列 |
| `enumValues` | string[] | enum の選択肢（スキーマ内定義） |
| `enumRef` | string | project.json の共有 enum 名 |
| `refTable` | string | `ref` 型の参照先テーブル名 |
| `readonly` | boolean | 編集不可（lookup 展開列など） |
| `validation` | ValidationRule | required / min / max / maxLength |

## 関連

- [[Table_Data]] — スキーマに従ってデータを格納する JSONL
- [[Project_Format]] — `enumRef` の共有 enum 定義
- [[concepts/architecture/Domain_Logic]] — `coerceToType` / `validateCell`
