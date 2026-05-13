# wiki への src/ SSoT 追加と充足性評価

**日付**: 2026-05-14  
**関連ファイル**: `wiki/CLAUDE.md`, `wiki/wiki/index.md`, `wiki/raw/refs/src-*.md`, `wiki/wiki/summaries/src-*.md`

## 相談内容

既存の wiki には `src/fs/` と一部コンポーネントのポインタファイルしかなく、`src/stores/`・`src/domain/`・`src/types/`・`src/components/spreadsheet/`・`src/lib/` が未取り込みだった。これらを SSoT として追加する方法と、追加後の wiki の充足性を評価したい。

## 検討した選択肢

- **一括 ingest**（src/ ディレクトリ全体）→ コンテキスト肥大化のリスクがある
- **モジュール別 ingest**（5グループに分割）→ 採用。各グループ独立してサマリー生成可能
- **自動化（git hook など）**→ 今回は手動運用を選択。AGENTS.md への記述が実用的と判断

## 決定事項

1. **`raw/refs/src-*.md` ポインタファイルを 5 件作成** — 既存の `src-fs-adapters.md` と同形式。`external_path` で src ディレクトリを指し、ファイル一覧を YAML に列挙
2. **サマリーを AI が直接 src を読んで生成** — 外部ツールなしに `ingest` オペレーションとして実施
3. **wiki 更新タイミングは手動**（自動化なし）— AGENTS.md に「src 変更時は `/llm-wiki ingest` を実行する」と記載するだけで十分。git hook は過剰設計
4. **SSoT 維持ルールを `CLAUDE.md` に追記** — 3ステップの手順（ポインタ確認 → ingest → 概念ページ更新）を明記

## 変更されたファイル

- `wiki/raw/refs/src-stores.md` — 新規（src/stores/ ポインタ）
- `wiki/raw/refs/src-domain.md` — 新規（src/domain/ ポインタ）
- `wiki/raw/refs/src-spreadsheet.md` — 新規（src/components/spreadsheet/ ポインタ）
- `wiki/raw/refs/src-types.md` — 新規（src/types/ ポインタ）
- `wiki/raw/refs/src-lib.md` — 新規（src/lib/ ポインタ）
- `wiki/wiki/summaries/src-{stores,domain,spreadsheet,types,lib}.md` — 新規（各 200〜400 語サマリー）
- `wiki/wiki/concepts/architecture/Stores.md` 他 4 ページ — backlink 追加
- `wiki/wiki/index.md` — Summaries セクション 5 行追加
- `wiki/CLAUDE.md` — raw/ テーブル拡張 + SSoT 維持ルール追記

## wiki 充足性評価（追加後）

**十分にカバーされている:**
- フロントエンドのアーキテクチャ全体（ストア・ドメイン・コンポーネント・型）
- データモデル（schema.json / JSONL / ViewQuery）
- スプレッドシート操作詳細（セル編集・入力挙動・仮想スクロール）
- Undo/Redo・Auto Save・テスト戦略

**不足している（識別済み）:**
1. **バックエンド (Hono サーバー)** — `src/server/` の API ルート・コントラクトが未取り込み（最優先）
2. **機能追加レシピ** — 「新しい ColumnType を追加する手順」のような多ファイル横断チェックリスト
3. **既知の落とし穴集** — `adapter` がモジュールレベル変数、`json`/`text` 型の編集不可制限など（現在は summaries に散在）
4. **開発ワークフロー専用ページ** — ビルド→テスト→動作確認の流れ

## 未解決・持ち越し（第1フェーズ終了時）

~~- `src/server/` を ingest する（最優先）~~ → 完了
~~- `how-to/` を新設し「新機能追加の手順書」を書く~~ → 完了
~~- 「既知の落とし穴」を1ページにまとめる（Gotchas.md）~~ → 完了

---

## 追記: server/ ingest（同日）

**関連ファイル**: `wiki/raw/refs/server.md`, `wiki/wiki/summaries/server.md`, `wiki/wiki/entities/Hono.md`, `wiki/wiki/concepts/architecture/System_Overview.md`

`src/server/` が存在しないことが判明。バックエンドは `server/`（リポジトリルート直下）にあり、2ファイル構成:
- `server/index.ts` — ファイルベース（port 8080）
- `server/db-server.ts` — SQLite（port 8082、better-sqlite3）

既存の `Hono.md` / `System_Overview.md` が API 表面は網羅していたため、サマリーは実装詳細（2サーバー構成・PATCHマージアルゴリズム・ファイルパスフォールバック・db-server の deletedIds 非対応）に絞った。

変更ファイル:
- `wiki/raw/refs/server.md` — 新規ポインタ
- `wiki/wiki/summaries/server.md` — 新規サマリー
- `wiki/wiki/entities/Hono.md`, `System_Overview.md` — backlink 追加

---

## 追記: Gotchas.md・how-to/ 新設（同日）

**関連ファイル**: `wiki/wiki/concepts/Gotchas.md`, `wiki/wiki/concepts/how-to/index.md`, `wiki/wiki/concepts/how-to/Add_Column_Type.md`

### llm-wiki 流儀の明確化

`concepts/` 配下への直接ファイル作成について誤解があった。整理:

- **`ingest`**: 外部ソース（コード・ドキュメント）を取り込む → `raw/` 経由必須
- **`compile`**: 既存 wiki ページを横断して合成・整理する → `raw/` 不要、直接 `concepts/` に書いてよい

`Gotchas.md` と `how-to/` は既に取り込み済みの src-* サマリーを横断合成したものなので **compile オペレーション**として正当。

### `doc/discussion/` と `wiki/` の関係

「discussion を定期的に ingest すべきか？」という問いへの回答:

- `doc/discussion/` = 決定ログ（不変・履歴）
- `wiki/` = 現状スナップショット（常に最新）

定期 ingest は不要。議論から **コードベースの知識として残すべき洞察** が出たときだけ、wiki の該当ページに手動で反映する。ingest ではなく compile または直接編集。

### 作成ページ

- `Gotchas.md` — adapter 非リアクティブ・dirty フラグ区別・型ごとの編集制限など 8 項目
- `how-to/Add_Column_Type.md` — 5 ステップ手順書（変更ファイル順・チェックリスト・落とし穴）

## 未解決・持ち越し（最終）

- 開発ワークフロー専用ページ（ビルド→テスト→動作確認）は未作成（優先度低）
- `how-to/` に追加すべきレシピ候補: Add_View_Type, Add_Command（Undo/Redo 対応コマンド追加）
