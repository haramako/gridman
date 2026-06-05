```json
{
  "identifier": "LIN-21",
  "title": "[TML] text-decoration がレンダリングされない",
  "status": "done",
  "run_count": 1,
  "total_tokens": 1607329,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-06-05"
}
```

# LIN-21: [TML] text-decoration がレンダリングされない

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初期トリガー) |

## 観察

`TMLBuilder.cs` で `TextDecoration` は `Style` に保持されていたが TextMeshPro への反映コードがなかった。`Fragment.cs` に `ActualTextDecoration()` を追加し、親チェーンをトラバースして値を解決。`TMLBuilder.cs` で `underline` → `FontStyles.Underline`、`line-through` → `FontStyles.Strikethrough` にマッピング。

## 教訓

1. **特筆すべき問題なし** — 単一ランで正常完了した機能追加。
