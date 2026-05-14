```json
{
  "identifier": "LIN-46",
  "title": "テーブル横断検索",
  "status": "done",
  "run_count": 6,
  "total_tokens": 5486002,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["spec-feature-addition", "e2e-not-verified"],
  "patterns": ["spec-feature-addition", "e2e-not-verified"],
  "countermeasure": "in-agents-md",
  "written_at": "2026-05-14"
}
```

# LIN-46: テーブル横断検索

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実装) |
| 2 | completed | `npm run test:e2e` 完了確認 |
| 3 | completed | E2Eテスト問題の調査・修正 + AGENTS.md 記載依頼 |
| 4 | completed | PR 作成依頼 |
| 5 | completed | コンフリクト解消 |
| 6 | completed | インクリメンタル検索・スロットル追加依頼 |

## 観察

### E2Eテスト未確認のまま PR 作成

Run 4 で PR を作成したが E2Eテストが通っていなかった。Run 2 でユーザーが「`npm run test:e2e` も完了していますか？」と確認、Run 3 で「E2Eテストの問題を調査・修正してください + AGENTS.md に必須要件を追記してください」という依頼が来た。この件を契機に AGENTS.md の「動作確認（タスク完了の必須条件）」に E2Eテストが追記された。

### 機能仕様の後追い追加

Run 6 の「インクリメンタルにしてください、スロットルも入れてください」は初回実装後に届いた追加要件。mvp.md にインクリメンタル方式の詳細が記載されていなかったことが原因。

### PR 作成前のコンフリクト

Run 5 は並行 main ブランチとのコンフリクト解消。PR 作成前に `git rebase main` を習慣化することで防止できる。

### 対策の現状

AGENTS.md の「動作確認（タスク完了の必須条件）」に `npm run test:e2e` が明記された（本 issue で追記）。以降のエージェントは PR 作成前に E2Eテストを必ず実行する。

## 教訓

1. **E2Eテストはタスク完了の必須条件**として AGENTS.md に定義済み — PR 作成前に `npm run test:e2e` を必ず確認すること（現在は対策済み）。
2. **機能仕様は実装前に確定させる** — 「インクリメンタルにしてください」のような詳細は初回 issue に含めるべきだった。mvp.md 参照系の issue は曖昧な仕様を残しやすい。
3. **PR 前に main との同期を確認する** — `git rebase main` または `git merge main` を PR 作成直前に実行することでコンフリクト run を防げる。
