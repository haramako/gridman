```json
{
  "identifier": "LIN-1",
  "title": "1. Install a runtime (Desktop app or CLI)",
  "status": "done",
  "run_count": 0,
  "total_tokens": 0,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-05-12"
}
```

# LIN-1: 1. Install a runtime (Desktop app or CLI)

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| (なし) | — | 手動完了 |

## 観察

### エージェント実行なし

エージェントによる実行は一度も行われず、人手で完了とマークされた issue。ランタイムインストール（Desktop app または CLI）はセットアップ手順の第一歩であり、人間が手動で行う必要があるタスクのため、エージェントの実行対象外だったと考えられる。

## 教訓

1. **ランタイムインストールは人間作業** — エージェントが動作するための前提条件であり、自動化できない。セットアップ系 issue はエージェント割り当て不要。
