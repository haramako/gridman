# 環境起因の再実行パターン

→ [[concepts/agent-patterns/index|Agent Patterns]] の一部

## 概要

最も頻繁に発生するパターン。環境（git 認証・GitHub token・E2E 環境・外部 URL）が整っていない
状態でタスクを開始し、ユーザーが修正してから再トリガーする。AIの実装品質とは無関係。

**該当 taxonomy**: `env-git-auth`, `env-github-token`, `env-e2e`, `env-url-config`

## バリエーション

### `env-github-token` — GitHub token スコープ不足

**事例**: [[summaries/issue-insights]] LIN-36（5 run）, LIN-16（4 run）

PR 作成に `pull_requests: write` スコープが必要だが、当初のトークンに含まれていなかった。
実装は完了しているが PR が作成できず「done」にならない状態が続く。

**必要スコープ**: `repo`（read/write）+ `pull_requests: write`

### `env-git-auth` — git SSH/HTTPS 切り替え

**事例**: LIN-16

タスク途中で git の認証方式を変更（HTTPS → SSH）した結果、エージェントが再起動を余儀なくされた。

### `env-e2e` — E2E テスト実行環境未整備

**事例**: LIN-43

E2Eテスト環境が動作しない状態でタスクが開始され、実装後のテスト検証フェーズで詰まった。
LIN-78 のインフラ改善（`reuseExistingServer: true`）により以降は改善済み。

### `env-url-config` — 外部リポジトリ URL 設定ミス

**事例**: LIN-22

外部リポジトリへの接続 URL が誤設定されており、エージェントがリポジトリにアクセスできなかった。
ユーザーが2回修正してようやく接続できた。

## 対策チェックリスト

タスク割り当て前に以下を確認する：

- [ ] `git push` が SSH/HTTPS で正常に動作するか
- [ ] GitHub token に `repo` + `pull_requests: write` スコープがあるか
- [ ] `npm run test:e2e` がローカルで通るか（AGENTS.md 参照）
- [ ] 外部リポジトリへの接続 URL と認証情報が正しいか

## メトリクスへの影響

環境問題による再実行は「AI の失敗」ではなく「環境設定コスト」として
別カテゴリで計上すべき。実失敗率を正確に計算するには `rerun_causes` に
`env-*` を含む run を除外する。
