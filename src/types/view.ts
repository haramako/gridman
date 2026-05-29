export type FilterExpr =
  | { op: 'and' | 'or'; conditions: FilterExpr[] }
  | {
      column: string;
      op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith';
      value: unknown;
    }
  | { column: string; op: 'isNull' | 'isNotNull' };

export type SortDef = { column: string; order: 'asc' | 'desc' };

/** 参照先テーブルのフィールドを展開する JOIN 指定。右辺は常に参照先の _id（1:1 保証）。 */
export type Join = { column: string; from: string; as: string; fields: string[] };

/**
 * 単一ベーステーブルの選択クエリ。filter / lookup を統合したもの。
 * - joins 無し ＝ 旧 filter ビュー（ベース表をそのまま編集）
 * - joins 有り ＝ 旧 lookup ビュー（展開列は readonly）
 */
export type SelectQuery = {
  type: 'select';
  from: string;
  filter?: FilterExpr;
  sort?: SortDef[];
  columns?: string[];
  joins?: Join[];
};

/** union の各ソース（ベース表＋任意の列絞り込み・フィルタ。JOIN は持たない）。 */
export type UnionSource = { from: string; columns?: string[]; filter?: FilterExpr };

/** 複数の SelectQuery 相当を縦結合する。各行に _origin で元テーブルを付与。 */
export type UnionQuery = {
  type: 'union';
  sources: UnionSource[];
};

export type PageViewQuery = {
  type: 'page';
  from: string;
  filter?: FilterExpr;
  pageLayout?: string;
};

export type ViewQuery = SelectQuery | UnionQuery | PageViewQuery;

export type ViewDefinition = {
  id: string;
  name: string;
  query: ViewQuery;
};

export type SharedEnum = {
  name: string;
  values: string[];
};

export type ProjectConfig = {
  version: number;
  name: string;
  tables: string[];
  views: ViewDefinition[];
  enums?: SharedEnum[];
};
