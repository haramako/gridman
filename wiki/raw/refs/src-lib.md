---
kind: ref
external_path: src/lib/
files:
  - columnTypeConfig.ts  # ColumnType ごとの設定オブジェクト（表示・編集・バリデーション）
  - enum-resolver.ts     # Enum 型カラムの選択肢解決ロジック
  - utils.ts             # 汎用ユーティリティ関数群
---

Gridman のユーティリティ・設定レイヤー。`columnTypeConfig.ts` が各カラム型の振る舞いを一元定義し、コンポーネントや domain 層から参照される。
