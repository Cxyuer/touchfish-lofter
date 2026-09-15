/*
 * 消息处理器：管理 webview <-> 扩展宿主之间的请求 / 响应配对
 * 与 touchFish/xhs/src/utils/messageHandler.ts 一致
 */
type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

class MessageHandler {
  private pendingRequests = new Map<string, PendingRequest>();
  private static instance: MessageHandler;

  private constructor() {
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  public static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }

  private handleMessage(event: MessageEvent) {
    const response = event.data;
    if (!response?.uuid || !this.pendingRequests.has(response.uuid)) return;

    const pendingRequest = this.pendingRequests.get(response.uuid)!;
    clearTimeout(pendingRequest.timeoutId);

    if (
      response.payload &&
      typeof response.payload.ok !== 'undefined' &&
      response.payload.ok !== 1 &&
      response.payload.ok !== true
    ) {
      pendingRequest.reject(new Error(response.payload.msg || '请求失败'));
    } else {
      pendingRequest.resolve(response.payload);
    }
    this.pendingRequests.delete(response.uuid);
  }

  public addRequest(
    uuid: string,
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
    timeout: number = 30000
  ) {
    const timeoutId = setTimeout(() => {
      this.pendingRequests.delete(uuid);
      reject(new Error('请求超时'));
    }, timeout);

    this.pendingRequests.set(uuid, { resolve, reject, timeoutId });
  }
}

export const messageHandler = MessageHandler.getInstance();
