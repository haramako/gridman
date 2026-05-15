---
kind: ref
external_path: doc/discussion/
size: ~14 files
---

`doc/discussion/` — Gridman プロジェクトの設計判断・相談内容の決定ログ。
各ファイルは `YYYY-MM-DD_<description>.md` の形式で、相談内容・検討した選択肢・決定事項・変更ファイル・持ち越しを記録する。

## ファイル一覧

| ファイル | 内容 |
|--------|------|
| `2026-05-12_workflow-insight-design.md` | countermeasure フィールド設計・doc/discussion SSoT 設置の経緯 |
| `2026-05-13_quota-recovery-trigger.md` | quota-recovery taxonomy と ping キーワード採用の経緯 |
| `2026-05-13_metrics-and-template.md` | has_real_failures 計算改善・issue テンプレート作成 |
| `2026-05-13_large-task-handling.md` | 大規模タスク分割・中止フロー設計（AGENTS.md 変更） |
| `2026-05-13_lint-wiki-windows-fix.md` | lint スクリプトの Windows パスバグ（as_posix() 修正） |
| `2026-05-13_agents-md-cleanup.md` | ブロッカー報告フォーマット追加・AGENTS.md セクション統合 |
| `2026-05-13_e2e-test-planning.md` | E2E テスト追加計画（優先度順リスト） |
| `2026-05-14_wiki-src-sot-and-coverage.md` | src/ SSoT 追加・wiki 充足性評価・compile フロー整理 |
| `2026-05-14_intent-gap-and-interaction-scenarios.md` | インタラクションシナリオ手法（UI挙動タスクの事前合意） |
| `2026-05-14_insight-countermeasure-review.md` | countermeasure 見直し（LIN-22/46/171: none→in-agents-md） |
| `2026-05-15_llm-wiki-operations.md` | llm-wiki ingest/lint/compile/query 一連の運用記録・outputs/queries の promote フロー確認 |
| `2026-05-15_crlf-fix-and-settings-cleanup.md` | CRLF lint エラー修正（.gitattributes 追加）・settings.json 整理（63→25エントリ） |
| `2026-05-15_e2e-fixes.md` | E2E サーバー自動起動修正（tsx watch TTY 問題）・tabIndex/dialog セレクタ リグレッション修正 |
| `2026-05-15_llm-wiki-reference-tracking.md` | llm-wiki 参照定量化の検討（Claude Code hook / OpenCode plugin / Multica API）—未決定 |
