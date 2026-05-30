---
kind: ref
external_path: src/fs/
files:
  - adapter.ts          # FileSystemAdapter インターフェース
  - local-server.ts     # LocalServerAdapter（Hono REST API 経由）
  - file-system-access.ts  # FileSystemAccessAPIAdapter（ブラウザ直接アクセス）
---

Gridman のファイルアクセス戦略パターン。`FileSystemAdapter` インターフェースを共通口として、2 種類の実装を差し替えられる設計。
