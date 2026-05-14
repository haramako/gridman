import { useProjectStore } from '@/stores/project.store';
import { useViewStore } from '@/stores/view.store';
import type { SearchResult } from '@/stores/view.store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEBOUNCE_MS = 300;

export default function SearchPage() {
  const navigate = useNavigate();
  const { project, tables, schemas } = useProjectStore();
  const { searchQuery, searchResults, setSearchQuery, setSearchResults, clearSearch } =
    useViewStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim() || !project) {
        setSearchResults([]);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const results: SearchResult[] = [];

      for (const [tableName, rowMap] of tables.entries()) {
        const schema = schemas.get(tableName);
        if (!schema) continue;

        for (const [rowId, row] of rowMap.entries()) {
          for (const col of schema.columns) {
            const value = row[col.key];
            if (value === undefined || value === null) continue;

            let strValue: string;
            if (typeof value === 'object') {
              strValue = JSON.stringify(value);
            } else {
              strValue = String(value);
            }

            if (strValue.toLowerCase().includes(lowerQuery)) {
              results.push({
                tableName,
                tableDisplayName: schema.displayName ?? tableName,
                rowId,
                columnKey: col.key,
                columnDisplayName: col.displayName,
                value: strValue.length > 100 ? `${strValue.slice(0, 100)}...` : strValue,
                row: row as Record<string, unknown>,
              });
            }
          }
        }
      }

      setSearchResults(results);
    },
    [project, tables, schemas, setSearchResults]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setLocalQuery(value);
      setSearchQuery(value);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_MS);
    },
    [setSearchQuery, performSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [searchQuery, performSearch]);

  const groupedResults = useMemo(() => {
    const groups: Map<string, SearchResult[]> = new Map();
    for (const result of searchResults) {
      const key = result.tableName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(result);
    }
    return groups;
  }, [searchResults]);

  const handleResultClick = (result: SearchResult) => {
    navigate(
      `/editor?project=${encodeURIComponent(project?.name ?? '')}&table=${result.tableName}`
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, result: SearchResult) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleResultClick(result);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        プロジェクトが読み込まれていません
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center gap-3 shrink-0">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/')}
        >
          ← ホーム
        </button>
        <span className="font-semibold text-sm">{project.name}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm">横断検索</span>
        <div className="flex-1" />
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm hover:bg-accent"
          onClick={() => {
            clearSearch();
            setLocalQuery('');
            navigate(
              `/editor?project=${encodeURIComponent(project.name)}&table=${project.tables[0] ?? ''}`
            );
          }}
        >
          閉じる
        </button>
      </header>

      {/* Search Input */}
      <div className="px-4 py-3 border-b shrink-0">
        <div className="max-w-2xl">
          <input
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="検索クエリを入力..."
            value={localQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {searchResults.length === 0 && !localQuery ? (
          <div className="text-center text-muted-foreground text-sm mt-8">
            検索クエリを入力して検索してください（自動的に検索されます）
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm mt-8">
            「{localQuery}」に一致する結果はありません
          </div>
        ) : (
          <div className="max-w-4xl space-y-4">
            <div className="text-sm text-muted-foreground">
              {searchResults.length} 件の結果が見つかりました
            </div>

            {[...groupedResults.entries()].map(([tableName, results]) => {
              const schema = schemas.get(tableName);
              return (
                <div key={tableName} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 text-sm font-medium flex items-center gap-2">
                    <span>📊</span>
                    <span>{schema?.displayName ?? tableName}</span>
                    <span className="text-muted-foreground text-xs">({results.length} 件)</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">行ID</th>
                        <th className="text-left px-4 py-2 font-medium">列</th>
                        <th className="text-left px-4 py-2 font-medium">値</th>
                        <th className="text-left px-4 py-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, idx) => (
                        <tr
                          key={`${result.rowId}-${result.columnKey}-${idx}`}
                          className="border-b hover:bg-accent/50 cursor-pointer"
                          onClick={() => handleResultClick(result)}
                          onKeyDown={(e) => handleKeyDown(e, result)}
                          tabIndex={0}
                        >
                          <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                            {result.rowId}
                          </td>
                          <td className="px-4 py-2">{result.columnDisplayName}</td>
                          <td className="px-4 py-2 max-w-md truncate">{String(result.value)}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResultClick(result);
                              }}
                            >
                              ジャンプ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
