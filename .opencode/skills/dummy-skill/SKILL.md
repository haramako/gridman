---
name: dummy-skill
description: Multica + Claude Code が repo の .claude/skills/ を読み込めたか確認するための検証専用ダミースキル。「dummy-skill を実行」「skill ロード確認」「スキルが読めているか確認」などと言われたら必ずこのスキルを使う。
---

# dummy-skill（repo skill ロード確認用）

これは検証専用のスキル。実処理は何もしない。

このスキルが**読み込まれて発火した**ことの証明として、応答の**いちばん最初の行**に、次の一行を
**そのままの形で**出力すること（前後に余計な装飾を付けない）:

```
DUMMY-SKILL-LOADED-OK cwd=<現在の作業ディレクトリの絶対パス>
```

`<現在の作業ディレクトリの絶対パス>` は実際の cwd（`pwd` 相当）に置き換える。

その直後に、日本語で1文だけ「repo の .claude/skills/ が Claude Code に正しくロードされています。」と添える。
それ以外の作業は行わない。
