# メトリクス改善・issue テンプレート・AGENTS.md 取消

**日付**: 2026-05-13  
**関連ファイル**: `.claude/skills/multica/scripts/multica_sync.py`, `doc/issue-template.md`, `AGENTS.md`

## 相談内容

前回の改善提案プランに基づき3件を実施した。そのうち提案1（AGENTS.md タスク開始前チェック）は実装後に誤りと判明して取消。

---

## 1. AGENTS.md タスク開始前チェックの取消

### 問題

提案1（env-github-token / env-git-auth を根拠にタスク開始前チェックリストを追加）を一度実装したが、根拠とした LIN-16・LIN-36 はいずれも `countermeasure: one-time`（一度限りの環境問題・構造的改善不要）と分類済みだった。追加の根拠がない状態で AGENTS.md を変更することは、countermeasure 分類と矛盾する。

### 決定事項

1. **追加したチェックリストを削除** — `one-time` 分類と矛盾するため。
2. **プランの提案1を「取消」として記録** — 根拠 issue の countermeasure を確認してから提案を作るべきだったという教訓。

---

## 2. has_real_failures メトリクス計算の改善

### 問題

`multica_sync.py` の `has_failures` は「failed run が1件でもある」で計算され、platform-artifact・duplicate-trigger・quota-recovery（いずれも実装品質と無関係）を含む過大評価になっていた。

### 検討した選択肢

- `multica_sync.py` に `has_real_failures` を追加（採用）
- 別途分析スクリプトを作成（見送り）
- query 時にのみフィルタ（見送り）

### 決定事項

1. **`compute_has_real_failures(runs)` 関数を追加** — 3パターンを除外して計算する。
2. **duplicate-trigger 除外条件を「newer completed と同一 trigger」に限定** — 初期実装では older run も見ていたため LIN-43（genuine E2E failure）を誤除外していた。修正後 21/22 件が手動 insight と一致。
3. **LIN-45 の 1 件ミスマッチは許容** — 初回 null 失敗 + 後続 completed の構造は LIN-56 と区別不能。アルゴリズム限界として記録。

### 除外ロジック（runs は新しい順）

```
- platform-artifact: failed + null trigger + prev(older).status == completed
- duplicate-trigger: failed + newer(more recent).trigger == same AND newer.status == completed
- quota-recovery: failed + newer.trigger に ping/いかがです/how are you/作業できますか を含む
```

---

## 3. issue 記述テンプレートの作成

### 問題

LIN-22（spec-design-change）・LIN-46（spec-feature-addition）への対策として、Multica issue 作成時のテンプレートが必要。AGENTS.md よりも Multica 側の運用で解決すべき内容。

### 決定事項

1. **`doc/issue-template.md` を作成** — バグ修正・機能追加の2パターン。「インターフェース設計」「スコープ外」「完了の定義」を明示するフォーマット。
2. **「最初に設計案を示してから実装してください」を推奨パターンとして記載** — LIN-43 で実証済み。

## 変更されたファイル

- `.claude/skills/multica/scripts/multica_sync.py` — `compute_has_real_failures()` 追加、`_derived` と `index.json` に `has_real_failures` 追加
- `doc/issue-template.md` — 新規作成
- `AGENTS.md` — タスク開始前チェック追加→削除（最終的に変更なし）
- `multica-data/issue-insights/LIN-51.md` — countermeasure を `none` → `in-agents-md` に更新

## 未解決・持ち越し

- LIN-22・LIN-46: issue テンプレートを Multica 側の運用に組み込む（ユーザー側対応）
- LIN-45 の `has_real_failures` ミスマッチ: 許容済みだがメッセージログが読めるようになったら再確認
