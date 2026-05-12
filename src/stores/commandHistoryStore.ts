import { commandHistory } from '@/domain/commands';
import { create } from 'zustand';

interface CommandHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  sync: () => void;
}

export const useCommandHistoryStore = create<CommandHistoryState>((set) => ({
  canUndo: false,
  canRedo: false,

  undo: () => {
    commandHistory.undo();
    set({ canUndo: commandHistory.canUndo, canRedo: commandHistory.canRedo });
  },

  redo: () => {
    commandHistory.redo();
    set({ canUndo: commandHistory.canUndo, canRedo: commandHistory.canRedo });
  },

  sync: () => {
    set({ canUndo: commandHistory.canUndo, canRedo: commandHistory.canRedo });
  },
}));
