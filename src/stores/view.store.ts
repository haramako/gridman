import { create } from 'zustand'
import type { ViewDefinition } from '@/types/view'

interface ViewState {
  activeView: ViewDefinition | null
  filter: string

  setActiveView: (view: ViewDefinition) => void
  setFilter: (filter: string) => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: null,
  filter: '',

  setActiveView: (view) => set({ activeView: view }),
  setFilter: (filter) => set({ filter }),
}))
