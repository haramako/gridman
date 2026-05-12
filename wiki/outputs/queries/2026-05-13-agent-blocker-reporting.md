# クエリ: エージェントへのブロッカー報告指示の実現可能性

**質問**: エージェントに、タスク実行の最後または途中で、設計・環境の問題で作業が進まない場合に
それを報告させることは可能か？pros/cons・実現可能性を検討する。

**根拠**: [[concepts/agent-patterns/index]] + [[concepts/agent-patterns/Environment_Issues]] +
[[concepts/agent-patterns/Spec_Quality]] + [[concepts/agent-patterns/Context_and_Cost]]

---

## 前提: エージェントが「検知できる」問題と「できない」問題

| 問題の種類 | taxonomy | 自己検知可否 | 理由 |
|-----------|---------|------------|------|
| git push 失敗 | `env-git-auth` | ✅ 検知可 | ツールエラーとして明示的に失敗する |
| GitHub token 不足 | `env-github-token` | ✅ 検知可 | API エラーが返る |
| E2E テスト失敗 | `env-e2e` | ✅ 検知可 | テスト出力に失敗が記録される |
| 仕様が曖昧 | `spec-design-change` | △ 部分的 | 「決定が必要」と判断できる場合もある |
| スコープ肥大化 | `context-overload` | ❌ 困難 | エージェント自身は自分のトークン消費を知らない |

---

## アプローチ別 pros/cons

### A. AGENTS.md にブロッカー報告セクションを追加（常時適用）

完了できなかった場合、最終メッセージに構造化された報告セクションを書くよう指示する。

```markdown
## ブロッカー報告

タスクを完了できなかった場合、以下の形式で報告すること：

- **何をしようとしたか**: （例: npm run test:e2e を実行）
- **何が起きたか**: （例: "Error: ENOENT playwright" — Playwright が未インストール）
- **次のアクション**: （例: `npx playwright install` を実行してから再実行してください）
```

| | |
|---|---|
| **Pro** | 常時適用。ユーザーのアクション不要 |
| **Pro** | 既存 issue-insights ワークフローへの入力になる |
| **Pro** | `env-*` 系の大半はツールエラーとして検知可能 |
| **Con** | 自由記述なので Multica 側での自動パースが難しい |
| **Con** | `context-overload` には対応できない（事前の「大規模タスクの進め方」で対処済み） |
| **実現可能性** | **高** — Claude Code は AGENTS.md を必ず読む。1セクション追加で即日適用可能 |

---

### B. タスク完了時に構造化 JSON を出力させる

run ごとに `blocker.json` を出力させ、`multica_sync.py` が取り込む。

```json
{
  "blocked": true,
  "type": "env-git-auth",
  "detail": "git push が 403 で失敗",
  "required_action": "GitHub token の pull_requests:write スコープを付与"
}
```

| | |
|---|---|
| **Pro** | `multica_sync.py` で `has_real_failures` と連携できる |
| **Pro** | taxonomy コードを自動分類できれば insight 生成コストが下がる |
| **Con** | エージェントに「ファイル出力」の手順を覚えさせる必要がある |
| **Con** | taxonomy コードの分類は LLM によるので精度が不安定 |
| **Con** | Multica が `blocker.json` を読む仕組みが現状ない |
| **実現可能性** | **中** — AGENTS.md + multica_sync.py の両方を変更する必要がある |

---

### C. タスク途中でユーザーに確認を求める（mid-task 割り込み）

実装途中でブロッカーを発見したら、その場で作業を止めてユーザーに問い合わせる。

| | |
|---|---|
| **Pro** | 早期発見でトークン浪費を防げる（特に `spec-design-change`）|
| **Con** | Multica の非同期実行モデルと相性が悪い（人間が待機していない場合が多い）|
| **Con** | 「いつ割り込んでよいか」の判断をエージェントに委ねることになり不安定 |
| **Con** | 現状の AGENTS.md に「大規模タスクは中止・タスク分割依頼」が既にある — これが実質的な mid-task 割り込み |
| **実現可能性** | **低〜中** — 現在の「大規模タスクの進め方」が最も近いが、それ以上の割り込みはプラットフォーム依存 |

---

## 推奨アプローチ

**アプローチ A（AGENTS.md への追記）が最も費用対効果が高い。**

理由:
1. 実装コストがほぼゼロ（1セクション追加のみ）
2. `env-*` 系（git auth・GitHub token・E2E 環境）は全件対応できる
3. `spec-*` 系も、エージェントが設計判断を求める際の雛形になる
4. `context-overload` は「大規模タスクの進め方」セクションで既に対策済み

アプローチ B は将来の自動化に価値があるが、まず A で運用して報告フォーマットが安定してから検討すべき。

---

## issue-insights との対応

ブロッカー報告が蓄積されると、現在の insight ファイルの `rerun_causes` フィールドを
エージェントが自動で埋められるようになる可能性がある（現在は人間が手動で分類）。

→ [[concepts/agent-patterns/index]] の taxonomy を報告フォーマットの選択肢として使えば、
  分類の一貫性が保てる。

---

## 関連ページ

- [[concepts/agent-patterns/Environment_Issues]] — env-* 系の事例と対策チェックリスト
- [[concepts/agent-patterns/Spec_Quality]] — spec-* 系の防止パターン
- [[concepts/agent-patterns/Context_and_Cost]] — context-overload の削減戦略
