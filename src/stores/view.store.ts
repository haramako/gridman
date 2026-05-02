import { create } from 'zustand'

interface ViewState {
  activeViewId: string | null
  filter: string

  setActiveViewId: (id: string | null) => void
  setFilter: (filter: string) => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeViewId: null,
  filter: '',

  setActiveViewId: (id) => set({ activeViewId: id }),
  setFilter: (filter) => set({ filter }),
}))
