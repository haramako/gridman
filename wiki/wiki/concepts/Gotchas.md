# Gotchas — よくある落とし穴

Gridman のコードを変更する前に知っておくべき非自明な制約・挙動の一覧。
各項目は既存サマリーの記述を根拠とする。

---

## 1. `adapter` はモジュールスコープ変数（Zustand ステートではない）

`src/stores/project.store.ts` の `adapter` は Zustand の状態として持たれていない。
`setAdapter()` を呼んでも React コンポーネントの再レンダリングはトリガーされない。
アダプター切り替えは起動時に 1 度だけ行う設計。

→ [[summaries/src-stores]]

---

## 2. `dirtyRowIds` と `dirtyCellIds` は別物

| フラグ | 用途 |
|--------|------|
| `dirtyRowIds` | 保存対象の行 ID セット（PATCH 送信に使う） |
| `dirtyCellIds` | セルの黄色ハイライト表示用 |

混同すると「保存はされたが黄色が消えない」「表示は消えたが保存されていない」などのバグが生じる。

→ [[summaries/src-stores]]

---

## 3. `json` / `text` 型セルはグリッドで直接編集不可

`columnTypeConfig.ts` でこれらの型は `gridReadonly: true` になっている。
グリッド上でダブルクリックしても編集モードにならない（`json` は JsonEditorPanel、`text` は読み取り専用 td）。
「なぜ編集できないのか」とデバッグする前にこの設定を確認すること。

→ [[summaries/src-lib]]、[[concepts/data-model/Schema_Definition]]

---

## 4. `boolean` は Enter キーで編集できない

`boolean` 型は `supportsKbdEdit: false`。Enter キーは無効。クリック（td 全体がボタン）でのみトグルできる。
キーボードナビゲーション系の機能を触るときに注意。

→ [[summaries/src-lib]]

---

## 5. `Cell` の `committedRef` フラグを消さない

`src/components/spreadsheet/Cell.tsx` にある `committedRef` は、Enter/Tab 後に続けて発生する `onBlur` イベントで二重 `commitEdit` が呼ばれるのを防ぐフラグ。
セル編集フローを変更するときにこのフラグを削除・無効化すると、1 回の確定で 2 回保存が走るバグが発生する。

→ [[summaries/src-spreadsheet]]、[[concepts/spreadsheet/Cell_Editing]]

---

## 6. `commandHistory` はモジュールスコープのシングルトン

`src/domain/commands.ts` でエクスポートされる `commandHistory` オブジェクトは Zustand の外にある。
`useCommandHistoryStore` はこのシングルトンを React に橋渡しする薄いブリッジに過ぎず、`canUndo`/`canRedo` だけを Zustand に持つ。
Undo/Redo 関連を修正するときは Zustand ストアではなくシングルトン側を見ること。

→ [[summaries/src-domain]]、[[concepts/Undo_Redo]]

---

## 7. システム予約フィールドはユーザーカラムに使えない

`Row` 型の以下のキーはシステムが専用目的で使用する。ユーザーが定義するカラムの `key` としては使用不可。

| フィールド | 用途 |
|-----------|------|
| `_id` | 行 ID（6 文字乱数） |
| `_order` | ソート順（数値） |
| `_invalid` | バリデーション違反値の保存場所 |
| `_origin` | ビュー（union / join）越しの行の出自 `{ table, id }`。編集の書き戻し先 |

> 2026-05-30 のビュークエリ統合で、旧 `_source`（union）と `_sources`（lookup）は
> 単一の `_origin = { table, id }` に統一された。

→ [[summaries/src-types]]

---

## 関連

- [[summaries/src-stores]] — adapter・dirtyRowIds・dirtyCellIds の詳細
- [[summaries/src-lib]] — columnTypeConfig の全型設定
- [[summaries/src-domain]] — commandHistory シングルトン
- [[summaries/server]] — 2サーバー実装の挙動差異
- [[concepts/how-to/Add_Column_Type]] — 新型追加時の落とし穴も含む手順書
