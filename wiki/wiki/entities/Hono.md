# Hono

Cloudflare Workers / Node.js / Deno で動く超軽量 Web フレームワーク。Express に近い API を持つが、TypeScript ファーストで型安全なルーティングを提供する。

## Gridman での使い方

`server/` 配下で Hono アプリを起動し、ポート 8080 で REST API を提供する。

```ts
// server/index.ts（概略）
const app = new Hono()

app.get('/api/project', async (c) => { ... })
app.put('/api/project', async (c) => { ... })
app.get('/api/tables/:name', async (c) => { ... })
app.patch('/api/tables/:name', async (c) => { ... })

serve({ fetch: app.fetch, port: 8080 })
```

開発時は Vite の `/api` プロキシ設定 (`vite.config.ts`) により、フロントエンド（:5173）からのリクエストが自動的にバックエンド（:8080）に転送される。本番ビルドでは Hono サーバーが `/dist` の SPA 静的ファイルも配信する。

## エンドポイント一覧

| Method | Path | 内容 |
|--------|------|------|
| GET | `/api/project?path=...` | `project.json` 読み込み |
| PUT | `/api/project?path=...` | `project.json` 書き込み |
| GET | `/api/tables/:name?project=...` | JSONL テーブルデータ読み込み |
| PUT | `/api/tables/:name?project=...` | テーブル全置換 |
| PATCH | `/api/tables/:name?project=...` | 変更行のみマージ保存 |
| GET | `/api/schemas/:name?project=...` | スキーマ読み込み |
| GET/PUT/DELETE | `/api/page-templates/:name?project=...` | ページテンプレート CRUD |

## 関連

- [[concepts/architecture/System_Overview]] — クライアント/サーバー構成
- [[concepts/data-model/Project_Format]] — project.json の構造
