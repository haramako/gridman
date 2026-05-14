# GitHub Actions で E2E テストは走らせられるか？

**クエリ日**: 2026-05-14

## 回答

**走らせられる。むしろ設定がほぼ CI 向きに出来上がっている。**

## 根拠

`playwright.config.ts` の `webServer` 設定で、両サーバーを Playwright が自動起動する：

```ts
webServer: [
  { command: 'npm run server', port: 8080, reuseExistingServer: true },
  { command: 'npm run dev',    url: 'http://localhost:5173', reuseExistingServer: true },
]
```

`global-setup.ts` で `npm run e2e:reset`（fixtures → var/e2e-test/ コピー）が自動実行される。
`headless: true` も既に設定済み。

つまり：
- 外部サービス・DBへの依存なし（ファイルベースサーバー）
- テストデータの自動初期化済み
- ブラウザ表示不要（headless）

## 最小の GitHub Actions 設定

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx tsc --noEmit
      - run: npm run test -- --run
      - run: npm run test:e2e
```

## 注意点

| 項目 | 内容 |
|------|------|
| Node.js バージョン | v18 では jsdom 非互換の failing test あり → **v20 推奨** |
| Playwright キャッシュ | `actions/cache` でブラウザをキャッシュすると高速化できる |
| E2E 実行時間 | ローカル測定なし（数十秒〜数分程度と予想）|

## 参照

- [[concepts/Testing]] — テスト種類・環境分離
- [[entities/Playwright]] — E2E テストフレームワーク
- [[outputs/queries/2026-05-14-ci-enforcement]] — CI 全体戦略
