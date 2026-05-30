# Summary: server/

`server/` は Hono バックエンド **`index.ts`（ファイルベース）の 1 実装**。
ローカルファイルシステムに JSONL / JSON で読み書きし、ポート 8080 で動く（`npm run server`）。

> かつて存在した SQLite 実装（`db-server.ts` / 8082）は、フロントから到達不能な未配線コードだったため
> 2026-05-30 に削除した。

## ファイルパス フォールバック

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

## フロントエンドとの対応

`src/fs/local-server.ts` (`LocalServerAdapter`) が API クライアント:

- `readProjectConfig` → `GET /api/project?path=`
- `patchTable` → `PATCH /api/tables/:name?project=`（`{ rows, deletedIds }` 形式で送信）
- `readSchema` / `writeSchema` → `GET|PUT /api/schemas/:name`
- `listPageTemplates` / `readPageTemplate` / `writePageTemplate` / `deletePageTemplate`

## 関連

- [[entities/Hono]] — フレームワーク概要・エンドポイント一覧
- [[concepts/architecture/System_Overview]] — クライアント/サーバー全体図
- [[concepts/architecture/FileSystem_Adapters]] — adapter 戦略パターン（LocalServer / FileSystemAccessAPI）
- [[summaries/src-fs-adapters]] — adapter 実装の詳細
