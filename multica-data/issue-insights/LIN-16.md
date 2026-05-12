```json
{
  "identifier": "LIN-16",
  "title": "[TML] 入力検証の強化 (for-binding)",
  "status": "done",
  "run_count": 4,
  "total_tokens": 18416149,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["env-git-auth", "duplicate-trigger"],
  "patterns": ["env-git-auth", "duplicate-trigger", "context-overload"],
  "countermeasure": "one-time",
  "written_at": "2026-05-12"
}
```

# LIN-16: [TML] 入力検証の強化 (for-binding)

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実行) |
| 2 | completed | ブランチへの push 依頼 |
| 3 | completed | Git SSH設定変更後の再試行 |
| 4 | failed | SSH設定変更後（Run3と同一トリガーの重複） |

※ `runs` 配列は新しい順のため、上表は時系列に並べ直している（Run1=最古、Run4=最新）。

## 観察

### Git SSH 設定変更による再実行
Run3・4のトリガーは「gitのレポジトリをssh経由に変更しました。これでどうでしょうか？」と同一。SSH設定変更後に2回送信されており、Run3が完了（71秒）、Run4が即失敗（9秒）した。

### Run4 は duplicate-trigger アーティファクト
Run3とRun4の開始時刻が同一（13:22）で同一トリガー。Run3が完了した後にRun4が重複して起動し、9秒で失敗している。`platform-artifact` ではなく、ユーザーがトリガーを誤って二重送信した `duplicate-trigger` パターン。

### 高トークン消費
18M tokens はワークスペース内最多。TMLParser.cs の複雑な実装と多数のファイル参照が原因と推測される。

## 教訓

1. **Git認証設定（SSH/HTTPS切り替え）はタスク開始前に確定させる**。途中での変更は余分な run を生む。
2. **トリガー送信の重複に注意**。同一内容を短時間に2回送ると、完了した run の直後に失敗 run が残る。
3. 大きなコードベース操作は段階的に指示を分割すると、各 run のコンテキスト消費を抑えられる。
