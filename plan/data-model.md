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

---

## データファイル (*.jsonl)

```jsonl
{"_id":"a1b2c3","name":"スライム","hp":10,"attack":3,"element":"water","drops":[{"itemId":"x1y2","rate":0.5}],"skills":[],"_order":1000}
{"_id":"d4e5f6","name":"ゴブリン","hp":25,"attack":8,"element":"none","drops":[],"skills":["s001"],"_order":2000}
```

**内部フィールド（アンダースコアプレフィックス）:**

| フィールド | 説明 |
|-----------|------|
| `_id` | 行のユニークID（UUID v4 または短縮形）|
| `_order` | 表示順序（整数、隙間挿入可能）|

`_type`（現在の実装）は廃止。テーブル名はファイル名で識別するため不要。

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

## ソフトバリデーション（Dirty State）

要件:「バリデーション違反を拒否せず、違反状態を別に保持する」

```typescript
// 行データの内部表現
type RowState = {
  // 永続化データ（バリデーション通過済み）
  committed: Record<string, unknown>

  // 編集中または違反のある値（未確定）
  dirty: {
    [columnKey: string]: {
      value: unknown          // ユーザーが入力した値
      violations: Violation[] // バリデーション違反一覧
    }
  }
}

type Violation = {
  rule: string     // 'required' | 'min' | 'max' | 'pattern' など
  message: string  // 表示メッセージ
}
```

**UI表示方針:**

| 状態 | セルの表示 |
|------|-----------|
| clean | 通常 |
| dirty (バリデーションOK) | 黄色ハイライト（変更済み） |
| dirty (バリデーション違反) | 赤枠 + ツールチップにエラー詳細 |
| committed後 | ハイライト消える |

**保存時の動作:**
- `committed` のみJSONLに書き出す（違反値は保存しない）
- または「違反あり行を含めて保存する（警告表示）」オプションも可

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
