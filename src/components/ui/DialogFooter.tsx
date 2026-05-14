interface DialogFooterProps {
  onClose: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  onDelete?: () => void;
}

export default function DialogFooter({
  onClose,
  onSave,
  saveDisabled,
  saveLabel = '保存',
  onDelete,
}: DialogFooterProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <div>
        {onDelete && (
          <button
            type="button"
            className="text-sm text-destructive hover:underline"
            onClick={onDelete}
          >
            削除
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded border text-sm hover:bg-accent"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-40"
          disabled={saveDisabled}
          onClick={onSave}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
