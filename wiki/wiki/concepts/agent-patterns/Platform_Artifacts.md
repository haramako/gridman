# プラットフォームアーティファクト

→ [[concepts/agent-patterns/index|Agent Patterns]] の一部

## 概要

実際の AI 実装の失敗ではなく、プラットフォームの状態管理や操作ミスによって生じる
「見かけ上の失敗 run」。`has_failures: true` になるため metrics を歪める。

**該当 taxonomy**: `platform-artifact`, `duplicate-trigger`, `quota-recovery`

## バリエーション

### `platform-artifact` — 完了後の stale failed run

**事例**: LIN-45, LIN-38, LIN-40, LIN-41, LIN-42, LIN-56, LIN-72（類似）

issue が完了した後、トリガーなしで failed run が残留するパターン。

**判定条件**（3つすべて満たす）:
1. `run.status == "failed"`
2. `run.trigger_summary == null`
3. 直前の run の `status == "completed"`

これらは issue 完了後にプラットフォームが残したアーティファクトであり、AI の実装失敗ではない。

### `duplicate-trigger` — 同一トリガーの重複送信

**事例**: LIN-16（Run1/2）, LIN-43（Run2/3）

同じトリガー文言が短時間に2回送信され、1つ目が完了した直後に2つ目が失敗するパターン。
ユーザーによる誤ったダブルクリックや、同一メッセージの再送が原因。

**特徴**: 2つの run の `trigger_summary` が完全一致し、開始時刻が近い。

### `quota-recovery` — 使用量上限回復後の手動再開チェック

**事例**: LIN-38, LIN-40, LIN-41, LIN-42, LIN-83, LIN-84, LIN-85, LIN-171, LIN-173, LIN-187, LIN-189

エージェントの使用量が上限に達して実行が中断した後、使用量が回復したタイミングでタスクが自動再起動しないよう、ユーザーが手動で送る確認メッセージ。"いかがです？" / "how are you？" / "作業できますか？" などが使われてきたが、通常の指示と区別がつかないため誤分類されやすい。

**専用キーワード**: `ping`（機械的に `trigger_summary == "ping"` で検出可能）

**特徴**: 初回 run が failed（quota 切れ）、次の run が quota-recovery トリガーで completed になるパターン。

**LIN-83 の例**: `ping` によって triggered された run が `cancelled` で終わり、別途 "mainブランチのrebase+PR" という明確な指示で completed になった。`cancelled` の run は issue 完了に影響しない。

**LIN-171 の例**: context-overload 状態で `ping` を2回受けて2回失敗。大型タスクへの quota-recovery は単純な ping では復帰できないことがある。

## メトリクスへの影響と `has_real_failures` ロジック

`has_failures`（1件でも failed run がある）はアーティファクトを含むため**過大評価**になる。
`multica_sync.py` の `compute_has_real_failures()` が以下の3パターンを除外して計算する:

```python
# runs は新しい順（最新が先頭）
def is_platform_artifact(run, prev_older_run):
    # failed + null trigger + 直前 older run が completed
    return (run.status == "failed"
            and run.trigger_summary is None
            and prev_older_run and prev_older_run.status == "completed")

def is_duplicate_trigger(run, newer_run):
    # failed + より新しい run が同一 trigger で completed
    return (run.status == "failed"
            and newer_run
            and newer_run.trigger_summary == run.trigger_summary
            and newer_run.status == "completed")

def is_quota_recovery(run):
    # failed + trigger が ping / quota-recovery 系キーワード
    keywords = ["ping", "いかがです", "how are you", "作業できますか"]
    return (run.status == "failed"
            and any(k in (run.trigger_summary or "") for k in keywords))
```

**既知の限界**: 「初回 null 失敗 + 後続 completed」の構造（LIN-45）は `platform-artifact` と区別不能。1件のミスマッチは許容済み。
