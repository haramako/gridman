```json
{
  "identifier": "LIN-41",
  "title": "[BUG]エディット状態でTABを押したときに二つ右のセルに移動してしまう",
  "status": "done",
  "run_count": 2,
  "total_tokens": 874454,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["quota-recovery"],
  "patterns": ["quota-recovery", "platform-artifact"],
  "countermeasure": "one-time",
  "written_at": "2026-05-13"
}
```

# LIN-41: [BUG] エディット状態でTABを押したときに二つ右のセルに移動してしまう

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実装) |
| 2 | completed | "いかがです？" — 使用量回復後の手動再開チェック |
| 3 | failed | (トリガーなし) |

## 観察

### quota-recovery トリガーのみ
LIN-42 と同じパターン。「いかがです？」は使用量回復後の手動確認メッセージ。Run3 は platform-artifact。

実装そのものは Run1 で完了しており、追加 run は実装品質とは無関係。

## 教訓

1. LIN-42 参照。`ping` などの専用キーワードへの移行を推奨。
