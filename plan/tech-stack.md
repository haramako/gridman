# 技術スタック

## 全体構成

```
フロントエンド
  ├── Vite 5.x（ビルドツール）
  ├── React 18.x
  ├── TypeScript 5.x
  ├── Zustand（状態管理）
  ├── Tailwind CSS + shadcn/ui（UI）
  ├── react-window / @tanstack/virtual（仮想スクロール）
  └── React Router 6（ルーティング）

バックエンド
  └── Hono.js on Node.js / Bun

テスト
  ├── Vitest（ユニットテスト）
  └── Playwright（E2E、任意）

フォーマッター/Linter
  └── Biome（ESLint + Prettier 代替）
```

---

## 各選定の理由

### Vite + React + TypeScript
- CRA（Create React App）は 2023年以降メンテナンス停止。移行必須
- SSR 不要なシンプルな SPA に Next.js は過剰
- Vite はビルド・HMR が高速で設定が少ない

### Zustand
- Recoil は開発が事実上停止
- Redux Toolkit はボイラープレートが多くオーバーキル
- Zustand はシンプル・軽量・型安全で、Store 単位の設計がこのアプリに合う

### Tailwind CSS + shadcn/ui
- MUI はバンドルサイズが大きく、密度の高いスプレッドシート UI を作りにくい
- shadcn/ui はコンポーネントのソースコードをプロジェクトにコピーして使う（npm パッケージではない）ため完全カスタマイズ可能
- Radix UI ベースでアクセシビリティが堅牢
- 使用コンポーネント: `Input`, `Button`, `Tooltip`, `Dialog`, `DropdownMenu`, `Sheet`, `Tabs`

### react-window（カスタムグリッド）
- AG Grid / Handsontable は重い・ライセンス問題がある
- 現行資産を活用しつつ、完全制御できるカスタム実装を選択
- 将来的に `@tanstack/virtual` への移行を検討

### Hono.js
- 超軽量（12KB）、TypeScript ファースト
- Node.js / Bun 両対応
- Express 互換 API で学習コストが低い
