# GRIDMAN — AI Agent ガイド

ゲーム開発用データをスプレッドシート形式で編集する Web アプリ。

## 開発サーバーの起動

```bash
# ターミナル1: フロントエンド (port 5173)
npm run dev

# ターミナル2: バックエンド (port 8080)
npm run server
```

サンプルデータを使う場合:

```bash
npm run dev:init   # var/sample を初期化（初回のみ）
```

`http://localhost:5173` を開き、`var/sample` の絶対パスを入力する。

---

## 動作確認（タスク完了の必須条件）

実装後は以下を必ず実行し、全て通過することを確認すること。

### 型チェック

```bash
npx tsc --noEmit
```

### ユニット・コンポーネントテスト

```bash
npm run test
```

### E2E テスト

```bash
npm run test:e2e
```

Playwright がサーバーを自動起動する。`reuseExistingServer: true` のため起動済みでも可。

---

## Pull Request

コミットを行った場合は、必ず gh コマンドで Pull Request を作成すること。

- タイトル・説明は日本語
- Ready for Review の状態にすること

---

## Git Rules

- コミットメッセージは**日本語**で書く
- コミットメッセージの先頭に `[AI]` を付ける（例: `[AI] フィルター条件の保存を修正`）

---

## コーディング方針

`karpathy-guidelines` スキルに基づいて行動すること。特に以下を徹底する：

- 過度な抽象化・汎化をしない（頼まれた変更だけを行う）
- 外科的な変更に留める（関係ない箇所を触らない）
- 暗黙の前提は明示する
- 変更前に検証可能な成功基準を定める

## コード規約

- Lint / Format: `npm run lint`（Biome）
- shadcn/ui コンポーネントの追加: `npx shadcn@latest add <component>`

---

## 設計ドキュメント

コードベースの詳細な知識は `wiki/wiki/index.md` を起点とする llm-wiki を参照すること（アーキテクチャ・データモデル・入力挙動・Undo/Redo など全概念を網羅）。

| ドキュメント | 内容 |
|---|---|
| `plan/mvp.md` | フェーズ別スコープ定義（現在 Phase 2・3 完了、Phase 4 未着手） |
