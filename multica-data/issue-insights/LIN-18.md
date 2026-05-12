```json
{
  "identifier": "LIN-18",
  "title": "[TML] StyleSheet キャッシュが無制限に増加",
  "status": "done",
  "run_count": 1,
  "total_tokens": 5419584,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": ["context-overload"],
  "countermeasure": "none",
  "written_at": "2026-05-12"
}
```

# LIN-18: [TML] StyleSheet キャッシュが無制限に増加

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実行) |

## 観察

### 高トークン消費での正常完了

Style.cs のクラス組み合わせキャッシュに上限・LRU クリア機能を追加するバグ修正タスク。1 回で正常完了したが、5.4M トークンと高いトークン消費を記録した。TML コードベースの規模とキャッシュ実装の調査が消費の主因と考えられる。

## 教訓

1. **キャッシュ系バグ修正はコンテキストが大きくなりやすい** — 既存キャッシュの動作確認・テスト記述・境界値検討など探索が多い。issue に「変更対象ファイル: Style.cs:24-25」と具体的なファイル位置を記載すると探索コストを削減できる。
2. **5M トークン超の issue は分割を検討** — 将来的に同規模の C# ライブラリ修正を依頼する場合、スコープを絞った複数 issue に分割するとトークン効率が改善する可能性がある。
