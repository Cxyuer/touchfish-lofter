/*
 * 首页 Feed 数据 Hook（支持发现/关注双流切换）
 * 对应 touchFish/weibo/src/App.tsx 中 tabs 切换 + getListData 的逻辑
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createLofterApi } from '../api';
import { useRequest } from './useRequest';
import type { LofterFeedItem, LofterFeedResponse } from '../types/lofter';

export type FeedMode = 'home' | 'following';

interface UseLofterFeedOptions {
  initialCursor?: string;
  mode?: FeedMode;
}

export function useLofterFeed(options: UseLofterFeedOptions = {}) {
  const { initialCursor = '' } = options;
  const [items, setItems] = useState<LofterFeedItem[]>([]);
  const [cursor, setCursor] = useState<string>(initialCursor);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FeedMode>(options.mode || 'home');

  const { request } = useRequest();
  const apiRef = useRef(createLofterApi(request));
  const cursorRef = useRef<string>(initialCursor);
  const loadingRef = useRef<boolean>(false);
  const initedRef = useRef<boolean>(false);
  const modeRef = useRef<FeedMode>(mode);

  const load = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const nextCursor = reset ? '' : cursorRef.current;
      const res: LofterFeedResponse = modeRef.current === 'following'
        ? await apiRef.current.getFollowingFeed({ cursor: nextCursor })
        : await apiRef.current.getHomeFeed({ cursor: nextCursor });
      const incoming = res.items || [];
      setItems((prev) => (reset ? incoming : [...prev, ...incoming]));
      cursorRef.current = res.cursor || '';
      setCursor(res.cursor || '');
      setHasMore(res.has_more !== false && incoming.length > 0);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    cursorRef.current = '';
    setCursor('');
    setHasMore(true);
  }, []);

  const refresh = useCallback(async () => {
    clear();
    await load(true);
  }, [clear, load]);

  // 切换模式：清空并重新加载
  const switchMode = useCallback((nextMode: FeedMode) => {
    if (modeRef.current === nextMode) return;
    modeRef.current = nextMode;
    setMode(nextMode);
    clear();
    load(true);
  }, [clear, load]);

  // 挂载时自动加载首页
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    load(true);
  }, [load]);

  return { items, cursor, loading, hasMore, error, mode, loadMore: load, refresh, clear, switchMode };
}

export default useLofterFeed;
