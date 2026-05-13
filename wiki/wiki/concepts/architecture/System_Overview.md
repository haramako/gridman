# System Overview

## 全体構成

```mermaid
flowchart TD
    Browser["ブラウザ\nReact SPA :5173"]
    Hono["Hono サーバー :8080"]
    FS["プロジェクトフォルダ\n(任意のディレクトリ)"]

    Browser <-->|"/api/* をプロキシ\n(vite.config.ts)"| Hono
    Hono <-->|"ファイル I/O"| FS
```

- **フロントエンド**: Vite + React (TypeScript)。状態管理は [[Stores|Zustand]] 3 ストア体制。
- **バックエンド**: Hono (Node.js)。REST API でファイル読み書きのみ担当。
- **データ**: ローカルファイルシステムに JSONL + JSON Schema として保存。git 差分管理が可能。

開発時は Vite の `/api` プロキシ経由でバックエンドと通信。本番ビルド時はバックエンドが `/dist` の SPA を配信する。

## API エンドポイント

| Method | Path | 内容 |
|--------|------|------|
| GET | `/api/project?path=...` | project.json 読み込み |
| PUT | `/api/project?path=...` | project.json 書き込み |
| GET | `/api/tables/:name?project=...` | JSONL テーブルデータ読み込み |
| PUT | `/api/tables/:name?project=...` | テーブル全置換 |
| PATCH | `/api/tables/:name?project=...` | 変更行のみマージ保存 |
| GET | `/api/schemas/:name?project=...` | スキーマ読み込み |
| GET/PUT/DELETE | `/api/page-templates/:name?project=...` | ページテンプレート CRUD |

**重要**: PATCH はフロント側の `dirtyRowIds` に記録された行だけを送信する。テーブル全体を送らないため効率的。

## プロジェクトを開くフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant HP as HomePage
    participant EP as EditorPage
    participant Store as useProjectStore
    participant API as Hono API

    U->>HP: パス入力・Enter
    HP->>API: GET /api/project?path=...
    API-->>HP: project.json
    HP->>EP: navigate('/editor?project=path')
    EP->>Store: loadProject(path)
    Store->>API: GET /api/project (並行)
    Store->>API: GET /api/schemas/:name × N (並行)
    Store->>API: GET /api/tables/:name × N (並行)
    Store-->>Store: localStorage からドラフト復元
    Store-->>Store: 書き込みロック取得
    EP-->>U: SpreadsheetGrid レンダリング
```

## セル編集から保存まで

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Cell
    participant Store as useProjectStore
    participant LS as localStorage
    participant API as Hono API

    U->>Cell: ダブルクリック / type-to-edit
    Cell-->>Cell: setEditing({ rowId, colKey })
    U->>Cell: Enter / blur
    Cell->>Store: updateCell(tableName, rowId, colKey, value)
    Store-->>Store: coerceToType + validateCell
    Store-->>Store: tables Map 更新
    Store-->>Store: dirtyCellIds + dirtyRowIds に追加
    Store->>LS: saveDraft(projectPath, tables)
    U->>Store: Ctrl+S → saveAll()
    Store->>API: PATCH /api/tables/:name (dirty 行のみ)
    Store-->>Store: dirtyRowIds / dirtyCellIds クリア
```

## 関連

- [[Stores]] — 状態管理の詳細
- [[concepts/Auto_Save_and_Draft]] — localStorage ドラフトの仕組み
- [[concepts/data-model/Project_Format]] — project.json の形式
- [[summaries/server]] — サーバー実装詳細（2実装・PATCH マージ・SQLite スキーマ）
