# ブロッカー報告パターン

→ [[concepts/agent-patterns/index|Agent Patterns]] の一部

## 概要

エージェントがタスクを完了できない場合に、問題をユーザーへ構造化して報告するパターン。
「とりあえず進める」「黙って失敗する」を防ぎ、人間が介入すべきタイミングを明確にする。

**背景**: `env-*` / `spec-*` 系の多くはツールエラーとして検知可能。発生時点で即報告する方が
途中まで実装した後に失敗するよりコストが低い（[[concepts/agent-patterns/Context_and_Cost]] の context-overload も同様）。

## AGENTS.md の報告フォーマット

タスクが完了できないと判断した場合、以下のフォーマットで報告する:

```
タスクを完了できません。

【何をしようとしたか】
<実装しようとしていた内容>

【何が起きたか】
<エラーの内容・設計判断が必要な理由>

【次のアクション候補】
1. <ユーザーが提供すべき情報または決定>
2. <タスク分割の案（あれば）>
```

## 報告すべきケース

| ケース | 例 |
|--------|-----|
| **環境問題** | GitHub token 不足・E2E 実行環境なし・接続エラー |
| **設計判断が必要** | 新しいインターフェースの形が決まっていない・複数の実装方針が考えられる |
| **大規模タスク** | 変更対象ファイルが 10 個以上に達しそう（[[concepts/agent-patterns/Context_and_Cost]] 参照） |
| **スコープ外** | issue の説明に記載がない要件が実装中に判明した |

## 関連パターン

- `env-*` — 環境問題（[[concepts/agent-patterns/Environment_Issues]]）
- `spec-design-change` — 設計判断不足（[[concepts/agent-patterns/Spec_Quality]]）
- `context-overload` — 大規模タスク（[[concepts/agent-patterns/Context_and_Cost]]）

## 将来の改善案

アプローチ B（構造化 JSON 出力 → multica_sync.py 取り込み）は将来の自動化候補。
報告フォーマットが運用で安定してから検討する（[[summaries/doc-discussions]] 参照）。
