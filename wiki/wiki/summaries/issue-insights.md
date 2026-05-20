# Summary — issue-insights (multica-data/issue-insights/)

**Source**: `multica-data/issue-insights/` — [[raw/refs/issue-insights]]  
**件数**: 82 issue（LIN-1〜LIN-205、一部欠番）  
**期間**: 2026-04〜05

## 概要

Multica で実行された AI エージェントタスクの実行ログを分析した insight ファイル群。
各ファイルは JSON メタデータ（patterns, rerun_causes, countermeasure）と観察・教訓を持つ統一フォーマット。

## countermeasure 分布

| 値 | 件数 | 意味 |
|----|------|------|
| `one-time` | 57 | 一度限りの環境問題・操作ミス |
| `none` | 13 | 未対策（context-overload 系: LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79, LIN-191, LIN-193, LIN-194, LIN-195, LIN-196, LIN-197, LIN-198） |
| `in-agents-md` | 11 | AGENTS.md 対策済み（LIN-51, LIN-22, LIN-46, LIN-171, LIN-184, LIN-189, LIN-176, LIN-188, LIN-190, LIN-199, LIN-201） |
| `platform-fix` | 1 | プラットフォーム修正済み（LIN-43） |

## 観察されたパターン分布

| パターン | 件数 | 代表 issue |
|---------|------|-----------|
| `context-overload` | 15 | LIN-16, LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79, LIN-171, LIN-191, LIN-193, LIN-194, LIN-195, LIN-196, LIN-197, LIN-198 |
| `quota-recovery` | 16 | LIN-38, LIN-40, LIN-41, LIN-42, LIN-83, LIN-84, LIN-85, LIN-171, LIN-173, LIN-187, LIN-189, LIN-188, LIN-191, LIN-194, LIN-198, LIN-199 |
| `platform-artifact` | 4 | LIN-41, LIN-42, LIN-45, LIN-72 |
| `infra-improvement` | 9 | LIN-78, LIN-168, LIN-186, LIN-187, LIN-176, LIN-188, LIN-190, LIN-199, LIN-201 |
| `duplicate-trigger` | 4 | LIN-16, LIN-43, LIN-72, LIN-205 |
| `e2e-not-verified` | 3 | LIN-46, LIN-51, LIN-184 |
| `env-github-token` | 2 | LIN-16, LIN-36 |
| `regression-broad-change` | 2 | LIN-51, LIN-189 |
| `env-e2e` | 2 | LIN-43, LIN-185 |
| `env-git-auth` | 1 | LIN-16 |
| `env-url-config` | 1 | LIN-22 |
| `spec-design-change` | 1 | LIN-22 |
| `spec-feature-addition` | 1 | LIN-46 |

## 主な教訓

1. **`context-overload` が最多パターン（15件）**。大規模実装タスクに加え、lint 修正波（LIN-191〜198）でもタイムアウトが頻発した。LIN-191/193/195/196 はいずれも初回2 run タイムアウト → ping で再開のパターン。issue に「変更対象ファイル」「設計指針」を明記するとコスト削減につながる。
2. **`quota-recovery` が16件に増加**。lint 修正波の ping による再トリガーが大幅に寄与。完了済みissueへの不要な ping は余分な実行を生む。
3. **lint 修正タスク波（LIN-191〜198、8件）**: Lint エラー修正を8件に分割して並列実行。全件でタイムアウト失敗が発生し、いずれも ping か明示的な実行指示で再開した。分割単位が適切でもタイムアウトは発生しうる。
4. **`infra-improvement` が9件に増加**: lint 分析・ガイドライン整備（LIN-188, 190, 199, 201）が大きく寄与。
5. **ゼロ run issue が9件**（LIN-1, LIN-27, LIN-28, LIN-34, LIN-35, LIN-67, LIN-180, LIN-181, LIN-182）。LIN-180/181/182 は LIN-171 の sub-task で、親 issue の作業内で一括完了した。
6. **82件中 53件がパターンなし（正常フロー）**。単純実装は1 run で完了するケースが多数。
7. **PR 作成忘れが3件（persistent）**（LIN-172, LIN-175, LIN-184）: エージェントが実装完了後に PR を作成しないパターン。AGENTS.md にルールは存在するがワークフローの最後まで実行されない。`pr-skip` taxonomy として追跡中。
8. **`countermeasure: none` が13件に増加**: context-overload 系 lint 修正タスク（LIN-191, 193, 194, 195, 196, 197, 198）が追加。issue 記述ガイドラインとタイムアウト対策の整備が課題。
9. **挨拶 issue の運用パターン（LIN-203, LIN-204, LIN-205）**: テスト目的の挨拶 issue が複数発生。LIN-204 ではサーバーエラーが4回連続発生した後に復旧。一時的なプラットフォーム障害は再試行で解消するケースが多い。LIN-205 では `duplicate-trigger` が確認された（同 issue への3回の direct 実行）。

## 合成先

→ [[concepts/agent-patterns/index|Agent Patterns]]
→ [[concepts/agent-patterns/Context_and_Cost]] — context-overload 詳細
→ [[concepts/agent-patterns/Platform_Artifacts]] — quota-recovery / platform-artifact 詳細
