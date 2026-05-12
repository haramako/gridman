# リグレッションと E2E 検証パターン

→ [[concepts/agent-patterns/index|Agent Patterns]] の一部

## 概要

テスト検証の不備と横断的変更によるリグレッション。`e2e-not-verified` は
AGENTS.md の更新（LIN-78）により現在は対策済み。

**該当 taxonomy**: `e2e-not-verified`, `regression-broad-change`

## バリエーション

### `e2e-not-verified` — E2E 未確認での PR 作成（対策済み）

**事例**: LIN-46, LIN-51

エージェントが E2E テストを実行せずに PR を作成し、後から「E2Eは通っていますか？」と
確認が必要になるパターン。LIN-46 がきっかけで LIN-78 でインフラ改善が行われた。

**現在の状況**: AGENTS.md に「E2Eテスト必須」が明記されており、対策済み。
Playwright 設定の `reuseExistingServer: true` で自動起動も対応済み。

### `regression-broad-change` — 横断的変更によるリグレッション

**事例**: LIN-51（enum 定義追加でスプレッドシート表示が壊れた）

ストアやデータモデルに広範囲に影響する変更（enum 定義、共有型の変更など）で
既存機能が意図せず壊れるパターン。E2E テストで検出できる。

## 対策

**E2E テスト検証**（AGENTS.md に記載済み）:
```bash
npm run test:e2e
```
PR 作成前に必ず実行すること。

**横断的変更時の指示パターン**:
> この変更が影響するコンポーネントをリストアップしてから実装してください

影響範囲を事前に把握することで、見落としによるリグレッションを防げる。

## インフラ改善による学習ループ

LIN-46 → 問題発見 → LIN-78（インフラ改善）→ AGENTS.md 更新 → 後続エージェントに伝達

これは [[concepts/agent-patterns/index]] のフィードバックループが正常に機能した好例。
