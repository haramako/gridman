# アーキテクチャ

## システム構成

```
ブラウザ (React SPA :5173)
    ↕  /api/* をプロキシ (vite.config.ts)
Hono サーバー (:8080)
    ↕  ファイル I/O
プロジェクトフォルダ (任意のディレクトリ)
```

フロントエンドは Vite + React (SPA)、バックエンドは Hono (Node.js)。
開発時はVite の `/api` プロキシ経由でバックエンドと通信する。
本番ビルド時はバックエンドが `/dist` の SPA を配信する。

## API エンドポイント

| Method | Path | 内容 |
|---|---|---|
| GET | `/api/project?path=...` | project.json 読み込み |
| PUT | `/api/project?path=...` | project.json 書き込み |
| GET | `/api/tables/:name?project=...` | JSONL テーブルデータ読み込み |
| PUT | `/api/tables/:name?project=...` | テーブル全置換 |
| PATCH | `/api/tables/:name?project=...` | 変更行のみマージ保存 |
| GET | `/api/schemas/:name?project=...` | スキーマ読み込み |
| GET/PUT/DELETE | `/api/page-templates/:name?project=...` | ページテンプレート CRUD |

## Zustand ストア

状態管理は 3 つの Zustand ストアで行う。

### `useProjectStore` (`src/stores/project.store.ts`)

アプリの中心となるストア。

| 状態 | 型 | 内容 |
|---|---|---|
| `projectPath` | string | 開いているフォルダのパス |
| `project` | ProjectConfig | project.json の内容 |
| `schemas` | Map<name, TableSchema> | 全テーブルのスキーマ |
| `tables` | Map<name, Map<id, Row>> | 全テーブルのデータ（行IDをキーにしたMap） |
| `dirtyRowIds` | Map<name, Set<id>> | 未保存の変更がある行ID |
| `writeMode` | boolean | 書き込みロック保持中か |

主なアクション:

```ts
loadProject(path)       // プロジェクトを開く
saveAll()               // Ctrl+S で全テーブル保存
updateCell(table, rowId, colKey, value)  // セル値更新
addRow(table)           // 行追加
deleteRow(table, rowId) // 行削除
saveView(view)          // ビュー定義を project.json に保存
```

### `useSelectionStore` (`src/stores/selection.store.ts`)

スプレッドシートの選択・編集状態。コンポーネントまたぎで共有する。

| 状態 | 内容 |
|---|---|
| `cursor` | 現在フォーカスしているセルの位置 `{ rowId, colKey, tableName }` |
| `editingCell` | 編集中のセル（null = 非編集） |
| `editInitialValue` | type-to-edit で最初に入力した文字 |
| `selectionBounds` | 範囲選択の矩形 `{ minRow, maxRow, minCol, maxCol }` |

### `useViewStore` (`src/stores/view.store.ts`)

アクティブなビューと検索状態。

| 状態 | 内容 |
|---|---|
| `activeViewId` | 左サイドバーで選択中のビューID（nullならテーブル表示） |
| `searchQuery` | テーブル横断検索のクエリ文字列 |
| `searchResults` | 検索結果 |

## データフロー：プロジェクトを開く

```
HomePage
  ↓ openProject(path) → fetch('/api/project?path=...')
  ↓ 成功したら navigate('/editor?project=path')

EditorPage（マウント時）
  ↓ loadProject(path)
    ↓ readProjectConfig()    → GET /api/project
    ↓ readSchema() × N       → GET /api/schemas/:name  （並行）
    ↓ readTable()  × N       → GET /api/tables/:name   （並行）
    ↓ localStorage からドラフトを復元
    ↓ 書き込みロック取得（multi-tab 制御）
  ↓ stores に schemas / tables / project をセット
  ↓ SpreadsheetGrid / SpreadsheetView がレンダリング
```

## データフロー：セル編集から保存まで

```
Cell (ダブルクリック or type-to-edit)
  ↓ setEditing({ rowId, colKey }) → selectionStore

Cell (Enter または blur)
  ↓ updateCell(tableName, rowId, colKey, value)
      → coerceToType(value, col.type)    バリデーション前に型変換
      → validateCell(coerced, col)       違反なら _invalid に格納
      → tables Map を更新
      → dirtyRowIds に追加
      → localStorage にドラフト保存（自動）

Ctrl+S
  ↓ saveAll()
      → dirtyRowIds の行のみ PATCH /api/tables/:name
      → dirtyRowIds をクリア
```

## ドメインロジック (`src/domain/`)

ビューのデータ変換はストアではなくドメイン関数で行い、ストアはデータ保持に専念する。

| ファイル | 役割 |
|---|---|
| `validator.ts` | `coerceToType` / `validateCell` |
| `filter.ts` | `applyFilter` / `applySort` — FilterExpr の評価 |
| `union.ts` | `applyUnion` — 複数テーブルの縦結合 |
| `lookup.ts` | `applyLookup` — 参照先フィールドの展開 |
| `commands.ts` | `CommandHistory` / `EditCellCommand` — Undo/Redo 基盤 |

## コンポーネント構成（主要）

```
EditorPage
├── Sidebar（テーブル一覧・ビュー一覧）
├── SpreadsheetView        ← filter / union / lookup ビューを表示
│   └── SpreadsheetGrid    ← react-window 仮想スクロール
│       └── Cell           ← 1 セル（表示・編集・バリデーション表示）
├── PageView               ← ページ/カードビュー
├── JsonEditorPanel        ← json 型カラムのサイドパネル
└── *Dialog                ← ビュー作成・編集ダイアログ
```

`SpreadsheetGrid` は `GridContext` をProvideし、`Cell` が `navigate` / `focusContainer` / `selectionBounds` を受け取る。
