# Summary: doc/overview（起動・開発環境）

**ソース**: `raw/notes/overview.md`

## 要点

Gridman の開発環境は **フロントエンド（Vite :5173）** と **バックエンド（Hono :8080）** を別々のターミナルで起動する二プロセス構成。

主な npm スクリプト:
- `npm run dev` — Vite 開発サーバー
- `npm run server` — Hono バックエンド
- `npm run dev:init` — `fixtures/sample` → `var/sample` コピー（初回のみ）
- `npm run test` / `test:e2e` — ユニットテスト / E2E テスト

ディレクトリ構成の要点:
- `src/` — React フロントエンド（pages / components / stores / domain / types）
- `server/` — Hono API サーバー
- `e2e/` / `tests/` — テストコード
- `fixtures/sample/` — サンプルデータのマスター（git 管理・変更しない）
- `var/` — 実行時データ（gitignore 済み）
- `doc/` — この wiki の元になったドキュメント

## 関連ページ

- [[concepts/architecture/System_Overview]] — システム構成の詳細
- [[concepts/Testing]] — テスト環境の分離と実行方法
