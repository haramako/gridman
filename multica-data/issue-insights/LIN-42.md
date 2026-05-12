```json
{
  "identifier": "LIN-42",
  "title": "[BUG]セルでEnterを押したときにエディット状態のままになってしまう",
  "status": "done",
  "run_count": 3,
  "total_tokens": 1103464,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["quota-recovery"],
  "patterns": ["quota-recovery", "platform-artifact"],
  "countermeasure": "one-time",
  "written_at": "2026-05-13"
}
```

# LIN-42: [BUG] セルでEnterを押したときにエディット状態のままになってしまう

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実装) |
| 2 | completed | "how are you?" — 使用量回復後の手動再開チェック |
| 3 | completed | "いかがです？" — 使用量回復後の手動再開チェック |
| 4 | failed | (トリガーなし) |

※ runs 配列は新しい順のため、上表は時系列に並べ直している。

## 観察

### 「いかがです？」「how are you?」は quota-recovery トリガー
エージェントの使用量が上限に達して停止した後、使用量が回復したタイミングでタスクが自動再起動しないように、ユーザーが手動で送る確認メッセージ。実装の良し悪しを確認しているわけではない。

現在の Multica ベストプラクティスとして使われているが、通常の指示と区別がつかないため、機械的な分析では誤分類される（→ 改善提案: 専用キーワード `ping` の使用を推奨）。

### Run4 は platform-artifact
最終 run が failed でトリガーなし → 完了後の stale run。

## 教訓

1. **`trigger_summary` が "いかがです？" / "how are you?" の run は quota-recovery** と判断する。AI の実装品質とは無関係。
2. 使用量回復後の再開チェックには **`ping` などの専用キーワード**を使うと機械的に検出しやすくなる。
