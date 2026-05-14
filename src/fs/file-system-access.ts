import type { PageTemplate } from '@/types/page';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { ProjectConfig } from '@/types/view';
import type { FileSystemAdapter } from './adapter';

export class FileSystemAccessAPIAdapter implements FileSystemAdapter {
  constructor(private dirHandle: FileSystemDirectoryHandle) {}

  async readProjectConfig(_projectPath: string): Promise<ProjectConfig> {
    const fileHandle = await this.dirHandle.getFileHandle('project.json');
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async writeProjectConfig(_projectPath: string, config: ProjectConfig): Promise<void> {
    const fileHandle = await this.dirHandle.getFileHandle('project.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(config, null, 2));
    await writable.close();
  }

  async readTable(_projectPath: string, tableName: string): Promise<Row[]> {
    const fileHandle = await this.dirHandle.getFileHandle(`${tableName}.jsonl`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  }

  async patchTable(
    _projectPath: string,
    tableName: string,
    rows: Row[],
    deletedIds: string[]
  ): Promise<void> {
    const fileHandle = await this.dirHandle.getFileHandle(`${tableName}.jsonl`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const existingRows = new Map<string, Row>();
    for (const line of text.split('\n').filter((l) => l.trim())) {
      const row = JSON.parse(line);
      existingRows.set(row._id as string, row);
    }
    for (const row of rows) {
      existingRows.set(row._id as string, row);
    }
    for (const id of deletedIds) {
      existingRows.delete(id);
    }
    const writable = await fileHandle.createWritable();
    for (const row of existingRows.values()) {
      await writable.write(`${JSON.stringify(row)}\n`);
    }
    await writable.close();
  }

  async readSchema(_projectPath: string, tableName: string): Promise<TableSchema> {
    const fileHandle = await this.dirHandle.getFileHandle(`${tableName}.schema.json`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async writeSchema(_projectPath: string, tableName: string, schema: TableSchema): Promise<void> {
    const fileHandle = await this.dirHandle.getFileHandle(`${tableName}.schema.json`, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(schema, null, 2));
    await writable.close();
  }

  async readPageTemplate(_projectPath: string, name: string): Promise<PageTemplate> {
    const fileHandle = await this.dirHandle.getFileHandle(`${name}.page.json`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async writePageTemplate(
    _projectPath: string,
    name: string,
    template: PageTemplate
  ): Promise<void> {
    const fileHandle = await this.dirHandle.getFileHandle(`${name}.page.json`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(template, null, 2));
    await writable.close();
  }

  async deletePageTemplate(_projectPath: string, name: string): Promise<void> {
    await this.dirHandle.removeEntry(`${name}.page.json`);
  }

  async listPageTemplates(_projectPath: string): Promise<string[]> {
    const templates: string[] = [];
    for await (const entry of (this.dirHandle as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.page.json')) {
        templates.push(entry.name.replace(/\.page\.json$/, ''));
      }
    }
    return templates;
  }
}
