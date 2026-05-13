# Summary: server/

`server/` ディレクトリには Hono バックエンドの **2つの実装**が共存する。

## 2 サーバー実装

| | `index.ts` | `db-server.ts` |
|-|-----------|----------------|
| ストレージ | ローカルファイルシステム（JSONL / JSON） | SQLite（`better-sqlite3`） |
| ポート | 8080 | 8082 |
| 用途 | 通常の開発・本番 | 複数プロジェクトを DB で管理したいケース |

`db-server.ts` の SQLite スキーマ:
```sql
project_configs (project_path PK, config TEXT)
table_rows      (project_path, table_name, row_id PK, row_order REAL, data TEXT)
schemas         (project_path, table_name PK, schema TEXT)
page_templates  (project_path, name PK, template TEXT)
```

## ファイルパス フォールバック（index.ts のみ）

`project.json` と `*.page.json` は 2 箇所を順に試す:

```
{projectPath}/project.json           ← 優先
{projectPath}/.spreadsheet/project.json  ← フォールバック
```

書き込み時も同様に既存ファイルの場所を継承する。

## PATCH テーブルのマージアルゴリズム

`PATCH /api/tables/:name` のボディは `{ rows: Row[], deletedIds: string[] }`:

1. 既存 JSONL を読み込み (`existing`)
2. `deletedIds` に一致する行を除外
3. `updated` の `_id` で既存行を上書き; 新規 `_id` なら末尾に追加
4. `_order` で昇順ソートして JSONL に書き直す

**注意**: `db-server.ts` の PATCH は upsert のみで `deletedIds` 処理がない（file サーバーと挙動差異あり）。

## フロントエンドとの対応

`src/fs/local-server.ts` (`LocalServerAdapter`) が唯一の API クライアント:

- `readProjectConfig` → `GET /api/project?path=`
- `patchTable` → `PATCH /api/tables/:name?project=`（`{ rows, deletedIds }` 形式で送信）
- `readSchema` / `writeSchema` → `GET|PUT /api/schemas/:name`
- `listPageTemplates` / `readPageTemplate` / `writePageTemplate` / `deletePageTemplate`

`DbServerAdapter` (`src/fs/db-adapter.ts`) は同じインタフェースを実装し、db-server の API を呼ぶ。

## 関連

- [[entities/Hono]] — フレームワーク概要・エンドポイント一覧
- [[concepts/architecture/System_Overview]] — クライアント/サーバー全体図
- [[concepts/architecture/FileSystem_Adapters]] — adapter 戦略パターン（LocalServer / DbServer / FileSystemAccessAPI）
- [[summaries/src-fs-adapters]] — adapter 実装の詳細
