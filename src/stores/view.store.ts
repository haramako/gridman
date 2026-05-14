import { create } from 'zustand';

export type SearchResult = {
  tableName: string;
  tableDisplayName: string;
  rowId: string;
  columnKey: string;
  columnDisplayName: string;
  value: unknown;
  row: Record<string, unknown>;
};

interface ViewState {
  activeViewId: string | null;
  filter: string;
  searchQuery: string;
  searchResults: SearchResult[];
  searchTargetTable: string | null;

  setActiveViewId: (id: string | null) => void;
  setFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchTargetTable: (tableName: string | null) => void;
  clearSearch: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  activeViewId: null,
  filter: '',
  searchQuery: '',
  searchResults: [],
  searchTargetTable: null,

  setActiveViewId: (id) => set({ activeViewId: id }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchTargetTable: (tableName) => set({ searchTargetTable: tableName }),
  clearSearch: () => set({ searchQuery: '', searchResults: [], searchTargetTable: null }),
}));
