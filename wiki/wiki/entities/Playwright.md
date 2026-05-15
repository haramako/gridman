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

## webServer 設定の注意点

`playwright.config.ts` の `webServer` でサーバーを自動起動させる際の注意:

```ts
webServer: [
  { command: 'npx tsx server/index.ts', port: 8080, reuseExistingServer: true },
  { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
]
```

- **`tsx watch` は使わない** — watch モードは TTY なしのサブプロセスとして起動するとサイレントに停止する。Playwright webServer では `npx tsx server/index.ts`（watch なし）を使うこと
- **`port:` vs `url:`**: `port:` は TCP 疎通確認、`url:` は HTTP GET で確認。Vite のように HTTP レスポンスが必要なサーバーには `url:` を使う
- **コールドスタート対策**: Vite の初回コンパイルに時間がかかるため `timeout: 60000`（デフォルト 30s）に延長推奨

## テストセレクタのベストプラクティス

- **`getByRole('dialog')` を使う** — `page.locator('[role="dialog"]')` は CSS 属性セレクタなので、ネイティブ `<dialog>` 要素には一致しない。ARIA ロールで照合する `getByRole()` を使うと DOM 構造変更に強い
- **`getByLabel()`, `getByText()`, `getByRole()` を優先** — CSS セレクタより意図が明確で壊れにくい

## 関連

- [[concepts/Testing]] — テスト種類と使い分け、環境分離
- [[entities/Vitest]] — ユニット・コンポーネントテスト
