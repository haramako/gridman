import FilterViewDialog from '@/components/filter/FilterViewDialog';
import LookupViewDialog from '@/components/lookup/LookupViewDialog';
import PageTemplateDialog from '@/components/page/PageTemplateDialog';
import SchemaEditorDialog from '@/components/schema/SchemaEditorDialog';
import UnionViewDialog from '@/components/union/UnionViewDialog';
import { useProjectStore } from '@/stores/project.store';
import { useViewStore } from '@/stores/view.store';
import type { PageTemplate } from '@/types/page';
import type { TableSchema } from '@/types/schema';
import type { PageViewQuery, ProjectConfig, ViewDefinition } from '@/types/view';
import { useState } from 'react';

interface UseDialogStateOptions {
  project: ProjectConfig | null;
  schemas: Map<string, TableSchema>;
  activeView: ViewDefinition | null;
  schema: TableSchema | undefined;
}

export function useDialogState({ project, schemas, activeView, schema }: UseDialogStateOptions) {
  const { addView, updateView, deleteView, updateSchema, stealLock, addPageTemplate, deletePageTemplate } =
    useProjectStore();
  const { setActiveViewId } = useViewStore();

  const [schemaEditorTable, setSchemaEditorTable] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'filter' | 'union' | 'lookup' | 'page'>('filter');
  const [editingView, setEditingView] = useState<ViewDefinition | undefined>();
  const [editingPageTemplate, setEditingPageTemplate] = useState<
    (PageTemplate & { id?: string }) | undefined
  >();
  const [showLockStealConfirm, setShowLockStealConfirm] = useState(false);

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

  const openCreatePageTemplate = () => {
    setEditingPageTemplate(undefined);
    setDialogType('page');
    setDialogOpen(true);
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

  const handleSavePageTemplate = async (template: PageTemplate & { id?: string }) => {
    await addPageTemplate(template);
    setDialogOpen(false);

    const viewId = `page-${template.name}`;
    const existingView = project?.views.find((v: ViewDefinition) => v.id === viewId);
    if (!existingView) {
      const newView: ViewDefinition = {
        id: viewId,
        name: template.name,
        query: {
          type: 'page',
          from: template.table,
          pageLayout: template.name,
        } satisfies PageViewQuery,
      };
      await addView(newView);
      setActiveViewId(viewId);
    }
  };

  const dialogs = (
    <>
      {dialogOpen && dialogType === 'filter' && project && (
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
      {dialogOpen && dialogType === 'union' && project && (
        <UnionViewDialog
          schemas={schemas}
          tables={project.tables}
          editView={editingView}
          onSave={handleSaveView}
          onDelete={editingView ? handleDeleteView : undefined}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {dialogOpen && dialogType === 'lookup' && project && (
        <LookupViewDialog
          schemas={schemas}
          tables={project.tables}
          editView={editingView}
          onSave={handleSaveView}
          onDelete={editingView ? handleDeleteView : undefined}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {dialogOpen && dialogType === 'page' && project && (
        <>
          {(() => {
            const pageSchema = schema ?? schemas.get(project.tables[0]);
            if (!pageSchema) return null;
            return (
              <PageTemplateDialog
                schema={pageSchema}
                tables={project.tables}
                schemas={schemas}
                editTemplate={editingPageTemplate}
                onSave={handleSavePageTemplate}
                onDelete={
                  editingPageTemplate?.id
                    ? () => {
                        deletePageTemplate(editingPageTemplate.name);
                        setDialogOpen(false);
                      }
                    : undefined
                }
                onClose={() => setDialogOpen(false)}
              />
            );
          })()}
        </>
      )}

      {schemaEditorTable &&
        (() => {
          const schemaEditorSchema = schemas.get(schemaEditorTable);
          return (
            schemaEditorSchema && (
              <SchemaEditorDialog
                tableName={schemaEditorTable}
                schema={schemaEditorSchema}
                tables={project?.tables ?? []}
                onSave={async (newSchema) => {
                  await updateSchema(schemaEditorTable, newSchema);
                  setSchemaEditorTable(null);
                }}
                onClose={() => setSchemaEditorTable(null)}
              />
            )
          );
        })()}

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
                type="button"
                className="px-3 py-1.5 rounded border text-sm hover:bg-accent"
                onClick={() => setShowLockStealConfirm(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
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
    </>
  );

  return {
    openCreateDialog,
    openEditDialog,
    openCreatePageTemplate,
    openSchemaEditor: setSchemaEditorTable,
    setShowLockStealConfirm,
    dialogs,
  };
}
