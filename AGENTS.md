# ゲームデータ管理ツール GRIDMAN Overview

ゲーム開発時のデータ（敵・アイテム・スキルなど）をExcelの代替として管理するWebアプリ。
JSONL形式でローカルファイルに保存し、gitで差分管理できることが特徴。

## Directory Structure

```
react-spreadsheet/
├── plan/                        設計ドキュメント（実装前に必ず参照）
│   ├── index.md                 全体概要・決定事項サマリー・将来対応リスト
│   ├── mvp.md                   Phase 1〜4 のスコープ定義（タスクリスト）
│   ├── data-model.md            データモデル・ファイル形式・バリデーション設計
│   ├── architecture.md          アーキテクチャ・Zustand ストア設計
│   ├── view-system.md           ビューシステム設計
│   ├── ui-layout.md             UI・画面設計
│   └── tech-stack.md            技術スタック
├── src/
│   ├── main.tsx                 エントリポイント
│   ├── App.tsx                  RouterProvider ラッパー
│   ├── router.tsx               ルート定義
│   ├── index.css                Tailwind CSS + shadcn/ui CSS 変数
│   ├── components/
│   │   └── spreadsheet/
│   │       ├── SpreadsheetView.tsx   ツールバー + グリッドのコンテナ
│   │       ├── SpreadsheetGrid.tsx   HTML table ベースのグリッド
│   │       ├── DataRow.tsx           行コンポーネント
│   │       └── Cell.tsx             セル（表示・編集・バリデーション）
│   ├── domain/
│   │   └── validator.ts         型変換・バリデーションロジック
│   ├── fs/
│   │   ├── adapter.ts           FileSystemAdapter インターフェース
│   │   └── local-server.ts      LocalServerAdapter（fetch → Hono API）
│   ├── lib/
│   │   └── utils.ts             cn() ユーティリティ（Tailwind merge）
│   ├── pages/
│   │   ├── HomePage.tsx         プロジェクト選択画面
│   │   └── EditorPage.tsx       メインエディター画面
│   ├── stores/
│   │   ├── project.store.ts     プロジェクト・テーブルデータ・保存状態
│   │   ├── view.store.ts        アクティブビュー・フィルター状態
│   │   └── selection.store.ts   セル選択・編集中セルの状態
│   └── types/
│       ├── row.ts               Row 型（_id / _order / _invalid）
│       ├── schema.ts            ColumnDef / TableSchema 型
│       └── view.ts              ViewQuery / ProjectConfig 型
├── server/
│   └── index.ts                 Hono サーバー（ファイル読み書き API）
├── var/
│   └── sample/                  開発用サンプルデータ（.gitignore 対象）
│       ├── project.json
│       ├── enemy.jsonl / enemy.schema.json
│       └── item.jsonl / item.schema.json
├── vite.config.ts               Vite 設定（@ エイリアス・API プロキシ）
├── tailwind.config.ts           Tailwind + shadcn/ui カラートークン
└── biome.json                   Linter / Formatter 設定
```

## Overview

### アーキテクチャ

SPA（Vite + React）+ ローカルサーバー（Hono on Node.js）の 2 層構成。

```
ブラウザ (React SPA :5173)
    ↕ /api/* プロキシ
Hono サーバー (:8080)
    ↕ ファイル I/O
プロジェクトフォルダ (*.jsonl / *.schema.json / project.json)
```

### データモデル

- テーブルデータ: `{tableName}.jsonl`（1 行 1 レコード）
- スキーマ定義: `{tableName}.schema.json`
- プロジェクト設定: `project.json`（または `.spreadsheet/project.json`）

Row の内部フィールド:
- `_id`: ユニーク ID
- `_order`: 表示順序（整数）
- `_invalid`: バリデーション違反値の保持領域（`{ colKey: 入力値 }`）

### 状態管理（Zustand）

| Store | 役割 |
|-------|------|
| `useProjectStore` | テーブルデータ・スキーマ・保存状態。テーブルは `Map<string, Map<string, Row>>` で保持 |
| `useViewStore` | アクティブビュー・テキストフィルター |
| `useSelectionStore` | カーソル位置・編集中セル（`{ rowId, colKey, tableName }` で特定） |

### バリデーション（ソフトバリデーション）

違反値は拒否せず `_invalid` に保持。通常カラムには最後の正常値を保持。
`_invalid` はファイルにそのまま保存され、再起動後も復元される。

### 現在のフェーズ

**Phase 1（コアエディター）実装中。**
フェーズ定義は `plan/mvp.md` を参照。

## Agent Workflow

### 開発サーバー起動

```bash
# フロントエンド（port 5173）
npm run dev

# バックエンド（port 8080）
npm run server
```

両方を起動した状態で `http://localhost:5173` にアクセスする。
サンプルデータのパス: `C:\Work\react-spreadsheet\var\sample`

### 型チェック

```bash
npx tsc --noEmit
```

実装後は必ずこれを実行してエラーがないことを確認すること。

### Lint / Format

```bash
npm run lint
```

### 設計ドキュメントの参照

実装・変更時は `plan/` フォルダのドキュメントを参照すること。
特に以下を確認する:
- 新機能追加 → `plan/mvp.md` でフェーズを確認
- データ構造の変更 → `plan/data-model.md`
- ストア設計の変更 → `plan/architecture.md`
- ビュー関連 → `plan/view-system.md`

### shadcn/ui コンポーネントの追加

```bash
npx shadcn@latest add <component>
```

例: `npx shadcn@latest add button input tooltip`

## Git Rules

- ブランチ名は、`agents/some-feature-description` のように `agents/` を先頭につける
- コミットメッセージの先頭に `[AI]` を付ける
- 例: `[AI] StyleParserのEOFハンドリング修正`
- Phase 1 の作業は `main` ブランチで直接行う（後述の Multica 制御下のときはその限りではない）
- 大きな機能追加（Phase 2 以降）はブランチを切ること

## Multica Rules

Multica(AI Agent管理ツール)の制御下では、以下の処理を行うこと。

- コミットするようなタスクをおこなった場合は、そのコミットを gh コマンドでPull Requestを作成する
  - Pull Request のタイトル、説明は日本語を使用すること
  - Pull Request は Ready for Review の状態にすること
