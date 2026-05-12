# クエリ: issue insight から見たコード設計上の問題

**質問**: Multica issue-insights の実行ログ分析（context-overload・regression-broad-change パターン）から、コードベースの設計上の問題はどこにあるか？

**根拠**: [[summaries/issue-insights]] + コードベース直接調査（src/ ファイル行数・import 分析）

---

## 問題1: `SpreadsheetGrid.tsx` の肥大化（1154行）

**症状**: context-overload issue（LIN-47: 4.2M tok, LIN-62: 2.6M tok）で毎回登場。

仮想スクロール・列リサイズ・キーボード操作・コンテキストメニュー・ビュー変換処理が一ファイルに混在。
変更のたびに全体の把握が必要になり、高トークン消費の主因になっている。

**影響範囲**: Cell.tsx・DataRow.tsx との密結合。GridContext が大量の外部状態を注入。

---

## 問題2: `ColumnType` 分岐の 51 箇所への分散

**症状**: LIN-51（regression-broad-change）の直接原因。`enumRef` 追加で広範囲のファイルが同時変更必要になった。

`col.type === 'xxx'` の分岐が以下に散在：
- SpreadsheetGrid.tsx（TYPE_ICON 11箇所・DEFAULT_COL_WIDTH 10箇所）
- FilterViewDialog.tsx / SchemaEditorDialog.tsx / Cell.tsx / PageView.tsx など

新しいカラム型を追加するたびに全ファイルを確認・修正する必要がある。

---

## 問題3: `project.store.ts` の責務過多（710行）

**症状**: LIN-44（Undo/Redo 実装）・LIN-47（ビュー経由編集）で高コスト。

「プロジェクトデータ」「操作履歴（CommandHistory）」「ビュー状態」が混在。
8ファイルから useProjectStore が呼ばれており、深い props drilling が発生。

---

## 問題4: `EditorPage.tsx` のダイアログ管理（587行・20 import）

**症状**: LIN-79（バグ調査タスク: 5.3M tok）で全体俯瞰コストが高かった。

Filter / Lookup / Union / Page / Schema など 8 本のダイアログを一箇所で状態管理。
各ダイアログが異なる props パターンで呼ばれており、追加・変更が困難。

---

## 問題5: 類似ダイアログ群の DRY 違反

FilterViewDialog（363行）・LookupViewDialog（290行）・SchemaEditorDialog（436行）・
PageTemplateDialog（296行）が各自で ColumnType 検査と UI マッピングを持っている。
ビュー越し座標変換（`_source`, `_sources`）もそれぞれ独立実装。

---

## 優先度マトリクス

| 優先度 | 問題 | 改善案 | 難易度 |
|-------|------|-------|-------|
| 高 | ColumnType 分岐の分散 | 単一マッピングファイルに集約 | 小〜中 |
| 高 | SpreadsheetGrid 肥大化 | キーボード/選択/スクロールを分割 | 大（要タスク分割） |
| 中 | project.store 責務過多 | データ層とコマンド層を分離 | 大 |
| 中 | EditorPage ダイアログ管理 | `useDialogState` hook 抽出 | 中 |
| 低 | ダイアログ DRY 違反 | 共通 wrapper パターン | 中 |

**ColumnType 集約**は「1ファイル変更 → 全体反映」になるため、今後の横断変更コストを最も下げられる。
SpreadsheetGrid 分割は AGENTS.md の「大規模タスク中止条件」に該当するため、チケット分割が必須。

---

## 関連 wiki ページ

- [[concepts/architecture/Stores]] — project.store / selection.store の構成
- [[concepts/architecture/Component_Structure]] — コンポーネント階層
- [[concepts/spreadsheet/Cell_Editing]] — 編集フロー
- [[concepts/agent-patterns/Regression_and_Testing]] — regression-broad-change パターン
- [[concepts/agent-patterns/index]] — context-overload パターン
