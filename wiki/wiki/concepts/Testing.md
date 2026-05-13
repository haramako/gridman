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

## E2E テストの現状カバレッジ（2026-05-13 時点）

現在の E2E テストはキーボード操作に偏っており、コア編集フローが未カバー。

| ファイル | カバー内容 |
|---------|-----------|
| `cell-keyboard.spec.ts` | Enter確定後の非自動編集（リグレッション） |
| `copy-paste.spec.ts` | Ctrl+C/V/X（単体・範囲） |
| `ctrl-arrow.spec.ts` | Ctrl+矢印ジャンプ（4方向） |
| `select-all.spec.ts` | Ctrl+A 全選択 |
| `page-view.spec.ts` | ページビュー作成・表示 |

### 追加すべき E2E テスト（優先度順）

**高: コアフロー（未カバー）**

| ファイル案 | 内容 |
|-----------|------|
| `cell-edit.spec.ts` | クリック選択 → Enter/F2 で編集 → Enter 確定・Esc キャンセル |
| `row-operations.spec.ts` | `+行追加` / `-行削除` ボタン |
| `save.spec.ts` | 編集 → Ctrl+S → リロード後も値が残っていること |
| `table-switch.spec.ts` | サイドバーで別テーブルをクリック → グリッドが切り替わる |

**中: カラム型**
- enum 型セル（セレクトドロップダウン）
- ref 型セル（参照先テーブルの行名が表示・選択できる）
- バリデーション違反（必須項目を空にして ⚠ 表示が出る）

**中: ビュー系**
- フィルタービュー作成・条件設定・結果確認
- ルックアップビュー作成・参照先列の展開表示

**低**
- テーブルフィルター（フィルター欄で行が絞られる）
- 全文検索（SearchPage）
- Undo/Redo（`commandHistory` シングルトンの E2E 検証）

### E2E テストデータの変更ルール

`var/e2e-test/` のスキーマ構造（カラム・型）に多数のテストが依存している。
新しいカラム型のテストが必要な場合は `var/e2e-test/` にカラムを追加し、
`e2e:reset` スクリプトでリセットできることを確認してから追加する。

---

## 関連

- [[entities/Vitest]] — テストランナー
- [[entities/Playwright]] — E2E テストフレームワーク
- [[concepts/Dev_Workflow]] — テスト実行コマンド一覧
