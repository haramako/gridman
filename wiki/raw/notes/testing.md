# テスト

## テストの種類と使い分け

| 種類 | ツール | 対象 | 速度 |
|---|---|---|---|
| ユニットテスト | Vitest | ドメイン関数（純粋関数） | 速い |
| コンポーネントテスト | Vitest + RTL | React コンポーネント単体 | 速い |
| E2E テスト | Playwright | ブラウザ全体の動作 | 遅い・壊れやすい |

## 実行方法

```bash
npm run test          # ユニット + コンポーネント（全件）
npm run test:watch    # ウォッチモード（開発中に使う）
npm run test:coverage # カバレッジレポート生成

npm run test:e2e      # E2E テスト（サーバー自動起動）
npm run test:e2e:ui   # E2E テスト（ブラウザ表示あり、デバッグ用）
```

## テストファイルの場所

```
tests/
├── setup.ts                          # jest-dom マッチャー + afterEach cleanup
├── domain/
│   ├── validator.test.ts             # coerceToType / validateCell
│   ├── filter.test.ts                # applyFilter / applySort
│   ├── union.test.ts                 # applyUnion
│   └── commands.test.ts             # CommandHistory / EditCellCommand
└── components/
    ├── Cell.test.tsx                 # セル表示・編集・キーボード操作
    └── FilterViewDialog.test.tsx    # ダイアログ保存・条件構築・キーイベント

e2e/
├── cell-keyboard.spec.ts            # Enter キーの動作
├── copy-paste.spec.ts               # コピー＆ペースト
└── page-view.spec.ts                # ページビュー作成・表示
```

## ユニットテストの書き方

ドメイン関数は副作用がないので、そのまま呼び出してアサーションする。

```ts
// tests/domain/validator.test.ts
import { describe, expect, it } from 'vitest'
import { coerceToType } from '@/domain/validator'

describe('coerceToType', () => {
  it('整数文字列を数値に変換する', () => {
    expect(coerceToType('42', 'integer')).toBe(42)
  })
  it('空文字列は null を返す', () => {
    expect(coerceToType('', 'integer')).toBeNull()
  })
})
```

## コンポーネントテストの書き方

ストアや Context は `vi.mock` でモックし、RTL でレンダリングする。

```tsx
// @vitest-environment jsdom  ← ファイル先頭に必須
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Zustand ストアのモック
vi.mock('@/stores/project.store', () => ({ useProjectStore: vi.fn() }))
import { useProjectStore } from '@/stores/project.store'

beforeEach(() => {
  vi.mocked(useProjectStore).mockReturnValue({
    updateCell: vi.fn(),
    dirtyRowIds: new Map(),
  } as any)
})

it('ダブルクリックで編集モードになる', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)
  await user.dblClick(screen.getByRole('cell'))
  expect(screen.getByRole('textbox')).toBeInTheDocument()
})
```

`Cell` コンポーネントは `<table><tbody><tr>` でラップしないと DOM 警告が出る。

```tsx
render(
  <table><tbody><tr>
    <Cell row={row} col={col} ... />
  </tr></tbody></table>
)
```

## E2E テストの書き方

E2E テストは `var/e2e-test` を使う。`global-setup.ts` がテスト開始前に自動でリセットする。

```ts
import path from 'node:path'
const SAMPLE_PATH = path.resolve('var/e2e-test')  // ← 必ずこのパスを使う

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder(/パス/).fill(SAMPLE_PATH)
  await page.getByPlaceholder(/パス/).press('Enter')
  await page.waitForURL('**/editor**')
})
```

## 環境の分離

| フォルダ | 用途 | リセットタイミング |
|---|---|---|
| `fixtures/sample/` | サンプルデータのマスター | git 管理（変更しない） |
| `var/sample/` | 開発者の作業フォルダ | `npm run dev:init`（手動・初回のみ） |
| `var/e2e-test/` | E2E テスト専用 | `npm run test:e2e` のたびに自動リセット |

開発中に `npm run test:e2e` を実行しても `var/sample` は上書きされない。
