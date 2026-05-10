# Architecture

Gridman は **React SPA (フロントエンド) + Hono (バックエンド)** の 2 層構成。データはローカルファイルシステム上の JSONL + JSON Schema ファイルとして保存される。

## サブページ

- [[System_Overview]] — システム全体像・API エンドポイント
- [[Stores]] — 3 つの Zustand ストア
- [[Domain_Logic]] — ビュー変換ロジック・バリデーション・コマンドパターン
- [[Component_Structure]] — コンポーネント階層と GridContext

## 関連

- [[concepts/data-model/index|Data Model]] — ファイル形式の詳細
- [[concepts/Auto_Save_and_Draft]] — localStorage ドラフトと書き込みロック
- [[concepts/Undo_Redo]] — コマンドパターンの実装
