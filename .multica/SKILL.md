# GRIDMAN Issue Management

GRIDMAN プロジェクトの issue 管理と PR マージワークフローを扱うスキル。

## プロジェクト情報

- **multica project ID**: `8e8cff5f-420c-4a17-9559-8e91923b43dd`
- **GitHub リポジトリ**: `haramako/gridman`（main ブランチがベース）

---

## Issue 操作リファレンス

### 一覧取得

```bash
# ステータス別（in_review / todo / in_progress / done / cancelled）
multica issue list --project 8e8cff5f-420c-4a17-9559-8e91923b43dd --status in_review --output json

# 優先度別（urgent / high / medium / low / none）
multica issue list --project 8e8cff5f-420c-4a17-9559-8e91923b43dd --priority high --output json
```

### 詳細・コメント取得

```bash
multica issue get <issue-id> --output json
multica issue comment list <issue-id> --output json
```

### Issue 作成

```bash
multica issue create \
  --project 8e8cff5f-420c-4a17-9559-8e91923b43dd \
  --title "タイトル" \
  --description "説明（\n で改行）" \
  --priority medium
```

### ステータス変更

```bash
multica issue status <issue-id> <status>
# status: todo / in_progress / in_review / done / cancelled
```

### コメント追加

```bash
multica issue comment add <issue-id> "コメント内容"
```

---

## PR確認OK ワークフロー

ユーザーが issue コメントに **「PR確認OK」** と書いた場合、下記の手順を順番に実行すること。
コメントの検出は `multica issue comment list` で最新コメントを確認することで行う。

### ステップ 1: PR URL を特定する

```bash
multica issue comment list <issue-id> --output json
```

コメント一覧から `https://github.com/haramako/gridman/pull/<PR番号>` の形式の URL を探す。
見つからない場合は issue の description も確認する。

### ステップ 2: PR の状態を確認する

```bash
gh pr view <PR番号> --json number,title,state,mergeable,mergeStateStatus,headRefName
```

- `state` が `OPEN` であることを確認する
- `mergeable` の値を確認する（`MERGEABLE` / `CONFLICTING` / `UNKNOWN`）

### ステップ 3: コンフリクトがある場合は解消する

`mergeable` が `CONFLICTING` の場合のみ実行する。

```bash
# PR ブランチをフェッチしてチェックアウト
git fetch origin
git checkout <headRefName>

# main をマージ（コンフリクトが発生する）
git merge main
```

コンフリクト解消の手順:
1. `grep -r "<<<<<<" .` でコンフリクト箇所を特定する
2. `Read` ツールで該当ファイルの内容を正確に確認する
3. `Edit` ツールでコンフリクトマーカーを含むブロックを解消した内容に置換する
4. 型チェックとテストを実行してビルドが通ることを確認する

```bash
# 解消後にコミット＆プッシュ
git add -A
git commit -m "Resolve merge conflicts with main"
git push origin <headRefName>
```

### ステップ 4: CI の確認

```bash
gh pr checks <PR番号>
```

すべてのチェックが通過していることを確認する。失敗している場合は原因を調べて修正すること。

### ステップ 5: PR をマージする

```bash
gh pr merge <PR番号> --merge --delete-branch
```

マージ方法は `--merge`（merge commit）を使用する。`--squash` や `--rebase` は使わない。

### ステップ 6: Issue を DONE に更新する

```bash
multica issue status <issue-id> done
```

### ステップ 7: Issue にマージ完了コメントを追加する

```bash
multica issue comment add <issue-id> "PR #<PR番号> をマージし、issue をクローズしました。"
```

---

## Issue 作成のガイドライン

コードや `doc/` の記述から未実装機能・バグを発見して issue を登録する際の基準:

| フィールド | ガイドライン |
|---|---|
| `title` | `[カテゴリ] 機能名` の形式。例: `[Grid] Ctrl+A 全選択の実装` |
| `description` | 実装箇所・背景・完了条件を含める。参照ファイルがあれば記載する |
| `priority` | `doc/input-behavior.md` の優先度マトリックスを参照する |
| `status` | 新規作成時は `todo` |

### doc/input-behavior.md の優先度マトリックス参照

`doc/input-behavior.md` に未実装機能の優先度一覧がある。issue を作成する前にこのファイルを確認して重複を避けること。

---

## 注意事項

- issue を作成する前に `multica issue list` で重複がないか確認すること
- PR マージは必ず CI（`gh pr checks`）が全通過してから実行すること
- コンフリクト解消時は `sed` や `cat -A` などの追加確認ツールは不要。`Read` ツールの出力を信頼して `Edit` を使うこと
