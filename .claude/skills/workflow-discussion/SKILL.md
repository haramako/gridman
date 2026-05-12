---
name: workflow-discussion
description: >-
  ワークフロー改善の相談内容・決定事項・持ち越し事項を
  doc/discussion/YYYY-MM-DD_<description>.md に記録する。
  相談の開始時・終了時・区切りのよいタイミングで呼ぶ。
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
---

# /workflow-discussion — ワークフロー改善相談の記録スキル

ワークフロー改善に関する相談・設計判断を `doc/discussion/` に蓄積する。
「なぜそう決めたか」の理由を残すことで、同じ議論の繰り返しを防ぐ。

Arguments passed: `$ARGUMENTS`

---

## doc/discussion/ の規約

- ファイル名: `YYYY-MM-DD_<kebab-case-description>.md`
- 1ファイル = 1つのまとまったトピック（複数の小さな決定をまとめてよい）
- 同じ日に別トピックなら別ファイル
- 継続中の相談は同じファイルに追記する

---

## 操作の dispatch

### 引数なし — 今日の相談をまとめてファイルに書く

現在の会話コンテキストからワークフロー改善に関する相談内容を抽出し、
下記フォーマットで `doc/discussion/YYYY-MM-DD_<topic>.md` を作成する。

1. `doc/discussion/` の既存ファイルを確認し、今日の日付のファイルがあれば追記を提案
2. トピックを一言で表す kebab-case の説明を決める（例: `workflow-insight-design`）
3. 会話から以下を抽出してファイルを書く：
   - 相談のきっかけ・問題意識
   - 検討した選択肢（あれば）
   - 決定事項と理由
   - 結果として変更されたファイル
   - 未解決・持ち越し事項

### `<description>` — 説明を指定して新規作成

`doc/discussion/YYYY-MM-DD_<description>.md` を作成する。
内容は引数なしと同じ手順で会話から抽出する。

### `list` — 過去の discussion 一覧

`doc/discussion/` のファイルを日付降順で一覧表示する。

### `update <filename>` — 既存ファイルに追記

指定されたファイルを読み込み、新しい決定事項や持ち越しの更新を末尾に追記する。

---

## ファイルフォーマット

```markdown
# <トピックのタイトル（日本語）>

**日付**: YYYY-MM-DD  
**関連ファイル**: `path/to/file1`, `path/to/file2`

## 相談内容

何が問題で、何を相談したか。背景・きっかけを含む。

## 検討した選択肢

（あれば）複数案を比較した場合に記述。なければ省略。

## 決定事項

1. **決定内容** — 理由（なぜそうしたか）
2. **決定内容** — 理由

## 変更されたファイル

- `path/to/file` — 何を変更したか

## 未解決・持ち越し

- 残課題や次のアクション（なければ「なし」）
```

---

## 出力スタイル

- タイトルは日本語、ファイル名は kebab-case 英語
- 「理由」は必ず書く（決定内容だけでは価値が半減する）
- 持ち越しは具体的なアクションとして書く（「検討する」より「〇〇をAGENTS.mdに追加する」）
- 簡潔に。1ファイル 200〜400 語が目安
