# データモデルとファイル形式

## ファイル形式: JSONL + Schema JSON

1行が1レコードの JSONL 形式。行の変更が git diff で行単位に対応する。

```jsonl
{"_id":"a1b2","name":"スライム","hp":10,"attack":3,"_order":1000}
{"_id":"c3d4","name":"ゴブリン","hp":25,"attack":8,"_order":2000}
```

**git diff の例（1行変更）:**
```diff
-{"_id":"c3d4","name":"ゴブリン","hp":25,"attack":8,"_order":2000}
+{"_id":"c3d4","name":"ゴブリン","hp":30,"attack":8,"_order":2000}
```

エクスポート機能として JSON / CSV 形式も将来対応予定（Phase 4）。

---

## プロジェクト構造

```
my-game-data/
├── .spreadsheet/
│   └── project.json          ← プロジェクト設定・ビュー定義
├── enemy.jsonl               ← テーブルデータ
├── enemy.schema.json         ← テーブルスキーマ
├── item.jsonl
├── item.schema.json
├── skill.jsonl
└── skill.schema.json
```

---

## スキーマファイル (*.schema.json)

```json
{
  "name": "enemy",
  "displayName": "敵キャラクター",
  "columns": [
    {
      "key": "name",
      "displayName": "名前",
      "type": "string",
      "validation": { "required": true, "maxLength": 50 },
      "isDisplayName": true
    },
    {
      "key": "hp",
      "displayName": "HP",
      "type": "integer",
      "validation": { "required": true, "min": 1 }
    },
    {
      "key": "element",
      "displayName": "属性",
      "type": "enum",
      "enumValues": ["fire", "water", "earth", "wind", "none"]
    },
    {
      "key": "drops",
      "displayName": "ドロップアイテム",
      "type": "json"
    },
    {
      "key": "skills",
      "displayName": "スキル",
      "type": "ref[]",
      "refTable": "skill"
    }
  ]
}
```

### カラム型一覧

| type | 説明 | 編集UI |
|------|------|--------|
| `string` | 文字列 | インラインテキスト |
| `integer` | 整数 | 数値入力 |
| `number` | 浮動小数点数 | 数値入力 |
| `boolean` | 真偽値 | チェックボックス |
| `enum` | 列挙値 | セレクトボックス |
| `ref` | 他テーブル行への参照（FK）| 参照解決表示 + セレクト |
| `ref[]` | 複数参照 | 複数セレクト or サイドパネル |
| `json` | 任意のJSONオブジェクト/配列 | JSON専用エディター（Phase 3）|
| `text` | 長文テキスト | サイドパネルエディター |
| `date` | 日付 | 日付ピッカー |

**将来対応予定:**
- プロジェクト全体で共有する enum 定義（Phase 2以降）
- `ref` 型を `json` 型の中に含むケース（検討中）

---

## データファイル (*.jsonl)

### 内部フィールド（アンダースコアプレフィックス）

| フィールド | 説明 |
|-----------|------|
| `_id` | 行のユニークID（UUID v4 または短縮形）|
| `_order` | 表示順序（整数、隙間挿入可能）|
| `_invalid` | バリデーション違反値の保持領域 |

`_type`（旧実装）は廃止。テーブル名はファイル名で識別するため不要。

### TypeScript 型定義

```typescript
type Row = {
  _id: string
  _order: number
  _invalid?: Record<string, unknown>  // キー: カラム名, 値: 違反入力値
  [key: string]: unknown              // ユーザーデータ（常に正常値）
}
```

---

## ソフトバリデーション

違反値は `_invalid` フィールドに格納する。通常カラムには常に最後の正常値が入る。

```jsonl
{"_id":"e001","name":"ゴブリン","age":10,"_invalid":{"age":"abc"},"_order":2000}
```

- `age: 10` → 最後の正常値（出力・参照に使われる）
- `_invalid.age: "abc"` → ユーザーが入力した違反値（表示・復元用）

### 状態遷移

```
① 正常値 10 を保持
   { age: 10 }

② "abc" を入力（バリデーション違反）
   { age: 10, _invalid: { age: "abc" } }
   → セル表示: "abc"（赤枠）、出力・参照値は 10 のまま

③-a 正常値 20 に修正
   { age: 20 }
   → _invalid.age は削除

③-b 違反値を破棄（元に戻す操作）
   { age: 10 }
   → _invalid.age は削除
```

### セルの表示状態

| 状態 | 判定条件 | セルの表示 |
|------|---------|-----------|
| 未変更 | `_invalid` なし、保存済みと同値 | 通常 |
| 変更済み（正常） | `_invalid` なし、未保存の変更あり | 黄色ハイライト |
| バリデーション違反 | `_invalid.{key}` あり | 赤枠 + ツールチップにエラー詳細 |

表示値の優先順位: `_invalid.{key}` があればその値を表示、なければ `{key}` の値を表示。

### バリデーションエラー情報

`_invalid` は違反値のみ保存する。エラーメッセージはスキーマから再計算できるためファイルには保存しない。

```typescript
// メモリ上でのみ保持
type ValidationError = {
  rule: string     // 'required' | 'min' | 'max' | 'type' など
  message: string
}
```

### 保存時の動作

- `_invalid` を含む状態のままファイルに保存（違反状態を永続化）
- アプリを再起動しても違反状態が復元される
- クリーンエクスポート（将来機能）: `_invalid` フィールドを除外して出力

---

## ref 型の参照解決

`ref` 型カラムはIDを格納するが、表示は参照先テーブルの `isDisplayName: true` なカラムで行う。

```
enemy.dropItemId = "x1y2"
        ↓ 参照解決
item["x1y2"].name = "回復ポーション"
        ↓ セル表示
"回復ポーション"
```

編集時: セレクトボックスで参照先テーブルの行一覧から選択 → ID を格納。

---

## json 型カラム

セル内に任意のオブジェクト/配列を格納できる。

**スプレッドシートビューでの表示:**
```
| name    | hp  | drops                    |
|---------|-----|--------------------------|
| スライム | 10  | [回復ポーション x0.5]     |  ← 省略表示
```

クリック/ダブルクリックでサイドパネルのエディターを開く（Phase 3実装）。
Phase 1ではテキスト表示のみ（編集不可）。

---

## プロジェクト設定ファイル (project.json)

```json
{
  "version": 1,
  "name": "My Game Data",
  "tables": ["enemy", "item", "skill"],
  "views": [
    {
      "id": "v001",
      "name": "ボス一覧",
      "type": "filter",
      "query": {
        "from": "enemy",
        "filter": { "column": "isBoss", "op": "eq", "value": true }
      }
    }
  ]
}
```
