# llm-wiki の運用: ingest・lint・compile・query と outputs/queries の扱い

**日付**: 2026-05-15  
**関連ファイル**: `wiki/CLAUDE.md`, `wiki/wiki/index.md`, `wiki/log/20260515.md`, `wiki/outputs/queries/`

## 相談内容

`doc/discussion/` 配下の 10 件の設計判断ログを wiki に ingest した後、lint・compile・query の一連の操作を実施した。
その中で「query の回答（`outputs/queries/`）は次回の compile で wiki に取り込まれるか？」という疑問が生じた。

## 検討した選択肢

- query 結果は `outputs/queries/` に保存される（現状）
- compile は `wiki/` 配下のみを対象とする（スキルの設計）

## 決定事項

1. **`outputs/queries/` の回答は compile では使われない** — compile のスコープは `wiki/concepts/`・`wiki/entities/`・`wiki/summaries/` のみ。`outputs/` は外側にある
2. **query 結果を wiki に定着させるには「promote」が必要** — 「durable な合成（比較・分析・新しい洞察）」と判断した場合のみ、`wiki/concepts/` に昇格して `index.md` に追加する。今回の `test:e2e:ui` の回答は「wiki の記載が薄い」という観察なので promote 対象外

## 変更されたファイル（今日の ingest 作業）

- `wiki/raw/refs/doc-discussions.md` — 新規ポインタ
- `wiki/wiki/summaries/doc-discussions.md` — 10 件の設計判断ログの合成サマリー
- `wiki/wiki/concepts/agent-patterns/Blocker_Reporting.md` — 新規ページ（ブロッカー報告フォーマット）
- `wiki/wiki/concepts/agent-patterns/Spec_Quality.md` — インタラクションシナリオ手法を追記
- `wiki/wiki/concepts/agent-patterns/Context_and_Cost.md` — 大規模タスク停止基準 3 条件を追記
- `wiki/wiki/summaries/issue-insights.md` — countermeasure 分布更新（none: 9→6, in-agents-md: 1→4, 計 51 件）
- `wiki/wiki/index.md`, `wiki/CLAUDE.md` — 各ページへのリンク追加
- `wiki/outputs/queries/2026-05-15-test-e2e-vs-test-e2e-ui.md` — query 回答（promote なし）

## 未解決・持ち越し

- `entities/Playwright.md` に `test:e2e:ui`（UI モード）の使い方セクションを追加する候補として識別済み。必要になったタイミングで `/llm-wiki compile` で追記する
