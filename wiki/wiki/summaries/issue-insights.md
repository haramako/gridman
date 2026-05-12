# Summary — issue-insights (multica-data/issue-insights/)

**Source**: `multica-data/issue-insights/` — [[raw/refs/issue-insights]]  
**件数**: 39 issue（LIN-1〜LIN-79、一部欠番）  
**期間**: 2026-04〜05

## 概要

Multica で実行された AI エージェントタスクの実行ログを分析した insight ファイル群。
各ファイルは JSON メタデータ（patterns, rerun_causes, countermeasure）と観察・教訓を持つ統一フォーマット。

## countermeasure 分布

| 値 | 件数 | 意味 |
|----|------|------|
| `one-time` | 29 | 一度限りの環境問題・操作ミス |
| `none` | 8 | 未対策（要改善） |
| `in-agents-md` | 1 | AGENTS.md 対策済み（LIN-51） |
| `platform-fix` | 1 | プラットフォーム修正済み（LIN-43） |

## 観察されたパターン分布

| パターン | 件数 | 代表 issue |
|---------|------|-----------|
| `context-overload` | 7 | LIN-16, LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79 |
| `quota-recovery` | 4 | LIN-38, LIN-40, LIN-41, LIN-42 |
| `platform-artifact` | 3 | LIN-41, LIN-42, LIN-45 |
| `infra-improvement` | 2 | LIN-78, LIN-168 |
| `env-github-token` | 2 | LIN-16, LIN-36 |
| `duplicate-trigger` | 2 | LIN-16, LIN-43 |
| `e2e-not-verified` | 2 | LIN-46, LIN-51 |
| `env-git-auth` | 1 | LIN-16 |
| `env-e2e` | 1 | LIN-43 |
| `env-url-config` | 1 | LIN-22 |
| `spec-design-change` | 1 | LIN-22 |
| `spec-feature-addition` | 1 | LIN-46 |
| `regression-broad-change` | 1 | LIN-51 |

## 主な教訓

1. **`context-overload` が最多パターン（7件）**。大規模実装タスク（Undo/Redo, ビュー編集, バグ探索など）は 3〜5M トークンを消費する。issue に「変更対象ファイル」「設計指針」を明記するとコスト削減につながる。
2. **`quota-recovery` が2位（4件）**。"いかがです？" 系メッセージは使用量回復後の手動確認。専用 `ping` キーワードへの移行を推奨。
3. **ゼロ run issue が6件**（LIN-1, LIN-27, LIN-28, LIN-34, LIN-35, LIN-67）。ランタイムインストール・環境確認・計画立案・優先度低によるキャンセルなど、エージェント実行不要または手動で完結したタスク。
4. **39件中 22件がパターンなし（正常フロー）**。単純実装は1 run で完了するケースが多数。
5. **仕様の後追い変更**（LIN-22, LIN-46）は `countermeasure: none` のまま残っている。

## 合成先

→ [[concepts/agent-patterns/index|Agent Patterns]]
→ [[concepts/agent-patterns/Context_and_Cost]] — context-overload 詳細
