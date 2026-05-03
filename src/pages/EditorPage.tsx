import FilterViewDialog from '@/components/filter/FilterViewDialog';
import JsonEditorPanel from '@/components/editor/JsonEditorPanel';
import LookupViewDialog from '@/components/lookup/LookupViewDialog';
import PageTemplateDialog from '@/components/page/PageTemplateDialog';
import PageView from '@/components/page/PageView';
import SpreadsheetView from '@/components/spreadsheet/SpreadsheetView';
import UnionViewDialog from '@/components/union/UnionViewDialog';
import { applyFilter } from '@/domain/filter';
import { applyLookup } from '@/domain/lookup';
import { applyUnion } from '@/domain/union';
import { useProjectStore } from '@/stores/project.store';
import { useSelectionStore } from '@/stores/selection.store';
import { useViewStore } from '@/stores/view.store';
import type { PageTemplate } from '@/types/page';
import type { Row } from '@/types/row';
import type { FilterViewQuery, LookupViewQuery, UnionViewQuery, ViewDefinition } from '@/types/view';
import { initStorageSync, onSyncMessage, setCurrentProjectPath } from '@/utils/autoSave';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function EditorPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const projectPath = params.get('project') ?? '';
  const tableName = params.get('table') ?? '';

  const {
    project,
    schemas,
    tables,
    isDirty,
    hasDraft,
    writeMode,
    lockHolderTabId,
    dirtyRowIds,
    loadProject,
    saveAll,
    addView,
    updateView,
    deleteView,
    undo,
    redo,
    clearDraftState,
    syncDraftFromTab,
    releaseLock,
    stealLock,
  } = useProjectStore();
  const { activeViewId, setActiveViewId } = useViewStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'filter' | 'union' | 'lookup' | 'page'>('filter');
  const [editingView, setEditingView] = useState<ViewDefinition | undefined>();
  const [editingPageTemplate, setEditingPageTemplate] = useState<(PageTemplate & { id?: string }) | undefined>();
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [showLockStealConfirm, setShowLockStealConfirm] = useState(false);
  const draftHandledRef = useRef(false);

  useEffect(() => {
    initStorageSync();
    const cleanup = onSyncMessage(syncDraftFromTab);
    return cleanup;
  }, [syncDraftFromTab]);

  useEffect(() => {
    setCurrentProjectPath(projectPath || null);
  }, [projectPath]);

  useEffect(() => {
    if (!projectPath) {
      navigate('/');
      return;
    }
    loadProject(projectPath).catch(() => navigate('/'));
  }, [projectPath, navigate, loadProject]);

  useEffect(() => {
    if (writeMode && hasDraft && !draftHandledRef.current && project) {
      draftHandledRef.current = true;
      setShowDraftConfirm(true);
    }
  }, [writeMode, hasDraft, project]);

  const handleDiscardDraft = () => {
    clearDraftState();
    setShowDraftConfirm(false);
    window.location.reload();
  };

  const handleKeepDraft = () => {
    setShowDraftConfirm(false);
  };

  // Warn on browser close/reload if there are unsaved changes or draft
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty || hasDraft) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, hasDraft]);

  // Ctrl+S / Ctrl+Z / Ctrl+Y / Ctrl+Shift+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.key === 's') {
        e.preventDefault();
        saveAll();
        return;
      }
      // Skip undo/redo while a cell is being edited (let the input handle native undo)
      if (useSelectionStore.getState().editingCell) return;
      if (e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'f' && e.shiftKey) {
        e.preventDefault();
        navigate(`/search?project=${encodeURIComponent(project?.name ?? '')}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveAll, undo, redo, navigate, project?.name]);

  useEffect(() => {
    const name = project?.name ?? 'Spreadsheet';
    document.title = isDirty ? `* ${name}` : name;
    return () => {
      document.title = 'Spreadsheet';
    };
  }, [isDirty, project?.name]);

  const activeView = project?.views.find((v) => v.id === activeViewId) ?? null;

  const currentTable = useMemo(() => {
    if (activeView?.query.type === 'filter') {
      return (activeView.query as FilterViewQuery).from;
    }
    if (activeView?.query.type === 'union') {
      return '__union__';
    }
    if (activeView?.query.type === 'lookup') {
      return '__lookup__';
    }
    return tableName || project?.tables[0] || '';
  }, [activeView, tableName, project?.tables]);

  const unionResult = useMemo(() => {
    if (activeView?.query.type !== 'union') return null;
    return applyUnion(activeView.query as UnionViewQuery, tables, schemas);
  }, [activeView, tables, schemas]);

  const lookupResult = useMemo(() => {
    if (activeView?.query.type !== 'lookup') return null;
    return applyLookup(activeView.query as LookupViewQuery, tables, schemas);
  }, [activeView, tables, schemas]);

  const schema = lookupResult?.schema ?? unionResult?.schema ?? schemas.get(currentTable);
  const rawRows = tables.get(currentTable);

  const displayRows = useMemo((): Map<string, Row> => {
    if (activeView?.query.type === 'union' && unionResult) {
      return new Map(unionResult.rows.map((r) => [r._id as string, r]));
    }
    if (activeView?.query.type === 'lookup' && lookupResult) {
      return new Map(lookupResult.rows.map((r) => [r._id as string, r]));
    }
    if (!rawRows) return new Map();
    if (activeView?.query.type === 'filter') {
      const q = activeView.query as FilterViewQuery;
      const filtered = applyFilter([...rawRows.values()], q.filter);
      return new Map(filtered.map((r) => [r._id as string, r]));
    }
    return rawRows;
  }, [rawRows, activeView, unionResult, lookupResult]);

  const isPageView = activeView?.query.type === 'page';
  const pageTemplateName = isPageView ? (activeView.query as any).pageLayout : undefined;
  const [pageTemplate, setPageTemplate] = useState<(PageTemplate & { id?: string }) | null>(null);

  useEffect(() => {
    if (pageTemplateName && projectPath) {
      useProjectStore.getState().readPageTemplate(projectPath, pageTemplateName).then(setPageTemplate).catch(() => setPageTemplate(null));
    } else {
      setPageTemplate(null);
    }
  }, [pageTemplateName, projectPath]);

  const [pageRowIndex, setPageRowIndex] = useState(0);
  const pageRow = useMemo(() => {
    if (!isPageView || !pageTemplate || displayRows.size === 0) return null;
    const rows = [...displayRows.values()];
    return rows[Math.min(pageRowIndex, rows.length - 1)] ?? null;
  }, [isPageView, pageTemplate, displayRows, pageRowIndex]);

  const handlePageNavigate = (index: number) => {
    setPageRowIndex(index);
  };

  const openCreateDialog = (type: 'filter' | 'union' | 'lookup') => {
    setEditingView(undefined);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openEditDialog = () => {
    if (activeView) {
      setEditingView(activeView);
      const t = activeView.query.type;
      setDialogType(t === 'union' ? 'union' : t === 'lookup' ? 'lookup' : 'filter');
      setDialogOpen(true);
    }
  };

  const handleSaveView = async (view: ViewDefinition) => {
    if (editingView) {
      await updateView(view);
    } else {
      await addView(view);
    }
    setActiveViewId(view.id);
  };

  const handleDeleteView = async (id: string) => {
    await deleteView(id);
    setActiveViewId(null);
  };

  const openCreatePageTemplate = () => {
    setEditingPageTemplate(undefined);
    setDialogType('page');
    setDialogOpen(true);
  };

  const handleSavePageTemplate = async (template: PageTemplate & { id?: string }) => {
    const { addPageTemplate } = useProjectStore.getState();
    await addPageTemplate(template);
    setDialogOpen(false);

    // Create a View entry so it appears in the left sidebar
    const viewId = `page-${template.name}`;
    const existingView = project?.views.find((v) => v.id === viewId);
    if (!existingView) {
      const newView: ViewDefinition = {
        id: viewId,
        name: template.name,
        query: { type: 'page', pageLayout: template.name } as any,
      };
      await addView(newView);
      setActiveViewId(viewId);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center gap-3 shrink-0 bg-background z-20">
        <button
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/')}
        >
          ← ホーム
        </button>
        <span className="font-semibold text-sm">{project.name}</span>
        {currentTable && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">{schema?.displayName ?? currentTable}</span>
          </>
        )}
        <div className="flex-1" />
        {!writeMode && lockHolderTabId && (
          <span className="flex items-center gap-2 text-xs text-amber-600">
            読み取り専用
            {hasDraft && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
                他タブで変更あり
              </span>
            )}
            <button
              type="button"
              className="px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-50 text-amber-700"
              onClick={() => setShowLockStealConfirm(true)}
            >
              編集を開始
            </button>
          </span>
        )}
        {writeMode && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            編集可能
            <button
              type="button"
              className="px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-50 text-emerald-700"
              onClick={releaseLock}
            >
              編集終了
            </button>
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {writeMode && (hasDraft && !isDirty
            ? 'ローカルに保存済み'
            : isDirty
              ? '未保存の変更があります'
              : '')}
        </span>
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={() =>
            navigate(`/search?project=${encodeURIComponent(project?.name ?? '')}`)
          }
          title="横断検索 (Ctrl+Shift+F)"
        >
          🔍 検索
        </button>
        <button
          className="px-3 py-1 rounded border text-sm hover:bg-accent disabled:opacity-40"
          disabled={!isDirty}
          onClick={() => saveAll()}
        >
          {isDirty ? '💾 保存*' : '保存済み'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[220px] border-r flex flex-col shrink-0 overflow-y-auto bg-background">
          {/* Tables */}
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            テーブル
          </div>
          {project.tables.map((name) => {
            const isTableDirty = (dirtyRowIds.get(name)?.size ?? 0) > 0;
            const isActive = !activeViewId && name === currentTable;
            return (
              <button
                key={name}
                className={`text-left px-4 py-1.5 text-sm hover:bg-accent ${isActive ? 'bg-accent font-medium' : ''}`}
                onClick={() => {
                  setActiveViewId(null);
                  setParams({ project: projectPath, table: name });
                }}
              >
                {isTableDirty ? '* ' : ''}
                {schemas.get(name)?.displayName ?? name}
              </button>
            );
          })}

          {/* Views */}
          <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t mt-2">
            ビュー
          </div>
          <button
            className="text-left px-4 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => openCreateDialog('filter')}
          >
            + フィルター
          </button>
          <button
            className="text-left px-4 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => openCreateDialog('union')}
          >
            + ユニオン
          </button>
          <button
            className="text-left px-4 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => openCreateDialog('lookup')}
          >
            + ルックアップ
          </button>
          <button
            className="text-left px-4 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={openCreatePageTemplate}
          >
            + ページ
          </button>
          {project.views.map((view) => {
            const icon = view.query.type === 'union' ? '⊕' : view.query.type === 'lookup' ? '🔎' : '🔍'
            return (
              <button
                key={view.id}
                className={`text-left px-4 py-1.5 text-sm hover:bg-accent flex items-center gap-1 ${activeViewId === view.id ? 'bg-accent font-medium' : ''}`}
                onClick={() => setActiveViewId(view.id)}
              >
                <span className="text-xs opacity-60">{icon}</span>
                <span className="truncate">{view.name}</span>
              </button>
            )
          })}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {isPageView && pageTemplate && pageRow ? (
            <PageView
              template={pageTemplate}
              row={pageRow}
              tableName={currentTable}
              schema={schema!}
              schemas={schemas}
              tables={tables}
              currentIndex={pageRowIndex}
              totalRows={displayRows.size}
              onNavigate={handlePageNavigate}
            />
          ) : schema ? (
            <SpreadsheetView
              tableName={currentTable}
              schema={schema}
              rows={displayRows}
              activeView={activeView ?? undefined}
              onEditView={openEditDialog}
              readOnly={!writeMode}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              テーブルを選択してください
            </div>
          )}
        </main>

        {/* JSON Editor Panel */}
        <JsonEditorPanel />
      </div>

      {/* View dialogs */}
       {dialogOpen && dialogType === 'filter' && (
         <FilterViewDialog
           schemas={schemas}
           tables={project.tables}
           project={project}
           editView={editingView}
           onSave={handleSaveView}
           onDelete={editingView ? handleDeleteView : undefined}
           onClose={() => setDialogOpen(false)}
         />
       )}
      {dialogOpen && dialogType === 'union' && (
        <UnionViewDialog
          schemas={schemas}
          tables={project.tables}
          editView={editingView}
          onSave={handleSaveView}
          onDelete={editingView ? handleDeleteView : undefined}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {dialogOpen && dialogType === 'lookup' && (
        <LookupViewDialog
          schemas={schemas}
          tables={project.tables}
          editView={editingView}
          onSave={handleSaveView}
          onDelete={editingView ? handleDeleteView : undefined}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {dialogOpen && dialogType === 'page' && (
        <PageTemplateDialog
          schema={schema ?? schemas.get(project.tables[0])!}
          tables={project.tables}
          schemas={schemas}
          editTemplate={editingPageTemplate}
          onSave={handleSavePageTemplate}
          onDelete={editingPageTemplate?.id ? () => {
            useProjectStore.getState().deletePageTemplate(editingPageTemplate.name);
            setDialogOpen(false);
          } : undefined}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {/* Draft confirmation dialog */}
      {showDraftConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">ローカルに保存された変更があります</h3>
            <p className="text-sm text-muted-foreground mb-4">
              前回セッションでファイルに保存されていない変更が見つかりました。どうしますか？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 rounded border text-sm hover:bg-accent"
                onClick={handleKeepDraft}
              >
                変更を保持
              </button>
              <button
                className="px-3 py-1.5 rounded border text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDiscardDraft}
              >
                破棄して再読み込み
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock steal confirmation dialog */}
      {showLockStealConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">編集モードを開始しますか？</h3>
            <p className="text-sm text-muted-foreground mb-2">
              現在、他のタブがこのプロジェクトを編集中です。
            </p>
            <p className="text-sm text-amber-600 mb-4 font-medium">
              編集モードに切り替えると、他のタブの変更が上書きされる可能性があります。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 rounded border text-sm hover:bg-accent"
                onClick={() => setShowLockStealConfirm(false)}
              >
                キャンセル
              </button>
              <button
                className="px-3 py-1.5 rounded border text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  stealLock();
                  setShowLockStealConfirm(false);
                }}
              >
                編集を開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
