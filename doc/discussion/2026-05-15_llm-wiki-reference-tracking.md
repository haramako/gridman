# llm-wiki 参照の定量化

**日付**: 2026-05-15  
**関連ファイル**: `.claude/settings.json`, `.opencode/plugins/`

## 相談内容

llm-wiki が AI の作業中にどれだけ参照されているかを定量化したい。現状 `wiki/log/` には明示的な操作（ingest/query/lint/audit 等）のみ記録されており、AI が作業中に受動的に wiki ファイルを Read/Glob/Grep した回数は把握できない。この「参照量」を測る仕組みが欲しい。

## 検討した選択肢

1. **Multica API の `messages <run-id>` 解析**: tool call 系列から Read/Glob/Grep 呼び出しを抽出可能。(a) 全 issue × 全 run のバッチ取得が必要、(b) `input_summary` が 200 文字で切られる、(c) 事後分析のみでリアルタイム性がない
2. **Claude Code PostToolUse hook**: `matcher: "Read|Glob|Grep"` でフィルタし、ツール実行後に `CLAUDE_TOOL_INPUT` からファイルパスを取得して JSONL にログ出力可能。リアルタイム、確実
3. **OpenCode plugin `tool.execute.after`**: OpenCode のプラグインで同様のログ取得が可能。`.opencode/plugins/` に JS ファイルを配置するだけ
4. **InstructionsLoaded hook**: Claude Code の `InstructionsLoaded` イベントで wiki の CLAUDE.md がロードされた瞬間も捕捉可能

## 決定事項

- （未決定 — どのプラットフォームで実装するかはユーザーの返答待ち）

## 変更されたファイル

- （まだなし）

## 未解決・持ち越し

- どのプラットフォームで実装するか（Claude Code / OpenCode / 両方 / Multica API）
- ログフォーマットと保存先の設計
- 集計方法（単純な回数カウントか、セッション単位の分析か）
