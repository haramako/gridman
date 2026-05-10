---
kind: ref
external_path: src/components/page/
files:
  - PageView.tsx           # テンプレートに従って1行をカード表示するコンポーネント
  - PageTemplateDialog.tsx # テンプレート作成・編集ダイアログ
external_path_types: src/types/page.ts  # PageTemplate / PageLayoutItem 型定義
---

Gridman のページビュー機能。スプレッドシートではなくカード形式で1行を表示・編集する。テンプレートで表示レイアウトを定義し、フィールドごとにウィジェット（テキスト・数値・チェックボックス等）を指定できる。
