# リグレッションと E2E 検証パターン

→ [[concepts/agent-patterns/index|Agent Patterns]] の一部

## 概要

テスト検証の不備と横断的変更によるリグレッション。`e2e-not-verified` は
AGENTS.md の更新（LIN-78）により現在は対策済み。

**該当 taxonomy**: `e2e-not-verified`, `regression-broad-change`

## バリエーション

### `e2e-not-verified` — E2E 未確認での PR 作成（対策済み）

**事例**: LIN-46, LIN-51, LIN-184

エージェントが E2E テストを実行せずに PR を作成し、後から「E2Eは通っていますか？」と
確認が必要になるパターン。LIN-46 がきっかけで LIN-78 でインフラ改善が行われた。

**現在の状況**: AGENTS.md に「E2Eテスト必須」が明記されており、対策済み。
Playwright 設定の `reuseExistingServer: true` で自動起動も対応済み。

### `regression-broad-change` — 横断的変更によるリグレッション

**事例**: LIN-51（enum 定義追加）, LIN-189（LIN-86 の emptyValue 変更が E2E テストに波及）

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

### `pr-skip` — 実装完了後の PR 作成忘れ

**事例**: LIN-172, LIN-175, LIN-184

エージェントがコード修正後のワークフローの最後で PR を作成せず、
人間に指摘されて初めて作成するパターン。AGENTS.md に「PR作成必須」のルールが
存在するにも関わらず再発しており、ルールの存在だけでは防げない。

**特徴**:
- 実装は正常に完了している（コード品質に問題はない）
- PR が存在しないため「done」にならない
- 人間が指摘すると即座に作成する（自覚はあるが行動に反映できない）

**対策案**: ワークフローの最後に「PR 作成チェック」を自動実行する仕組みが必要。
現在は SKILL の「PR 作成判断基準」に依存しており、判断基準だけでなく
ワークフローとして機械的にチェックする方法を検討すべき。

### `lint-fix-regression` — lint 修正 AI による機能破壊

**事例**: `9cc710b`（tabIndex 削除）、`1e7360f`（dialog セレクタ不一致）

lint 修正・リファクタリング・セマンティックHTML化を行う AI タスクが、E2E テストを実行せずに
マージされた結果、キーボード操作が全滅するパターン。

**具体的な破壊パターン**:

1. **`noNoninteractiveTabindex` "fix"**: Biome が `tabIndex={0}` を lint 違反として検出し、
   AI が "Unsafe fix: Remove" を採用。グリッドコンテナのキーボードフォーカスが失われ、
   Enter/F2/Ctrl+矢印 が全て動作しなくなった（15 件の E2E テスト失敗）
2. **セマンティックHTML化によるセレクタ不一致**: `<div role="dialog">` を `<dialog>` 要素に
   変換したため、E2E テストの `[role="dialog"]` CSS セレクタが一致しなくなった
   （`[role="..."]` は CSS 属性セレクタなので ARIA ロールを参照しない）

**対策**:
- `biome.json` の `overrides` で意図的な lint 例外を明示的に保護する
- E2E テストでは `page.locator('[role="..."]')` ではなく `page.getByRole('...')` を使う
  （ARIA ロールで照合するため DOM 構造変更に強い）
- **lint 修正・リファクタリング系タスクにも E2E テスト実行を必須とする**（AGENTS.md 追記推奨）

## インフラ改善による学習ループ

LIN-46 → 問題発見 → LIN-78（インフラ改善）→ AGENTS.md 更新 → 後続エージェントに伝達

これは [[concepts/agent-patterns/index]] のフィードバックループが正常に機能した好例。
