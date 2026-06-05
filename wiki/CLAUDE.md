# CLAUDE.md — Gridman Wiki

## スコープ

**Gridman** — ゲーム開発用データ（敵・アイテム・スキルなど）をスプレッドシート形式で編集する Web アプリのコードベース wiki。

- 技術スタック: React + TypeScript (Vite), Hono (Node.js), Zustand, JSONL + JSON Schema
- 対象読者: このリポジトリに新しく入るエンジニア、機能追加・バグ修正を行う開発者

スコープ外: 一般的な React/TypeScript の説明、ゲームデータの中身（敵のステータス等）

---

## 命名規則

- wiki ページのファイル名: `PascalCase.md`（フォルダ内 index は `index.md`）
- 概念ページ: `wiki/concepts/<カテゴリ>/` 配下
- 実体ページ（ツール・ライブラリ等）: `wiki/entities/` 配下
- サマリーページ: `wiki/summaries/<source-slug>.md`
- ウィキリンク: `[[Page_Name]]` または `[[フォルダ/index|表示名]]`

---

## カテゴリ構成

```
concepts/
  architecture/   ← システム構成・ストア・データフロー・コンポーネント
  data-model/     ← ファイル形式・型定義・ビュークエリ
  spreadsheet/    ← グリッド・セル編集・入力挙動
  Auto_Save_and_Draft.md
  Undo_Redo.md
  Testing.md
entities/         ← Zustand, Hono, Vite, Vitest, Playwright など
summaries/        ← doc/ 各ファイルのサマリー
```

---

## 現在の記事一覧

### concepts/architecture/
- index.md
- System_Overview.md
- Stores.md
- Domain_Logic.md
- Component_Structure.md
- FileSystem_Adapters.md

### concepts/data-model/
- index.md
- Project_Format.md
- Schema_Definition.md
- Table_Data.md
- View_Queries.md

### concepts/spreadsheet/
- index.md
- Cell_Editing.md
- Input_Behavior.md

### concepts/agent-patterns/
- index.md
- Context_and_Cost.md
- Environment_Issues.md
- Platform_Artifacts.md
- Spec_Quality.md
- Regression_and_Testing.md
- Blocker_Reporting.md

### concepts/
- Page_View.md
- View_Dialogs.md
- Schema_Editor.md
- Json_Editor.md
- Search.md
- Auto_Save_and_Draft.md
- Undo_Redo.md
- Testing.md
- Gotchas.md
- Dev_Workflow.md

### concepts/how-to/
- index.md
- Add_Column_Type.md
- Add_Command.md
- Add_View_Type.md

### entities/
- Zustand.md
- Hono.md
- Vitest.md
- Playwright.md

### summaries/
- doc-overview.md
- doc-architecture.md
- doc-data-model.md
- doc-testing.md
- doc-input-behavior.md
- src-fs-adapters.md
- src-page-view.md
- src-view-dialogs.md
- src-schema-editor.md
- src-json-editor-search.md
- issue-insights.md
- doc-discussions.md

---

## オープンな調査課題

- ~~LIN-71〜LIN-79 + 17件~~: insight 作成済み（2026-05-12）、計 39件
- ~~LIN-57, LIN-72, LIN-83, LIN-136, LIN-169, LIN-171, LIN-172, LIN-175, LIN-180, LIN-181, LIN-182~~: insight 作成済み（2026-05-13）、計 50件
- ~~LIN-82, LIN-84, LIN-85, LIN-86, LIN-137, LIN-173, LIN-184, LIN-185, LIN-186, LIN-187, LIN-189~~: insight 作成済み（2026-05-15）、計 62件
- ~~LIN-174, LIN-176, LIN-177, LIN-179, LIN-188, LIN-190, LIN-191〜199, LIN-201~~: insight 作成済み（2026-05-18）、計 78件
- ~~LIN-202, LIN-203, LIN-204, LIN-205~~: insight 作成済み（2026-05-20）、計 82件
- ~~LIN-12, LIN-13, LIN-14, LIN-15, LIN-17, LIN-206, LIN-207, LIN-208, LIN-209, LIN-21, LIN-24, LIN-29, LIN-30, LIN-33~~: insight 作成済み（2026-06-05）、計 96件
- ~~`FileSystem Access API` 対応~~: → `FileSystem_Adapters.md` に記述済み
- ~~ページビュー (`PageView`) のアーキテクチャ~~: → `Page_View.md` に記述済み
- `syncDraftFromTab` の動作詳細（マルチタブ同期）が未ドキュメント
- **設計改善（2026-05-30 design-review）**: ~~① ColumnType 表示整形を `formatCellValue` に集約（PR #63）~~・~~② ViewQuery アイコンを `viewTypeConfig` に集約（PR #64）~~ 実装済。~~db-server PATCH 削除非対応~~ 削除で解消。~~project.store 責務分離~~ reactive/永続化/変更ヘルパに分離（PR #69）。**③ 編集ウィジェットの JSX レジストリ化は不採用**（可読性低下・繊細領域でリスク過大、価値は①で回収済み）。→ バックログ消化完了。`outputs/queries/2026-05-30-design-review.md`
- ~~LIN-22, LIN-46, LIN-171~~: `in-agents-md` に更新済み（2026-05-14）
- **LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79, LIN-191, LIN-193, LIN-194, LIN-195, LIN-196, LIN-197, LIN-198**: `countermeasure: none` — context-overload 系（計13件）。タイムアウト対策として「実装前にファイル数確認」の指示追加を検討
- **PR 作成忘れパターン**（LIN-172, LIN-175, LIN-184）: 新 taxonomy `pr-skip` として追跡。ワークフローの機械的チェックが必要
- **`quota-recovery` 16件に増加**: lint 修正タスク波での不要 ping が大幅増。完了後の ping 抑制の検討が必要

---

## raw/ ファイル一覧

| スラグ | 種類 | 内容 |
|--------|------|------|
| `doc-overview` | notes | 起動方法・ディレクトリ構成 |
| `doc-architecture` | notes | システム構成・ストア・データフロー |
| `doc-data-model` | notes | ファイル形式・型定義 |
| `doc-testing` | notes | テストの書き方・環境分離 |
| `doc-input-behavior` | notes | キーボード・マウス入力仕様 |
| `src-fs-adapters` | refs | `src/fs/` — FileSystemAdapter 戦略パターン（3実装） |
| `src-page-view` | refs | `src/components/page/` — PageView コンポーネント |
| `src-view-dialogs` | refs | `src/components/filter|lookup|union/` — ビュー作成 UI |
| `src-schema-editor` | refs | `src/components/schema/` — スキーマ編集ダイアログ |
| `src-json-editor-search` | refs | `src/components/editor/` + `src/pages/SearchPage.tsx` |
| `src-stores` | refs | `src/stores/` — Zustand ストア群（project / selection / view / commandHistory） |
| `src-domain` | refs | `src/domain/` — filter / lookup / union / commands / validator |
| `src-spreadsheet` | refs | `src/components/spreadsheet/` — グリッド・セル・仮想スクロール |
| `src-types` | refs | `src/types/` — ColumnType / ViewQuery / Row / ProjectConfig |
| `src-lib` | refs | `src/lib/` — columnTypeConfig ディスパッチテーブル・enum-resolver |
| `server` | refs | `server/` — Hono サーバー 2実装（ファイルベース / SQLite） |
| `doc-discussions` | refs | `doc/discussion/` — 設計判断ログ（14件、2026-05-12〜15） |

---

## src/ SSoT 維持ルール

`raw/refs/src-*.md` は `external_path` で実際の src ファイルを指すポインタ。src が変わったときの更新手順:

1. 変更があったモジュールの `raw/refs/src-XXX.md` を確認（ポインタなので変更不要なことが多い）
2. `/llm-wiki ingest src-XXX` でサマリーを再生成（`wiki/summaries/src-XXX.md` を上書き）
3. 影響する概念ページがあれば内容を確認・更新
