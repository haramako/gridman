# CRLF lint エラー修正と settings.json 整理

**日付**: 2026-05-15  
**関連ファイル**: `.gitattributes`, `.claude/settings.json`

## 相談内容

`npm run lint` を実行すると大量のフォーマットエラーが出るとの報告。
調査したところ、Biome が LF を期待しているのに対してファイルが CRLF になっていることが判明。
合わせて `.claude/settings.json` の権限エントリが増えすぎており、整理を依頼された。

## 決定事項

### CRLF 問題

1. **`.gitattributes` を追加して `eol=lf` を強制する** — `git config core.autocrlf=true` がグローバルに設定されているため、チェックアウト時に LF → CRLF 変換が起きていた。`.gitattributes` は `core.autocrlf` より優先されるため、これで恒久的に防止できる
2. **`git add --renormalize .`** でインデックスを正規化してから **`biome check --write`** で作業ツリーを修正 — 順序が重要（renormalize 先行）

### settings.json 整理

3. **`Edit(/.claude/skills/**)` で包括される細かい Edit エントリを削除** — `workflow-insight`, `multica`, `llm-wiki` 個別の Edit 権限は冗長
4. **multica_sync.py の3エントリを `multica_sync.py *` に統合** — 個別コマンドを列挙する必要がなかった
5. **lint_wiki.py の7エントリ（Bash×5 + PowerShell×2）を2行に統合** — `Bash(python* *lint_wiki.py *)` と `PowerShell(*lint_wiki.py*)`
6. **一回限りエントリを削除** — `node run.js C:/tmp/...`、`cp /tmp/multica-skill.md ...` 等
7. **PowerShell コマンドが Bash に誤登録されていたエントリを削除** — `Bash(Get-ChildItem ...)` 等
8. **`ask` セクションを削除** — `Bash(python -c *)` が `allow` 側と競合しており混乱の元

## 変更されたファイル

- `.gitattributes` — 新規作成。`* text=auto eol=lf` で全ファイルの LF を強制
- `.claude/settings.json` — 63エントリ → 25エントリに整理（冗長エントリ削除・統合）

## 未解決・持ち越し

- `npm run test:e2e` でサーバーが自動起動しない問題は未解決（`core.autocrlf` 調査中に発見。原因候補: `tsx watch` のサブプロセス動作）
