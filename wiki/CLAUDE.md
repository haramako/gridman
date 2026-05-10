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

### concepts/
- Page_View.md
- View_Dialogs.md
- Schema_Editor.md
- Json_Editor.md
- Search.md
- Auto_Save_and_Draft.md
- Undo_Redo.md
- Testing.md

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

---

## オープンな調査課題

- LIN-71〜LIN-78: GitHub Issues で管理中のバグ/機能改善
- ~~`FileSystem Access API` 対応~~: → `FileSystem_Adapters.md` に記述済み
- ~~ページビュー (`PageView`) のアーキテクチャ~~: → `Page_View.md` に記述済み
- `syncDraftFromTab` の動作詳細（マルチタブ同期）が未ドキュメント

---

## raw/ ファイル一覧

| スラグ | 種類 | 内容 |
|--------|------|------|
| `doc-overview` | notes | 起動方法・ディレクトリ構成 |
| `doc-architecture` | notes | システム構成・ストア・データフロー |
| `doc-data-model` | notes | ファイル形式・型定義 |
| `doc-testing` | notes | テストの書き方・環境分離 |
| `doc-input-behavior` | notes | キーボード・マウス入力仕様 |
