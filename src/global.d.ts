declare global {
  interface Window {
    showImg?: boolean;
    fontSize?: number;
    /** 由扩展宿主注入的初始配置 */
    windowConfig?: {
      showImg?: boolean;
    };
  }
}
export {};

declare module 'react-masonry-css';
