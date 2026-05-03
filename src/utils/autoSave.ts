import type { Row } from '@/types/row';

const DRAFT_KEY_PREFIX = 'gridman:draft:';
const LOCK_KEY_PREFIX = 'gridman:lock:';

const tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function getTabId(): string {
  return tabId;
}

function projectKey(projectPath: string): string {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(projectPath)}`;
}

function lockKey(projectPath: string): string {
  return `${LOCK_KEY_PREFIX}${encodeURIComponent(projectPath)}`;
}

export interface LockData {
  tabId: string;
  acquiredAt: number;
}

export function checkLock(projectPath: string): LockData | null {
  const key = lockKey(projectPath);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as LockData;
  } catch {
    return null;
  }
}

export function acquireLock(projectPath: string): boolean {
  const key = lockKey(projectPath);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const existing: LockData = JSON.parse(raw);
      if (existing.tabId === tabId) return true;
      if (Date.now() - existing.acquiredAt < 30_000) return false;
    }
    const lock: LockData = { tabId, acquiredAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(lock));
    return true;
  } catch {
    const lock: LockData = { tabId, acquiredAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(lock));
    return true;
  }
}

export function releaseLock(projectPath: string): void {
  const key = lockKey(projectPath);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const lock: LockData = JSON.parse(raw);
    if (lock.tabId === tabId) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function stealLock(projectPath: string): boolean {
  const key = lockKey(projectPath);
  try {
    const lock: LockData = { tabId, acquiredAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(lock));
    return true;
  } catch {
    return false;
  }
}

export interface DraftData {
  savedAt: number;
  tables: Record<string, Record<string, Row>>;
}

export function saveDraft(projectPath: string, tables: Map<string, Map<string, Row>>): void {
  const key = projectKey(projectPath);
  const serialized: Record<string, Record<string, Row>> = {};
  for (const [tableName, rowMap] of tables.entries()) {
    serialized[tableName] = Object.fromEntries(rowMap.entries());
  }
  const draft: DraftData = { savedAt: Date.now(), tables: serialized };
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(draft) }));
  } catch {
    // quota exceeded or localStorage unavailable
  }
}

export function loadDraft(projectPath: string): DraftData | null {
  const key = projectKey(projectPath);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

export function clearDraft(projectPath: string): void {
  const key = projectKey(projectPath);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function deserializeTables(
  tables: Record<string, Record<string, Row>>
): Map<string, Map<string, Row>> {
  const result = new Map<string, Map<string, Row>>();
  for (const [tableName, rowRecord] of Object.entries(tables)) {
    result.set(tableName, new Map(Object.entries(rowRecord)));
  }
  return result;
}

export interface SyncMessage {
  type: 'draft-updated' | 'lock-acquired' | 'lock-released';
  projectPath: string;
  tabId: string;
  draft?: DraftData;
}

type SyncCallback = (msg: SyncMessage) => void;

const syncListeners = new Set<SyncCallback>();

export function onSyncMessage(cb: SyncCallback): () => void {
  syncListeners.add(cb);
  return () => {
    syncListeners.delete(cb);
  };
}

export function initStorageSync(): void {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (!e.key || !e.newValue) return;

    if (e.key.startsWith(LOCK_KEY_PREFIX)) {
      const projectPath = decodeURIComponent(e.key.slice(LOCK_KEY_PREFIX.length));
      try {
        const lock: LockData = JSON.parse(e.newValue);
        if (lock.tabId === tabId) return;
        const msg: SyncMessage = {
          type: 'lock-acquired',
          projectPath,
          tabId: lock.tabId,
        };
        for (const cb of syncListeners) cb(msg);
      } catch {
        const projectPath = decodeURIComponent(e.key.slice(LOCK_KEY_PREFIX.length));
        const msg: SyncMessage = { type: 'lock-released', projectPath, tabId: '' };
        for (const cb of syncListeners) cb(msg);
      }
      return;
    }

    if (e.key.startsWith(DRAFT_KEY_PREFIX)) {
      const projectPath = decodeURIComponent(e.key.slice(DRAFT_KEY_PREFIX.length));
      try {
        const draft: DraftData = JSON.parse(e.newValue);
        const msg: SyncMessage = {
          type: 'draft-updated',
          projectPath,
          tabId: '',
          draft,
        };
        for (const cb of syncListeners) cb(msg);
      } catch {
        // ignore malformed
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    const state = (window as unknown as { __currentProjectPath?: string }).__currentProjectPath;
    if (state) {
      releaseLock(state);
    }
  });
}

export function setCurrentProjectPath(path: string | null): void {
  (window as unknown as { __currentProjectPath?: string }).__currentProjectPath = path ?? '';
}
