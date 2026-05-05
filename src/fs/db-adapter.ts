import type { PageTemplate } from '@/types/page';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { ProjectConfig } from '@/types/view';
import type { FileSystemAdapter } from './adapter';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`DB API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

/**
 * Adapter that talks to the SQLite-backed DB server (server/db-server.ts).
 * Drop-in replacement for LocalServerAdapter — swap the base URL to point at
 * the DB server (default port 8082).
 */
export class DbServerAdapter implements FileSystemAdapter {
  constructor(private base = 'http://localhost:8082') {}

  private url(path: string): string {
    return `${this.base}${path}`;
  }

  async readProjectConfig(projectPath: string): Promise<ProjectConfig> {
    return fetchJson(this.url(`/api/project?path=${encodeURIComponent(projectPath)}`));
  }

  async writeProjectConfig(projectPath: string, config: ProjectConfig): Promise<void> {
    await fetch(this.url(`/api/project?path=${encodeURIComponent(projectPath)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  async readTable(projectPath: string, tableName: string): Promise<Row[]> {
    return fetchJson(
      this.url(`/api/tables/${tableName}?project=${encodeURIComponent(projectPath)}`)
    );
  }

  async patchTable(projectPath: string, tableName: string, rows: Row[]): Promise<void> {
    await fetch(this.url(`/api/tables/${tableName}?project=${encodeURIComponent(projectPath)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
  }

  async readSchema(projectPath: string, tableName: string): Promise<TableSchema> {
    return fetchJson(
      this.url(`/api/schemas/${tableName}?project=${encodeURIComponent(projectPath)}`)
    );
  }

  async writeSchema(projectPath: string, tableName: string, schema: TableSchema): Promise<void> {
    await fetch(this.url(`/api/schemas/${tableName}?project=${encodeURIComponent(projectPath)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });
  }

  async readPageTemplate(projectPath: string, name: string): Promise<PageTemplate> {
    return fetchJson(
      this.url(`/api/page-templates/${name}?project=${encodeURIComponent(projectPath)}`)
    );
  }

  async writePageTemplate(
    projectPath: string,
    name: string,
    template: PageTemplate
  ): Promise<void> {
    await fetch(
      this.url(`/api/page-templates/${name}?project=${encodeURIComponent(projectPath)}`),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      }
    );
  }

  async listPageTemplates(projectPath: string): Promise<string[]> {
    return fetchJson(this.url(`/api/page-templates?project=${encodeURIComponent(projectPath)}`));
  }

  async deletePageTemplate(projectPath: string, name: string): Promise<void> {
    await fetch(
      this.url(`/api/page-templates/${name}?project=${encodeURIComponent(projectPath)}`),
      { method: 'DELETE' }
    );
  }
}
