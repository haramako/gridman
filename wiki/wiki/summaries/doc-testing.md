# Summary: doc/testing（テスト）

**ソース**: `raw/notes/testing.md`

## 要点

3 種類のテスト体制:
- **ユニットテスト** (Vitest): ドメイン関数（純粋関数）を直接呼び出し
- **コンポーネントテスト** (Vitest + RTL): Zustand ストアと GridContext を `vi.mock` でモック、`@vitest-environment jsdom` 指定必須
- **E2E テスト** (Playwright): `var/e2e-test/` を使用、テスト実行ごとに自動リセット

**環境分離**の要点: `npm run test:e2e` を実行しても開発用 `var/sample/` は上書きされない。

**コンポーネントテストの注意**: `Cell` コンポーネントは `<table><tbody><tr>` でラップしないと DOM 警告が出る。

## 関連ページ

- [[concepts/Testing]]
- [[entities/Vitest]]
- [[entities/Playwright]]
