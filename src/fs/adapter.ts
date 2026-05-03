import type { PageTemplate } from '@/types/page';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { ProjectConfig } from '@/types/view';

export interface FileSystemAdapter {
  readProjectConfig(projectPath: string): Promise<ProjectConfig>;
  writeProjectConfig(projectPath: string, config: ProjectConfig): Promise<void>;
  readTable(projectPath: string, tableName: string): Promise<Row[]>;
  patchTable(projectPath: string, tableName: string, rows: Row[]): Promise<void>;
  readSchema(projectPath: string, tableName: string): Promise<TableSchema>;
  readPageTemplate(projectPath: string, name: string): Promise<PageTemplate>;
  writePageTemplate(projectPath: string, name: string, template: PageTemplate): Promise<void>;
  listPageTemplates(projectPath: string): Promise<string[]>;
}
