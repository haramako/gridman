```json
{
  "identifier": "LIN-13",
  "title": "[TML] インラインバインディング失敗時のサイレントスキップ修正",
  "status": "done",
  "run_count": 1,
  "total_tokens": 1907757,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-06-05"
}
```

# LIN-13: [TML] インラインバインディング失敗時のサイレントスキップ修正

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初期トリガー) |

## 観察

`TMLParser.cs:367-378` の `addInlineBindingText` メソッドでパース失敗時にサイレントにテキストをドロップする問題を修正。`Logger.LogWarning()` 追加とフォールバック平文要素の導入。2つの新テストを追加し、全111テストパス。

## 教訓

1. **特筆すべき問題なし** — 単一ランで正常完了したバグ修正。
