# データモデルとファイル形式

## 設計方針

- **git-friendly**: 行の変更がgit diffで人間に読みやすく表れること
- **スキーマ分離**: データとスキーマ定義を別ファイルに持つ
- **拡張性**: カラムの型追加、バリデーションルール追加が容易

---

## ファイル形式: JSONL + Schema JSON

### 比較検討

| 形式 | git diff | 構造化データ | 可読性 | 採用 |
|------|---------|------------|--------|------|
| 単一JSON（現状）| ❌ 全体が変わる | ✅ | ✅ | ❌ |
| CSV/TSV | ✅ 行単位 | ❌ | ✅ | ❌ |
| YAML | ✅ | ✅ | ✅ | △ パース複雑 |
| **JSONL (1行1行)** | ✅ 行単位 | ✅ | ✅ | ✅ |
| SQLite | ❌ バイナリ | ✅ | ❌ | ❌ |

**JSONL** (JSON Lines) 形式: 1行が1つのJSONオブジェクト

```jsonl
{"_id":"a1b2","name":"スライム","hp":10,"attack":3,"_order":1000}
{"_id":"c3d4","name":"ゴブリン","hp":25,"attack":8,"_order":2000}
{"_id":"e5f6","name":"ドラゴン","hp":500,"attack":80,"_order":3000}
```

**git diffの例（行を1行変更した場合）:**
```diff
-{"_id":"c3d4","name":"ゴブリン","hp":25,"attack":8,"_order":2000}
+{"_id":"c3d4","name":"ゴブリン","hp":30,"attack":8,"_order":2000}
```

非常にクリーンなdiff。1行変更が1行のdiffに対応する。

> デフォルトではJSONL形式で決定。ただし、出力に関しては、JSONやCSVも可能とする（MVP外)

---

## プロジェクト構造

```
my-game-data/                     ← Gitリポジトリのルート
├── .spreadsheet/
│   └── project.json              ← プロジェクト設定・ビュー定義
├── enemy.jsonl                   ← テーブルデータ（JSONL）
├── enemy.schema.json             ← テーブルスキーマ
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
      "key": "attack",
      "displayName": "攻撃力",
      "type": "integer",
      "validation": { "min": 0 }
    },
    {
      "key": "element",
      "displayName": "属性",
      "type": "enum",
      "enumValues": ["fire", "water", "earth", "wind", "none"],
      "validation": { "required": false }
    },
    {
      "key": "drops",
      "displayName": "ドロップアイテム",
      "type": "json",
      "schema": {
        "type": "array",
        "items": {
          "itemId": { "type": "ref", "table": "item" },
          "rate": { "type": "number" }
        }
      }
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
| `ref` | 他テーブル行への参照（FK的） | 参照解決表示 + セレクト |
| `ref[]` | 複数参照 | 複数セレクト or サイドパネル |
| `json` | 任意のJSONオブジェクト/配列 | JSON専用エディター |
| `text` | 長文テキスト | サイドパネルエディター |
| `date` | 日付 | 日付ピッカー |

> `enum`に関しては、プロジェクト全体で使用するenumを定義できる必要がある（MVP外)

> `ref`型に関しては、`json`型の中に含むことも想定しているか？ (MVP外)

---

## データファイル (*.jsonl)

```jsonl
{"_id":"a1b2c3","name":"スライム","hp":10,"attack":3,"element":"water","_order":1000}
{"_id":"d4e5f6","name":"ゴブリン","hp":25,"attack":8,"element":"none","_order":2000}
```

**内部フィールド（アンダースコアプレフィックス）:**

| フィールド | 説明 |
|-----------|------|
| `_id` | 行のユニークID（UUID v4 または短縮形）|
| `_order` | 表示順序（整数、隙間挿入可能）|
| `_invalid` | バリデーション違反値の保持領域（後述）|

`_type`（現在の実装）は廃止。テーブル名はファイル名で識別するため不要。

---

## バリデーション違反値の保存形式

バリデーション違反が発生した場合、**違反前の最後の正常値をそのカラムに保持**し、
**違反値は `_invalid` オブジェクトに格納**する。

```jsonl
{"_id":"d4e5f6","name":"ゴブリン","hp":25,"age":10,"_invalid":{"age":"abc"},"_order":2000}
```

`age` の例:
- `age: 10` → 最後の正常値（出力・参照に使われる）
- `_invalid.age: "abc"` → ユーザーが入力した違反値（表示・復元用）

**状態遷移:**

```
① 正常値 10 を保持
   {"age": 10}

② ユーザーが "abc" を入力（バリデーション違反）
   {"age": 10, "_invalid": {"age": "abc"}}
   表示: "abc"（赤表示）、実データは 10 のまま

③-a ユーザーが正常値 20 に修正
   {"age": 20}
   _invalid.age は削除される

③-b ユーザーが違反値を破棄（元に戻す操作）
   {"age": 10}
   _invalid.age は削除される
```

**複数フィールドに違反がある場合:**
```jsonl
{"_id":"e001","hp":10,"attack":5,"_invalid":{"hp":"xxx","attack":-1},"_order":1000}
```

**保存・出力の挙動:**
- 通常保存: `_invalid` を含めてそのまま保存（違反状態を永続化）
- クリーンエクスポート（将来機能）: `_invalid` フィールドを除外して出力

---

## プロジェクト設定ファイル (project.json)

```json
{
  "version": 1,
  "name": "My Game Data",
  "tables": ["enemy", "item", "skill", "map"],
  "views": [
    {
      "id": "v001",
      "name": "ボス一覧",
      "type": "table",
      "query": {
        "from": "enemy",
        "filter": { "column": "isBoss", "op": "eq", "value": true }
      }
    },
    {
      "id": "v002",
      "name": "全エネミー（火属性）",
      "type": "table",
      "query": {
        "from": "enemy",
        "filter": { "column": "element", "op": "eq", "value": "fire" }
      }
    },
    {
      "id": "v003",
      "name": "敵詳細カード",
      "type": "page",
      "query": { "from": "enemy" },
      "pageLayout": "default"
    }
  ]
}
```

---

## ソフトバリデーション

要件:「バリデーション違反を拒否せず、違反状態をファイルに永続化する」

### 行データの構造

違反値は `_invalid` フィールドに格納する。通常カラムには常に最後の正常値が入る。

```typescript
type Row = {
  _id: string
  _order: number
  _invalid?: Record<string, unknown>  // キー: カラム名, 値: 違反入力値
  [key: string]: unknown              // ユーザーデータ（常に正常値）
}
```

**例: `age` に不正値 "abc" を入力した状態**
```jsonl
{"_id":"e001","name":"ゴブリン","age":10,"_invalid":{"age":"abc"},"_order":2000}
```

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

### バリデーションエラー情報の保持

`_invalid` は違反値のみ保存する。エラーメッセージはスキーマから再計算できるため保存しない。

```typescript
// メモリ上でのみ保持（ファイルには書かない）
type ValidationError = {
  rule: string     // 'required' | 'min' | 'max' | 'type' など
  message: string
}
```

### 保存時の動作

- 違反値を含む状態のままファイルに保存する（`_invalid` ごと書き出す）
- アプリを再起動しても違反状態が復元される
- `_invalid` フィールドがない行は完全に正常な状態

---

## 参照解決 (ref型)

`ref` 型カラムはIDを格納するが、表示は参照先テーブルの `isDisplayName: true` なカラムで行う。

```
enemy.drops[0].itemId = "x1y2"
            ↓ 参照解決
item["x1y2"].name = "回復ポーション"
            ↓ セル表示
"回復ポーション"
```

**編集時:** セレクトボックスで参照先テーブルの行一覧から選択 → IDを格納

---

## 構造化データカラム (json型)

`json` 型カラムはセル内に任意のオブジェクト/配列を格納できる。

**スプレッドシートビューでの表示:**
```
| name    | hp  | drops                    |
|---------|-----|--------------------------|
| スライム | 10  | [回復ポーション x0.5]     |  ← 省略表示
| ゴブリン | 25  | (空)                     |
```

クリックまたはダブルクリックでサイドパネルのJSONエディターを開く。

**サイドパネルでの編集:**
- スキーマがあれば構造化フォーム表示
- スキーマがなければJSONテキストエディター
