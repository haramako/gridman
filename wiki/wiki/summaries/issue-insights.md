# Summary — issue-insights (multica-data/issue-insights/)

**Source**: `multica-data/issue-insights/` — [[raw/refs/issue-insights]]  
**件数**: 50 issue（LIN-1〜LIN-182、一部欠番）  
**期間**: 2026-04〜05

## 概要

Multica で実行された AI エージェントタスクの実行ログを分析した insight ファイル群。
各ファイルは JSON メタデータ（patterns, rerun_causes, countermeasure）と観察・教訓を持つ統一フォーマット。

## countermeasure 分布

| 値 | 件数 | 意味 |
|----|------|------|
| `one-time` | 39 | 一度限りの環境問題・操作ミス |
| `none` | 9 | 未対策（要改善） |
| `in-agents-md` | 1 | AGENTS.md 対策済み（LIN-51） |
| `platform-fix` | 1 | プラットフォーム修正済み（LIN-43） |

## 観察されたパターン分布

| パターン | 件数 | 代表 issue |
|---------|------|-----------|
| `context-overload` | 8 | LIN-16, LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79, **LIN-171** |
| `quota-recovery` | 6 | LIN-38, LIN-40, LIN-41, LIN-42, LIN-83, LIN-171 |
| `platform-artifact` | 4 | LIN-41, LIN-42, LIN-45, LIN-72 |
| `duplicate-trigger` | 3 | LIN-16, LIN-43, LIN-72 |
| `infra-improvement` | 2 | LIN-78, LIN-168 |
| `env-github-token` | 2 | LIN-16, LIN-36 |
| `e2e-not-verified` | 2 | LIN-46, LIN-51 |
| `env-git-auth` | 1 | LIN-16 |
| `env-e2e` | 1 | LIN-43 |
| `env-url-config` | 1 | LIN-22 |
| `spec-design-change` | 1 | LIN-22 |
| `spec-feature-addition` | 1 | LIN-46 |
| `regression-broad-change` | 1 | LIN-51 |

## 主な教訓

1. **`context-overload` が最多パターン（8件）**。大規模実装タスク（Undo/Redo, ビュー編集, バグ探索など）は 3〜10M トークンを消費する。**LIN-171（SpreadsheetGrid.tsx 分割）は 10.5M トークン**と最大記録。issue に「変更対象ファイル」「設計指針」を明記するとコスト削減につながる。
2. **`quota-recovery` が2位（6件）**。"いかがです？" 系メッセージは使用量回復後の手動確認。専用 `ping` キーワードへの移行を推奨。
3. **ゼロ run issue が9件**（LIN-1, LIN-27, LIN-28, LIN-34, LIN-35, LIN-67, LIN-180, LIN-181, LIN-182）。LIN-180/181/182 は LIN-171 の sub-task で、親 issue の作業内で一括完了した。
4. **50件中 27件がパターンなし（正常フロー）**。単純実装は1 run で完了するケースが多数。
5. **PR 省略→再依頼パターン**（LIN-172, LIN-175）: エージェントが実装完了後に PR を作成せず、ユーザーが再依頼。SKILL の「PR 作成判断基準」を厳守すれば防げる。
6. **仕様の後追い変更**（LIN-22, LIN-46）と **context-overload 未対策**（LIN-171 など）は `countermeasure: none` のまま残っている。

## 合成先

→ [[concepts/agent-patterns/index|Agent Patterns]]
→ [[concepts/agent-patterns/Context_and_Cost]] — context-overload 詳細
→ [[concepts/agent-patterns/Platform_Artifacts]] — quota-recovery / platform-artifact 詳細
