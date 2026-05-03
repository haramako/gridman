# アーキテクチャ

## 全体構成

SPA（Vite）+ ローカルサーバー（Hono）の2層構成。ファイルI/Oは `FileSystemAdapter` で抽象化する。

```
┌─────────────────────────────────────────┐
│           React SPA (Vite)              │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │    FileSystemAdapter（抽象層）   │   │
│   └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
      ┌───────────┴───────────┐
      ↓                       ↓
LocalServerAdapter        FSAccessAdapter
（Honoサーバー経由）       （File System Access API）
ローカル/Web両用           サーバーなし・Chrome/Edge限定
Phase 1で実装              Phase 4で実装
```

---

## レイヤー構成

```
┌──────────────────────────────────────────────────────┐
│  View Layer: React コンポーネント                     │
│  (SpreadsheetView, PageView, TableList, ...)          │
├──────────────────────────────────────────────────────┤
│  State Layer: Zustand stores                          │
│  (ProjectStore, ViewStore, SelectionStore)            │
├──────────────────────────────────────────────────────┤
│  Domain Layer: ビジネスロジック                       │
│  (ViewEngine, Validator, Serializer)                  │
├──────────────────────────────────────────────────────┤
│  FileSystem Layer: 抽象化I/O                          │
│  (FileSystemAdapter → LocalServer or FSAccessAPI)     │
└──────────────────────────────────────────────────────┘
```

---

## Zustand ストア設計

```typescript
// プロジェクト全体の状態
interface ProjectStore {
  project: ProjectConfig | null
  tables: Map<string, Map<string, Row>>  // テーブル名 → rowId → Row
  schemas: Map<string, TableSchema>      // テーブル名 → スキーマ
  isDirty: boolean                       // 未保存変更あり
  dirtyRowIds: Map<string, Set<string>>  // テーブル名 → 変更済みrowId集合

  loadProject(path: string): Promise<void>
  saveAll(): Promise<void>
  saveTable(name: string): Promise<void>  // 変更行のみ PATCH で送信
}

// 現在のビュー・テーブル表示
interface ViewStore {
  activeView: ViewDefinition | null
  resolvedTable: ITable | null       // ViewEngine が解決した結果
  filter: string

  setActiveView(view: ViewDefinition): void
  setFilter(filter: string): void
  updateCell(rowId: string, col: string, value: unknown): void  // Row を新オブジェクトで置換
}

// 選択・カーソル状態
interface SelectionStore {
  cursor: CellPosition | null       // 現在のカーソル位置（フォーカスセル）
  anchorCell: CellPosition | null   // 矩形選択の起点（Shift+矢印で拡張）
  editingCell: CellPosition | null  // 編集中セル（null = 非エディット状態）
  editInitialValue: string | null   // タイプ編集で最初に入力された文字

  setCursor(pos: CellPosition | null): void          // カーソル移動（anchorも同時リセット）
  extendCursor(pos: CellPosition): void              // 矩形範囲拡張（anchorは保持）
  setEditing(pos: CellPosition | null): void         // エディット開始・終了
  startEditWithInput(pos: CellPosition, ch: string): void  // タイプ編集開始
  clearEditInitialValue(): void
}

// セル位置
type CellPosition = { rowId: string; colKey: string; tableName: string }

// 矩形選択範囲（行・列インデックスで表現）
type SelectionBounds = { minRow: number; maxRow: number; minCol: number; maxCol: number }
```

---

## GridContext（セル間の共有情報）

`SpreadsheetGrid` は React Context (`GridContext`) を通じて、配下の `Cell` コンポーネントに以下を提供する。

```typescript
type GridContextValue = {
  navigate: (fromRowId: string, fromColKey: string, dr: number, dc: number) => void
  selectionBounds: SelectionBounds | null  // 矩形選択の範囲（単一選択時は null）
  focusContainer: () => void               // グリッドコンテナへフォーカスを戻す
  filteredRows: Row[]
  columns: ColumnDef[]
}
```

グリッドコンテナ（`<div tabIndex={0}>`）が非エディット時のキーイベントを一元処理し、エディット時は各セルの `<input>` / `<select>` が直接処理する。

---

## コマンドパターン（Undo/Redo 基盤）

`src/domain/commands.ts` に Undo/Redo およびコピー&ペーストの基盤を定義。

```typescript
interface Command {
  execute(): void
  undo(): void
  description: string
}

class CommandHistory {
  execute(cmd: Command): void  // 実行して undoStack に積む
  undo(): void                 // undoStack から pop → redo へ
  redo(): void                 // redoStack から pop → undo へ
  clear(): void
  get canUndo(): boolean
  get canRedo(): boolean
}

// 単一セル編集
class EditCellCommand implements Command {
  constructor(setter, getter, newValue, description?)
}

// 複数操作を1つの Undo 単位にまとめる
class CompositeCommand implements Command {
  constructor(commands: Command[], description?)
}

// シングルトン（将来 Zustand ストアに移行予定）
export const commandHistory: CommandHistory
```

**現状:** 基盤のみ実装済み。`updateCell` を `EditCellCommand` でラップし Ctrl+Z / Ctrl+Y を接続すると Undo/Redo が完成する（Phase 3 予定）。

---

## 大規模データの取り扱い

数万〜数十万行を想定した設計。

### テーブルの内部構造

```typescript
// 配列ではなく Map で保持（行ID による O(1) アクセス）
type TableData = Map<string, Row>  // rowId → Row

// 表示順は _order フィールドで管理（Map のイテレーション順に依存しない）
```

react-window の仮想スクロールにより、DOM にマウントされるのは画面上の可視行のみ（20〜50行程度）。Zustand のセレクターもマウント済みコンポーネントしか実行されないため、行数に関わらずレンダリングコストは一定。

### 非同期ロード（ストリーミングパース）

```typescript
// JSONL を1行ずつ非同期でパースし、UI をブロックしない
async function loadTable(jsonlText: string): Promise<TableData> {
  const map = new Map<string, Row>()
  for (const line of jsonlText.split('\n')) {
    if (line.trim()) {
      const row = JSON.parse(line)
      map.set(row._id, row)
    }
  }
  return map
}
// 大規模時は Web Worker に移譲
```

### 差分保存（変更行のみ送信）

```typescript
// Ctrl+S 時: dirtyRowIds に記録された行だけ PATCH で送信
saveTable(name: string) {
  const dirty = this.dirtyRowIds.get(name)
  const rows = [...dirty].map(id => this.tables.get(name)!.get(id)!)
  await adapter.patchTable(name, rows)  // PATCH /api/tables/:name
  dirty.clear()
}
```

---

## ViewEngine

ビュークエリを解決して ITable を生成するエンジン。

```typescript
class ViewEngine {
  constructor(private tables: Map<string, TableData>) {}

  resolve(query: ViewQuery): ITable {
    switch (query.type) {
      case 'filter': return this.resolveFilter(query)
      case 'union':  return this.resolveUnion(query)
      case 'lookup': return this.resolveLookup(query)
      case 'page':   return this.resolveFilter(query)
    }
  }
}
```

---

## FileSystemAdapter インターフェース

```typescript
interface FileSystemAdapter {
  readProjectConfig(projectPath: string): Promise<ProjectConfig>
  writeProjectConfig(projectPath: string, config: ProjectConfig): Promise<void>

  readTable(projectPath: string, tableName: string): Promise<RawRow[]>
  writeTable(projectPath: string, tableName: string, rows: RawRow[]): Promise<void>
  patchTable(projectPath: string, tableName: string, rows: RawRow[]): Promise<void>

  readSchema(projectPath: string, tableName: string): Promise<TableSchema>
  writeSchema(projectPath: string, tableName: string, schema: TableSchema): Promise<void>

  listProjects(rootPath: string): Promise<string[]>
}
```

---

## API エンドポイント設計（Hono）

```
GET    /api/projects                   プロジェクト一覧
GET    /api/project?path=...           プロジェクト設定取得
PUT    /api/project?path=...           プロジェクト設定保存

GET    /api/tables/:name?project=...   テーブルデータ取得
PUT    /api/tables/:name?project=...   テーブルデータ保存（全行）
PATCH  /api/tables/:name?project=...  テーブルデータ差分更新（変更行のみ）

GET    /api/schemas/:name?project=...  スキーマ取得
PUT    /api/schemas/:name?project=...  スキーマ保存
```

---

## ディレクトリ構成

```
react-spreadsheet/
├── src/
│   ├── main.tsx
│   ├── router.tsx
│   ├── components/
│   │   ├── spreadsheet/      # グリッド系
│   │   ├── page-view/        # ページ/カードビュー
│   │   ├── view-editor/      # ビュー定義UI
│   │   ├── schema-editor/    # スキーマ編集UI
│   │   └── common/           # 共通コンポーネント
│   ├── stores/
│   │   ├── project.store.ts
│   │   ├── view.store.ts
│   │   └── selection.store.ts
│   ├── domain/
│   │   ├── view-engine.ts
│   │   ├── validator.ts
│   │   └── serializer.ts
│   ├── fs/
│   │   ├── adapter.ts        # インターフェース
│   │   ├── local-server.ts
│   │   └── fs-access.ts
│   └── types/
│       ├── schema.ts
│       ├── view.ts
│       └── row.ts
├── server/
│   └── index.ts              # Hono サーバー
└── var/                      # 開発用データ
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
