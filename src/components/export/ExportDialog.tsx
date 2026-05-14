import { exportToCsv, exportToJson } from '@/domain/exportData';
import type { Row } from '@/types/row';
import type { TableSchema } from '@/types/schema';
import { useState } from 'react';

interface Props {
  tableName: string;
  schema: TableSchema;
  rows: Map<string, Row>;
  onClose: () => void;
}

type ExportFormat = 'json' | 'csv';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export default function ExportDialog({ tableName, schema, rows, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('json');

  const rowArray = [...rows.values()];
  const displayName = schema.displayName || tableName;

  const handleExport = () => {
    const base = sanitizeFilename(displayName);
    if (format === 'json') {
      const content = exportToJson(rowArray, schema);
      downloadFile(content, `${base}.json`, 'application/json');
    } else {
      const content = exportToCsv(rowArray, schema);
      downloadFile(content, `${base}.csv`, 'text/csv');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-lg w-80 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">エクスポート</h2>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            テーブル: <span className="text-foreground font-medium">{displayName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            行数: <span className="text-foreground font-medium">{rowArray.length}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">形式</p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
            />
            JSON
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
            />
            CSV
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded border text-sm hover:bg-accent"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
            onClick={handleExport}
          >
            ダウンロード
          </button>
        </div>
      </div>
    </div>
  );
}
