```json
{
  "identifier": "LIN-14",
  "title": "[TML] TMLParser.Default に bindingVM が未設定",
  "status": "done",
  "run_count": 1,
  "total_tokens": 2310193,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-06-05"
}
```

# LIN-14: [TML] TMLParser.Default に bindingVM が未設定

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初期トリガー) |

## 観察

`Binder.cs:58` で `TMLParser.Default.Parse()` を `bindingVM` なしで呼び出していたため、`ITMLText.ToTML()` の出力に含まれる `{{expr}}` がサイレントにドロップされるバグを修正。一行追加の修正で解決。全110テストパス。

## 教訓

1. **特筆すべき問題なし** — 単一ランで正常完了したシンプルなバグ修正。
