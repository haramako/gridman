# Index — Gridman

> ゲーム開発用データをスプレッドシート形式で編集する Web アプリのコードベース wiki。

## 🔖 Navigation
- [[#Concepts]] · [[#Entities]] · [[#Summaries]] · [[#Open Questions]]

---

## Concepts

### アーキテクチャ
- [[concepts/architecture/index|Architecture]] — システム全体像・フロントエンド/バックエンド/データフロー
    - [[concepts/architecture/System_Overview]] — React SPA + Hono の構成と API エンドポイント
    - [[concepts/architecture/Stores]] — 3 つの Zustand ストア（project / selection / view）
    - [[concepts/architecture/Domain_Logic]] — filter / union / lookup / validator / commands
    - [[concepts/architecture/Component_Structure]] — コンポーネント階層と GridContext
    - [[concepts/architecture/FileSystem_Adapters]] — LocalServer / FileSystemAccessAPI / DbServer の戦略パターン

### データモデル
- [[concepts/data-model/index|Data Model]] — プロジェクトフォルダ構造・ファイル形式
    - [[concepts/data-model/Project_Format]] — project.json の構造
    - [[concepts/data-model/Schema_Definition]] — *.schema.json・カラム型一覧
    - [[concepts/data-model/Table_Data]] — *.jsonl・内部フィールド（_id, _order, _invalid）
    - [[concepts/data-model/View_Queries]] — FilterViewQuery / UnionViewQuery / LookupViewQuery / FilterExpr

### スプレッドシート
- [[concepts/spreadsheet/index|Spreadsheet]] — グリッドの構成と操作モデル
    - [[concepts/spreadsheet/Cell_Editing]] — セル編集フロー・dirty 追跡・commitEdit
    - [[concepts/spreadsheet/Input_Behavior]] — キーボード・マウス入力仕様と Excel との差異

### 横断的概念
- [[concepts/Page_View]] — カード型ビュー・テンプレート定義・ウィジェット
- [[concepts/View_Dialogs]] — フィルター / ユニオン / ルックアップ ビュー作成ダイアログ
- [[concepts/Schema_Editor]] — スキーマ編集ダイアログ（Undo対象外）
- [[concepts/Json_Editor]] — json型カラム編集サイドパネル
- [[concepts/Search]] — 全テーブル横断検索ページ
- [[concepts/Auto_Save_and_Draft]] — localStorage ドラフト・マルチタブロック
- [[concepts/Undo_Redo]] — CommandHistory・EditCellCommand・CompositeCommand
- [[concepts/Testing]] — テスト種類・書き方・環境分離

---

## Entities

- [[entities/Zustand]] — 状態管理ライブラリ（3 ストア体制）
- [[entities/Hono]] — バックエンド Web フレームワーク（REST API）
- [[entities/Vitest]] — ユニット・コンポーネントテストランナー
- [[entities/Playwright]] — E2E テストフレームワーク

---

## Summaries (ingest 順)

- 2026-05-11 — [[summaries/doc-overview]] — 起動方法・ディレクトリ構成
- 2026-05-11 — [[summaries/doc-architecture]] — システム構成・ストア・データフロー
- 2026-05-11 — [[summaries/doc-data-model]] — ファイル形式・型定義
- 2026-05-11 — [[summaries/doc-testing]] — テストの書き方・環境分離
- 2026-05-11 — [[summaries/doc-input-behavior]] — キーボード・マウス入力仕様
- 2026-05-11 — [[summaries/src-fs-adapters]] — FileSystemAdapter 戦略パターン（3実装）
- 2026-05-11 — [[summaries/src-page-view]] — PageView コンポーネントとテンプレート定義
- 2026-05-11 — [[summaries/src-view-dialogs]] — フィルター/ユニオン/ルックアップ ビュー作成 UI
- 2026-05-11 — [[summaries/src-schema-editor]] — スキーマ編集ダイアログ
- 2026-05-11 — [[summaries/src-json-editor-search]] — JsonEditorPanel + SearchPage

---

## Open Questions

- Q1: FileSystem Access API 対応（サーバーなし版）のアーキテクチャ詳細は？
- Q2: `PageView` コンポーネントの設計と `*.page.json` テンプレートの詳細は？
- Q3: `syncDraftFromTab` のマルチタブ同期アルゴリズム詳細は？
- Q4: LIN-73 (Ctrl+X Undo 粒度) の修正方針は？
