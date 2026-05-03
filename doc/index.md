# GRIDMAN ドキュメント

ゲーム開発用データ（敵・アイテム・スキルなど）をスプレッドシート形式で編集する Web アプリ。
JSONL + JSON Schema でデータを保存し、git による差分管理を可能にする。

## 目次

| ドキュメント | 内容 |
|---|---|
| [overview.md](overview.md) | 起動方法・ディレクトリ構成 |
| [architecture.md](architecture.md) | システム構成・ストア・データフロー |
| [data-model.md](data-model.md) | ファイル形式・型定義 |
| [testing.md](testing.md) | テストの実行と記述 |
| [input-behavior.md](input-behavior.md) | キーボード・マウス入力の仕様と Excel との差異 |

## クイックスタート

```bash
npm install
npm run dev          # フロントエンド :5173
npm run server       # バックエンド   :8080
npm run dev:init     # var/sample を初期化（初回のみ）
```

ブラウザで `http://localhost:5173` を開き、`var/sample` の絶対パスを入力する。
