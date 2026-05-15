# Summary — doc-discussions (doc/discussion/)

**Source**: `doc/discussion/` — [[raw/refs/doc-discussions]]  
**件数**: 14 ファイル（2026-05-12〜15）  
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

### llm-wiki 運用フロー確認（2026-05-15）

- **`outputs/queries/` は compile で使われない** — compile のスコープは `wiki/concepts/`・`wiki/entities/`・`wiki/summaries/` のみ。`outputs/` は対象外
- **query 結果を wiki に定着させるには promote が必要** — durable な合成（比較・分析・新しい洞察）の場合のみ `wiki/concepts/` に昇格し `index.md` に追加する
- **`entities/Playwright.md` の UI モード記述不足**を識別 — `test:e2e:ui` の具体的な使用シナリオが未記載。必要になったタイミングで追記する

### 開発環境・CI 修正（2026-05-15）

- **`tsx watch` は TTY なしのサブプロセスとして起動するとサイレントに停止する** — Playwright の webServer では `npm run server`（= `tsx watch`）が使えない。`npx tsx server/index.ts`（watch なし）に変更して解決
- **Biome の a11y lint 修正が `tabIndex={0}` を誤削除するパターンを確認** — `noNoninteractiveTabindex` 警告の "fix" として削除されたが、グリッドコンテナのキーボードフォーカスに必須。`biome.json` の `overrides` で再発防止
- **`[role="dialog"]` CSS セレクタはネイティブ `<dialog>` 要素に一致しない** — Playwright テストでは `getByRole('dialog')` を使うこと（ARIA ロールで照合）
- **CRLF 問題の根本対策**: `core.autocrlf=true` のグローバル Git 設定に対し `.gitattributes`（`eol=lf`）で上書きして恒久解決
- **`.claude/settings.json` の整理**: 63 → 25 エントリへ削減（冗長エントリ統合・一回限り削除）

### llm-wiki 参照定量化（2026-05-15、未決定）

- **AI が作業中に wiki を受動的に参照した回数を定量化したい** — 現状は明示的な操作（ingest/query/lint）しか `log/` に記録されない
- **候補**: Claude Code PostToolUse hook（`matcher: "Read|Glob|Grep"`）、OpenCode plugin（`tool.execute.after`）、Multica API バッチ解析
- **未決定**: どのプラットフォームで実装するか、ログフォーマットと保存先

## 合成先

→ [[concepts/agent-patterns/Spec_Quality]] — インタラクションシナリオ手法
→ [[concepts/agent-patterns/Context_and_Cost]] — 大規模タスク停止基準
→ [[concepts/agent-patterns/Blocker_Reporting]] — ブロッカー報告フォーマット
→ [[concepts/agent-patterns/Platform_Artifacts]] — quota-recovery / has_real_failures
→ [[summaries/issue-insights]] — countermeasure 分布更新
→ [[concepts/agent-patterns/Regression_and_Testing]] — lint 修正 AI によるリグレッションパターン追加
→ [[entities/Playwright]] — webServer 設定の注意点（tsx watch / getByRole）
