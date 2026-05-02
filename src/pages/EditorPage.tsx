import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/project.store'
import SpreadsheetView from '@/components/spreadsheet/SpreadsheetView'

export default function EditorPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const projectPath = params.get('project') ?? ''
  const tableName = params.get('table') ?? ''

  const { project, schemas, tables, isDirty, loadProject, saveAll } = useProjectStore()

  useEffect(() => {
    if (!projectPath) { navigate('/'); return }
    loadProject(projectPath).catch(() => navigate('/'))
  }, [projectPath])

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveAll() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveAll])

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        読み込み中...
      </div>
    )
  }

  const currentTable = tableName || project.tables[0] || ''
  const schema = schemas.get(currentTable)
  const rows = tables.get(currentTable)

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
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            テーブル
          </div>
          {project.tables.map((name) => (
            <button
              key={name}
              className={`text-left px-4 py-1.5 text-sm hover:bg-accent ${
                name === currentTable ? 'bg-accent font-medium' : ''
              }`}
              onClick={() =>
                setParams({ project: projectPath, table: name })
              }
            >
              {schemas.get(name)?.displayName ?? name}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {schema && rows ? (
            <SpreadsheetView tableName={currentTable} schema={schema} rows={rows} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              テーブルを選択してください
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
