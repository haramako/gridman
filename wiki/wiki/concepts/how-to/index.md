# How-To — 機能追加レシピ

よくある多ファイル横断変更のチェックリスト集。
「どのファイルを触ればいいか」を素早く確認するためのページ。

---

## レシピ一覧

- [[concepts/how-to/Add_Column_Type]] — 新しいカラム型（`ColumnType`）を追加する
- [[concepts/how-to/Add_Command]] — Undo/Redo 対応コマンドを追加する
- [[concepts/how-to/Add_View_Type]] — 新しいビュー種別を追加する

---

## このフォルダの使い方

各レシピは「何を変えるか」ではなく「どの順番で何を変えるか」を記述する。
変更が必要なファイルを順番に列挙し、各ステップで確認すべき点を示す。

新しいレシピを追加するときは：
1. `wiki/wiki/concepts/how-to/<操作名>.md` を作成
2. このインデックスページに 1 行追加
3. `wiki/wiki/index.md` の Concepts セクションに追加
