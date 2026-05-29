# ビュー型（filter / union / lookup）の統合設計

**日付**: 2026-05-30
**関連ファイル**: `src/types/view.ts`, `src/domain/filter.ts`, `src/domain/union.ts`, `src/domain/lookup.ts`, `src/lib/viewRowSource.ts`, `wiki/raw/articles/view-architecture-idea.md`, `wiki/outputs/queries/2026-05-30-view-unification.md`

## 相談内容

filter / union / lookup の 3 ビュー型が別々に定義・実装されており（型・domain 関数・作成ダイアログがそれぞれ独立）、使い勝手とコードの両面で分かれているのが課題。これを 1 つのクエリ表現に統合できるか、SQL ライク or 独自形式で設計できないかを相談。ビュー作成 UI は今回は棚上げし、クエリの**モデル**に集中。グリル（/grill-me）で設計ツリーを 1 問ずつ確定させた。

## 検討した選択肢

- **保存形式**: SQL ライク（テキスト）/ 独自テキスト DSL / 構造化 JSON モデル
- **JOIN カーディナリティ**: 1:1 のみ / 1:N も許可
- **結合キー**: 右＝_id 固定+左任意 / 左を ref 型限定 / 任意の base.X==ref.Y
- **provenance 粒度**: 行単位 / 列単位
- **union 順序**: ソース順連結 / union 全体 orderBy
- **移行**: 読込時変換シム / 永続互換レイヤ / ハードカットオーバー

## 決定事項

1. **保存形式は構造化 JSON モデルを正本。テキスト DSL は後付けの入力層（後回し）** — パーサ不要・検証容易・既存 `FilterExpr` を再利用でき、provenance を型で表現できる。「SQL だと自由度が高すぎる」懸念は構造化モデルなら自然に解決。目的は将来の統合ビュー UI の土台＋3 domain 関数の内部統合。
2. **JOIN は 1:1 のみ** — 「1 結果行＝1 編集可能行」の不変条件を保つ。1:N は行が増殖し編集の書き戻しと相性が悪い。
3. **結合キーは 右＝参照先 `_id` 固定 / 左＝任意カラム** — `_id` が一意なので 1:1 を自動保証。現 lookup と完全互換。ref/ref[] 型カラムなら refTable を自動補完。
4. **provenance は行単位 `_origin = {table, id}`** — JOIN 展開列は readonly 維持。`_source`/`_sources` をこれに一本化し `getRowOwnerTable` の分岐を消す。列単位は YAGNI で見送り（将来必要なら拡張）。
5. **union は SelectQuery のフラットなリスト（入れ子なし）** — `{ unionAll: SelectQuery[] }`。ソース順連結・各ソース内 `_order` 順（UNION ALL・重複除去なし・列マージはキー基準＝現状維持）。member SelectQuery は join/where を持ててよい（制約しない）。
6. **移行はハードカットオーバー（変換なし）** — 開発段階で守るべき実データがないため。3 ダイアログは UI 据え置きで出力マッピングのみ新形式に更新。形状依存の E2E は追従修正。

### 確定モデル

```ts
type SelectQuery = {
  from: { table: string; as?: string };
  joins?: Array<{ table: string; as: string; column: string; fields?: string[] }>; // 右は _id 固定
  where?: FilterExpr;          // 既存を再利用
  select?: string[];           // 'e.name' / 'i.value'
  orderBy?: SortDef[];
};
type ViewQuery = SelectQuery | { unionAll: SelectQuery[] };
```

filter ＝ joins 無しの SelectQuery、lookup ＝ joins 有り、union ＝ SelectQuery の平らなリスト。3 型が実質 1.5 種に減る。

## 変更されたファイル

- （設計フェーズのため実装変更なし）`wiki/outputs/queries/2026-05-30-view-unification.md` に調査、本ファイルに決定を記録。

## 未解決・持ち越し

実装はフェーズ分割（AGENTS.md の大規模タスク停止基準該当）。各フェーズを別タスク・別 PR とする:

- **Phase 1**: `SelectQuery` 型を `src/types/view.ts` に定義し `applySelect`（filter+lookup を吸収）を新設。union は `applySelect` を各 source に適用するラッパ化。旧 `applyFilter/Union/Lookup` と旧 `ViewQuery` 型を削除（ハードカット）。3 ダイアログの出力を新形式に更新し E2E を追従。
- **Phase 2**: `_source`/`_sources` を `_origin = {table, id}` に一般化し `viewRowSource.ts` を単純化。
- **Phase 3（棚上げ）**: 統合ビュー作成 UI、および任意でテキスト DSL ⇄ 構造化モデルのコンパイラ。
- `_origin` は予約フィールド規約（`_id`/`_order`/`_invalid` 等）に合わせ単一アンダースコアで命名する。
