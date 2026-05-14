# 現在のワークフローでの課題

[[concepts/agent-patterns/index|Agent Patterns]] · [[summaries/issue-insights]] · [[summaries/doc-discussions]]

## 課題一覧（優先度順）

### 1. context-overload が最多パターン（対策未完）

50件中 8件で観察された最大の課題。大規模タスクで 3〜10.5M トークンを消費する（[[concepts/agent-patterns/Context_and_Cost]]）。AGENTS.md に停止基準（ファイル10個以上 / 設計判断必要 / 独立コンポーネント複数）は記載済みだが、**6件が `countermeasure: none` のまま**（LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79）。issue 記述ガイドラインの整備が必要。

### 2. llm-wiki 参照量の可視化欠如

wiki が AI の作業中にどの程度読まれているか定量化できていない。`wiki/log/` は明示的な操作（ingest/query/lint 等）のみ記録し、受動的な Read/Glob/Grep は捕捉しない（[[summaries/doc-discussions]] → `doc/discussion/2026-05-15_llm-wiki-reference-tracking.md` で議論中）。

### 3. PR 省略→再依頼パターン

エージェントが実装完了後に PR を作成せず、ユーザーが再依頼するケース（LIN-172, LIN-175）。SKILL の PR 作成判断基準の徹底が課題。AGENTS.md には「コミットは明示要求時のみ」とあるが、PR 作成のトリガー条件が不明確（[[summaries/issue-insights]]）。

### 4. quota-recovery の誤分類リスク

"いかがです？" 系メッセージが通常指示と区別できない。専用キーワード `ping` への移行中だが完全には浸透していない（[[concepts/agent-patterns/Platform_Artifacts]]）。6件中で `ping` が使われたのは一部のみ。

### 5. 仕様の後追い変更

`spec-design-change` / `spec-feature-addition`。インタラクションシナリオ手法（[[concepts/agent-patterns/Spec_Quality]]）は導入されたが、定着度は未検証。新しいタスクでこの手法が使われているか確認できていない。

### 6. 環境問題は対策済みだがゼロではない

`env-*` は `platform-fix` や `in-agents-md` で大部分対策済み。ただし恒久的にゼロにはならない（[[concepts/agent-patterns/Environment_Issues]]）。

## 優先アクション

1. **context-overload 対策**の具体化作業（issue 記述ガイドラインを AGENTS.md に追加）
2. **wiki 参照量の tracking 実装**（Claude Code hook / OpenCode plugin の選定と作成）
3. **PR 判断基準の明確化**（AGENTS.md の「いつ PR を作成するか」の条件を具体化）
4. **quota-recovery の `ping` 移行徹底**（ユーザーとの運用ルール化）
