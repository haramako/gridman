import type { ColumnDef } from '@/types/schema';
import type { ProjectConfig, SharedEnum } from '@/types/view';

export function resolveEnumValues(
  colDef: ColumnDef,
  project: ProjectConfig | null
): string[] | undefined {
  if (colDef.enumValues) {
    return colDef.enumValues;
  }
  if (colDef.enumRef && project?.enums) {
    const shared = project.enums.find((e: SharedEnum) => e.name === colDef.enumRef);
    return shared?.values;
  }
  return undefined;
}
