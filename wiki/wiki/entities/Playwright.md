# Playwright

Microsoft 製の E2E テストフレームワーク。Chromium / Firefox / WebKit をヘッドレスで制御し、実際のブラウザ動作を検証する。

## Gridman での使い方

```bash
npm run test:e2e   # E2E テスト実行（var/e2e-test/ を自動リセット）
```

テストファイルは `e2e/` 配下:

```
e2e/
├── cell-keyboard.spec.ts   # キーボード操作の結合テスト
├── copy-paste.spec.ts      # Ctrl+C/V の動作
└── page-view.spec.ts       # ページビュー表示
```

各テスト実行前に `var/e2e-test/` フォルダが `fixtures/sample/` からリセットされる（`var/sample/` は上書きされない）。

## 関連

- [[concepts/Testing]] — テスト種類と使い分け、環境分離
- [[entities/Vitest]] — ユニット・コンポーネントテスト
