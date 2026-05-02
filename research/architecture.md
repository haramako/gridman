# アーキテクチャ

## 全体構成

このアプリは3つの層に明確に分離されている。

```
┌─────────────────────────────────────────────────┐
│                   View Layer                     │
│   React コンポーネント群 (src/spreadsheet/, App) │
├─────────────────────────────────────────────────┤
│                  State Layer                     │
│   Recoil (グローバル) + useReducer (ローカル)    │
├─────────────────────────────────────────────────┤
│                  Data Layer                      │
│       Dataset / DataTable / DataCell             │
├─────────────────────────────────────────────────┤
│                 Persistence Layer                │
│         Express API + var/*.json                 │
└─────────────────────────────────────────────────┘
```

## レイヤー詳細

### View Layer
- Reactコンポーネントで構成
- UIの描画とユーザーインタラクションのみを担当
- データ取得・変換ロジックは持たない
- `TableContext`, `TableDispatcherContext` でコンポーネントツリー内にデータを配布

### State Layer
**グローバル状態 (Recoil)**
- アプリ全体で共有が必要なデータを管理
- `atom`: 単純な状態（ファイルパス、選択テーブル名、フィルター文字列）
- `selector`: 派生状態（datasetState, viewState）—自動的に依存関係を追跡して再計算

**ローカル状態 (useReducer)**
- SpreadSheetコンポーネント内のインタラクション状態
- カーソル位置、選択範囲、編集中セル、一時編集値
- Recoil → useReducer への一方向同期（`setTable` アクションで`ITable`を渡す）

### Data Layer
- TypeScriptクラスで実装された純粋なデータ操作層
- Reactに依存しない
- `Dataset`: データの正規化・管理（全行をGUIDで管理するMap）
- `DataTable`: フィルタリング後の表形式ビュー（`ITable` 実装）
- `DataCell`: 個別セルのアクセサ（`ICell` 実装）

### Persistence Layer
- `server.mjs` のExpressサーバーがJSONファイルの読み書きを提供
- フロントエンドからは `/api/files/:name` REST APIとして利用

## データフロー

```
JSONファイル (var/data.json)
    │ GET /api/files/:name
    ↓
createDataset() → loadDataset()
    ↓
Dataset (全行をMapで保持)
    │ dataset.selectAsTable(tableName, filterFunc)
    ↓
DataTable (ITable): フィルタ済み2Dグリッド
    │ TableContext でコンポーネントに配布
    ↓
SpreadSheet → Cell → Visualizer (表示)

ユーザー編集
    │ dispatch(setCellTempValue / setCellValue)
    ↓
useReducer → doSetCellValue()
    │ validator.validate(newValue)
    ↓
DataCell.value = coercedValue (または error をセット)
    │ saveDataset(dataset) → JSON
    ↓
PUT /api/files/:name → JSONファイルへ保存
```

## コンポーネント階層

```
RecoilRoot
└── RouterProvider
    └── App (Suspense)
        ├── 左サイドバー
        │   ├── TextField (ファイルパス入力)
        │   ├── Button (保存/読み込み)
        │   └── List (テーブル選択)
        ├── Outlet (React Router)
        │   └── TablePage
        │       ├── SpreadSheetFilter
        │       ├── Button (行追加/削除)
        │       └── AutoSizer
        │           └── SpreadSheet (useReducer)
        │               ├── VariableSizeList (列ヘッダー)
        │               │   └── HeadCell (×colNum)
        │               ├── VariableSizeList (行ヘッダー)
        │               │   └── RowHeadCell (×rowNum)
        │               ├── VariableSizeGrid (データセル)
        │               │   └── MakeCell → Cell (×rowNum×colNum)
        │               │       └── Visualizer (type別)
        │               ├── Portal → CellEditor (編集中のみ)
        │               └── Portal → SelectionRect (選択中のみ)
        └── DataView (右サイドバー)
```

## 状態の責務分離

| 状態 | 管理場所 | 永続化 |
|------|---------|--------|
| ファイルパス | Recoil atom | localStorage |
| 選択テーブル名 | Recoil atom | なし |
| フィルター文字列 | Recoil atom | なし |
| データセット (Dataset) | Recoil selector (非同期) | サーバーJSONファイル |
| テーブルビュー (ITable) | Recoil selector | なし（派生値） |
| カーソル位置 | useReducer state | なし |
| 選択範囲 | useReducer state | なし |
| 編集中セル位置 | useReducer state | なし |
| 一時編集値 | useReducer state | なし |

## 設計上の重要な判断

### 1. ImmutableではなくMutable Dataモデル
`DataCell.value = v` のように直接変更する設計。Reactの再レンダリングは `version` カウンターをキーとして制御する。Recoil/useReducerの不変性原則からは外れるが、大規模グリッドでのパフォーマンスを優先した設計と考えられる。

### 2. Context APIによるProps Drilling回避
`TableContext` と `TableDispatcherContext` の2つのContextを分離することで、データを読むだけのコンポーネント（`Cell`など）がdispatcher変更で再レンダリングされないようにしている。

### 3. Recoil ↔ useReducer の橋渡し
`viewState`（Recoil selector）が変わると `useEffect` で `dispatch(setTable(newTable))` を呼び出し、`useReducer` の状態を更新する。グローバル状態とローカル状態の同期ポイントはここだけ。

### 4. GUIDによる行同一性管理
行の追加・削除・並び替え時もGUIDで一意性を保証。フィルタリング後のインデックス変化に対して堅牢。`_order` フィールドで順序を管理（整数ではなく浮動小数点数的な隙間挿入が可能な設計）。
