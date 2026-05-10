# Vitest

Vite ネイティブのテストランナー。Jest 互換 API を持つが設定が最小限で、`vite.config.ts` と統合される。Gridman ではユニットテストとコンポーネントテストに使用。

## Gridman での設定

```ts
// vite.config.ts の test セクション（概略）
test: {
  environment: 'node',      // デフォルト（ドメイン関数）
  setupFiles: ['tests/setup.ts'],
}
```

jsdom 環境が必要なコンポーネントテストはファイル先頭に `// @vitest-environment jsdom` を記述する。

## テスト実行

```bash
npm run test        # 全テスト実行
npm run test:watch  # ウォッチモード
```

## 関連

- [[concepts/Testing]] — テストの書き方・パターン全般
- [[entities/Playwright]] — E2E テストフレームワーク
