# Summary — issue-insights (multica-data/issue-insights/)

**Source**: `multica-data/issue-insights/` — [[raw/refs/issue-insights]]  
**件数**: 62 issue（LIN-1〜LIN-189、一部欠番）  
**期間**: 2026-04〜05

## 概要

Multica で実行された AI エージェントタスクの実行ログを分析した insight ファイル群。
各ファイルは JSON メタデータ（patterns, rerun_causes, countermeasure）と観察・教訓を持つ統一フォーマット。

## countermeasure 分布

| 値 | 件数 | 意味 |
|----|------|------|
| `one-time` | 49 | 一度限りの環境問題・操作ミス |
| `none` | 6 | 未対策（context-overload 系: LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79） |
| `in-agents-md` | 6 | AGENTS.md 対策済み（LIN-51, LIN-22, LIN-46, LIN-171, LIN-184, LIN-189） |
| `platform-fix` | 1 | プラットフォーム修正済み（LIN-43） |

## 観察されたパターン分布

| パターン | 件数 | 代表 issue |
|---------|------|-----------|
| `context-overload` | 8 | LIN-16, LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79, LIN-171 |
| `quota-recovery` | 11 | LIN-38, LIN-40, LIN-41, LIN-42, LIN-83, LIN-84, LIN-85, LIN-171, LIN-173, LIN-187, LIN-189 |
| `platform-artifact` | 4 | LIN-41, LIN-42, LIN-45, LIN-72 |
| `infra-improvement` | 4 | LIN-78, LIN-168, LIN-186, LIN-187 |
| `duplicate-trigger` | 3 | LIN-16, LIN-43, LIN-72 |
| `e2e-not-verified` | 3 | LIN-46, LIN-51, LIN-184 |
| `env-github-token` | 2 | LIN-16, LIN-36 |
| `regression-broad-change` | 2 | LIN-51, LIN-189 |
| `env-e2e` | 2 | LIN-43, LIN-185 |
| `env-git-auth` | 1 | LIN-16 |
| `env-url-config` | 1 | LIN-22 |
| `spec-design-change` | 1 | LIN-22 |
| `spec-feature-addition` | 1 | LIN-46 |

## 主な教訓

1. **`context-overload` が最多パターン（8件）**。大規模実装タスク（Undo/Redo, ビュー編集, バグ探索など）は 3〜10M トークンを消費する。**LIN-171（SpreadsheetGrid.tsx 分割）は 10.5M トークン**と最大記録。issue に「変更対象ファイル」「設計指針」を明記するとコスト削減につながる。
2. **`quota-recovery` が2位（6件）**。"いかがです？" 系メッセージは使用量回復後の手動確認。専用 `ping` キーワードへの移行を推奨。
3. **ゼロ run issue が9件**（LIN-1, LIN-27, LIN-28, LIN-34, LIN-35, LIN-67, LIN-180, LIN-181, LIN-182）。LIN-180/181/182 は LIN-171 の sub-task で、親 issue の作業内で一括完了した。
4. **62件中 38件がパターンなし（正常フロー）**。単純実装は1 run で完了するケースが多数。
5. **PR 作成忘れが3件（persistent）**（LIN-172, LIN-175, LIN-184）: エージェントが実装完了後に PR を作成しないパターン。AGENTS.md にルールは存在するがワークフローの最後まで実行されない。新 taxonomy `pr-skip` として追跡開始。
6. **`quota-recovery` が急増（6→11件）**: LIN-173（クォータ枯渇で即死→キャンセル）、LIN-187/189（実装前にクォータ超過）など。クォータ管理の改善が急務。
7. **`regression-broad-change` が2件に**: LIN-51 に加え LIN-189（LIN-86 の emptyValue 変更が E2E テストに波及）。小規模な型変更でもテストデータに影響しうる。
8. **`has_real_failures = true` が6→8件**: LIN-173（cancelled: quota）、LIN-187（Run1 FAILED: quota）、LIN-189（Run1 FAILED: quota）を追加。
9. **仕様の後追い変更**（LIN-22, LIN-46）と **context-overload**（LIN-171）は `countermeasure: in-agents-md` に更新済み。残り `none` は context-overload 系 6 件（LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79）— issue 記述ガイドラインの整備が課題。

## 合成先

→ [[concepts/agent-patterns/index|Agent Patterns]]
→ [[concepts/agent-patterns/Context_and_Cost]] — context-overload 詳細
→ [[concepts/agent-patterns/Platform_Artifacts]] — quota-recovery / platform-artifact 詳細
