import { create } from 'zustand'

export type CellPosition = {
  rowId: string
  colKey: string
  tableName: string
}

interface SelectionState {
  cursor: CellPosition | null
  editingCell: CellPosition | null

  setCursor: (pos: CellPosition | null) => void
  setEditing: (pos: CellPosition | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  cursor: null,
  editingCell: null,

  setCursor: (pos) => set({ cursor: pos }),
  setEditing: (pos) => set({ editingCell: pos }),
}))
