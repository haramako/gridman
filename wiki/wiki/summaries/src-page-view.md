# Summary: src/components/page/（Page View）

**ソース**: `raw/refs/src-page-view.md` → `src/components/page/`

## 要点

スプレッドシートとは独立した **カード型ビュー**。`PageTemplate`（`*.page.json`）でレイアウトを定義し、1 行を `PageView` コンポーネントで表示・編集する。

**型の核心**:
- `PageLayoutItem` は `field | section` の再帰ユニオン型
- `field` は `widget` でウィジェット種別を指定（text/number/select/checkbox/table/tag-list/json）

**PageView コンポーネントの特徴**:
- `renderItem` が `section` を再帰処理
- `ref` / `ref[]` 型は参照先テーブルから表示名を引いて解決
- `totalRows > 1` のとき前後ナビゲーションヘッダーを表示
- `updateCell` 経由で更新 → Undo/Redo・ドラフト自動保存が通常通り動作

**PageTemplateDialog** でテンプレートを WYSIWYG 編集できる。カラム型から widget を自動推定。

## 関連ページ

- [[concepts/Page_View]]
- [[concepts/data-model/Project_Format]]
