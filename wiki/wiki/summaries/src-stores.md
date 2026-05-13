# src-stores — Zustand ストア群

> ソース: [[raw/refs/src-stores]] (`src/stores/`)

Gridman の状態管理は 4 つの Zustand ストアで構成される。責務の境界が明確で、相互依存は最小限に抑えられている。

---

## useProjectStore（project.store.ts）

全ストア中最大（約 24 KB）。プロジェクトデータと書き込み操作のほぼすべてを担う。

**主要な状態**

| 状態 | 内容 |
|------|------|
| `tables` | `Map<tableName, Map<rowId, Row>>` — 全テーブルのインメモリデータ |
| `schemas` | `Map<tableName, TableSchema>` — 列定義 |
| `dirtyRowIds` | 保存対象の行 ID セット（PATCH ロジック用） |
| `dirtyCellIds` | 未保存セルの座標（黄色表示用）。`dirtyRowIds` とは別目的 |
| `writeMode` | タブロックを保持しているか（マルチタブ排他制御） |
| `hasDraft` | localStorage にドラフトが存在するか |

**設計上の注意点**

- `adapter`（FileSystemAdapter 実装）はモジュールスコープの変数。Zustand の状態ではないため、`setAdapter()` で切り替えてもリアクティブには伝播しない
- `updateCell` は毎回 `Command` オブジェクトを生成して `commandHistory.execute()` に積む。ストア操作と Undo/Redo が完全に統合されている
- 自動保存は 500ms デバウンス（`scheduleAutoSave`）で localStorage ドラフトに書く

**`syncDraftFromTab(msg)`**: BroadcastChannel 経由でメッセージを受信し、他タブのドラフト差分をインメモリにマージする（[[concepts/Auto_Save_and_Draft]] 参照）。

---

## useSelectionStore（selection.store.ts）

セルカーソル・範囲選択・編集モードを管理する軽量ストア。

| 状態 | 内容 |
|------|------|
| `cursor` | フォーカス中のセル座標 `{rowId, colKey, tableName}` |
| `anchorCell` | 範囲選択の起点（Shift+矢印で拡張） |
| `editingCell` | 編集モード中のセル（null = 非編集） |
| `editInitialValue` | type-to-edit で最初に打った文字 |
| `jsonPanelCell` | JsonEditorPanel に表示中のセル |

---

## useViewStore（view.store.ts）

ビュー切り替えとテーブル横断検索の UI 状態を保持する。データは持たず、表示制御のみ。

| 状態 | 内容 |
|------|------|
| `activeViewId` | 左サイドバーで選択中のビュー ID（null = テーブル直接表示） |
| `filter` | スプレッドシートのクイックフィルター文字列 |
| `searchQuery` / `searchResults` | テーブル横断検索 |

---

## useCommandHistoryStore（commandHistoryStore.ts）

`commandHistory`（モジュールスコープのシングルトン）を React コンポーネントから購読するための薄いブリッジ。`canUndo` / `canRedo` のみを Zustand に持ち、`sync()` でシングルトンの状態を反映する。

---

## 関連

- [[concepts/architecture/Stores]] — ストアの役割と状態の詳細
- [[concepts/Auto_Save_and_Draft]] — `writeMode` / `hasDraft` / `syncDraftFromTab` の詳細
- [[concepts/Undo_Redo]] — `commandHistory` シングルトンとストアの連携
- [[summaries/src-domain]] — `commandHistory` の実装本体
