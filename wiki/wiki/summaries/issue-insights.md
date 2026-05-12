# Summary — issue-insights (multica-data/issue-insights/)

**Source**: `multica-data/issue-insights/` — [[raw/refs/issue-insights]]  
**件数**: 8 issue（LIN-16, LIN-22, LIN-36, LIN-43, LIN-45, LIN-46, LIN-51, LIN-78）  
**期間**: 2026-04〜05

## 概要

Multica で実行された AI エージェントタスクの実行ログを分析した insight ファイル群。
各ファイルは JSON メタデータ（patterns, rerun_causes）と観察・教訓を持つ統一フォーマット。

## 観察されたパターン分布

| パターン | 件数 | 代表 issue |
|---------|------|-----------|
| `platform-artifact` | 1 | LIN-45 |
| `env-github-token` | 2 | LIN-36, LIN-16 |
| `env-git-auth` | 1 | LIN-16 |
| `env-e2e` | 1 | LIN-43 |
| `env-url-config` | 1 | LIN-22 |
| `spec-design-change` | 1 | LIN-22 |
| `spec-feature-addition` | 1 | LIN-46 |
| `e2e-not-verified` | 2 | LIN-46, LIN-51 |
| `regression-broad-change` | 1 | LIN-51 |
| `duplicate-trigger` | 2 | LIN-16, LIN-43 |
| `infra-improvement` | 1 | LIN-78 |
| `context-overload` | 1 | LIN-16 |

## 主な教訓

1. **環境起因の再実行が最多**。git 認証・GitHub token スコープ・E2E 環境の整備不足が繰り返されている。
2. **`has_failures` の過大評価**。stale な failed run（`platform-artifact`）が実失敗としてカウントされるため、メトリクス計算時に除外が必要。
3. **E2E テスト確認漏れ**は LIN-78 のインフラ改善により AGENTS.md に対策が組み込まれた。
4. **仕様の後追い変更**（設計変更・機能追加）は issue 記述の品質向上で防げる。

## 合成先

→ [[concepts/agent-patterns/index|Agent Patterns]]
