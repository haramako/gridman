# 状態管理

## 2層構造の状態管理

このアプリは **Recoil（グローバル）** と **useReducer（ローカル）** を組み合わせた2層構造を採用している。

```
┌───────────────────────────────────────────────────┐
│                  Recoil (グローバル)                │
│  ファイルパス、テーブル選択、フィルター、データセット  │
└────────────────────┬──────────────────────────────┘
                     │ useEffect で同期
┌────────────────────▼──────────────────────────────┐
│              useReducer (SpreadSheet内)             │
│  カーソル、選択範囲、編集状態、一時編集値             │
└───────────────────────────────────────────────────┘
```

## Recoil: Atoms

### dataPathState
```typescript
const dataPathState = atom<string>({
  key: 'dataPath',
  default: 'data.json',
  effects_UNSTABLE: [persistAtom],  // localStorage に永続化
})
```
ロード/保存するJSONファイルのパス。`recoil-persist` により、ページリロード後も値が維持される。

### selectedViewLinkState
```typescript
const selectedViewLinkState = atom<string>({
  key: 'selectedViewLink',
  default: 'enemy',
})
```
現在表示中のテーブル名。左サイドバーのリスト選択で更新される。

### filterState
```typescript
const filterState = atom({
  key: 'filter',
  default: { filter: '', version: 0 },
})
```
- `filter`: テキストフィルターの文字列
- `version`: 行追加/削除のたびにインクリメントされるカウンター。Recoilのselectorキャッシュを強制無効化するためのトリック

### datasetVersionState
```typescript
const datasetVersionState = atom<number>({
  key: 'datasetVersion',
  default: 0,
})
```
行追加/削除時にインクリメントされる。`viewState` はこのatomに依存しており、変化するとビューが再計算される。

### selectionState
```typescript
type SelectionState = {
  cursor?: Position
  selection: Selection
}

const selectionState = atom<SelectionState>({
  key: 'selection',
  default: { cursor: undefined, selection: new Selection(0, 0, 0, 0) },
})
```
スプレッドシートの選択状態をグローバルに共有（DataViewでの表示に使用）。SpreadSheet内の `useReducer` から `useEffect` 経由で同期される。

## Recoil: Selectors

### datasetState（非同期）
```typescript
const datasetState = selector<Dataset>({
  key: 'dataset',
  get: async ({ get }) => {
    get(datasetVersionState)  // バージョン依存でキャッシュ無効化
    const path = get(dataPathState)
    return createDataset('/api/files/' + path)
    // createDataset: fetch → JSON.parse → loadDataset(new Dataset(), data)
  },
})
```
- 非同期selectorで、Suspenseと連携してローディング状態を管理
- `dataPathState` または `datasetVersionState` が変わると再取得

### viewLinksState（非同期）
```typescript
const viewLinksState = selector<ViewLink[]>({
  key: 'viewLinks',
  get: async ({ get }) => {
    const dataset = await get(datasetState)
    return [...dataset.tables.keys()].map((name) => ({ name }))
  },
})
```
左サイドバーのテーブル一覧表示に使用。`datasetState` から派生。

### viewState（非同期）
```typescript
const viewState = selector<ITable>({
  key: 'view',
  get: ({ get }) => {
    const dataset = get(datasetState)
    const filter = get(filterState)
    const viewLink = get(selectedViewLinkState)
    return dataset.selectAsTable(viewLink, filterFunc(filter.filter))
  },
})

function filterFunc(filter: string) {
  return (row: any, headers: HeaderData[]): boolean => {
    if (filter === '') return true
    return headers.some((h) => row[h.key]?.toString().includes(filter))
  }
}
```
最も重要なselector。`filter`, `selectedViewLink`, `filterState.version` のいずれかが変わると自動的に再計算され、新しい `ITable` を返す。

## Recoil状態の依存グラフ

```
dataPathState ──────────────────────┐
datasetVersionState ─────────────── datasetState ─── viewLinksState
                                        │
selectedViewLinkState ──────────── viewState
filterState ────────────────────────────┘
```

## useReducer: SpreadSheetState

SpreadSheetコンポーネント内でローカルなインタラクション状態を管理。

```typescript
type SpreadSheetState = {
  data: ITable           // 現在表示中のテーブル（viewStateから同期）
  selected?: Position    // 現在のカーソル位置
  selectStart?: Position // ドラッグ選択の開始点
  selection: Selection   // 現在の選択範囲
  editing?: Position     // 編集中のセル位置（undefinedなら非編集）
  tableRef: React.RefObject<HTMLDivElement>
  gridRef: React.RefObject<VariableSizeGrid>
  colHeadRef: React.RefObject<VariableSizeList>
  rowHeadRef: React.RefObject<VariableSizeList>
  tempPosition?: Position // 編集中のセル位置（setCellTempValue用）
  tempValue?: any         // 確定前の一時編集値
  filter: string
  onChangeCell?: (cell?: ICell) => void
}
```

## useReducer: アクション一覧

| アクション | 引数 | 動作 |
|-----------|------|------|
| `setTable` | `ITable` | テーブル切り替え。選択/編集状態をリセット |
| `setFilter` | `string` | フィルター文字列更新 |
| `setCursor` | `Position, shiftKey` | カーソル移動（範囲選択対応） |
| `moveCursor` | `dRow, dCol, shiftKey` | 相対カーソル移動（境界チェック付き） |
| `startEdit` | `Position` | セル編集モード開始 |
| `setCellValue` | `value, Position` | セル値確定（バリデーション実行） |
| `setCellTempValue` | `value, Position` | 編集中の一時値保存 |
| `clearCellValue` | `Position` | セル値をクリア |
| `cancelCellEdit` | なし | 編集キャンセル（tempValue破棄） |
| `resizeColumn` | `column` | 列幅変更後にgridをリセット |

## Recoil ↔ useReducer の同期

```typescript
// SpreadSheet.tsx 内
const table = useRecoilValue(viewState)

useEffect(() => {
  dispatch(setTable(table))
}, [table])

// 選択状態の逆方向同期
const setSelection = useSetRecoilState(selectionState)
useEffect(() => {
  setSelection({ cursor: state.selected, selection: state.selection })
}, [state.selected, state.selection])
```

**同期の方向:**
- `viewState` (Recoil) → `setTable` dispatch → `useReducer`（一方向）
- `selected`, `selection` (useReducer) → `selectionState` (Recoil)（逆方向）

## setCellValue の詳細フロー

```
dispatch(setCellValue(newValue, pos))
    │
    ↓ doSetCellValue(table, pos, newValue)
    │
    ├── header = table.getHeader(pos.col)
    ├── cell = table.get(pos.row, pos.col)
    ├── validator = validators.findValidator(header.validatorType)
    │
    ├── [バリデーターあり]
    │   ├── [err, coercedValue] = validator.validate(newValue)
    │   ├── エラーあり → cell.error = [newValue, err]
    │   └── エラーなし → cell.value = coercedValue
    │
    └── [バリデーターなし]
        └── cell.value = newValue
```

## 行追加/削除の状態更新

行の追加・削除はRecoilの状態を更新することで `viewState` の再計算をトリガーする。

```typescript
// TablePage.tsx
const [filterAtom, setFilterAtom] = useRecoilState(filterState)
const setDatasetVersion = useSetRecoilState(datasetVersionState)

// 行追加
const onAddRowClick = () => {
  // dataset.insert(newRow) で直接データを変更
  setDatasetVersion(v => v + 1)          // datasetState を再計算
  setFilterAtom(f => ({...f, version: f.version + 1}))  // viewState を再計算
}

// 行削除
const onRemoveRowClick = () => {
  // dataset.removeRow(guid) で直接データを変更
  setDatasetVersion(v => v + 1)
  setFilterAtom(f => ({...f, version: f.version + 1}))
}
```
