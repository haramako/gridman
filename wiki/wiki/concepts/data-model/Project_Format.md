# Project Format

`project.json` はプロジェクト全体の設定ファイル。テーブル名の列挙・ビュー定義・共有 enum 定義を保持する。

## 構造

```json
{
  "version": 1,
  "name": "モンスターデータ",
  "tables": ["enemy", "skill", "item"],
  "views": [
    {
      "id": "v1",
      "name": "炎属性の敵",
      "query": {
        "type": "filter",
        "from": "enemy",
        "filter": { "column": "element", "op": "eq", "value": "fire" }
      }
    }
  ],
  "enums": [
    { "name": "elementType", "values": ["fire", "ice", "thunder"] }
  ]
}
```

## フィールド

| フィールド | 型 | 内容 |
|-----------|-----|------|
| `version` | number | フォーマットバージョン（現在 1） |
| `name` | string | プロジェクト表示名 |
| `tables` | string[] | テーブル名の配列。順序がサイドバーの表示順になる |
| `views` | ViewDefinition[] | 保存済みビュー定義（filter / union / lookup） |
| `enums` | EnumDef[] | 複数テーブルで共有できる enum 定義 |

## ビュー定義

`views` 配列の各要素は `ViewDefinition`:

```ts
interface ViewDefinition {
  id: string        // ユニーク ID
  name: string      // サイドバーに表示する名前
  query: SelectQuery | UnionQuery | PageViewQuery
}
```

→ クエリ型の詳細は [[View_Queries]] を参照。

## enums

`enumRef` フィールドを持つカラムが参照する。スキーマローカルな `enumValues` と異なり、**複数テーブル間で共有**できる。

```json
// schema.json 側で参照
{ "key": "element", "type": "enum", "enumRef": "elementType" }

// project.json 側で定義
{ "name": "elementType", "values": ["fire", "ice", "thunder"] }
```

## 関連

- [[Schema_Definition]] — `enumRef` を使うスキーマ側の定義
- [[View_Queries]] — views 配列に格納されるクエリ型
- [[concepts/architecture/Stores]] — `useProjectStore.project` として保持される
