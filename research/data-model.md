# データモデル

## 概要

データは4つの層で表現される。各層が異なる関心事を担う。

```
DataFile (JSON)        ← ファイル永続化形式
    ↓ loadDataset()
Dataset                ← 正規化された全データ（行の主リスト）
    ↓ selectAsTable()
DataTable (ITable)     ← フィルタ済み表形式ビュー
    ↓ get(row, col)
DataCell (ICell)       ← 個別セルアクセサ
```

## インターフェース定義

### ICell
```typescript
interface ICell {
  value: any                          // セルの現在値
  error: [string, string] | undefined // [入力値, エラーメッセージ]
  get version(): number               // 編集回数カウンター
  get guid(): number                  // セルの一意識別子
}
```

### ITable
```typescript
interface ITable {
  get colNum(): number
  get rowNum(): number
  getHeader(col: number): IHeader
  getRow(row: number): IRow
  get(row: number, col: number): ICell
}
```

### IHeader
```typescript
type CellType = 'number' | 'string' | 'boolean' | 'object'

interface IHeader {
  key: string          // JSONオブジェクトのキー名
  name: string         // 表示用ラベル
  type: CellType       // セルの表示・編集タイプ
  validatorType: string // バリデーター識別子
  columnWidth: number   // ピクセル単位の列幅
}
```

### IRow
```typescript
interface IRow {
  guid: number  // 行の一意識別子
  data: any     // 生データオブジェクト
}
```

## 実装クラス

### DataCell
セルの値アクセスと変更追跡を担うクラス。行オブジェクトへの参照と列キーを保持する薄いラッパー。

```typescript
class DataCell implements ICell {
  #data: any     // 行オブジェクトへの参照
  #key: string   // 列のキー名

  get guid(): number {
    // 行GUIDと列キーのハッシュをXORで合成
    return this.#data._guid ^ stringHash(this.#key)
  }

  get value(): any {
    return this.#data[this.#key]
  }

  set value(v: any) {
    // 値が変わった場合のみ: エラークリア + バージョンインクリメント
    if (this.error !== undefined || this.value !== v) {
      this.#data[this.#key] = v
      this.error = undefined
      this.#incVersion()
    }
  }

  get error(): [string, string] | undefined {
    return this.#data._additional?.errors?.[this.#key]
  }

  set error(v: [string, string] | undefined) {
    // _additional.errors[key] に格納
  }

  get version(): number {
    return this.#data._additional?.versions?.[this.#key] ?? 0
  }

  #incVersion(): void {
    // _additional.versions[key]++ (未初期化なら 0 → 1)
  }
}
```

**設計ポイント:**
- `#data` は行オブジェクトへの参照なので、セルへの変更は即座にデータ層に反映される（Mutableデザイン）
- GUIDは `行GUID XOR hash(列キー)` で列をまたいで一意性を確保
- メタデータ（エラー・バージョン）は `_additional` という特別なプロパティに隔離し、通常データと混在させない

### DataTable
ITableの実装。行・列インデックスでセルにアクセスできる2Dグリッド。

```typescript
class DataTable implements ITable {
  colNum: number
  rowNum: number
  data: DataCell[][]      // [row][col] の2D配列
  headers: HeaderData[]   // 列定義の配列
  rows: RowData[]         // { guid: number; data: any }[]

  constructor(data: any[], headers: HeaderData[]) {
    // data配列からDataCell[][]を構築
  }

  getHeader(col: number): HeaderData
  getRow(row: number): IRow
  get(row: number, col: number): ICell
}
```

### HeaderData
列の定義を保持するクラス。JSONのテンプレートから生成される。

```typescript
class HeaderData implements IHeader {
  key: string
  name: string
  type: CellType
  validatorType: string
  unique: boolean
  isData: boolean = true
  columnWidth: number

  static from(src: HeaderData | HeaderTemplate): HeaderData
}

type HeaderTemplate = {
  key: string
  name?: string
  type?: CellType
  validatorType?: string
  unique?: boolean
  columnWidth?: number
}
```

### Dataset
アプリケーション全体のデータを管理する中心クラス。

```typescript
class Dataset {
  rows: Map<number, Row>        // GUID → 行オブジェクト
  tables: Map<string, TableInfo> // テーブル名 → スキーマ定義
  indices: Map<string, Row[]>   // テーブル名 → 行リスト（順序付き）

  createTable(name: string, headers: (HeaderTemplate | HeaderData)[])

  insert(row: any, reorder: boolean = false)
  // _guid, _order が未設定なら自動付与
  // _type でどのテーブルかを識別

  batchInsert(rows: any[])

  select(tableName: string, filter?: FilterFunc, columns?: string[]): Row[]
  // フィルタ・列絞り込みを適用した生データ配列を返す

  selectAsTable(tableName: string, filter?: FilterFunc): ITable
  // select() の結果から DataTable を構築して返す

  removeRow(guid: number)
  // rows と indices から該当行を削除

  getRowOrder(guid: number): number
  // 指定行の後に挿入するための _order 値を計算
}
```

## 行オブジェクトの構造

JSONから読み込まれた行は以下の内部フィールドを付与して管理される。

```typescript
type Row = {
  // --- 内部管理フィールド ---
  _guid: number    // 行の一意識別子（stringHashで生成）
  _order: number   // 表示順序（浮動小数点数で隙間挿入可能）
  _type: string    // 所属テーブル名

  // --- メタデータ（永続化しない） ---
  _additional?: {
    versions: { [key: string]: number }  // 列ごとの編集バージョン
    errors:   { [key: string]: [string, string] }  // 列ごとのエラー
  }

  // --- ユーザーデータ ---
  [key: string]: any  // テーブルスキーマで定義されたカラムの値
}
```

## JSONファイル形式 (DataFile)

```typescript
type DataFile = {
  [tableName: string]: {
    columns: {
      key: string
      name?: string
      type: CellType  // 'number' | 'string' | 'boolean' | 'object'
    }[]
    items: any[]  // 各行オブジェクト（_guid, _order, _type は除外）
  }
}
```

**例:**
```json
{
  "enemy": {
    "columns": [
      { "key": "id",   "type": "number" },
      { "key": "name", "type": "string" },
      { "key": "hp",   "type": "number" }
    ],
    "items": [
      { "id": 1, "name": "スライム", "hp": 10 },
      { "id": 2, "name": "ゴブリン", "hp": 25 }
    ]
  },
  "item": {
    "columns": [...],
    "items": [...]
  }
}
```

## 位置・選択モデル

スプレッドシートのカーソル・選択範囲はSpreadSheet内で管理される。

```typescript
class Position {
  row: number
  col: number

  // オブジェクトプーリング: 同一座標のPositionは同一インスタンスを再利用
  static cache: Map<number, Position>
  static from(row: number, col: number): Position
  static equals(a?: Position, b?: Position): boolean
}

class Selection {
  top: number
  left: number
  bottom: number
  right: number

  isNone(): boolean   // 0,0,0,0
  isOne(): boolean    // 1セルのみ
  width(): number
  height(): number
  contains(pos: Position): boolean
}
```

`Position` はオブジェクトプーリングを実装しており、同一座標のインスタンスをキャッシュして再利用することでGCの負荷を軽減している。
