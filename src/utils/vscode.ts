/*
 * VSCode Webview API 封装
 * 与 touchFish/xhs/src/utils/vscode.ts 保持一致：
 * - 在 VS Code/Cursor 等 webview 中使用 acquireVsCodeApi
 * - 在浏览器 dev 模式下回退到 console / localStorage，便于独立调试
 */
import type { WebviewApi } from 'vscode-webview';

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /** 是否运行在真实的 VS Code webview 环境里 */
  public get isExtensionHost(): boolean {
    return !!this.vsCodeApi;
  }

  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      // 浏览器模式下仅打印，mock 层会通过 window.postMessage 模拟回包
      console.log('[lofter:postMessage]', message);
    }
  }

  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem('vscodeState');
      return state ? JSON.parse(state) : undefined;
    }
  }

  public setState<T extends unknown | undefined>(newState: T): T {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem('vscodeState', JSON.stringify(newState));
      return newState;
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
