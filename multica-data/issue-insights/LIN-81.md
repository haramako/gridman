```json
{
  "identifier": "LIN-81",
  "title": "行削除がファイルに保存されない",
  "status": "todo",
  "run_count": 2,
  "total_tokens": 3650887,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": [],
  "patterns": [],
  "countermeasure": "one-time",
  "written_at": "2026-05-14"
}
```

# LIN-81: 行削除がファイルに保存されない

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | 初回アサイン（直接） |
| 2 | completed | 最新の main にリベースして PR を更新 |

## 観察

### Run 1: バグ修正の実装

`deleteRow` が削除した行 ID を追跡しておらず、`saveTable` が PATCH に `deletedIds` を含めなかったのが根本原因。5 ファイルを修正して対応：

- `project.store.ts` — `deletedRowIds` 状態を追加。`deleteRow` が ID を記録し、`saveTable` 時にサーバーへ渡してクリア
- `src/fs/adapter.ts` / `local-server.ts` / `file-system-access.ts` — `deletedIds` を受け取って削除処理
- `server/index.ts` — PATCH ハンドラーで `{ rows, deletedIds }` をパース（旧形式との後方互換あり）

Run 1 では PR は作成されず完了した。

### Run 2: リベースと PR 作成

Run 1 から約 6 日後、ユーザーのコメントで「最新の main にリベースして PR を更新」と依頼。コンフリクトなしでリベースし、全 110 テスト通過後に PR #34 を作成。

## 教訓

1. **初回 run で PR を作るかどうかは issue 文に明示する** — 今回は Run 1 で実装完了・Run 2 で PR 作成という 2 run 構成になった。PR 作成が求められる場合は issue に明記しておくと 1 run で済む。
2. **後方互換を持たせた API 変更** — PATCH ボディを旧形式（配列）と新形式（`{ rows, deletedIds }`）の両方に対応させた設計は、複数クライアントが混在しうる場合に有効なパターン。
