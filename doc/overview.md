# GRIDMAN — 概要ドキュメント

> Phase 1 開発中につき、細部は変わりうる。詳細な設計は `plan/` を参照。

## 何をするアプリか

ゲーム開発時のデータ（敵・アイテム・スキルなど）をスプレッドシート形式で編集するWebアプリ。
Excelの代替として、**JSONL + JSON Schema** でデータを保存することで git での差分管理を可能にする。

## 起動方法

```bash
npm install

# ターミナル1: フロントエンド (port 5173)
npm run dev

# ターミナル2: バックエンド (port 8080)
npm run server
```

ブラウザで `http://localhost:5173` を開く。
サンプルデータのパス: `C:\Work\react-spreadsheet\var\sample`（なければ `npm run sample:reset` で作成）

## データ構造

プロジェクトは1つのフォルダで管理する。

```
my-project/
├── project.json          # プロジェクト設定（テーブル一覧・ビュー定義）
├── enemy.jsonl           # テーブルデータ（1行1レコード）
├── enemy.schema.json     # カラム定義
├── item.jsonl
└── item.schema.json
```

### Row の内部フィールド

| フィールド | 説明 |
|---|---|
| `_id` | レコードの一意ID（文字列） |
| `_order` | 表示順（整数、1000刻み推奨） |
| `_invalid` | バリデーション違反値の保持領域 `{ colKey: 入力値 }` |

### カラム型

`string` / `integer` / `number` / `boolean` / `enum` / `ref` / `json` / `text` / `date`

`ref` 型は他テーブルの行を参照する外部キー。`isDisplayName: true` の列が表示名として使われる。

## バリデーション（ソフトバリデーション）

違反値を **拒否せず** `_invalid` に保持し、正常値を持つ通常フィールドを維持する。
違反セルは赤枠で表示。ファイルにも `_invalid` のまま保存される。

## 保存

- `Ctrl+S` で手動保存
- 変更のあった行だけを PATCH（差分保存）

## システム構成

```
ブラウザ (React SPA :5173)
    ↕ /api/* プロキシ
Hono サーバー (:8080)
    ↕ ファイル I/O
プロジェクトフォルダ
```

## 主要ディレクトリ

| パス | 内容 |
|---|---|
| `src/components/spreadsheet/` | グリッド・セル・ビューのUIコンポーネント |
| `src/stores/` | Zustand ストア（project / view / selection） |
| `src/domain/validator.ts` | 型変換・バリデーションロジック |
| `src/fs/` | ファイルI/Oアダプター |
| `server/index.ts` | Hono APIサーバー |
| `plan/` | 設計ドキュメント（詳細仕様はこちら） |
| `fixtures/sample/` | サンプルデータのマスター（git管理） |
