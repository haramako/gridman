# Summary: doc/architecture（アーキテクチャ）

**ソース**: `raw/notes/architecture.md`

## 要点

React SPA（:5173）↔ Vite プロキシ ↔ Hono サーバー（:8080）↔ ファイルシステムの 3 層構成。

**3 ストア体制** (Zustand):
- `useProjectStore` — テーブルデータ・スキーマ・保存状態の中心ストア
- `useSelectionStore` — カーソル位置・編集中セル・範囲選択
- `useViewStore` — アクティブビュー・横断検索クエリ

**2 つのデータフロー**:
1. プロジェクトを開く: `loadProject` → 並行 fetch（スキーマ×N + テーブル×N）→ ドラフト復元 → ロック取得
2. セル編集から保存: `updateCell` → 型変換・バリデーション → `dirtyRowIds` 追加 → ドラフト保存 → Ctrl+S で PATCH

**ドメインロジック** (`src/domain/`):
- `validator.ts` — 型変換・バリデーション
- `filter.ts` — FilterExpr 評価・ソート
- `select.ts` — SelectQuery 評価（filter + lookup を統合）・`union.ts` — テーブル縦結合
- `commands.ts` — Undo/Redo コマンドパターン

## 関連ページ

- [[concepts/architecture/System_Overview]]
- [[concepts/architecture/Stores]]
- [[concepts/architecture/Domain_Logic]]
- [[concepts/architecture/Component_Structure]]
