/*
 * 通用工具函数（镜像 touchFish/xhs/src/utils/utils.tsx，去除小红书专属逻辑）
 */

/** 生成简单 UUID */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 生成 traceId 风格的随机串 */
export function generateXB3TraceId(len = 16): string {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** 防抖 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** 节流 */
export function throttle<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      fn(...args);
    }
  };
}

/** 相对时间格式化 */
export function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '';
  try {
    let ts = timestamp;
    if (ts < 1e11) ts *= 1000;
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    if (year === now.getFullYear()) return `${month}-${day} ${hour}:${minute}`;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return '';
  }
}

/** 数字易读化 */
export function formatCount(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(n)) return '0';
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1) + 'k';
  if (n < 1000000) return (n / 10000).toFixed(1) + 'w';
  return (n / 1000000).toFixed(1) + 'm';
}

/** 解析 #话题# 标签 */
export function parseTopicTags(
  text: string,
): Array<{ type: 'text' | 'tag'; content: string }> {
  if (!text) return [];
  const result: Array<{ type: 'text' | 'tag'; content: string }> = [];
  const regex = /#([^#]+)#/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    const tagContent = match[1].replace(/\[[^\]]*\]/g, '');
    if (tagContent.trim()) {
      result.push({ type: 'tag', content: tagContent });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    result.push({ type: 'text', content: text.substring(lastIndex) });
  }
  return result.length > 0 ? result : [{ type: 'text', content: text }];
}
