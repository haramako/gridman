---
name: workflow-insight
description: >-
  Multica issue の実行履歴を分析し multica-data/issue-insights/<id>.md に
  統一フォーマットで insight を書く。ワークフロー改善のパターン蓄積・横断分析に使う。
  引数なしで未作成候補をリストアップ。<id> で単体生成。all で全件生成。
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(python *)
---

# /workflow-insight — Issue Insight スキル

Multica の issue 実行ログから学びを抽出し、`multica-data/issue-insights/` に蓄積する。
各ファイルは先頭に **JSON メタデータブロック** を持つ統一フォーマットで書く。

Arguments passed: `$ARGUMENTS`

---

## multica-data/issue-insights/ の規約

このディレクトリには **issue ごとの insight ファイルのみ** を置く。

### 置いてよいファイル
- `LIN-XX.md` — 1 issue につき 1 ファイル。このスキルが生成・管理する。

### 置いてはいけないファイル
- 横断まとめ・パターン集 → `doc/` に置く
- テンプレートや README → このスキルの SKILL.md に書く
- `_` で始まるファイル全般

横断パターンの合成は `/llm-wiki ingest multica-data/issue-insights/` で wiki に昇格させる。

---

## 操作の dispatch

### 引数なし — 候補リストアップ

`multica-data/issues/*.json` を全件読み込み、以下の条件でinsight未作成の候補を出力する：

- `run_count >= 2`、または
- いずれかの run の `status == "failed"`

出力フォーマット：

```
LIN-XX | タイトル(30字) | status | runs=N fail=Y/N | tok=N,NNN,NNN
```

既に `multica-data/issue-insights/<id>.md` が存在するものは `(done)` を付ける。
`countermeasure == "none"` のものは `[要対策]` を付けて強調する。

### `<id>`（例: `LIN-36`）— 単体生成・更新

1. `multica-data/issues/<id>.json` を読む
2. 下記「insight生成手順」に従って分析する
3. `multica-data/issue-insights/<id>.md` を書く（既存なら上書き）

### `all` — 全件生成

done または cancelled の全 issue に対して、未作成のものを順に生成する（in_progress / in_review はスキップ）。

---

## insight ファイルフォーマット

ファイルは **JSON メタデータブロック → markdown 本文** の順で書く。

````
```json
{
  "identifier": "LIN-XX",
  "title": "issue タイトル（原文のまま）",
  "status": "done",
  "run_count": N,
  "total_tokens": NNNNNN,
  "has_real_failures": false,
  "failure_cause": null,
  "rerun_causes": ["taxonomy-code", ...],
  "patterns": ["taxonomy-code", ...],
  "countermeasure": "none",
  "written_at": "YYYY-MM-DD"
}
```

# LIN-XX: issue タイトル

## 実行履歴サマリー

| Run | Status | トリガー |
|-----|--------|---------|
| 1 | completed | トリガー概要（30字程度） |
| 2 | failed    | (トリガーなし) |

## 観察

### 見出し（何が起きたか）
観察内容。run 番号を参照しながら具体的に記述。

## 教訓

1. **太字で要点** — 詳細説明。
2. ...
````

### フィールド仕様

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `identifier` | string | "LIN-XX" 形式 |
| `title` | string | issue タイトル原文 |
| `status` | string | done / in_review / cancelled など |
| `run_count` | int | runs 配列の長さ |
| `total_tokens` | int | `usage.total_tokens`（なければ 0）|
| `has_real_failures` | bool | platform-artifact を**除いた**本物の失敗があるか |
| `failure_cause` | string\|null | 失敗した原因の短い説明（なければ null）|
| `rerun_causes` | string[] | 再実行が必要になった理由の taxonomy コード |
| `patterns` | string[] | 観察されたパターンの taxonomy コード |
| `countermeasure` | string | 対策状況（値は下記） |
| `written_at` | string | insight を書いた日（YYYY-MM-DD）|

**`countermeasure` の値：**

| 値 | 意味 |
|----|------|
| `none` | 未対策。改善提案・AGENTS.md 更新などが必要 |
| `one-time` | 一度限りの環境問題・操作ミス。構造的な改善は不要 |
| `in-agents-md` | AGENTS.md に対策が記載済み |
| `platform-fix` | プラットフォーム（Multica 設定・インフラ）側で修正済み |

---

## パターン taxonomy

`rerun_causes` と `patterns` で使うコードの一覧。

| コード | 意味 |
|--------|------|
| `platform-artifact` | 完了後に残る stale failed run（trigger_summary が null で前 run が completed）|
| `env-git-auth` | git SSH / HTTPS 認証設定問題 |
| `env-github-token` | GitHub token のスコープ不足（repo, pull_requests:write など）|
| `env-e2e` | E2E テスト実行環境が未整備（サーバー未起動など）|
| `env-url-config` | 外部リポジトリや API の URL / 接続設定ミス |
| `spec-design-change` | 実装後にインターフェース・設計の変更依頼 |
| `spec-feature-addition` | 実装後に機能追加依頼（仕様が不完全だった）|
| `regression-broad-change` | 横断的変更（enum, store など）で既存機能が壊れた |
| `e2e-not-verified` | E2E 未確認のまま PR 作成し後で指摘された |
| `duplicate-trigger` | 同じトリガーが重複送信された |
| `infra-improvement` | ワークフロー問題自体を修正したタスク（後続への学び）|
| `context-overload` | 高トークン消費・コンテキスト肥大化が問題になった |
| `quota-recovery` | 使用量上限回復後の手動再開チェック（"いかがです？" / "ping" など）|

複数該当する場合はすべて列挙する。

---

## insight 生成手順（`<id>` 指定時）

### Step 1: データ読み込み

```python
import json
with open(f"multica-data/issues/{id}.json", encoding="utf-8") as f:
    d = json.load(f)

runs = d.get("runs", [])        # 新しい順（runs[0] が最新）
usage = d.get("usage", {})
total_tokens = usage.get("total_tokens", 0)
```

`runs` は **新しい順**（runs[0] が最新 run）。時系列は逆順で並んでいることに注意。

### Step 2: platform-artifact の判定

```
最後の run（runs[0] = 最新）が:
  - status == "failed"
  - trigger_summary == null
  - かつ runs[1].status == "completed"（ひとつ前のrunが完了済み）
→ platform-artifact と判定。has_real_failures = false
```

### Step 3: rerun_causes の判定

各 run の `trigger_summary` を読み、以下のキーワードで分類する：

| キーワード（含む） | コード |
|-------------------|--------|
| SSH / ssh / git設定 | `env-git-auth` |
| token / Token / hosts.yml / スコープ / scope | `env-github-token` |
| e2e / E2E / ホスト環境 / テスト環境 | `env-e2e` |
| URL / url / 設定を間違え / 設定しなおし | `env-url-config` |
| 同じトリガーが連続している | `duplicate-trigger` |
| 設計を変えて / インターフェース / コールバック | `spec-design-change` |
| 〜も追加して / インクリメンタル | `spec-feature-addition` |
| いかがです？ / how are you? / ping | `quota-recovery` |

### Step 4: patterns の決定

`rerun_causes` に加え、issue 全体の傾向から追加パターンを付与する：

- PR作成後に「E2Eは通っていますか？」→ `e2e-not-verified`
- 実装後にスプレッドシートなどが壊れた → `regression-broad-change`
- total_tokens > 10,000,000 → `context-overload`
- このタスク自体がインフラ/ワークフロー改善 → `infra-improvement`
- `platform-artifact` の run がある → `platform-artifact` を patterns にも含める

### Step 5: countermeasure の決定

以下の基準で `countermeasure` を設定する：

- `patterns` のすべてが `platform-artifact` / `duplicate-trigger` のみ → `one-time`
- `patterns` に `env-*` のみが含まれ、すでに環境が整備済みと判断できる → `one-time`
- `patterns` に `e2e-not-verified` があり AGENTS.md に記載済み → `in-agents-md`
- `patterns` に `env-e2e` があり LIN-78 で修正済み → `platform-fix`
- `patterns` に `spec-*` / `regression-broad-change` / `context-overload` が含まれ未対策 → `none`
- 判断できない場合は `none`（保守的に）

### Step 5: markdown 本文の記述

**実行履歴サマリー表** — runs を時系列順（古い順）に並べ替えて表示する。トリガーは 30 字程度に要約。

**観察セクション** — 「何が起きたか」を具体的に記述。run 番号（時系列基準）を参照。
  - platform-artifact が含まれる場合は必ず言及する
  - 単純な成功なら「特筆すべき問題なし」と書いてよい

**教訓セクション** — 「次回以降に活かせること」を箇条書き。
  - 環境問題系は「事前に〇〇を確認する」
  - 仕様問題系は「issueに〇〇を含めるとよい」
  - platform-artifact だけなら「アーティファクト的 failed run が含まれる。実際の実装は正常完了」

---

## 出力スタイル

- JSON は整形済み（インデント 2）で書く
- `written_at` は今日の日付
- 教訓は 1〜4 項目程度（多すぎると読まれない）
- platform-artifact のみで他に学びがない issue は短くてよい
