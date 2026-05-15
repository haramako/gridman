import { useProjectStore } from '@/stores/project.store';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RECENT_KEY = 'recentProjects';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function addRecent(path: string) {
  const list = [path, ...getRecent().filter((p) => p !== path)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function HomePage() {
  const navigate = useNavigate();
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const setAdapter = useProjectStore((s) => s.setAdapter);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  const openProject = async (projectPath: string) => {
    if (!projectPath.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/project?path=${encodeURIComponent(projectPath.trim())}`);
      if (!res.ok) throw new Error('プロジェクトが見つかりません');
      const project = await res.json();
      addRecent(projectPath.trim());
      setAdapter('server');
      const firstTable = project.tables?.[0] ?? '';
      navigate(`/editor?project=${encodeURIComponent(projectPath.trim())}&table=${firstTable}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '開けませんでした');
    }
  };

  const openFolder = async () => {
    setError('');
    try {
      const dirHandle = await (window as unknown as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      setAdapter('file-system-access', dirHandle);
      addRecent(dirHandle.name);
      navigate(`/editor?project=${encodeURIComponent(dirHandle.name)}&table=`);
    } catch (e) {
      if (e instanceof Error) {
        if (e.name !== 'AbortError') setError(e.message);
      } else {
        setError('フォルダを開けませんでした');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-semibold">Spreadsheet</h1>

      <div className="w-full max-w-lg flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="プロジェクトフォルダのパスを入力..."
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openProject(path)}
          />
          <button
            type="button"
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:opacity-90"
            onClick={() => openProject(path)}
          >
            開く
          </button>
        </div>
        <button type="button" className="px-4 py-2 border rounded text-sm hover:bg-accent" onClick={openFolder}>
          📁 フォルダを選択（Chrome/Edge）
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {recent.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="text-sm text-muted-foreground mb-2">最近開いたプロジェクト</p>
          <div className="flex flex-col gap-1">
            {recent.map((p) => (
              <button
                key={p}
                type="button"
                className="text-left px-3 py-2 rounded border text-sm hover:bg-accent truncate"
                onClick={() => openProject(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
