# 定量的なワークフローヘルス判断のアイデア

[[summaries/issue-insights]] · [[concepts/agent-patterns/index]] · [[concepts/agent-patterns/Context_and_Cost]]

## 既存データで即計算可能な指標

`multica-data/index.json`（64件）と issue-insights の JSON メタデータだけで算出できる指標：

### 1. 週次トークン消費トレンド

```
集計: created_at で週次グループ化、total_tokens の合計・平均・中央値を計算
```

| 指標 | 意味 | 判断基準 |
|------|------|---------|
| 週間 total_tokens 合計 | ワークフロー全体のコスト | 下降トレンド = 改善 |
| 1 issue あたり平均トークン | issue 記述の粒度指標 | 減少傾向が望ましい |
| total_tokens > 2M の割合 | context-overload 率の代用 | LIN-171 は 10.5M、閾値は仮設定 |

### 2. context-overload 率と改善速度

```
集計: issue-insights の patterns に context-overload を含む割合
      countermeasure の経時変化（none → in-agents-md への遷移レート）
```

現在: 50件中 8件（16%）が context-overload。6件が `countermeasure: none` 残存。
**目標**: 3ヶ月後に context-overload 率 10% 未満、`none` ゼロ

### 3. 実失敗率（`has_real_failures`）

```
集計: has_real_failures = true の割合（すでに計算済み）
```

platform-artifact / duplicate-trigger / quota-recovery を除外した純粋な失敗率。
正常フロー（1 run 完了）の比率も同時に見る。

### 4. issue 完了までの run 数分布

| run_count | 意味 | 目標 |
|-----------|------|------|
| 1 | 正常フロー | 増やしたい |
| 2-3 | 軽微な再実行 | 許容範囲 |
| 4+ | 問題あり | 減らしたい |

### 5. エージェント別パフォーマンス

`agents.json` に 3 エージェント（Claude / kanade-claude / kanade-opencode）が登録済み。
`assignee_id` でグループ化し、平均トークン・平均 run 数・失敗率を比較。

## 新規に仕込むべき指標

### 6. wiki 参照量（本日議論中）

Claude Code hook / OpenCode plugin で Read/Glob/Grep の wiki ファイルアクセスを JSONL に記録。
集計可能な指標:
- 1 セッションあたりの wiki 参照回数
- 参照頻度上位のページ
- wiki 参照 vs トークン消費の相関（wiki を読むほど消費が減っているか）
- → `doc/discussion/2026-05-15_llm-wiki-reference-tracking.md` で実装議論中

### 7. LLM アウトプット品質スコア

issue-insights の `countermeasure` 分布と `rerun_causes` を組み合わせてスコア化:
```
Quality Score = 1 - (spec-* + regression-broad-change) / total_issues
```
spec起因・リグレッション起因の再実行率を品質の逆指標にする。

## レポーティング方針

### 軽量（即実行可能）

```bash
# multica_sync.py ですでに利用可能
python multica_sync.py query --sort-by tokens --top 10       # トークン消費上位
python multica_sync.py query --sort-by runs --top 10          # 再実行上位
python multica_sync.py query --has-failures                   # 実失敗一覧
python multica_sync.py status                                 # ステータス分布
```

### 定期レポート（生成が必要）

週次で `multica-data/index.json` と issue-insights を横断集計する小さなスクリプトを作る。
出力先: `multica-data/report-2026-W20.json`（ISO 週番号）
`/llm-wiki ingest multica-data/` で wiki に昇格可能。

### ダッシュボード（将来構想）

6 指標を一覧表示する `doc/health-dashboard.md`（Markdown で良く、週次自動更新）。

## まとめ

| # | 指標 | 実装コスト | 効果 |
|---|------|-----------|------|
| 1 | 週次トークントレンド | 低（計算のみ） | 全体コスト把握 |
| 2 | context-overload 率 | 低（集計のみ） | 最大課題の改善度 |
| 3 | 実失敗率 | 不要（計算済み） | 品質の経時変化 |
| 4 | run 数分布 | 低（集計のみ） | 再実行減少の検出 |
| 5 | エージェント別比較 | 低（集計のみ） | プラットフォーム効果 |
| 6 | wiki 参照量 | 中（新規実装） | wiki ROI の定量化 |
| 7 | 品質スコア | 低（計算のみ） | 仕様品質の経時変化 |

まずは既存データだけで週次サマリースクリプトを作り、それに wiki 参照量を後から追加するのが現実的なロードマップ。
