```json
{
  "identifier": "LIN-45",
  "title": "ユニオンビュー（複数テーブルを縦結合）の実装",
  "status": "done",
  "run_count": 2,
  "total_tokens": 5179489,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": ["platform-artifact"],
  "written_at": "2026-05-12"
}
```

# LIN-45: ユニオンビュー（複数テーブルを縦結合）の実装

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | よろしく |
| 2 | failed | (トリガーなし) |

## 観察

### platform-artifact の典型例
Run1 が完了した後、トリガーなしで Run2 が failed になっている。`trigger_summary` が null の failed run は、issue 完了後に残留したプラットフォームの状態管理アーティファクトと判断できる。実装上の問題はない。

## 教訓

1. **`has_failures: true` でもトリガーなし + 前 run 完了の場合は platform-artifact**。実際の失敗率を計算する際はこのパターンを除外する。
