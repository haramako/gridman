import type { Row } from '@/types/row'
import type { TableSchema } from '@/types/schema'
import type { ProjectConfig } from '@/types/view'
import type { FileSystemAdapter } from './adapter'

const BASE = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

export class LocalServerAdapter implements FileSystemAdapter {
  async readProjectConfig(projectPath: string): Promise<ProjectConfig> {
    return fetchJson(`${BASE}/project?path=${encodeURIComponent(projectPath)}`)
  }

  async writeProjectConfig(projectPath: string, config: ProjectConfig): Promise<void> {
    await fetch(`${BASE}/project?path=${encodeURIComponent(projectPath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  }

  async readTable(projectPath: string, tableName: string): Promise<Row[]> {
    return fetchJson(`${BASE}/tables/${tableName}?project=${encodeURIComponent(projectPath)}`)
  }

  async patchTable(projectPath: string, tableName: string, rows: Row[]): Promise<void> {
    await fetch(`${BASE}/tables/${tableName}?project=${encodeURIComponent(projectPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
  }

  async readSchema(projectPath: string, tableName: string): Promise<TableSchema> {
    return fetchJson(`${BASE}/schemas/${tableName}?project=${encodeURIComponent(projectPath)}`)
  }
}
