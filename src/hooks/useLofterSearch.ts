/*
 * 搜索 Hook（支持文章/用户两种模式）
 */
import { useCallback, useRef, useState } from 'react';
import { createLofterApi } from '../api';

export type SearchMode = 'posts' | 'blogs';

interface UseLofterSearchOptions {
  request: any;
}

export const useLofterSearch = ({ request }: UseLofterSearchOptions) => {
  const apiRef = useRef(createLofterApi(request));
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  // keyword state 仅供内部 setKeyword 重置时使用，外部读 keywordRef
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [keyword, setKeyword] = useState('');
  const [cursor, setCursor] = useState('');
  const [mode, setMode] = useState<SearchMode>('posts');
  const modeRef = useRef<SearchMode>('posts');
  // 防竞态 token：快速搜索时旧请求结果被丢弃
  const searchTokenRef = useRef(0);
  // 最新 keyword ref，供 doSearch 内同步读取
  const keywordRef = useRef('');

  const doSearch = useCallback(async (kw: string, m: SearchMode) => {
    const trimmed = kw?.trim();
    if (!trimmed) return;
    const token = ++searchTokenRef.current;
    setLoading(true);
    setKeyword(trimmed);
    keywordRef.current = trimmed;
    setResults([]);
    setHasMore(true);
    setCursor('');
    try {
      const api: any = apiRef.current;
      const res: any = m === 'blogs'
        ? await api.searchBlogs({ keyword: trimmed })
        : await api.searchPosts({ keyword: trimmed });
      if (searchTokenRef.current !== token) return; // 旧请求，丢弃
      setResults(res?.items || []);
      setHasMore(!!res?.has_more);
      setCursor(res?.cursor || '');
    } catch (e) {
      if (searchTokenRef.current !== token) return;
      console.error('[lofter search] error', e);
      throw e;
    } finally {
      if (searchTokenRef.current === token) setLoading(false);
    }
  }, []);

  const search = useCallback(async (kw: string) => {
    await doSearch(kw, modeRef.current);
  }, [doSearch]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !keywordRef.current) return;
    const token = searchTokenRef.current;
    setLoading(true);
    try {
      const api: any = apiRef.current;
      const res: any = modeRef.current === 'blogs'
        ? await api.searchBlogs({ keyword: keywordRef.current, cursor })
        : await api.searchPosts({ keyword: keywordRef.current, cursor });
      if (searchTokenRef.current !== token) return;
      setResults((prev) => [...prev, ...(res?.items || [])]);
      setHasMore(!!res?.has_more);
      setCursor(res?.cursor || '');
    } catch (e) {
      if (searchTokenRef.current !== token) return;
      console.error('[lofter search more] error', e);
    } finally {
      if (searchTokenRef.current === token) setLoading(false);
    }
  }, [hasMore, loading, cursor]);

  const switchMode = useCallback((m: SearchMode) => {
    if (modeRef.current === m) return;
    modeRef.current = m;
    setMode(m);
    setResults([]);
    setHasMore(true);
    setCursor('');
    // 注意：保留 keyword，不清空。切 Tab 时由调用方根据当前 keyword 自动重搜
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setHasMore(true);
    setLoading(false);
    setKeyword('');
    setCursor('');
  }, []);

  return { loading, results, hasMore, search, loadMore, reset, mode, switchMode };
};
