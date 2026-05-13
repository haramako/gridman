---
kind: ref
external_path: src/stores/
files:
  - project.store.ts      # 主要ストア（プロジェクト・テーブル・ビュー操作、約 24KB）
  - selection.store.ts    # セル選択状態
  - view.store.ts         # アクティブビュー切り替え
  - commandHistoryStore.ts # Undo/Redo 履歴管理
---

Gridman の Zustand 状態管理レイヤー。`project.store.ts` がプロジェクト・テーブル・行データ・ビュークエリの CRUD を一手に担い、残りの 3 ストアがそれぞれ選択・表示・コマンド履歴を分離管理する。
