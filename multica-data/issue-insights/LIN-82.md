```json
{
  "identifier": "LIN-82",
  "title": "ドラフト復元時に行削除が反映されない",
  "status": "done",
  "run_count": 2,
  "total_tokens": 1398141,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-05-15"
}
```

# LIN-82: ドラフト復元時に行削除が反映されない

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (なし) |
| 2 | completed | PRは作成されていますか？ |

## 観察

### Run 1: バグ修正 — loadProject のマージロジックを修正

`loadProject` がドラフト行をファイル行の上にマージ（merge）していたため、行削除がドラフト復元時に打ち消されていた。修正はマージではなく置換（replace）にするというシンプルなもので、1 run で実装が完了した。

### Run 2: PR 状態の確認依頼

ユーザーから「PRは作成されていますか？もしくは、すでにコードはマージされていますか？」というコメント。Agent は PR が既に作成済みであることを確認して完了。

## 教訓

1. **単純なバグ修正は 1 run で完結する** — 明確な原因特定と修正方針があれば、追加 Run は不要。
2. **PR 作成状況の確認コメントは軽量** — コミュニケーションのみで完了するため、トークン消費もわずか。
