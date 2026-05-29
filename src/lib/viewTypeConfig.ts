import type { ViewQuery } from '@/types/view';

export type ViewType = ViewQuery['type'];

export type ViewTypeConfig = {
  /** サイドバー・ツールバーでビュー種別を表すアイコン */
  icon: string;
};

/**
 * ビュー種別ごとのメタデータ。`columnTypeConfig` のビュー版。
 * 表示用メタデータ（アイコン等）を集約し、各所の `query.type` 分岐の重複を防ぐ。
 * 結果計算ロジック（applySelect / applyUnion）はドメイン層に置く。
 */
export const VIEW_TYPE_CONFIG: Record<ViewType, ViewTypeConfig> = {
  select: { icon: '🔍' },
  union: { icon: '⊕' },
  // page ビューは現状 select と同じアイコンを使う（既存挙動を維持）
  page: { icon: '🔍' },
};
