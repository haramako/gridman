# src-lib — ユーティリティ・設定レイヤー

> ソース: [[raw/refs/src-lib]] (`src/lib/`)

コンポーネントとドメイン層の両方から参照される横断的なユーティリティ。3 ファイル構成。

---

## columnTypeConfig.ts — 型ディスパッチテーブル

Gridman の最重要設定ファイルの一つ。10 種類の `ColumnType` それぞれについて、UI 動作を一元定義する。

```ts
type ColumnTypeConfig = {
  icon: string               // UI 表示アイコン
  defaultWidth: number       // グリッドの初期列幅（px）
  filterOps: readonly string[] // 使用可能なフィルター演算子
  filterValueWidget: 'text' | 'enum' | 'boolean'  // フィルター値入力ウィジェット
  defaultWidget: PageLayoutWidget  // ページビューでのデフォルトウィジェット
  emptyValue: '' | 0         // 新規行での初期値
  gridReadonly: boolean      // グリッド上で編集不可か（json, text は true）
  supportsKbdEdit: boolean   // Enterキーで編集開始できるか
  supportsTypeToEdit: boolean // 文字入力で編集開始できるか
  hasEnumValues: boolean     // enumValues / enumRef を持つか
  hasRefTable: boolean       // refTable を持つか
  validationGroup: 'number' | 'string' | 'other'
}
```

**主要な定数**:
- `COLUMN_TYPE_CONFIG: Record<ColumnType, ColumnTypeConfig>` — 全型の設定テーブル
- `COLUMN_TYPE_OPTIONS` — スキーマ編集 UI 向けの `{value, label}[]`

**設計の意図**: カラム型ごとの `if/switch` 分岐をコンポーネント各所に散らさず、この 1 ファイルに集約する。型に新しい動作プロパティを追加する場合はここだけ変更すれば済む。

**注目点**:
- `json`・`text` 型は `gridReadonly: true`（グリッドでは編集不可。別 UI を使う）
- `boolean` は `supportsKbdEdit: false`（Enter キー編集非対応、クリックのみ）
- `ref`・`ref[]` は `supportsTypeToEdit: false`（select ボックスなので type-to-edit 不可）

---

## enum-resolver.ts

`enum` 型カラムの選択肢を解決するユーティリティ。`enumValues`（スキーマ内定義）と `enumRef`（project.json の共有 enum 参照）の両方を処理し、実際の選択肢文字列配列を返す。

---

## utils.ts

汎用ユーティリティ関数群。文字列操作・型ガード・その他の共通処理を提供する。

---

## 関連

- [[concepts/data-model/Schema_Definition]] — ColumnType と ColumnDef の型定義
- [[summaries/src-types]] — ColumnType の型定義本体
- [[concepts/architecture/Component_Structure]] — columnTypeConfig を参照するコンポーネント
