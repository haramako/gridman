# 開発ワークフロー

Gridman の開発・ビルド・テスト手順の早引き。

---

## 起動（開発時）

2つのターミナルを同時に使う:

```bash
# ターミナル 1: フロントエンド (Vite :5173)
npm run dev

# ターミナル 2: バックエンド (Hono :8080)
npm run server
```

開発データが未セットアップの場合は初回のみ:
```bash
npm run dev:init   # fixtures/sample/ → var/sample/ にコピー
```

ブラウザで `http://localhost:5173` を開き、`var/sample` のパスを入力して動作確認。

---

## その他の起動オプション

| コマンド | 用途 |
|---------|------|
| `npm run db-server` | SQLite サーバー（port 8082）を起動 |
| `npm run dev:gen-dummy` | ダミーデータ生成 |
| `npm run preview` | 本番ビルドのプレビュー |

---

## ビルド

```bash
npm run build
```

内部で `tsc --noEmit`（型チェック）+ `vite build` を実行。型エラーがあればビルド失敗。

---

## Lint

```bash
npm run lint    # biome check src server
```

`src/` と `server/` を対象に Biome でチェック。

---

## テスト

### ユニット・コンポーネントテスト（速い）

```bash
npm run test          # 1回実行して終了
npm run test:watch    # ウォッチモード（開発中）
npm run test:coverage # カバレッジ付き
```

- `tests/domain/` — ドメイン関数（純粋関数）
- `tests/components/` — React コンポーネント（Zustand・GridContext はモック）

### E2E テスト（遅い）

```bash
npm run test:e2e         # ヘッドレス
npm run test:e2e:ui      # ブラウザ表示あり（デバッグ用）
```

実行前に `npm run dev` + `npm run server` が起動していること。  
`var/e2e-test/` はテスト実行ごとに自動リセット。`var/sample/` は触られない。

---

## データフォルダの使い分け

| フォルダ | 用途 | 変更 |
|---------|------|------|
| `fixtures/sample/` | サンプルデータのマスター | git 管理、変更しない |
| `var/sample/` | 開発中の作業フォルダ | 自由に変更可（gitignore） |
| `var/e2e-test/` | E2E テスト専用 | テスト実行で自動リセット |

---

## 変更後の確認手順（推奨）

1. `npm run lint` — コード品質チェック
2. `npm run test` — ユニット・コンポーネントテスト
3. ブラウザで動作確認（`var/sample` を開いて実際に操作）
4. 必要に応じて `npm run test:e2e`

---

## 関連

- [[concepts/Testing]] — テストの書き方・環境分離の詳細
- [[concepts/architecture/System_Overview]] — フロント/バックエンド構成
- [[summaries/doc-overview]] — ディレクトリ構成の詳細
