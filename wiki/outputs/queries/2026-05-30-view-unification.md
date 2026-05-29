# クエリ: ビュー型（filter / union / lookup）の統合可能性

**質問**: 別々になっている filter / union / lookup ビューを 1 つのクエリ表現に統合できるか。SQL ライク or 独自形式。（UI は棚上げ）

**根拠**: `raw/articles/view-architecture-idea.md`（着想元）+ [[concepts/data-model/View_Queries]] + コード直接調査（`src/domain/{filter,union,lookup}.ts`・`src/lib/viewRowSource.ts`・`src/types/view.ts`）

---

## 現状: 3 型は関係演算の異なる軸に対応

| ビュー型 | 関係演算 | 形 | 編集（書き戻し） |
|---|---|---|---|
| `filter` | 選択 + 射影 + ソート | 単一表 | ベース表へ直接 |
| `lookup` | LEFT JOIN | 水平拡張（列が増える） | ベース列=編集可 / 展開列=`readonly` |
| `union` | UNION ALL | 垂直結合（行が増える） | `_source` で元表へルーティング |

実装上、`applyUnion` / `applyLookup` はどちらも内部で `applyFilter` を呼ぶ（フィルタは共通部品）。
行の出自は **`_source`（union）/ `_sources`（lookup）** というアドホックなフィールドで持ち、
書き戻し先は [[concepts/architecture/Domain_Logic|viewRowSource]] の `getRowOwnerTable` が解決している。

## 核心: 「読み取り変換」より「書き戻し（編集）」が本丸

SQL の SELECT は読み取り専用だが、**Gridman のビューは編集可能なグリッド**である。
ここが「ただのクエリ言語」にできない最大の理由。統合モデルは、各セルが
**どの物理テーブルのどの行・列に書き戻るか（provenance）** を表現できなければならない。
現状の `_source`/`_sources` はこの provenance の特殊化に過ぎず、統合の際はこれを一般化するのが設計の中心になる。

## 統合可能性の評価

- **filter と lookup は自然に 1 つに畳める**。両者は「単一ベース表 + 任意の JOIN + WHERE + 射影」。
  lookup は filter に join が付いただけ。→ 共通の `SelectQuery` に統合できる。
- **union は構造が異なる（垂直軸）**。1 つの SELECT には畳めないが、`SelectQuery` の配列を
  縦結合する薄いラッパとして表現できる。

着想元の独自形式は、実は `SelectQuery` の表面構文そのもの:

```
table(enemy:e, item:i by e.dropItemId) column(e.name, i.value)
  → from=enemy:e, join=item:i on e.dropItemId, select=[e.name, i.value]   （= lookup）

table(enemy:e) column(e.name, e.hp) filter(e.hp > 10 and e.attack > 30)
  → from=enemy:e, select=[...], where=...                                  （= filter）
```

## 推奨: 「構造化 JSON モデルを正本」＋テキスト DSL は後付けの入力層

着想の「1. SQL ライク / 2. 独自形式」はどちらも**テキスト構文**だが、**保存形式（正本）は構造化 JSON にすべき**。

| 形式 | パーサ | 検証 | UI 往復 | 自由度 | provenance |
|---|---|---|---|---|---|
| SQL ライク（テキスト） | 要・複雑 | 困難 | 困難 | 広すぎ（着想でも懸念） | 表現しにくい |
| 独自テキスト DSL | 要・中 | 中 | 中 | 中 | 表現しにくい |
| **構造化 JSON モデル（推奨）** | 不要 | 容易 | 容易 | 設計で絞れる | 型で表現できる |

構造化 JSON なら既存の `FilterExpr` をそのまま `where` に再利用でき、`project.json` の現行方式とも整合する。
テキスト DSL（SQL ライク or `table()/column()` 形式）は、**構造化モデルへコンパイルする任意の入力/表示層**として
後から載せられる。「SQL だと自由度が高すぎる」という懸念は、正本を構造化モデルにすれば自然に解決する。

### 統合クエリモデル（たたき台）

```ts
// filter と lookup を吸収する単一の SELECT
type SelectQuery = {
  from: { table: string; as?: string };
  joins?: Array<{
    table: string; as: string;
    on: { left: string; right: string };  // e.dropItemId == item._id
    fields?: string[];                      // 展開する列（readonly）
  }>;
  where?: FilterExpr;          // 既存の FilterExpr を再利用
  select?: string[];           // 'e.name' / 'i.value'（alias.field）
  orderBy?: SortDef[];
};

// union は SelectQuery の縦結合ラッパ
type ViewQuery = SelectQuery | { unionAll: SelectQuery[] };
```

- `joins` 無しの `SelectQuery` ＝ 現 filter、`joins` 有り ＝ 現 lookup。
- `{ unionAll: [...] }` ＝ 現 union。
- 3 型が実質 **1.5 種**（SelectQuery + union ラッパ）に減る。

### 書き戻し（provenance）の一般化

`_source`/`_sources` を、結果行が必ず持つ **出自メタデータ**に一般化する:

```ts
// 各結果行: ベース表と行 ID を保持。JOIN 展開列は readonly（現 lookup と同じ）。
row.__origin = { table: 'enemy', id: 'e_xxx' }
```

union 行は各 `SelectQuery` の `from` がそのまま `__origin` になる。
これにより `getRowOwnerTable` の union/lookup 分岐が **単一の `__origin` 参照**に統一できる。

## 影響範囲とフェーズ分割（重要）

これは **新インターフェース設計 + 横断変更（>10 ファイル）** に該当し、
AGENTS.md の「大規模タスク中止条件」にあたる。一括実装せず、段階分割を推奨:

- **Phase 0（設計確定）**: 本ドキュメントを起点に `SelectQuery` / `__origin` を確定（`discussion` に記録）
- **Phase 1（読み取り統合）**: `applySelect`（filter+lookup を吸収）を新設し、union は `applySelect` を各 source に適用するラッパ化。旧 `applyFilter/Lookup/Union` を内部置換。旧 `ViewQuery` 型からの移行シムを用意
- **Phase 2（書き戻し統合）**: `_source`/`_sources` → `__origin` へ一般化し `viewRowSource` を単純化
- **Phase 3（UI / テキスト DSL）**: 棚上げ中。統合 UI、および任意でテキスト DSL ⇄ 構造化モデルのコンパイラ

**移行リスク**: `fixtures/sample/project.json` の `views` は現状空のため E2E への影響は小さいが、
ビュー作成系の E2E（filter/lookup/union spec）と既存ユーザの `project.json` は移行が必要。
Phase 1 で旧→新の変換シムを必ず用意すること。

## 結論

- **統合は可能かつ妥当**。filter+lookup は `SelectQuery` に自然統合、union は縦結合ラッパ。
- 保存形式は **構造化 JSON モデルを正本**にし、SQL/独自テキストは後付けの入力層に留めるのが安全。
- 設計の本丸は読み取り変換ではなく **編集の書き戻し（provenance の一般化）**。
- 規模的に大規模タスク。Phase 0（設計確定）から段階的に進めるべき。

## 関連 wiki ページ

- [[concepts/data-model/View_Queries]] — 現行 3 型の定義（本統合で再構成対象）
- [[concepts/architecture/Domain_Logic]] — applyFilter/Union/Lookup と書き戻し
- [[concepts/how-to/Add_View_Type]] — 現状「新型追加＝触る箇所リスト」。統合後は不要化する見込み
- [[outputs/queries/2026-05-30-design-review]] — ②（viewTypeConfig）と地続き。本統合はその先の構造改革
