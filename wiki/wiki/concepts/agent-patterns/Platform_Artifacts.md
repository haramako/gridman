# プラットフォームアーティファクト

→ [[concepts/agent-patterns/index|Agent Patterns]] の一部

## 概要

実際の AI 実装の失敗ではなく、プラットフォームの状態管理や操作ミスによって生じる
「見かけ上の失敗 run」。`has_failures: true` になるため metrics を歪める。

**該当 taxonomy**: `platform-artifact`, `duplicate-trigger`, `quota-recovery`

## バリエーション

### `platform-artifact` — 完了後の stale failed run

**事例**: LIN-45, LIN-38, LIN-40, LIN-41, LIN-42, LIN-56（複数）

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

**事例**: LIN-38, LIN-40, LIN-41, LIN-42

エージェントの使用量が上限に達して実行が中断した後、使用量が回復したタイミングでタスクが自動再起動しないよう、ユーザーが手動で送る確認メッセージ。"いかがです？" / "how are you?" / "作業できますか？" などが使われてきたが、通常の指示と区別がつかないため誤分類されやすい。

**専用キーワード**: `ping`（機械的に `trigger_summary == "ping"` で検出可能）

**特徴**: 初回 run が failed（quota 切れ）、次の run が quota-recovery トリガーで completed になるパターン。

## メトリクスへの影響

現在の `has_failures` フラグはこれらのアーティファクトを含むため、**過大評価になる**。

```
真の失敗率 = has_failures == true
           AND NOT (trigger_summary == null AND 前 run == completed)
           AND NOT (trigger が直前 run と同一)
```

分析スクリプトで除外ロジックを入れることを推奨。
