# 起動・開発環境

## 起動方法

```bash
npm install

# ターミナル1: フロントエンド (Vite, port 5173)
npm run dev

# ターミナル2: バックエンド (Hono, port 8080)
npm run server
```

ブラウザで `http://localhost:5173` を開く。
サンプルデータを使う場合は `npm run dev:init` で `var/sample` を作成し、そのパスを入力する。

## npm スクリプト一覧

| スクリプト | 内容 |
|---|---|
| `dev` | Vite 開発サーバー起動 |
| `server` | Hono バックエンド起動 |
| `build` | 本番ビルド（tsc + vite build） |
| `dev:init` | `fixtures/sample` → `var/sample` にコピー（初回のみ実行） |
| `dev:gen-dummy` | `var/dummy` にパフォーマンス用大量データを生成 |
| `test` | Vitest ユニット・コンポーネントテスト実行 |
| `test:watch` | Vitest ウォッチモード |
| `test:e2e` | Playwright E2E テスト実行 |
| `lint` | Biome でコードチェック |

## ディレクトリ構成

```
gridman/
├── src/
│   ├── pages/          # ページコンポーネント (HomePage, EditorPage, SearchPage)
│   ├── components/
│   │   ├── spreadsheet/    # グリッド・セル本体
│   │   ├── filter/         # フィルタービュー作成ダイアログ
│   │   ├── union/          # ユニオンビュー作成ダイアログ
│   │   ├── lookup/         # ルックアップビュー作成ダイアログ
│   │   ├── page/           # ページビュー・テンプレートダイアログ
│   │   └── editor/         # JSON エディターパネル
│   ├── stores/         # Zustand ストア (project / selection / view)
│   ├── domain/         # ドメインロジック (filter, validator, union, lookup, commands)
│   ├── fs/             # ファイルシステムアダプター
│   ├── lib/            # ユーティリティ (enum-resolver, cn)
│   ├── types/          # 型定義 (schema, row, view, page)
│   └── utils/          # 自動保存・ドラフト管理
├── server/             # Hono API サーバー
├── e2e/                # Playwright E2E テスト
├── tests/              # Vitest ユニット・コンポーネントテスト
├── fixtures/sample/    # サンプルデータのマスター (git 管理)
├── var/                # 実行時データ (gitignore)
│   ├── sample/         # 開発用作業フォルダ
│   └── e2e-test/       # E2E テスト専用（テスト実行時に自動リセット）
├── scripts/            # データ生成・リセットスクリプト
└── doc/                # このドキュメント
```
