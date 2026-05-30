import type { FileSystemAdapter } from '@/fs/adapter';
import { FileSystemAccessAPIAdapter } from '@/fs/file-system-access';
import { LocalServerAdapter } from '@/fs/local-server';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import type { ProjectConfig } from '@/types/view';
import { saveDraft } from '@/utils/autoSave';

/**
 * 永続化層: ストレージアダプタのライフサイクル、プロジェクト読み込み I/O、
 * ドラフトの自動保存スケジューリングを担う。reactive な状態は持たず、
 * project.store（reactive 層）から委譲される。
 */

let adapter: FileSystemAdapter = new LocalServerAdapter();

/** 現在のストレージアダプタ。save/load 系はこれを経由する。 */
export function getAdapter(): FileSystemAdapter {
  return adapter;
}

/** アダプタを差し替える。adapterType をストア側で反映するため返す。 */
export function createAdapter(
  type: 'server' | 'file-system-access',
  dirHandle?: FileSystemDirectoryHandle
): 'server' | 'file-system-access' {
  if (type === 'file-system-access' && dirHandle) {
    adapter = new FileSystemAccessAPIAdapter(dirHandle);
    return 'file-system-access';
  }
  adapter = new LocalServerAdapter();
  return 'server';
}

/** プロジェクト設定・スキーマ・テーブルをまとめて読み込む（ドラフト復元・ロックはストア側）。 */
export async function loadProjectData(path: string): Promise<{
  project: ProjectConfig;
  schemas: Map<string, TableSchema>;
  tables: Map<string, Map<string, Row>>;
}> {
  const project = await adapter.readProjectConfig(path);
  const schemas = new Map<string, TableSchema>();
  const tables = new Map<string, Map<string, Row>>();

  await Promise.all(
    project.tables.map(async (name) => {
      const [schema, rows] = await Promise.all([
        adapter.readSchema(path, name),
        adapter.readTable(path, name),
      ]);
      schemas.set(name, schema);
      const tableMap = new Map<string, Row>();
      for (const row of rows) tableMap.set(row._id as string, row);
      tables.set(name, tableMap);
    })
  );

  return { project, schemas, tables };
}

type AutoSaveSnapshot = {
  projectPath: string | null;
  writeMode: boolean;
  tables: Map<string, Map<string, Row>>;
};

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 500ms デバウンスで localStorage にドラフトを自動保存する。state は getState で都度取得。 */
export function scheduleAutoSave(getState: () => AutoSaveSnapshot): void {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const s = getState();
    if (s.projectPath && s.writeMode) {
      saveDraft(s.projectPath, s.tables);
    }
  }, 500);
}
