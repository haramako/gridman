```json
{
  "identifier": "LIN-78",
  "title": "[Test] E2EテストがローカルサーバーなしでE2E実行できない",
  "status": "done",
  "run_count": 2,
  "total_tokens": 3120555,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": ["infra-improvement"],
  "written_at": "2026-05-12"
}
```

# LIN-78: [Test] E2EテストがローカルサーバーなしでE2E実行できない

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実装) |
| 2 | completed | PR マージ・タスク DONE 化の依頼 |

## 観察

### LIN-46 の教訓から生まれたインフラ改善
LIN-46 でエージェントが E2E テストを通さずに PR 作成したことが発端。Playwright 設定に `reuseExistingServer: true` とサーバー自動起動を追加し、エージェントが単独で E2E テストを実行できるようにした。現在の AGENTS.md に反映済み。

### PR マージを別 run でトリガー
実装完了後、PR マージと issue の DONE 化を別 run でトリガーしている。「マージして、DONEにして」という指示パターンは定型化できる。

## 教訓

1. **問題 → インフラ改善のサイクルが機能した好例**。LIN-46 のペインが LIN-78 につながった。
2. E2E テストの自動起動設定（`reuseExistingServer: true`）は AGENTS.md に記載され、後続エージェントに引き継がれた。知識の伝達が正しく機能したケース。
