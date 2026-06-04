// @vitest-environment jsdom
import {
  type DraftData,
  type LockData,
  acquireLock,
  checkLock,
  clearDraft,
  deserializeTables,
  getTabId,
  initStorageSync,
  loadDraft,
  onSyncMessage,
  releaseLock,
  saveDraft,
  stealLock,
} from '@/utils/autoSave';
import type { Row } from '@/types/row';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const PATH = 'proj-a';
const lockKey = (p: string) => `gridman:lock:${encodeURIComponent(p)}`;
const draftKey = (p: string) => `gridman:draft:${encodeURIComponent(p)}`;

const writeLock = (p: string, lock: LockData) =>
  localStorage.setItem(lockKey(p), JSON.stringify(lock));

beforeEach(() => {
  localStorage.clear();
});

// ---- ロック ----

describe('checkLock', () => {
  it('ロックが無ければ null', () => {
    expect(checkLock(PATH)).toBeNull();
  });

  it('ロックがあれば LockData を返す', () => {
    writeLock(PATH, { tabId: 'other', acquiredAt: 123 });
    expect(checkLock(PATH)).toEqual({ tabId: 'other', acquiredAt: 123 });
  });

  it('壊れた JSON なら null', () => {
    localStorage.setItem(lockKey(PATH), 'not-json');
    expect(checkLock(PATH)).toBeNull();
  });
});

describe('acquireLock', () => {
  it('ロックが無ければ取得し、自タブの tabId が記録される', () => {
    expect(acquireLock(PATH)).toBe(true);
    expect(checkLock(PATH)?.tabId).toBe(getTabId());
  });

  it('自タブが保持中なら true', () => {
    acquireLock(PATH);
    expect(acquireLock(PATH)).toBe(true);
  });

  it('他タブが保持中（30秒未満）なら false、既存ロックを上書きしない', () => {
    writeLock(PATH, { tabId: 'other', acquiredAt: Date.now() });
    expect(acquireLock(PATH)).toBe(false);
    expect(checkLock(PATH)?.tabId).toBe('other');
  });

  it('他タブのロックが 30 秒以上古ければ奪取して true', () => {
    writeLock(PATH, { tabId: 'other', acquiredAt: Date.now() - 31_000 });
    expect(acquireLock(PATH)).toBe(true);
    expect(checkLock(PATH)?.tabId).toBe(getTabId());
  });
});

describe('releaseLock', () => {
  it('自タブのロックを解放する', () => {
    acquireLock(PATH);
    releaseLock(PATH);
    expect(checkLock(PATH)).toBeNull();
  });

  it('他タブのロックは解放しない', () => {
    writeLock(PATH, { tabId: 'other', acquiredAt: Date.now() });
    releaseLock(PATH);
    expect(checkLock(PATH)?.tabId).toBe('other');
  });

  it('ロックが無くても例外を投げない', () => {
    expect(() => releaseLock(PATH)).not.toThrow();
  });
});

describe('stealLock', () => {
  it('他タブのロックを自タブで上書きする', () => {
    writeLock(PATH, { tabId: 'other', acquiredAt: Date.now() });
    expect(stealLock(PATH)).toBe(true);
    expect(checkLock(PATH)?.tabId).toBe(getTabId());
  });
});

// ---- ドラフト ----

describe('saveDraft / loadDraft / deserializeTables', () => {
  const tables = new Map<string, Map<string, Row>>([
    [
      'enemy',
      new Map<string, Row>([
        ['r1', { _id: 'r1', _order: 0, name: 'スライム', hp: 10 }],
        ['r2', { _id: 'r2', _order: 1, name: 'ゴブリン', hp: 20 }],
      ]),
    ],
  ]);

  it('保存したドラフトを読み戻すと行の値が保持される', () => {
    saveDraft(PATH, tables);
    const draft = loadDraft(PATH);
    expect(draft).not.toBeNull();
    expect(draft?.tables.enemy.r1.name).toBe('スライム');
    expect(draft?.tables.enemy.r2.hp).toBe(20);
    expect(typeof draft?.savedAt).toBe('number');
  });

  it('deserializeTables で Record を Map に戻せる', () => {
    saveDraft(PATH, tables);
    const draft = loadDraft(PATH) as DraftData;
    const restored = deserializeTables(draft.tables);
    expect(restored.get('enemy')?.get('r1')?.name).toBe('スライム');
    expect(restored.get('enemy')?.size).toBe(2);
  });

  it('ドラフトが無ければ loadDraft は null', () => {
    expect(loadDraft(PATH)).toBeNull();
  });

  it('壊れた JSON なら loadDraft は null', () => {
    localStorage.setItem(draftKey(PATH), 'not-json');
    expect(loadDraft(PATH)).toBeNull();
  });

  it('clearDraft で削除される', () => {
    saveDraft(PATH, tables);
    clearDraft(PATH);
    expect(loadDraft(PATH)).toBeNull();
  });
});

// ---- マルチタブ同期（storage イベント）----

describe('initStorageSync', () => {
  beforeAll(() => {
    // window への storage リスナ登録は 1 回だけ（複数回だとコールバックが重複発火する）
    initStorageSync();
  });

  const dispatch = (key: string, newValue: string | null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));

  it('他タブのロック取得イベントを lock-acquired として通知する', () => {
    const cb = vi.fn();
    const unsub = onSyncMessage(cb);
    dispatch(lockKey(PATH), JSON.stringify({ tabId: 'other', acquiredAt: Date.now() }));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({ type: 'lock-acquired', tabId: 'other', projectPath: PATH });
    unsub();
  });

  it('自タブの tabId のロックイベントは通知しない', () => {
    const cb = vi.fn();
    const unsub = onSyncMessage(cb);
    dispatch(lockKey(PATH), JSON.stringify({ tabId: getTabId(), acquiredAt: Date.now() }));
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it('ロックキーで壊れた値なら lock-released として通知する', () => {
    const cb = vi.fn();
    const unsub = onSyncMessage(cb);
    dispatch(lockKey(PATH), 'not-json');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({ type: 'lock-released', projectPath: PATH });
    unsub();
  });

  it('ドラフト更新イベントを draft-updated として draft 付きで通知する', () => {
    const cb = vi.fn();
    const unsub = onSyncMessage(cb);
    const draft: DraftData = { savedAt: 1, tables: { enemy: { r1: { _id: 'r1', _order: 0 } } } };
    dispatch(draftKey(PATH), JSON.stringify(draft));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({ type: 'draft-updated', projectPath: PATH });
    expect(cb.mock.calls[0][0].draft).toEqual(draft);
    unsub();
  });

  it('unsubscribe 後はコールバックされない', () => {
    const cb = vi.fn();
    const unsub = onSyncMessage(cb);
    unsub();
    dispatch(lockKey(PATH), JSON.stringify({ tabId: 'other', acquiredAt: Date.now() }));
    expect(cb).not.toHaveBeenCalled();
  });
});
