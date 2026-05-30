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
    - [[concepts/data-model/View_Queries]] — SelectQuery / UnionQuery / PageViewQuery / FilterExpr

### スプレッドシート
- [[concepts/spreadsheet/index|Spreadsheet]] — グリッドの構成と操作モデル
    - [[concepts/spreadsheet/Cell_Editing]] — セル編集フロー・dirty 追跡・commitEdit
    - [[concepts/spreadsheet/Input_Behavior]] — キーボード・マウス入力仕様と Excel との差異

### AIエージェントパターン
- [[concepts/agent-patterns/index|Agent Patterns]] — Multica issue ログから帰納したワークフローパターン
    - [[concepts/agent-patterns/Context_and_Cost]] — コンテキスト肥大化・高コスト（最多パターン、15件）
    - [[concepts/agent-patterns/Environment_Issues]] — 環境起因の再実行（5件）
    - [[concepts/agent-patterns/Platform_Artifacts]] — stale failed run・重複トリガー・quota-recovery（メトリクス歪み）
    - [[concepts/agent-patterns/Spec_Quality]] — 仕様不完全による再設計・インタラクションシナリオ手法
    - [[concepts/agent-patterns/Regression_and_Testing]] — リグレッションと E2E 検証（対策済み）
    - [[concepts/agent-patterns/Blocker_Reporting]] — タスク完了できない場合の構造化報告フォーマット

### 横断的概念
- [[concepts/Page_View]] — カード型ビュー・テンプレート定義・ウィジェット
- [[concepts/View_Dialogs]] — フィルター / ユニオン / ルックアップ ビュー作成ダイアログ
- [[concepts/Schema_Editor]] — スキーマ編集ダイアログ（Undo対象外）
- [[concepts/Json_Editor]] — json型カラム編集サイドパネル
- [[concepts/Search]] — 全テーブル横断検索ページ
- [[concepts/Auto_Save_and_Draft]] — localStorage ドラフト・マルチタブロック
- [[concepts/Undo_Redo]] — CommandHistory・EditCellCommand・CompositeCommand
- [[concepts/Testing]] — テスト種類・書き方・環境分離
- [[concepts/Gotchas]] — よくある落とし穴（8項目）
- [[concepts/Dev_Workflow]] — 起動・ビルド・テスト手順の早引き

### How-To — 機能追加レシピ
- [[concepts/how-to/index|How-To]] — レシピ一覧
    - [[concepts/how-to/Add_Column_Type]] — 新しい ColumnType を追加する
    - [[concepts/how-to/Add_Command]] — Undo/Redo 対応コマンドを追加する
    - [[concepts/how-to/Add_View_Type]] — 新しいビュー種別を追加する

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
- 2026-05-20 — [[summaries/issue-insights]] — Multica issue 実行ログ分析（82件・context-overload 15件, quota-recovery 16件, duplicate-trigger 4件）
- 2026-05-15 — [[summaries/doc-discussions]] — 設計判断ログ分析（11件・インタラクションシナリオ・大規模タスク停止基準・ブロッカー報告・query promote フロー）
- 2026-05-14 — [[summaries/src-stores]] — Zustand ストア群（project / selection / view / commandHistory）の実装詳細
- 2026-05-14 — [[summaries/src-domain]] — ドメインロジック（filter / lookup / union / commands / validator）の実装詳細
- 2026-05-14 — [[summaries/src-spreadsheet]] — スプレッドシート UI コンポーネント群（SpreadsheetView / Grid / Cell）の実装詳細
- 2026-05-14 — [[summaries/src-types]] — 型定義（ColumnType / ViewQuery / Row / ProjectConfig）の全体像
- 2026-05-14 — [[summaries/src-lib]] — columnTypeConfig による型ディスパッチテーブルとユーティリティ
- 2026-05-14 — [[summaries/server]] — Hono サーバー 2実装（ファイルベース / SQLite）・API 実装詳細

---

## Open Questions

- Q3: `syncDraftFromTab` のマルチタブ同期アルゴリズム詳細は？
- Q4: `countermeasure: none` issue 群（LIN-18, LIN-39, LIN-44, LIN-47, LIN-62, LIN-79 + lint波 LIN-191/193/194/195/196/197/198 = 計13件）— context-overload 対策として「実装前にファイル数確認」指示を issue テンプレートに追加すべきか？
- Q5: PR 作成忘れパターン（LIN-172, LIN-175, LIN-184）— AGENTS.md ルールに加え、ワークフローの機械的チェックをどう実装するか？
- Q6: `quota-recovery` 16件に増加 — lint修正タスク後の不要 ping 抑制策は？
