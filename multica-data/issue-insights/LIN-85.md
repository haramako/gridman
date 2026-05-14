```json
{
  "identifier": "LIN-85",
  "title": "syncDraftFromTab が _order（ソート順）でドラフトの新旧を判定している",
  "status": "done",
  "run_count": 6,
  "total_tokens": 3708018,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["quota-recovery"],
  "patterns": ["quota-recovery"],
  "countermeasure": "one-time",
  "written_at": "2026-05-15"
}
```

# LIN-85: syncDraftFromTab が _order（ソート順）でドラフトの新旧を判定している

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | (なし) |
| 2 | failed | (なし) |
| 3 | completed | (なし) |
| 4 | completed | (なし) |
| 5 | completed | 変更内容を確認して... |
| 6 | completed | テストの報告がないですが... |

## 観察

### Run 1: 初回実装

`syncDraftFromTab` が `_order` フィールドでドラフトの新旧を判定していたロジックを修正。`_order` はソート順であり、更新時刻の代理として使うべきではない。1 run で実装が完了したが、この時点では PR 未作成。

### Run 2: Quota 超過による失敗

Run 1 完了直後の Run 2 が "You're out of extra usage" で 3 秒で failed。**実質的な失敗原因はクォータ枯渇であり、コードの問題ではない。**

### Run 3: クォータ回復後の確認

クォータ回復後、再度トリガー。修正が維持されていることを確認して完了。

### Run 4: PR #43 作成

再度トリガーされ、PR #43 を作成。実装は Run 1 で完了済みだったため、PR 作成のみ。

### Run 5: PR レビュー

ユーザーから「変更内容を確認して...」のコメントに応答。PR の内容を確認し、問題なしと回答。

### Run 6: テスト結果の報告

ユーザーから「テストの報告がないですが...」のコメント。テスト結果を報告して完了。

## 教訓

1. **クォータ超過による再実行パターン（`quota-recovery`）** — Run 2 の失敗はクォータ不足が原因で、修正内容に問題があったわけではない。結果的に Run 3 で同じ内容を再実行することになった。
2. **PR 作成は初回 run で行うと効率的** — Run 1 で実装のみ完了し、Run 4 で改めて PR 作成のためにトリガーが必要になった。初回 run で PR まで完了していれば 2 run 削減できた可能性がある。
3. **フォローアップコメントは軽量だが積み重なるとコストになる** — Run 5・Run 6 はそれぞれ軽量だが、合計で 130 秒・130K トークン程度消費している。
