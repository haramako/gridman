# GitHub セットアップ

GitHub Actions による CI/CD の設定手順。

## ワークフロー概要

| ファイル | トリガー | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | PR 作成・main への push | リント・ビルド・ユニットテスト |
| `.github/workflows/e2e.yml` | main への push・毎日 2:00 UTC・手動 | Playwright E2E テスト |

## ワークフローファイルの追加

リポジトリに以下の 2 ファイルを追加する（詳細は各ファイルを参照）。

```
.github/
└── workflows/
    ├── ci.yml      # PR マージ前 CI
    └── e2e.yml     # 定期 E2E テスト
```

## Branch Protection Rules の設定

PR マージ前に CI を必須化するには、GitHub の Settings で Branch Protection を設定する。

1. GitHub リポジトリの **Settings > Branches** を開く
2. **Add branch ruleset** をクリック
3. 対象ブランチを `main`（または `master`）に設定
4. **Require status checks to pass before merging** を有効にする
5. **Add checks** で `test`（`ci.yml` の job 名）を追加
6. **Require branches to be up to date before merging** を有効にする（推奨）
7. **Save changes**

これにより、CI が通過しない PR はマージできなくなる。

## ローカルで事前確認するコマンド

CI と同じチェックをローカルで実行する。

```bash
npm run lint          # Biome リント
npm run build         # TypeScript 型チェック + Vite ビルド
npm run test          # Vitest ユニットテスト
npm run test:e2e      # Playwright E2E テスト
```

## 追加で検討する設定

| 設定 | 方法 |
|---|---|
| Node.js バージョン固定 | `package.json` に `"engines": { "node": "20.x" }` を追加 |
| テストカバレッジ可視化 | CI に `npm run test:coverage` を追加し artifact として保存 |
| 依存パッケージ自動更新 | `.github/dependabot.yml` で npm の Dependabot を設定 |
| E2E の高速化 | テストケース増加後、Playwright の sharding で並列実行 |
| Secrets 管理 | サーバー環境変数が必要な場合は GitHub Secrets に登録して `env:` で渡す |
