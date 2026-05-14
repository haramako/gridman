# issue-insights の countermeasure 見直しと LIN-81 追加

**日付**: 2026-05-14  
**関連ファイル**: `multica-data/issue-insights/LIN-22.md`, `multica-data/issue-insights/LIN-46.md`, `multica-data/issue-insights/LIN-81.md`, `multica-data/issue-insights/LIN-171.md`

## 相談内容

`/workflow-insight`（引数なし）を実行し、insight 未作成・要対策の候補を洗い出した。
未作成だった **LIN-81** を新規作成し、既存の `[要対策]`（countermeasure = "none"）3件を見直した。

## 検討した選択肢

`countermeasure` の値をどれにすべきか、AGENTS.md の記載内容と照合して判断した。

| Issue | 主なパターン | AGENTS.md の関連記載 |
|-------|------------|-------------------|
| LIN-171 | quota-recovery, context-overload | 大規模タスクの進め方（10ファイル超 or アーキテクチャ設計 → 中止・分割依頼） |
| LIN-46 | e2e-not-verified, spec-feature-addition | 動作確認の必須条件に E2Eテストを明記（本 issue で追記） |
| LIN-22 | spec-design-change, env-url-config | 新しいインターフェース設計が必要なら中止・確認依頼 |

## 決定事項

1. **LIN-81 を新規作成** — run_count=2 で唯一の未作成候補。2回目は main へのリベースと PR 作成の follow-up であり、countermeasure = `one-time`。
2. **LIN-171 の countermeasure を `in-agents-md` に変更** — クォータ失敗は実障害ではない（has_real_failures も false に修正）。大規模タスク分割ルールが AGENTS.md に記載済み。
3. **LIN-46 の countermeasure を `in-agents-md` に変更** — e2e-not-verified が主パターンで、本 issue を契機に AGENTS.md へ E2Eテスト必須が追記された。spec-feature-addition は残課題だが主要因ではない。
4. **LIN-22 の countermeasure を `in-agents-md` に変更** — インターフェース設計が必要なら「中止して確認依頼」するルールが AGENTS.md にある。env-url-config は one-time だが spec-design-change のカバーを優先した。

## 変更されたファイル

- `multica-data/issue-insights/LIN-81.md` — 新規作成
- `multica-data/issue-insights/LIN-171.md` — countermeasure `none`→`in-agents-md`、has_real_failures を false に修正
- `multica-data/issue-insights/LIN-46.md` — countermeasure `none`→`in-agents-md`
- `multica-data/issue-insights/LIN-22.md` — countermeasure `none`→`in-agents-md`

## 未解決・持ち越し

- LIN-46 の `spec-feature-addition`（仕様の後追い追加）は AGENTS.md に対策が書かれていない。issue テンプレートや mvp.md の詳細化が有効だが、今回は対応しなかった。
- `[要対策]` issue はすべて解消済み。次回 `/workflow-insight` 実行時に残課題がないか確認する。
