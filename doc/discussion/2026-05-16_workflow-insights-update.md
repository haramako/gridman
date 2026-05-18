# ワークフローインサイトの更新と新パターンの定義

**日付**: 2026-05-16  
**関連ファイル**: `wiki/summaries/issue-insights.md`, `wiki/concepts/agent-patterns/index.md`, `wiki/concepts/agent-patterns/Regression_and_Testing.md`, `wiki/concepts/agent-patterns/Platform_Artifacts.md`, `wiki/index.md`, `CLAUDE.md`

## 相談内容

Multica の issue-insights (LIN-82〜189 の 11 件) を wiki に ingest し、最新の AI エージェント実行パターンを分析・反映させる。特に、最近の失敗原因の傾向を可視化し、既存の taxonomy でカバーできているかを確認する。

## 決定事項

1. **`pr-skip` パターンの新設** — `e2e-not-verified` (E2E未確認でPR作成) とは別に、実装完了後に PR 作成自体を忘れるパターンが LIN-172, 175, 184 と継続的に発生しているため、独立した taxonomy コードとして定義し追跡を開始する。
2. **`quota-recovery` の急増を記録** — 6件から 11件へ急増。特に LIN-173, 187, 189 など、「実装前のクォータ超過」による失敗が目立っており、プラットフォーム上のクォータ管理の課題として明文化する。
3. **`has_real_failures` の更新** — 6件から 8件 (LIN-187, 189 追加) へ更新。クォータ超過による失敗を正しく除外した上での実失敗率を維持する。

## 変更されたファイル

- `wiki/summaries/issue-insights.md` — 件数 (51→62) および分布統計の更新
- `wiki/concepts/agent-patterns/index.md` — taxonomy に `pr-skip` を追加
- `wiki/concepts/agent-patterns/Regression_and_Testing.md` — `pr-skip` パターンの詳細および事例 (LIN-184) を追記
- `wiki/concepts/agent-patterns/Platform_Artifacts.md` — `quota-recovery` の事例を更新
- `wiki/index.md` — インデックスの件数更新
- `CLAUDE.md` — 完了済み insight の件数更新およびオープンな調査課題の更新

## 未解決・持ち越し

- **PR 作成の強制力**: AGENTS.md にルールを記載しても `pr-skip` が再発しており、判断基準の提示だけでなく、ワークフローの最後に PR の有無を機械的にチェックする仕組みを検討する必要がある。
