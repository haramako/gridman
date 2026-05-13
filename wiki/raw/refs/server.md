---
kind: ref
external_path: server/
files:
  - index.ts       # ファイルベースサーバー（port 8080）
  - db-server.ts   # SQLite サーバー（port 8082、better-sqlite3）
---

Gridman のバックエンド Hono サーバー。2 実装が存在する。
`src/fs/local-server.ts` がフロントエンド側の API クライアント実装。
