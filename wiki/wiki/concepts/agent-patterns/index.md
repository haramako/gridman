# Agent Patterns — AIエージェント実行パターン

Multica issue の実行ログ（[[raw/refs/issue-insights]] / [[summaries/issue-insights]]）から帰納した、
AIエージェントタスクで繰り返し発生するパターンとその対策。

## サブページ

- [[concepts/agent-patterns/Environment_Issues]] — 環境起因の再実行（最多パターン）
- [[concepts/agent-patterns/Platform_Artifacts]] — プラットフォームアーティファクト（メトリクス歪み）
- [[concepts/agent-patterns/Spec_Quality]] — 仕様品質起因の再設計
- [[concepts/agent-patterns/Regression_and_Testing]] — リグレッションと E2E 検証

## パターン taxonomy

| コード | カテゴリ | 概要 |
|--------|---------|------|
| `env-git-auth` | 環境 | git SSH/HTTPS 認証設定問題 |
| `env-github-token` | 環境 | GitHub token スコープ不足 |
| `env-e2e` | 環境 | E2E テスト実行環境未整備 |
| `env-url-config` | 環境 | 外部 URL/接続設定ミス |
| `platform-artifact` | アーティファクト | 完了後に残る stale failed run |
| `duplicate-trigger` | アーティファクト | 同一トリガーの重複送信 |
| `spec-design-change` | 仕様 | 実装後にインターフェース設計変更 |
| `spec-feature-addition` | 仕様 | 実装後に機能追加依頼 |
| `e2e-not-verified` | テスト | E2E 未確認で PR 作成 |
| `regression-broad-change` | テスト | 横断的変更で既存機能が壊れた |
| `quota-recovery` | アーティファクト | 使用量上限回復後の手動再開チェック（`ping` など） |
| `infra-improvement` | 改善 | ワークフロー問題自体を修正したタスク |
| `context-overload` | コスト | 高トークン消費・コンテキスト肥大化 |

## フィードバックループ

```mermaid
flowchart LR
    A[Multica issue 実行] --> B[multica-data/issue-insights/LIN-XX.md]
    B --> C[/llm-wiki ingest]
    C --> D[wiki/concepts/agent-patterns/]
    D --> E[AGENTS.md に対策を反映]
    E --> A
```

ループを閉じるには人間のトリガーが1回必要：issue 完了後に insight を書き、定期的に ingest する。
