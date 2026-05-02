# テックスタック

## フロントエンド

### React 18.2.0
- UIフレームワーク
- `React.memo` による不要な再レンダリング抑制
- `createPortal` でセルエディタ・選択矩形をDOMツリーの外に描画
- `Suspense` によるデータ取得中のローディング制御

### TypeScript 4.7.4
- 全ソースコードに適用
- `ICell`, `ITable`, `IHeader` などのインターフェース定義で型安全を確保
- Private class fields (`#data`, `#key`) を使用

### React Router 6.4.0
- `createBrowserRouter` による宣言的ルーティング
- ルート: `/` (App) と `/view/:view` (TablePage)
- `loader` 関数でルート移動前のデータプリフェッチが可能な構造

### Recoil 0.7.5
- Facebookが開発したReact向け状態管理ライブラリ
- atom/selectorによる宣言的状態グラフ
- 非同期selector (`get: async`) でAPIからのデータロードを宣言的に記述
- `recoil-persist` プラグインで `dataPathState` をlocalStorageに永続化

### Material-UI (MUI) 5.10.6
- UIコンポーネントライブラリ
- `@emotion/react`, `@emotion/styled` をCSS-in-JSエンジンとして使用
- 使用コンポーネント: `Button`, `TextField`, `List`, `ListItemButton`, `Tooltip`, `Checkbox`

### react-window 1.8.7
- 大規模リストの仮想スクロールライブラリ
- `VariableSizeGrid`: データセル部分の仮想化（可変行高・列幅対応）
- `VariableSizeList`: 列ヘッダー・行ヘッダーの仮想化
- `react-virtualized-auto-sizer 1.0.7`: 親要素のサイズに自動追従させるラッパー

## バックエンド

### Express.js 4.18.1 (devDependency)
- 開発・本番共用の軽量APIサーバー
- 2エンドポイントのみ: `GET /api/files/:name`, `PUT /api/files/:name`
- `body-parser` でPUTリクエストのテキストボディを解析
- ビルド済みReactアプリも `express.static('build')` で配信

### nodemon 2.0.20
- `server.mjs` のホットリロード用

## ユーティリティライブラリ

| ライブラリ | バージョン | 用途 |
|------------|-----------|------|
| `shallow-equals` | 1.0.0 | SelectionRectで選択範囲変化のshallow比較 |
| `string-hash` | 1.1.3 | 列キー文字列を数値ハッシュ化してGUID生成に利用 |
| `tsv-json` | 2.0.0 | TSV形式対応の準備（現在は未使用と思われる） |
| `web-vitals` | 2.1.4 | CRAデフォルトのパフォーマンス計測用 |

## 開発ツール

### Prettier 2.7.1
- コードフォーマッター
- Husky + lint-staged との組み合わせでコミット前に自動実行

### Husky 8.0.1 + lint-staged 13.0.3
- pre-commitフックでPrettierを自動実行
- コードスタイルを一貫して維持

### Create React App (react-scripts 5.0.1)
- Webpack, Babel, ESLint, Jest を内包したビルドシステム
- `"proxy": "http://localhost:8080"` 設定で開発時のAPI呼び出しをExpressにプロキシ

## 依存関係マップ

```
React (UI)
  ├── React Router (ルーティング)
  ├── Recoil (グローバル状態)
  │   └── recoil-persist (localStorage永続化)
  ├── Material-UI (UIコンポーネント)
  │   └── Emotion (CSS-in-JS)
  ├── react-window (仮想スクロール)
  │   └── react-virtualized-auto-sizer (サイズ自動計測)
  └── useReducer (ローカル状態)

データ層 (TypeScript classes)
  ├── Dataset (行・テーブル管理)
  ├── DataTable (ITable実装)
  ├── DataCell (ICell実装)
  └── string-hash (GUID生成)

バックエンド
  └── Express (JSON read/write API)
```
