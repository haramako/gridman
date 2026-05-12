```json
{
  "identifier": "LIN-51",
  "title": "mvp.mdの\"プロジェクト全体共有 enum 定義\"の実装",
  "status": "done",
  "run_count": 4,
  "total_tokens": 5532609,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["regression-broad-change", "e2e-not-verified"],
  "patterns": ["regression-broad-change", "e2e-not-verified"],
  "countermeasure": "in-agents-md",
  "written_at": "2026-05-12"
}
```

# LIN-51: mvp.mdの"プロジェクト全体共有 enum 定義"の実装

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (初回実装) |
| 2 | completed | スプレッドシートページが表示できない問題の調査 |
| 3 | cancelled | E2Eテスト完了確認 |
| 4 | completed | E2Eテスト修正完了・main マージ確認・PR 依頼 |

## 観察

### 実装によるリグレッション
Run2のトリガー「スプレッドシートのページが表示できません」は実装によるリグレッションと推測される。enum 定義の追加がストアやコンポーネントに広範囲に影響し、既存機能が壊れた。

### E2Eテスト確認の繰り返し
Run3「E2Eテストまで通っていますか？」、Run4「E2Eテスト修正完了したので〜」と複数回確認が必要だった。E2Eを通さずに完了扱いにしようとしたパターン。

### Cancelled run の意味
Run3（cancelled）は Run4 の実行中に発行されて競合したか、手動でキャンセルされた可能性がある。

## 教訓

1. **enum定義など横断的な変更はリグレッションリスクが高い**。変更前に影響を受けるコンポーネントをリストアップしてから実装するよう指示に含めるとよい。
2. **E2Eテスト通過を完了の必須条件として明示**することで、未確認のまま PR 作成するのを防げる（現在は AGENTS.md に記載済み）。
3. 複合依頼（「マージして、問題なければPRして」）はどの段階で詰まったか把握しにくい。依頼は一つずつ分割する方が望ましい。
