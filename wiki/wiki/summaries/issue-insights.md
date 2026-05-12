# Summary — issue-insights (multica-data/issue-insights/)

**Source**: `multica-data/issue-insights/` — [[raw/refs/issue-insights]]  
**件数**: 22 issue（LIN-10〜LIN-78）  
**期間**: 2026-04〜05

## 概要

Multica で実行された AI エージェントタスクの実行ログを分析した insight ファイル群。
各ファイルは JSON メタデータ（patterns, rerun_causes, countermeasure）と観察・教訓を持つ統一フォーマット。

## countermeasure 分布

| 値 | 件数 | 意味 |
|----|------|------|
| `one-time` | 18 | 一度限りの環境問題・操作ミス |
| `in-agents-md` | 1 | AGENTS.md 対策済み（LIN-51） |
| `platform-fix` | 1 | プラットフォーム修正済み（LIN-43） |
| `none` | 2 | 未対策（LIN-22, LIN-46） |

## 観察されたパターン分布

| パターン | 件数 | 代表 issue |
|---------|------|-----------|
| `quota-recovery` | 4 | LIN-38, LIN-40, LIN-41, LIN-42 |
| `platform-artifact` | 3 | LIN-41, LIN-42, LIN-45 |
| `env-github-token` | 2 | LIN-16, LIN-36 |
| `duplicate-trigger` | 2 | LIN-16, LIN-43 |
| `e2e-not-verified` | 2 | LIN-46, LIN-51 |
| `env-git-auth` | 1 | LIN-16 |
| `env-e2e` | 1 | LIN-43 |
| `env-url-config` | 1 | LIN-22 |
| `spec-design-change` | 1 | LIN-22 |
| `spec-feature-addition` | 1 | LIN-46 |
| `regression-broad-change` | 1 | LIN-51 |
| `context-overload` | 1 | LIN-16 |
| `infra-improvement` | 1 | LIN-78 |

## 主な教訓

1. **quota-recovery が最多パターン**。"いかがです？" / "how are you?" / "作業できますか？" は使用量回復後の手動確認メッセージ。専用キーワード `ping` への移行を推奨。
2. **22 件中 15 件がパターンなし（正常フロー）**。2ステップ（実装 → PR作成）が標準的な完了パターン。
3. **環境起因の再実行**は git 認証・GitHub token スコープ・E2E 環境の整備不足が繰り返されている。
4. **`has_failures` の過大評価**。`platform-artifact` と `quota-recovery` の失敗は実装失敗ではないため除外が必要。
5. **仕様の後追い変更**（LIN-22, LIN-46）は未対策の2件に残っている。

## 合成先

→ [[concepts/agent-patterns/index|Agent Patterns]]
