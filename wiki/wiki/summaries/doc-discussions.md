# Summary — doc-discussions (doc/discussion/)

**Source**: `doc/discussion/` — [[raw/refs/doc-discussions]]  
**件数**: 10 ファイル（2026-05-12〜14）  
**性質**: 設計判断の決定ログ（変更の "なぜ" を残すための SSoT）

## 概要

Gridman のワークフロー改善・wiki 設計・AGENTS.md 更新に関する設計相談と決定事項のログ。
コードや設定ファイルには「何を決めたか」は反映されるが「なぜそう決めたか」は失われる。
その根拠を残す場所として `doc/discussion/` を設置（2026-05-12）。

## 主な決定事項

### ワークフロー分析の改善（2026-05-12〜13）

- **`countermeasure` フィールドを issue-insight JSON に追加**（`none` / `one-time` / `in-agents-md` / `platform-fix` の4種）— 解決済みの問題を改善提案から自動除外するため
- **`quota-recovery` taxonomy を追加**、専用キーワード `ping` を採用 — "いかがです？" 系メッセージとの区別を機械化
- **`compute_has_real_failures()` を multica_sync.py に追加** — platform-artifact / duplicate-trigger / quota-recovery を除外した正確な失敗率を計算

### AGENTS.md の機能強化（2026-05-13）

- **大規模タスクの停止基準**（変更ファイル 10 個以上 / アーキテクチャ設計判断必要 / 独立コンポーネント複数変更）→ 中止・タスク分割依頼
- **ブロッカー報告フォーマット**（タスク完了できない場合の構造化報告: 何をしようとしたか・何が起きたか・次のアクション）
- 「コーディング方針」+「コード規約」を1セクションに統合

### 仕様品質・E2E テスト（2026-05-13〜14）

- **インタラクションシナリオ**（UI 挙動変更タスクの事前合意手法）: 実装前に 5〜10 行の操作シナリオを書いてユーザーが確認。エージェントが書き、ユーザーは OK/NG するだけ。シナリオは Playwright テスト仕様にもなる
- **E2E テスト優先度計画**: コアフロー 4 ファイル（cell-edit / row-operations / save / table-switch）が最高優先

### wiki 設計の整理（2026-05-14）

- **`ingest` と `compile` の区別**: `doc/discussion/` は不変の決定ログ。コードベースの知識として残す洞察だけを wiki に反映（compile または直接編集）。定期 ingest は不要
- **LIN-22 / LIN-46 / LIN-171** の countermeasure を `none` → `in-agents-md` に更新

## 合成先

→ [[concepts/agent-patterns/Spec_Quality]] — インタラクションシナリオ手法
→ [[concepts/agent-patterns/Context_and_Cost]] — 大規模タスク停止基準
→ [[concepts/agent-patterns/Blocker_Reporting]] — ブロッカー報告フォーマット
→ [[concepts/agent-patterns/Platform_Artifacts]] — quota-recovery / has_real_failures
→ [[summaries/issue-insights]] — countermeasure 分布更新
