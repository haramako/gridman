```json
{
  "identifier": "LIN-52",
  "title": "E2Eテストが失敗する",
  "status": "cancelled",
  "run_count": 1,
  "total_tokens": 149995,
  "has_real_failures": true,
  "failure_cause": "単一 run が失敗してキャンセル（原因不明）",
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-05-13"
}
```

# LIN-52: E2Eテストが失敗する

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | failed | (初回実行) |

## 観察

### 単一 run 失敗でキャンセル
Run1 が失敗してそのまま cancelled になっている。トークン消費 149,995 は極めて小さく、短時間で中断された可能性が高い。

メッセージログが読めないため失敗原因は不明。LIN-78 で E2E 環境が整備された後に issue 自体が不要になってキャンセルされた可能性がある。

## 教訓

1. **短時間失敗 → キャンセルは環境問題の可能性** — E2E 実行環境が未整備の時期に発行された issue と推測。LIN-78 参照。
