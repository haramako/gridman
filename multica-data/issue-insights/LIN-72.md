```json
{
  "identifier": "LIN-72",
  "title": "[BUG] Ctrl+S を1回押しても未保存状態が解消されない",
  "status": "done",
  "run_count": 3,
  "total_tokens": 1777257,
  "has_real_failures": true,
  "failure_cause": "PR作成依頼後の run が failed。GitHub token またはネットワーク環境の一時的な問題",
  "rerun_causes": [],
  "patterns": ["platform-artifact"],
  "countermeasure": "one-time",
  "written_at": "2026-05-13"
}
```

# LIN-72: [BUG] Ctrl+S を1回押しても未保存状態が解消されない

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | PR作成して |
| 2 | failed | PR作成して |
| 3 | completed | (なし) |

## 観察

### PR 作成依頼が2回、2回目が failed

Run 1（「PR作成して」）が完了。ところが Run 2 も「PR作成して」で再度トリガーされ、こちらは failed。Run 3 はトリガーなしで completed。

Run 3（runs[0] = 最新）は completed かつ trigger=null。Run 2（runs[1]）が failed。これは platform-artifact の逆のパターンに近く、Run 2 は重複トリガーまたは一時的な問題による失敗と考えられる。

### 重複トリガーの可能性

「PR作成して」が2回送信されており、duplicate-trigger に近いパターン。1回目（Run 1）で PR 作成は完了していたにもかかわらず、2回目のトリガーで再実行された。

## 教訓

1. **PR が作成済みかどうか確認してから再依頼する** — 同じトリガーが複数回送られると、完了済みの作業を重複実行する run が発生する。
2. **完了 run の後に来た failed run は platform-artifact 寄りの可能性がある** — Run 1 が completed なら Run 2 の failed は一時的な問題と判断してよい場合がある。
