# llm-wiki lint スクリプトの Windows パスバグ修正

**日付**: 2026-05-13  
**関連ファイル**: `.claude/skills/llm-wiki/scripts/lint_wiki.py`

## 相談内容

`/llm-wiki lint` を実行したところ、43件の「Pages missing from index.md」が報告された。
実際には index.md にすべて記載されており、誤検知であることが疑われた。

## 原因調査

lint スクリプトの Pass 3（missing index entries）の判定ロジック：

```python
str(p.relative_to(wiki_path).with_suffix("")) not in index_text
```

Windows では `Path.relative_to()` の `str()` 変換がバックスラッシュ区切り（`concepts\architecture\Stores`）を返す。
一方、index.md のウィキリンクはスラッシュ区切り（`concepts/architecture/Stores`）で書かれているため、
すべてのパスが「一致しない」と判定されていた。

## 決定事項

1. **`str()` を `.as_posix()` に変更** — `Path.as_posix()` は OS に関係なく常に `/` 区切りを返す。Linux では動作が変わらず、Windows でのみバグが修正される。

## 変更されたファイル

- `.claude/skills/llm-wiki/scripts/lint_wiki.py` — Pass 3 の `str(...)` を `.as_posix()` に変更（1行のみ）

## 未解決・持ち越し

- なし（修正後に lint が全項目 ✅ を確認済み）
