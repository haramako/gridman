# Testing

## テスト種類と使い分け

| 種類 | ツール | 対象 | 速度 |
|------|--------|------|------|
| ユニットテスト | Vitest | ドメイン関数（純粋関数） | 速い |
| コンポーネントテスト | Vitest + RTL | React コンポーネント単体 | 速い |
| E2E テスト | Playwright | ブラウザ全体の動作 | 遅い・壊れやすい |

## ファイル構成

```
tests/
├── setup.ts                          # jest-dom マッチャー + afterEach cleanup
├── tsconfig.json                     # @/* パス解決 + @testing-library/jest-dom 型
├── domain/
│   ├── validator.test.ts
│   ├── filter.test.ts
│   ├── union.test.ts
│   └── commands.test.ts
└── components/
    ├── Cell.test.tsx
    └── FilterViewDialog.test.tsx

e2e/
├── cell-keyboard.spec.ts
├── copy-paste.spec.ts
└── page-view.spec.ts
```

## コンポーネントテストのパターン

Zustand ストアと GridContext は `vi.mock` でモックする。

```tsx
// @vitest-environment jsdom  ← ファイル先頭に必須
vi.mock('@/stores/project.store', () => ({ useProjectStore: vi.fn() }))
vi.mock('@/stores/selection.store', () => ({ useSelectionStore: vi.fn() }))
vi.mock('@/components/spreadsheet/SpreadsheetGrid', () => ({ useGridContext: vi.fn() }))

beforeEach(() => {
  vi.mocked(useProjectStore).mockReturnValue({
    updateCell: vi.fn(),
    dirtyRowIds: new Map(),
    dirtyCellIds: new Map(),  // ← 追加済み
  } as any)
  vi.mocked(useGridContext).mockReturnValue({
    navigate: vi.fn(),
    focusContainer: vi.fn(),
    onCellMouseDown: vi.fn(),  // ← GridContext に追加済み
    selectionBounds: null,
    filteredRows: [],
    columns: [],
    readOnly: false,
  })
})
```

**注意**: `Cell` は `<table><tbody><tr>` でラップしないと DOM 警告が出る。

## 環境分離

| フォルダ | 用途 | リセットタイミング |
|----------|------|------------------|
| `fixtures/sample/` | サンプルデータマスター | git 管理（変更しない） |
| `var/sample/` | 開発者の作業フォルダ | `npm run dev:init`（手動・初回のみ） |
| `var/e2e-test/` | E2E テスト専用 | `npm run test:e2e` のたびに自動リセット |

`npm run test:e2e` を実行しても `var/sample` は上書きされない。

## VS Code での型エラー対策

`tests/tsconfig.json` を作成済み。`@/*` パス解決と `@testing-library/jest-dom` 型が有効になる。TypeScript エラーが出る場合は `Ctrl+Shift+P` → "TypeScript: Restart TS Server"。

## 関連

- [[entities/Vitest]] — テストランナー
- [[entities/Playwright]] — E2E テストフレームワーク
