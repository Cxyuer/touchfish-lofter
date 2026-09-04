/*
 * 全局字号 store
 */
import { create } from 'zustand';
import { vscode } from '../utils/vscode';

interface FontSizeState {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
  setFontSize: (size: number) => void;
}

export const useFontSizeStore = create<FontSizeState>((set) => ({
  fontSize: window.fontSize || 14,
  increase: () =>
    set((state) => {
      const newSize = state.fontSize + 1;
      vscode.postMessage({ command: 'SAVE_FONT_SIZE', payload: newSize });
      return { fontSize: newSize };
    }),
  decrease: () =>
    set((state) => {
      const newSize = Math.max(12, state.fontSize - 1);
      vscode.postMessage({ command: 'SAVE_FONT_SIZE', payload: newSize });
      return { fontSize: newSize };
    }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
