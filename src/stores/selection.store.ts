import { create } from 'zustand'

export type CellPosition = {
  rowId: string
  colKey: string
  tableName: string
}

export type SelectionBounds = {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

interface SelectionState {
  cursor: CellPosition | null
  anchorCell: CellPosition | null
  editingCell: CellPosition | null
  editInitialValue: string | null

  // Normal navigation: resets selection to single cell
  setCursor: (pos: CellPosition | null) => void
  // Range extension: moves cursor/focus but keeps anchor
  extendCursor: (pos: CellPosition) => void
  setEditing: (pos: CellPosition | null) => void
  // Type-to-edit: start editing with the character that was typed
  startEditWithInput: (pos: CellPosition, initialValue: string) => void
  clearEditInitialValue: () => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  cursor: null,
  anchorCell: null,
  editingCell: null,
  editInitialValue: null,

  setCursor: (pos) => set({ cursor: pos, anchorCell: pos }),
  extendCursor: (pos) =>
    set((state) => ({
      cursor: pos,
      anchorCell: state.anchorCell ?? state.cursor ?? pos,
    })),
  setEditing: (pos) => set({ editingCell: pos, editInitialValue: null }),
  startEditWithInput: (pos, initialValue) =>
    set({
      cursor: pos,
      anchorCell: pos,
      editingCell: pos,
      editInitialValue: initialValue,
    }),
  clearEditInitialValue: () => set({ editInitialValue: null }),
}))
