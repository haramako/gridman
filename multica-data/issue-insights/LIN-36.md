```json
{
  "identifier": "LIN-36",
  "title": "未保存変更の * 表示",
  "status": "done",
  "run_count": 5,
  "total_tokens": 3005082,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["env-github-token"],
  "patterns": ["env-github-token"],
  "countermeasure": "one-time",
  "written_at": "2026-05-12"
}
```

# LIN-36: 未保存変更の * 表示

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実行) |
| 2 | completed | GitHub Classic Token作成・hosts.yml再設定 |
| 3 | completed | hosts.yml更新後の再試行 |
| 4 | completed | pull_requests: write スコープ追加後の確認 |
| 5 | completed | (最終確認) |

## 観察

### GitHub token スコープ不足で3回再実行
Run2・3は「Classic Tokenを作成しました」「hosts.ymlを更新しました」というトリガーで、ユーザーが環境を修正しながら再試行するパターン。Run4では `pull_requests: write` スコープが別途不足していることが発覚し、さらに1回追加された。

### 実装自体は問題なし
`*` 表示の本実装は Run1 またはその早い段階で完了していたと推測される。PR が作成できないために「done」にならず、実質的な完了が遅延した。

## 教訓

1. **GitHub token に必要スコープを事前に確認する**: `repo`（read/write）と `pull_requests: write` が最低限必要。タスク開始前チェックリストに含めるとよい。
2. **環境問題による再実行は実装品質と切り離して記録する**: 実装は正常でも環境設定で複数 run になるケースがある。
3. エージェントが「このスコープが必要です」と具体的なエラーメッセージを伝えられると、ユーザーの修正が1回で済む。
