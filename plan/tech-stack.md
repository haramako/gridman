# 技術スタック選定

## フロントエンドフレームワーク

### 選定: Vite + React + TypeScript

**現状のCRAからの移行が必要:**
Create React App (CRA) は2023年以降メンテナンス停止状態。Viteへの移行は必須。

**Next.jsは不採用:**
- SSRのメリットがない（データはローカルファイル）
- ファイルベースルーティングはこのアプリには過剰
- シンプルなSPAで十分

**Viteの利点:**
- ビルドが高速（CRAの10倍以上速い）
- HMRが高速
- 設定が少ない
- `vite-plugin-electron` でElectron化も将来検討できる

---

## 状態管理

### 選定: Zustand

| ライブラリ | 評価 | 理由 |
|----------|------|------|
| Recoil | ❌ | Meta内での開発が事実上停止 |
| Jotai | ○ | Recoilの後継、atom単位で細かい。複雑なビュー状態管理がやや煩雑 |
| **Zustand** | ✅ | シンプル・軽量・型安全。Store単位の設計がこのアプリに合う |
| TanStack Query | △ | サーバーデータfetchには良いが、ローカルファイル操作には過剰 |
| Redux Toolkit | ❌ | ボイラープレートが多い、オーバーキル |

**Zustandを選ぶ理由:**

```typescript
// シンプルなストア定義例
const useAppStore = create<AppState>((set, get) => ({
  project: null,
  openTable: null,
  activeView: null,
  selection: { cursor: null, range: null },

  loadProject: async (path) => { ... },
  saveTable: async (tableName) => { ... },
  setCursor: (pos) => set({ selection: { ...get().selection, cursor: pos } }),
}))
```

データ取得のキャッシュが必要な場面は **SWR** と組み合わせることも可。

---

## UIライブラリ

### 選定: Tailwind CSS + shadcn/ui

**MUIからの移行理由:**
- MUIは重い（バンドルサイズ大）
- Excelライクな密度のあるUIを実装しにくい
- shadcn/ui はコードをコピーして使うため完全カスタマイズ可能

**shadcn/uiの特徴:**
- Radix UI プリミティブ + Tailwind CSS で構成
- コンポーネントをプロジェクト内にコピーして使う（npmパッケージではない）
- アクセシビリティが高い（Radix UIの恩恵）
- 使うコンポーネント: `Table`, `Input`, `Button`, `Tooltip`, `Dialog`, `DropdownMenu`, `Sheet`, `Tabs`

**Tailwindを選ぶ理由:**
- スプレッドシートのような細かいスタイリングが容易
- CSS-in-JSより高速（ランタイムコストゼロ）

---

## スプレッドシートグリッド

### 選定: カスタム実装 (react-window 継続 + 改善)

| 選択肢 | 評価 | 理由 |
|--------|------|------|
| AG Grid Community | △ | 機能豊富だが重い（~400KB）、見た目のカスタマイズが難しい |
| TanStack Table | △ | ヘッドレスで柔軟だが、仮想スクロールは別途実装が必要 |
| Handsontable | ❌ | 商用ライセンスが高額 |
| **カスタム + react-window** | ✅ | 軽量・完全制御・既存資産を活用できる |

現在の実装をベースに以下を改善:
- **react-window** → **@tanstack/virtual** への移行を検討（より柔軟なvirtualizer）
- セル結合・フリーズ列などの追加機能を段階的に実装

---

## バックエンド

### 選定: Hono.js

**Honoを選ぶ理由:**
- 超軽量（12KB）
- Node.js / Bun / Deno / Cloudflare Workers など複数ランタイムで動く
- TypeScriptファースト
- Express互換のAPIで学習コストが低い

```typescript
// server.ts (Hono)
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/api/project', (c) => { ... })
app.get('/api/tables/:name', (c) => { ... })
app.put('/api/tables/:name', async (c) => { ... })

serve(app, (info) => console.log(`http://localhost:${info.port}`))
```

**ローカル専用の場合はFile System Access APIも選択肢:**
- サーバー不要でブラウザから直接ファイルシステムにアクセス
- Chrome/Edge対応（Firefoxは未対応）
- Progressive Enhancement: 対応ブラウザではサーバーなしで動作

---

## 技術スタック全体像

```
フロントエンド
  ├── Vite 5.x (ビルドツール)
  ├── React 18.x
  ├── TypeScript 5.x
  ├── Zustand (状態管理)
  ├── Tailwind CSS + shadcn/ui (UI)
  ├── react-window / @tanstack/virtual (仮想スクロール)
  └── React Router 6 (ルーティング)

バックエンド
  └── Hono.js on Node.js / Bun

テスト
  ├── Vitest (ユニットテスト、Viteと統合)
  └── Playwright (E2Eテスト、任意)

フォーマッター/Linter
  ├── Biome (ESLint + Prettier の代替、高速)
  └── または ESLint + Prettier (現状維持)
```

---

## 移行コスト概算

| 作業 | 規模 |
|------|------|
| CRA → Vite 移行 | 小（設定変更のみ） |
| Recoil → Zustand 移行 | 中（状態定義の書き直し） |
| MUI → Tailwind/shadcn 移行 | 大（全コンポーネントの置き換え） |
| Express → Hono 移行 | 小（API数が少ない） |

MUI → Tailwind の移行が最も工数がかかるが、UIを全面再設計する前提なら同時にやるのが効率的。
