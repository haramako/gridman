---
kind: ref
external_path: src/domain/
files:
  - commands.ts    # Command パターン（Undo/Redo 用操作オブジェクト定義）
  - filter.ts      # Filter ビューの式評価ロジック
  - lookup.ts      # Lookup ビューの結合ロジック
  - union.ts       # Union ビューの結合ロジック
  - validator.ts   # セルデータのバリデーションルール
  - exportData.ts  # データエクスポート処理
---

Gridman のビジネスロジック・ドメイン層。UI やストアに依存せず、ビュー演算（filter/lookup/union）・コマンドパターン・バリデーション・エクスポートを純粋関数として実装する。
