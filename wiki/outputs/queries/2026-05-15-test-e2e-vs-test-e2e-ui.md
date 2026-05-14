# Query: test:e2e と test:e2e:ui の違い・ui を使うタイミング

**Date**: 2026-05-15  
**Sources**: [[concepts/Dev_Workflow]], [[entities/Playwright]], [[concepts/Testing]]

## 回答

### コマンドの違い

[[concepts/Dev_Workflow]] に記載:

| コマンド | 動作 | 用途 |
|---------|------|------|
| `npm run test:e2e` | ヘッドレス（ブラウザ非表示） | CI・通常の合否確認 |
| `npm run test:e2e:ui` | ブラウザ表示あり | **デバッグ用** |

どちらも実行前に `npm run dev` + `npm run server` が起動している必要がある。
`var/e2e-test/` はどちらの実行でも自動リセットされる。

### UI モードを使うタイミング

wiki には「デバッグ用」とだけ記載されており、詳細は記述されていない。
Dev_Workflow.md の情報から推論できる使いどころ:

1. **新しい E2E テストを書くとき** — ステップごとのブラウザ状態を見ながら selector や操作を確認
2. **失敗テストの原因を調べるとき** — どのステップで失敗するか・なぜ要素が見つからないかを目視確認
3. **非自明な UI 挙動をデバッグするとき** — タイミング依存の問題（要素が出るタイミングなど）を観察

### wiki の不足点

[[entities/Playwright]] には `test:e2e:ui` への言及がない。
[[concepts/Testing]] も UI モードの具体的な使用シナリオを記載していない。

**改善案**: `Playwright.md` または `Testing.md` の E2E セクションに「UI モードの使い方」セクションを追加する。
