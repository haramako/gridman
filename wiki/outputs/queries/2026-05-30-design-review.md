# クエリ: 現時点（2026-05-30）の設計見直し・改善点

**質問**: 現時点でコードベースの設計を見直し、改善すべき点を探す。

**根拠**: [[outputs/queries/2026-05-13-design-issues-from-insights]]（前回分析）+ コードベース直接調査（src/ ファイル行数・`col.type`/`query.type` 分岐の現況）+ [[concepts/Gotchas]] + [[concepts/architecture/Stores]]

> **実装状況（2026-05-30 更新）**
> - ✅ **①（優先度高）実装済** — `col.type` 表示整形を `src/lib/formatCellValue.ts` に集約（PR #63 / main マージ済）
> - ✅ **②（優先度中）実装済** — ビュー種別アイコンを `src/lib/viewTypeConfig.ts` に集約（PR #64 / main マージ済）
> - ✅ **④（優先度中）解消済** — EditorPage のダイアログ管理は `useDialogState` フックに抽出済み（本調査時に確認）
> - ✅ **db-server PATCH 削除非対応 解消** — 当該バグは未配線の死蔵コードに起因していたため、`db-server.ts`/`db-adapter.ts` ごと削除（2026-05-30）
> - ✅ **project.store 責務分離 実装済** — reactive 層 / 永続化層（`persistence.ts`）/ 変更ヘルパ（`rowMutations.ts`）に分離、766→454 行（PR #69）
> - ❌ **③ 編集ウィジェットの JSX レジストリ化 不採用** — 価値の高い「表示整形」は①で回収済み。残る編集 JSX（enum/ref/input）をデータテーブルに入れるのは可読性を損ない、`committedRef`/onBlur（[[concepts/Gotchas]] #5）やキーボードナビの繊細領域に触れるためリスクに見合わない。今後の選択肢から除外。
> - **バックログはクリア**（残課題なし）

---

## まず: 2026-05-13 から改善された点

前回の design-issues 分析以降、実際にコードが進んでいる。

| 前回の問題 | 当時 | 現在 | 状態 |
|-----------|------|------|------|
| SpreadsheetGrid 肥大化 | 1154行 | **400行** | ✅ ほぼ解消 |
| EditorPage ダイアログ管理 | 587行 | 438行 | △ 縮小 |
| ColumnType 分岐の分散 | 51箇所 | 36箇所 | △ 集約進行中 |

**SpreadsheetGrid の分割**が完了している。責務がフックとサブコンポーネントに切り出された:
`useColumnResize.ts` / `useVirtualScroll.ts` / `useKeyboardNavigation.ts` / `DataRow.tsx` / `RowContextMenu.tsx`。
前回「大（要タスク分割）」とした最重要課題が片付いた点は大きい。

`columnTypeConfig.ts`（`COLUMN_TYPE_CONFIG`）も整備され、icon / defaultWidth / filterOps / gridReadonly /
supportsKbdEdit などの**メタデータ**は単一テーブルに集約済み。

---

## 残る・新たに見える設計上の改善点

### 1. ColumnType 分岐の残りは「描画」と「変換」に集中（高）

`COLUMN_TYPE_CONFIG` は**メタデータ**（幅・アイコン・フラグ）は集約したが、
**型ごとの描画ロジックと値変換**はまだ各所に `col.type === 'xxx'` で散在している:

- `Cell.tsx`（7箇所）— ref / json / text / boolean / enum の表示・編集分岐
- `PageView.tsx`（8箇所）— ref / json / boolean / text / ref[] の値抽出・整形
- `validator.ts`（3箇所）— coerceToType の型別変換

これらは `columnTypeConfig` が意図的にカバーしていない領域。
新カラム型追加時に依然として複数ファイルを触る必要があり、[[concepts/agent-patterns/Regression_and_Testing]]
の regression-broad-change を再発させる残存リスク。

**改善案**: `COLUMN_TYPE_CONFIG` に `formatValue` / `coerce` を関数として持たせる、
または型→レンダラのレジストリを追加し、Cell / PageView / validator がそれを参照する形にする。
→ 詳細手順は [[concepts/how-to/Add_Column_Type]] と整合させること。

### 2. ViewQuery 型分岐という「第2の分散軸」（中）

前回見落とされていた軸。`query.type === 'filter' | 'union' | 'lookup' | 'page'` の分岐が
`EditorPage.tsx`（8箇所、特に表示コンポーネント切替・サイドバーアイコン）・`SpreadsheetView.tsx`（3箇所）・
ドメインの `filter`/`union`/`lookup` に散在している。

ColumnType と同様、**ビュー種別もディスパッチテーブル化**できる（アイコン・結果計算関数・表示コンポーネント）。
[[concepts/how-to/Add_View_Type]] が「触る箇所リスト」になっている時点で、集約余地のサイン。

**改善案**: `viewTypeConfig`（`columnTypeConfig` と対になる）を新設し、icon / resultSelector / component を集約。

### 3. project.store の責務過多は未着手（中）

766行。前回（710行）より**増えている**。データ保持・dirty 追跡・保存・行 CRUD・Undo/Redo 橋渡し・
マルチタブ同期（`syncDraftFromTab`）が同居。[[concepts/Gotchas]] #1/#2/#6 がいずれもこのストア起因の
非自明な落とし穴である点が、責務過多の症状を裏づける。

**改善案**: 「データ層（tables/schemas）」と「永続化層（dirty 追跡 + save + draft）」の分離が第一歩。
ただし AGENTS.md の横断的変更ルールに該当するため、影響コンポーネントの列挙→段階コミットが前提。

### 4. db-server の PATCH が削除を処理しない（バグ寄り・要トリアージ）

`server/index.ts`（ファイル）は `deletedIds` を処理するが、`server/db-server.ts`（SQLite）は upsert のみで
行削除が効かなかった。だが調査の結果、DbServerAdapter は `setAdapter` のどの分岐からも生成されない**未配線の
死蔵コード**だったため、修正ではなく `db-server.ts`/`db-adapter.ts` ごと削除して解消（2026-05-30）。

---

## 優先度マトリクス（2026-05-30 改訂）

| 優先度 | 問題 | 改善案 | 難易度 | 状態 |
|-------|------|-------|-------|------|
| 高 | ColumnType の描画/変換分岐（残36箇所の中核） | 表示整形を `formatCellValue` に集約 | 中 | ✅ 実装済（PR #63） |
| 中 | ViewQuery 型分岐の分散 | `viewTypeConfig` 新設 | 中 | ✅ 実装済（PR #64） |
| 中 | project.store 責務過多（766行・増加傾向） | reactive層／永続化層／変更ヘルパに分離 | 大（要分割） | ✅ 実装済（PR #69） |
| 要修正 | db-server PATCH が削除非対応 | 死蔵コードごと削除 | 小〜中 | ✅ 解決（削除） |
| 低 | 編集ウィジェットの JSX 分岐（③） | （レジストリ化）| 中 | ❌ 不採用（可読性低下・リスク過大） |

> ①の実装スコープ補足: 当初想定の `coerce` 集約は見送り（`coerceToType`/`validateCell` は
> 既に `validator.ts` に集約済みで、config 移動は churn 大・利得小）。実際の重複は **表示整形**
> （`Cell.tsx` と `PageView.tsx` の `getDisplayValue` 重複）にあり、ここを `formatCellValue` に集約した。
> ②は icon 集約のみ。結果計算（`applyFilter`/`applyUnion`/`applyLookup`）はドメイン層の責務として対象外。

**最も費用対効果が高いのは ColumnType の関数集約**。メタデータ集約（済）の自然な続きで、
新型追加コスト＝横断変更コストを実質ゼロに近づけられる。
ViewQuery の集約も同型の打ち手で、2つ揃えると「型を増やす＝1ファイル変更」という一貫した設計になる。

---

## 関連 wiki ページ

- [[outputs/queries/2026-05-13-design-issues-from-insights]] — 前回分析（本クエリの差分元）
- [[concepts/architecture/Stores]] — project.store の責務
- [[concepts/Gotchas]] — #1/#2/#6（store 起因）・#7（server 差異）
- [[concepts/how-to/Add_Column_Type]] / [[concepts/how-to/Add_View_Type]] — 「触る箇所」が集約余地のサイン
- [[concepts/agent-patterns/Regression_and_Testing]] — 分岐分散が招く regression-broad-change
