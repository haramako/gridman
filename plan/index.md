# ゲームデータ管理ツール 設計ドキュメント

## 概要

ゲーム開発時のデータ（敵・アイテム・スキルなど）をExcelの代替として管理するWebアプリ。
現行実装（CRA + Recoil + MUI）を全面的に作り直す。

## 要件

- Excelに似たインターフェース（導入しやすい）
- ローカルテキストファイルで永続化（git管理しやすい）
- ブラウザで動作（ローカル/Web両対応）
- ソフトバリデーション（違反値を拒否せず、強調表示しつつ正常値を保持）
- 行はユニークIDで管理、nameカラムで表示
- 構造化データカラム（JSON型）をセル内に持てる
- 複数ビュー（表形式・フィルター・ユニオン・ページ形式）
- テーブル横断検索

## 決定事項サマリー

| 領域 | 決定 |
|------|------|
| ファイル形式 | JSONL（1行1レコード）+ schema JSON |
| フロントエンド | Vite + React 18 + TypeScript |
| 状態管理 | Zustand |
| UI | Tailwind CSS + shadcn/ui |
| グリッド | react-window ベースカスタム実装 |
| バックエンド | Hono.js on Node.js |
| アーキテクチャ | SPA + ローカルサーバー（File System Access API はオプション）|
| テーブル内部構造 | `Map<rowId, Row>`。順序は `_order` フィールドで管理 |
| バリデーション | ソフトバリデーション（`_invalid` フィールドに違反値を保持、ファイルに永続化）|
| ビューシステム | 宣言的クエリ定義（Filter / Union / Lookup / Page）|
| ルックアップ編集 | 単純FK参照（1対1/多対1）のみ可。共有参照変更時は警告表示 |
| ページビューレイアウト | JSONテンプレート定義（GUI編集は Phase 3以降）|
| 複数ユーザー同時編集 | 対応しない。git のコミット・マージで解決 |
| 保存方式 | 差分保存（変更行のみ PATCH）|
| キーボードナビゲーション | 矢印/Home/End/Tab/Delete + Shift+矢印で矩形選択 |
| タイプ編集 | 非エディット状態で印字可能文字を押すとエディット開始（IMEオフのみ）|
| Undo/Redo 設計 | コマンドパターン（`CommandHistory` + `EditCellCommand`）|

詳細は各ドキュメントを参照:

- [tech-stack.md](./tech-stack.md) — 技術スタック
- [data-model.md](./data-model.md) — データモデル・ファイル形式
- [architecture.md](./architecture.md) — アーキテクチャ・ストア設計
- [view-system.md](./view-system.md) — ビューシステム
- [ui-layout.md](./ui-layout.md) — UI・画面設計
- [mvp.md](./mvp.md) — フェーズ別スコープ

---

## 将来対応予定（MVP外）

| 項目 | 想定フェーズ |
|------|------------|
| ファイルエクスポート（JSON / CSV） | Phase 4 |
| プロジェクト全体で共有する enum 定義 | Phase 2以降 |
| スキーマ編集 UI | Phase 4 |
| File System Access API 対応（サーバーなし・Chrome/Edge）| Phase 4 |
| DB バックエンドアダプター | Phase 4以降 |
| Undo / Redo（UI接続・Ctrl+Z/Y）| Phase 3（基盤は実装済み）|
| json 型カラムの専用エディター（サイドパネル）| Phase 3 |
| テーブル横断検索 | Phase 2 |
| ビュー定義の GUI 編集 | Phase 2 |
| ルックアップビュー経由の編集 | Phase 3 |
| ページ/カードビュー | Phase 3 |
| カラムのソート（ヘッダークリック）| Phase 4 |
| 列の表示/非表示切り替え | Phase 4 |

---

## 検討中（未決定）

- `ref` 型を `json` 型の中に含むケース（JSON オブジェクト内に FK 参照を持つ）
