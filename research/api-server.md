# APIサーバー

## 概要

`server.mjs` に実装された極めてシンプルなExpressサーバー。JSONファイルの読み書きと、ビルド済みReactアプリの配信のみを担当する。

## 実装

```javascript
import express from 'express'
import bodyParser from 'body-parser'
import * as path from 'path'
import { readFileSync, writeFileSync } from 'fs'

const app = express()

// ビルド済みReactアプリを配信
app.use(express.static('build'))

// JSONファイル取得
app.get('/api/files/:name', (req, res) => {
  const name = req.params.name
  const json = readFileSync(path.resolve('var/' + name))
  res.send(json)
})

// JSONファイル保存
app.put('/api/files/:name', bodyParser.text({ type: '*/*' }), (req, res) => {
  const name = req.params.name
  writeFileSync(path.resolve('var/' + name), req.body)
  res.send('OK')
})

app.listen(process.env.PORT || 8080)
```

## エンドポイント

### GET /api/files/:name
- **用途:** JSONデータファイルの読み込み
- **パラメーター:** `:name` — ファイル名（例: `data.json`）
- **返却:** JSONファイルの内容（そのまま送信）
- **ファイルパス:** `var/:name`（プロセスの作業ディレクトリ基準）

### PUT /api/files/:name
- **用途:** JSONデータファイルの保存
- **パラメーター:** `:name` — ファイル名
- **リクエストボディ:** JSON文字列（Content-Type問わず受け付ける）
- **返却:** `"OK"` 文字列
- **ファイルパス:** `var/:name`

## 開発時のプロキシ設定

開発時はCreate React App（ポート3000）とExpressサーバー（ポート8080）が別々に起動する。`package.json` に以下のプロキシ設定があり、`/api/` へのリクエストを自動転送する。

```json
{
  "proxy": "http://localhost:8080"
}
```

## 起動方法

```bash
# バックエンドサーバー起動（nodemonで自動再起動）
npm run server   # または node server.mjs

# フロントエンド開発サーバー起動
npm start

# 本番ビルド後は Express だけで両方配信
npm run build
node server.mjs
```

## データディレクトリ

```
react-spreadsheet/
└── var/
    ├── data.json      # デフォルトのデータファイル
    └── (任意の名前).json
```

ファイル名はフロントエンドの「ファイルパス」入力フィールドで指定する。`var/` ディレクトリが作業ディレクトリに存在する必要がある。

## セキュリティ上の注意

現在の実装にはパス検証が**ない**。`:name` パラメーターに `../` を含むパスを指定するとディレクトリトラバーサルが可能な状態。社内/ローカル専用ツールとして使用する前提の設計と考えられる。

本番環境で公開する場合は以下のような対策が必要：

```javascript
// パス検証の例
const safeName = path.basename(name)  // ディレクトリ部分を除去
if (!safeName.endsWith('.json')) {
  return res.status(400).send('Invalid filename')
}
const filePath = path.resolve('var', safeName)
// var/ ディレクトリ外を指していないか確認
if (!filePath.startsWith(path.resolve('var'))) {
  return res.status(400).send('Invalid path')
}
```

## フロントエンドからの使用

```typescript
// データ読み込み (state.ts)
const createDataset = async (url: string): Promise<Dataset> => {
  const res = await fetch(url)  // GET /api/files/data.json
  const data: DataFile = await res.json()
  const dataset = new Dataset()
  loadDataset(dataset, data)
  return dataset
}

// データ保存 (App.tsx)
const onSaveClick = async () => {
  const data = saveDataset(dataset)
  await fetch('/api/files/' + dataPath, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
```
