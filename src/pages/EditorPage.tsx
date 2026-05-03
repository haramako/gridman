import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/project.store'
import { useViewStore } from '@/stores/view.store'
import { useSelectionStore } from '@/stores/selection.store'
import { applyFilter } from '@/domain/filter'
import SpreadsheetView from '@/components/spreadsheet/SpreadsheetView'
import FilterViewDialog from '@/components/filter/FilterViewDialog'
import type { FilterViewQuery, ViewDefinition } from '@/types/view'
import type { Row } from '@/types/row'

export default function EditorPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const projectPath = params.get('project') ?? ''
  const tableName = params.get('table') ?? ''

  const { project, schemas, tables, isDirty, dirtyRowIds, loadProject, saveAll, addView, updateView, deleteView, undo, redo } = useProjectStore()
  const { activeViewId, setActiveViewId } = useViewStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingView, setEditingView] = useState<ViewDefinition | undefined>()

  useEffect(() => {
    if (!projectPath) { navigate('/'); return }
    loadProject(projectPath).catch(() => navigate('/'))
  }, [projectPath])

  // Ctrl+S / Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      if (e.key === 's') { e.preventDefault(); saveAll(); return }
      // Skip undo/redo while a cell is being edited (let the input handle native undo)
      if (useSelectionStore.getState().editingCell) return
      if (e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveAll, undo, redo])

  useEffect(() => {
    const name = project?.name ?? 'Spreadsheet'
    document.title = isDirty ? `* ${name}` : name
    return () => { document.title = 'Spreadsheet' }
  }, [isDirty, project?.name])

  const activeView = project?.views.find((v) => v.id === activeViewId) ?? null

  const currentTable = useMemo(() => {
    if (activeView?.query.type === 'filter') {
      return (activeView.query as FilterViewQuery).from
    }
    return tableName || project?.tables[0] || ''
  }, [activeView, tableName, project?.tables])

  const schema = schemas.get(currentTable)
  const rawRows = tables.get(currentTable)

  const displayRows = useMemo((): Map<string, Row> => {
    if (!rawRows) return new Map()
    if (activeView?.query.type === 'filter') {
      const q = activeView.query as FilterViewQuery
      const filtered = applyFilter([...rawRows.values()], q.filter)
      return new Map(filtered.map((r) => [r._id as string, r]))
    }
    return rawRows
  }, [rawRows, activeView])

  const openCreateDialog = () => {
    setEditingView(undefined)
    setDialogOpen(true)
  }

  const openEditDialog = () => {
    if (activeView) {
      setEditingView(activeView)
      setDialogOpen(true)
    }
  }

  const handleSaveView = async (view: ViewDefinition) => {
    if (editingView) {
      await updateView(view)
    } else {
      await addView(view)
    }
    setActiveViewId(view.id)
  }

  const handleDeleteView = async (id: string) => {
    await deleteView(id)
    setActiveViewId(null)
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        読み込み中...
      </div>
    )
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
        <span className="text-xs text-muted-foreground">{isDirty ? '未保存の変更があります' : ''}</span>
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
            const isTableDirty = (dirtyRowIds.get(name)?.size ?? 0) > 0
            const isActive = !activeViewId && name === currentTable
            return (
              <button
                key={name}
                className={`text-left px-4 py-1.5 text-sm hover:bg-accent ${isActive ? 'bg-accent font-medium' : ''}`}
                onClick={() => { setActiveViewId(null); setParams({ project: projectPath, table: name }) }}
              >
                {isTableDirty ? '* ' : ''}{schemas.get(name)?.displayName ?? name}
              </button>
            )
          })}

          {/* Views */}
          <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t mt-2">
            ビュー
          </div>
          <button
            className="text-left px-4 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={openCreateDialog}
          >
            + 追加
          </button>
          {project.views.map((view) => (
            <button
              key={view.id}
              className={`text-left px-4 py-1.5 text-sm hover:bg-accent flex items-center gap-1 ${activeViewId === view.id ? 'bg-accent font-medium' : ''}`}
              onClick={() => setActiveViewId(view.id)}
            >
              <span className="text-xs opacity-60">🔍</span>
              <span className="truncate">{view.name}</span>
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {schema ? (
            <SpreadsheetView
              tableName={currentTable}
              schema={schema}
              rows={displayRows}
              activeView={activeView ?? undefined}
              onEditView={openEditDialog}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              テーブルを選択してください
            </div>
          )}
        </main>
      </div>

      {/* FilterViewDialog */}
      {dialogOpen && (
        <FilterViewDialog
          schemas={schemas}
          tables={project.tables}
          editView={editingView}
          onSave={handleSaveView}
          onDelete={editingView ? handleDeleteView : undefined}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}
