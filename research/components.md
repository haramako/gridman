# コンポーネント詳細

## App.tsx

アプリケーションのルートコンポーネント。レイアウト全体の管理とデータのロード/セーブを担当する。

**使用Recoil状態:**
- `dataPathState`: ファイルパスの読み書き
- `viewLinksState`: テーブル一覧の取得（非同期selector）
- `selectedViewLinkState`: 現在選択中のテーブル名

**主要な関数:**
```typescript
onSaveClick(): void
// saveDataset(dataset) でDatasetをJSON化
// fetch PUT /api/files/:path でサーバーに保存

onLoadClick(): void
// dataPathState を更新 → datasetState が自動再取得

onViewClick(name: string): void
// selectedViewLinkState を更新 → viewState が再計算
// navigate('/view/' + name) でルーティング
```

**レイアウト:** CSS Gridで3列（200px | 1fr | 240px）

---

## TablePage.tsx

テーブル表示ページ。フィルター・行操作UIとSpreadSheetを統合する。

**使用Recoil状態:**
- `viewState`: 表示するITable（非同期selector）
- `datasetState`: 行追加/削除の操作対象
- `filterState`: フィルタ文字列・バージョン
- `datasetVersionState`: Dataset再取得トリガー
- `selectionState`: 選択行の特定（削除時）

**行追加ロジック:**
```typescript
onAddRowClick():
1. selection から選択行数 N を計算
2. selection の最終行の _order から次の行の順序値を計算
3. N 個の空行を生成し dataset.insert() で挿入
4. datasetVersionState と filterState.version をインクリメント
```

**行削除ロジック:**
```typescript
onRemoveRowClick():
1. selection の各行の guid を取得
2. dataset.removeRow(guid) で削除
3. datasetVersionState と filterState.version をインクリメント
```

---

## SpreadSheet.tsx

アプリのコアコンポーネント。仮想スクロール・セル選択・編集を統合管理する。

### Props
```typescript
type SpreadSheetProps = {
  table: ITable
  width?: number
  height?: number
}
```

### レイアウト構造
```
┌──────────────────────────────────────────────────┐
│  (空白 30px×240px)  │  列ヘッダー (30px × rest)  │
├─────────────────────┼──────────────────────────── │
│  行ヘッダー         │  データグリッド              │
│  (rest × 240px)     │  (VariableSizeGrid)          │
└──────────────────────────────────────────────────┘
```

### 仮想スクロール設定
```typescript
<VariableSizeGrid
  columnCount={table.colNum}
  rowCount={table.rowNum}
  columnWidth={(col) => table.getHeader(col).columnWidth}
  rowHeight={(_row) => 24}  // 固定高さ24px
  overscanColumnCount={10}   // 描画外も10列分キャッシュ
  overscanRowCount={10}      // 描画外も10行分キャッシュ
>
```

### スクロール同期フック
```typescript
function useScrollSynchronization() {
  // VariableSizeGrid のスクロールイベントをフックし
  // 列ヘッダー (colHeadRef) と行ヘッダー (rowHeadRef) を
  // scrollTo() で同期させる
}
```

### ポインターイベント（ドラッグ選択）
```typescript
function usePointerEvents(dispatch) {
  onPointerDown: (e, position) => {
    // shiftKey で範囲選択、なければ単一セル選択
    dispatch(setCursor(position, e.shiftKey))
    // setPointerCapture でドラッグ追跡
  }
  onPointerMove: (e, position) => {
    // ドラッグ中: dispatch(setCursor(position, true)) で選択拡張
  }
  onPointerUp: () => {
    // releasePointerCapture
  }
}
```

### キーボードハンドラー
| キー | 動作 |
|------|------|
| 文字キー | `startEdit` → 入力値で編集開始 |
| F2 | `startEdit` → 現在値で編集開始 |
| Delete | `clearCellValue` |
| Backspace | `clearCellValue` + `startEdit` |
| ↑↓←→ | `moveCursor` (Shiftで選択拡張) |
| Enter | `moveCursor(1, 0)` (1行下へ) |
| Tab | `moveCursor(0, 1)` (1列右へ) |

### MakeCell (メモ化セルレンダラー)
```typescript
const MakeCell = React.memo(({ columnIndex, rowIndex, style }) => {
  const cell = table.get(rowIndex, columnIndex)
  const header = table.getHeader(columnIndex)
  return (
    <Cell
      location={Position.from(rowIndex, columnIndex)}
      header={header}
      cell={cell}
      version={cell.version}  // バージョンが変わると再レンダリング
      style={style}
    />
  )
})
```

---

## Cell.tsx

個別セルのレンダリングコンポーネント。`React.memo` でメモ化。

**Props:**
```typescript
type CellProps = {
  location: Position
  header: IHeader
  cell: ICell
  version: number  // これが変わると再レンダリングされる
  style: CSSProperties
}
```

**レンダリングロジック:**
```typescript
// 背景色の決定
backgroundColor:
  cell.error   → '#f88'   // 赤: エラーあり
  version > 0  → '#ff8'   // 黄: 編集済み
  default      → 'white'

// コンテンツ
<Visualizers[header.type] value={cell.value} location={location} />

// エラーがある場合はTooltipでラップ
<Tooltip title={`${cell.error[0]} → ${cell.error[1]}`}>
  {content}
</Tooltip>
```

---

## CellEditor.tsx

セル編集用のtextareaコンポーネント。編集モード時のみPortal経由でレンダリングされる。

**動作:**
1. マウント時に `textarea.select()` で全選択
2. 編集中セルのDOM要素を `document.getElementById` で取得
3. 取得したDOM要素のBoundingRectを使って自身を絶対配置
4. `onChange` → `dispatch(setCellTempValue(value, location))`
5. `Enter` → `dispatch(setCursor(row+1, col, false))` （確定して下へ）
6. `Escape` → `dispatch(cancelCellEdit())`

---

## SelectionRect.tsx

選択範囲を示す半透明の青い矩形オーバーレイ。

**実装:**
```typescript
// 4隅のセルのDOMを取得してBoundingRectを計算
const topLeft     = getElementById(top, left)
const topRight    = getElementById(top, right)
const bottomLeft  = getElementById(bottom, left)
const bottomRight = getElementById(bottom, right)

// 最小・最大座標から矩形サイズを算出
const rect = {
  top:    Math.min(topLeft.top, topRight.top),
  left:   Math.min(topLeft.left, bottomLeft.left),
  width:  bottomRight.right - topLeft.left,
  height: bottomRight.bottom - topLeft.top,
}
```

- `shallowEquals` で前回と同一なら再計算しない
- `pointerEvents: 'none'` でクリックイベントを透過

---

## DataView.tsx

右サイドバー。現在選択中のセルの詳細表示・編集ができる。

現在は `StringEditor` コンポーネントで選択セルの値を文字列として表示する。`cell.guid` をReactの `key` に使用することで、セル移動時に確実にリセットされる。

---

## SpreadSheetFilter.tsx

テーブル上部のフィルター入力フィールド。

```typescript
// シンプルなMUI Input
<Input
  value={filter}
  onChange={(e) => onChange(e.target.value)}
  placeholder="filter..."
/>
```

変更は `TablePage` → `filterState` (Recoil) → `viewState` (selector再計算) のパスで反映される。

---

## Visualizers (visualizers.tsx)

セルの型に応じた表示コンポーネント群。

```typescript
export const Visualizers: { [name: string]: Visualizer } = {
  string:  StringVisualizer,   // 左寄せテキスト
  object:  ObjectVisualizer,   // JSON.stringify の結果を表示
  number:  NumberVisualizer,   // 右寄せ数値
  boolean: BooleanVisualizer,  // チェックボックス（変更でdispatch）
}
```

**BooleanVisualizerのみインタラクティブ:**
```typescript
const BooleanVisualizer = ({ location, value }) => {
  const dispatch = useContext(TableDispatcherContext)
  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => dispatch(setCellValue(e.target.checked, location))}
    />
  )
}
```

---

## Contexts (contexts.ts)

コンポーネントツリーへのデータ注入用Context。

```typescript
const TableContext = createContext<ITable | undefined>(undefined)
const TableDispatcherContext = createContext<Dispatch<SpreadSheetAction>>(...)
```

`TableContext` と `TableDispatcherContext` を分離することで、dispatcherが変わっても読み取り専用のコンポーネントが再レンダリングされない。
