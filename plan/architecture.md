# アーキテクチャ

## 全体方針

「ローカルでもWebでも動く」という要件に対し、**2モード対応**のアーキテクチャを採用する。

```
┌─────────────────────────────────────────────────────┐
│                  React SPA (Vite)                    │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │           FileSystemAdapter (抽象層)           │  │
│  └────────────────┬──────────────────────────────┘  │
└───────────────────┼─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
  LocalServerAdapter      FSAccessAdapter
  (Honoサーバー経由)       (File System Access API)
  ローカル/Web両用          ブラウザ直接アクセス
  サーバーが必要             サーバー不要・Chrome/Edge限定
```

---

## モード1: ローカルサーバーモード（推奨）

```
ブラウザ (React SPA)
    ↕ REST API  (localhost:PORT)
Hono サーバー (Node.js / Bun)
    ↕ ファイルI/O
プロジェクトディレクトリ (*.jsonl, *.schema.json, project.json)
```

**メリット:**
- ブラウザ問わず動作
- ファイルシステムへの完全アクセス
- 将来的にリモートサーバー化も容易

**デメリット:**
- サーバー起動が必要

---

## モード2: File System Access APIモード（オプション）

```
ブラウザ (React SPA)
    ↕ File System Access API (Chrome/Edge)
プロジェクトディレクトリ (*.jsonl, *.schema.json, project.json)
```

**メリット:**
- サーバー不要
- シンプルな配布（静的ホスティングのみ）

**デメリット:**
- Chrome/Edgeのみ対応
- Firefoxは未対応

---

## レイヤー構成

```
┌─────────────────────────────────────────────────────────┐
│  View Layer: React コンポーネント                        │
│  (SpreadsheetView, PageView, TableList, ViewEditor ...)  │
├─────────────────────────────────────────────────────────┤
│  State Layer: Zustand stores                             │
│  (ProjectStore, TableStore, SelectionStore, UIStore)     │
├─────────────────────────────────────────────────────────┤
│  Domain Layer: ビジネスロジック                          │
│  (ViewEngine, QueryResolver, Validator, Serializer)      │
├─────────────────────────────────────────────────────────┤
│  FileSystem Layer: 抽象化I/O                             │
│  (FileSystemAdapter → LocalServer or FSAccessAPI)        │
└─────────────────────────────────────────────────────────┘
```

---

## Zustand ストア設計

```typescript
// プロジェクト全体の状態
interface ProjectStore {
  project: ProjectConfig | null
  tables: Map<string, TableData>     // テーブル名 → データ
  schemas: Map<string, TableSchema>  // テーブル名 → スキーマ
  isDirty: boolean                   // 未保存変更あり

  loadProject(path: string): Promise<void>
  saveAll(): Promise<void>
  saveTable(name: string): Promise<void>
}

// 現在のビュー・テーブル表示
interface ViewStore {
  activeView: ViewDefinition | null
  resolvedTable: ITable | null       // ViewEngineが解決した結果
  filter: string
  dirtyRows: Map<string, DirtyRowState> // rowId → dirty state

  setActiveView(view: ViewDefinition): void
  setFilter(filter: string): void
  setCellDirty(rowId: string, col: string, value: unknown): void
  commitDirtyCell(rowId: string, col: string): void
}

// 選択・カーソル状態
interface SelectionStore {
  cursor: Position | null
  selection: Selection
  editingCell: Position | null

  setCursor(pos: Position, shiftKey?: boolean): void
  setEditing(pos: Position | null): void
}
```

---

## Domain Layer: ViewEngine

ビュークエリを解決してITableを生成するエンジン。

```typescript
class ViewEngine {
  constructor(private tables: Map<string, TableData>) {}

  resolve(query: ViewQuery): ITable {
    switch (query.type) {
      case 'filter': return this.resolveFilter(query)
      case 'union':  return this.resolveUnion(query)
      case 'lookup': return this.resolveLookup(query)
      case 'page':   return this.resolveFilter(query) // pageはfilterと同じ解決
    }
  }

  private resolveFilter(query: FilterViewQuery): ITable { ... }
  private resolveUnion(query: UnionViewQuery): ITable { ... }
  private resolveLookup(query: LookupViewQuery): ITable { ... }
}
```

---

## FileSystemAdapter インターフェース

```typescript
interface FileSystemAdapter {
  // プロジェクト操作
  readProjectConfig(projectPath: string): Promise<ProjectConfig>
  writeProjectConfig(projectPath: string, config: ProjectConfig): Promise<void>

  // テーブルデータ
  readTable(projectPath: string, tableName: string): Promise<RawRow[]>
  writeTable(projectPath: string, tableName: string, rows: RawRow[]): Promise<void>

  // スキーマ
  readSchema(projectPath: string, tableName: string): Promise<TableSchema>
  writeSchema(projectPath: string, tableName: string, schema: TableSchema): Promise<void>

  // ディレクトリ
  listProjects(rootPath: string): Promise<string[]>
}

// ローカルサーバー経由の実装
class LocalServerAdapter implements FileSystemAdapter { ... }

// File System Access API の実装
class FSAccessAdapter implements FileSystemAdapter { ... }
```

---

## APIエンドポイント設計 (Hono)

```
GET    /api/projects                    プロジェクト一覧
GET    /api/project?path=...            プロジェクト設定取得
PUT    /api/project?path=...            プロジェクト設定保存

GET    /api/tables/:name?project=...    テーブルデータ取得
PUT    /api/tables/:name?project=...    テーブルデータ保存（全行）
PATCH  /api/tables/:name?project=...   テーブルデータ差分更新（行単位）

GET    /api/schemas/:name?project=...  スキーマ取得
PUT    /api/schemas/:name?project=...  スキーマ保存
```

---

## 起動方法

```bash
# 開発時
bun run dev        # Vite dev server (port 5173)
bun run server     # Hono server (port 8080)

# 本番
bun run build      # Vite build → dist/
bun run start      # Hono が dist/ を静的配信 + API
```

---

## ディレクトリ構成（新）

```
react-spreadsheet/
├── src/
│   ├── main.tsx
│   ├── router.tsx
│   ├── components/           # UIコンポーネント
│   │   ├── spreadsheet/      # グリッド系
│   │   ├── page-view/        # ページ/カードビュー
│   │   ├── view-editor/      # ビュー定義UI
│   │   ├── schema-editor/    # スキーマ編集UI
│   │   └── common/           # 共通コンポーネント
│   ├── stores/               # Zustand stores
│   │   ├── project.store.ts
│   │   ├── view.store.ts
│   │   └── selection.store.ts
│   ├── domain/               # ビジネスロジック
│   │   ├── view-engine.ts
│   │   ├── query-resolver.ts
│   │   ├── validator.ts
│   │   └── serializer.ts
│   ├── fs/                   # FileSystemAdapter
│   │   ├── adapter.ts        # インターフェース
│   │   ├── local-server.ts
│   │   └── fs-access.ts
│   └── types/                # 型定義
│       ├── schema.ts
│       ├── view.ts
│       └── row.ts
├── server/
│   └── index.ts              # Honoサーバー
└── var/                      # 開発用データ
```
