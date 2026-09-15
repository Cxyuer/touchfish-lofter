/*
 * 全局配置 store（showImg 等）
 */
import { create } from 'zustand';
import { vscode } from '../utils/vscode';

interface ConfigState {
  showImg: boolean;
  setShowImg: (show: boolean) => void;
  toggleShowImg: () => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  showImg: (window as any).windowConfig?.showImg !== false,
  setShowImg: (showImg) => set({ showImg }),
  toggleShowImg: () => {
    const nextState = !get().showImg;
    set({ showImg: nextState });
    vscode.postMessage({ command: 'TOGGLE_SHOW_IMG', payload: nextState });
  },
}));
