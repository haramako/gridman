# Page View

スプレッドシートとは別の表示モード。1 行のデータを **カード形式** で表示・編集する。テンプレートでレイアウトを自由に定義でき、フィールドごとにウィジェットを選択できる。

## 型定義 (`src/types/page.ts`)

```ts
type PageLayoutWidget = 'text' | 'number' | 'select' | 'checkbox' | 'table' | 'tag-list' | 'json';

type PageLayoutItem =
  | { type: 'field'; key: string; label?: string; widget: PageLayoutWidget; columns?: string[] }
  | { type: 'section'; label?: string; children: PageLayoutItem[] };

type PageTemplate = {
  name: string;
  table: string;
  layout: PageLayoutItem[];
};
```

- `PageLayoutItem` は再帰的 — `section` の `children` に `field` や別の `section` をネストできる
- `columns` は `widget: 'table'` のときに表示するカラム一覧を指定

## ウィジェット一覧

| ウィジェット | 用途 | 列型との対応 |
|---|---|---|
| `text` | テキスト入力 | `string`, `text` |
| `number` | 数値入力 | `integer`, `number` |
| `select` | セレクトボックス | `enum` |
| `checkbox` | チェックボックス | `boolean` |
| `table` | ネスト JSON のテーブル表示 | `json` (配列) |
| `tag-list` | 参照配列をタグ表示 | `ref[]` |
| `json` | JSON を `<pre>` で表示 | `json` |

## PageView コンポーネント

`src/components/page/PageView.tsx`。テンプレート + 1 行のデータを受け取り、レイアウトに従ってフィールドをレンダリングする。

```mermaid
flowchart TD
    Template[PageTemplate\nlayout: PageLayoutItem[]]
    Row[Row データ]
    PV[PageView]
    Nav[ナビゲーションヘッダー\n前へ / 次へ]
    Section[section → 再帰レンダリング]
    Field[field → renderField\nウィジェット選択]

    Template --> PV
    Row --> PV
    PV --> Nav
    PV --> Section
    PV --> Field
```

- **`renderItem`** — `section` は再帰、`field` は `renderField` に委譲
- **`renderField`** — ウィジェット型に応じて input/select/checkbox/pre 等を返す
- **ナビゲーション** — `totalRows > 1` のとき「前へ / 次へ」ボタンを表示
- **`ref` 型の表示** — `isDisplayName` カラムを参照テーブルから引いて名前を表示
- **バリデーション** — `row._invalid[col.key]` があれば赤枠で表示

セル編集と同じく `updateCell` で値を更新するので Undo/Redo・ドラフト自動保存が動作する。

## PageTemplateDialog

`src/components/page/PageTemplateDialog.tsx`。テンプレートの作成・編集 UI。

- テーブルを選択するとレイアウトがリセット（スキーマが変わるため）
- フィールド追加時にカラム型から `widget` を自動推定
- セクション内にフィールドをネストして追加可能
- 保存は `*.page.json` としてプロジェクトフォルダに書き込み（`FileSystemAdapter.writePageTemplate`）

## テンプレートの保存場所

`*.page.json` ファイルとしてプロジェクトフォルダに保存される。`loadProject` 時に `listPageTemplates` → `readPageTemplate` で全テンプレートを読み込む。

## 関連

- [[concepts/data-model/Project_Format]] — ページテンプレートの JSON 形式
- [[concepts/architecture/FileSystem_Adapters]] — テンプレートの読み書き先
- [[concepts/architecture/Component_Structure]] — EditorPage 内での PageView の位置
