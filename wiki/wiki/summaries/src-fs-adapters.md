# Summary: src/fs/（FileSystem Adapters）

**ソース**: `raw/refs/src-fs-adapters.md` → `src/fs/`

## 要点

`FileSystemAdapter` インターフェースを共通口とした戦略パターン。3 実装を差し替えられる:

1. **`LocalServerAdapter`** — Hono REST API（`/api/*`）経由。デフォルト。`npm run server` 必須
2. **`FileSystemAccessAPIAdapter`** — ブラウザの File System Access API で直接ファイル操作。サーバー不要・Chrome/Edge のみ対応
3. **`DbServerAdapter`** — SQLite バックエンド（`:8082`）。`LocalServerAdapter` のドロップイン置き換え

インターフェースは `readProjectConfig` / `writeProjectConfig` / `readTable` / `patchTable` / `readSchema` / `writeSchema` / `readPageTemplate` 系の 10 メソッド。

`patchTable` の実装が実装ごとに異なる点に注意:
- `LocalServerAdapter` → サーバー側で PATCH マージ
- `FileSystemAccessAPIAdapter` → クライアント側で JSONL 全読み込み → マージ → 上書き

## 関連ページ

- [[concepts/architecture/FileSystem_Adapters]]
- [[concepts/architecture/System_Overview]]
