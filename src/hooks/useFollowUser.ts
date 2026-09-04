/*
 * 关注 / 取关 Hook
 * 对应 touchFish/xhs/src/hooks/useFollowUser.ts
 */
import { useCallback, useRef, useState } from 'react';
import { createLofterApi } from '../api';
import { useRequest } from './useRequest';

interface UseFollowUserOptions {
  initialFollowing?: boolean;
  onSuccess?: (isFollowing: boolean) => void;
  onError?: (error: any, isFollowing: boolean) => void;
}

export function useFollowUser(options: UseFollowUserOptions = {}) {
  const { initialFollowing = false, onSuccess, onError } = options;
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const { request, messageApi } = useRequest();
  const apiRef = useRef(createLofterApi(request));

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!userId || loading) return;
      setLoading(true);
      const wasFollowing = isFollowing;
      try {
        setIsFollowing(!wasFollowing);
        if (wasFollowing) {
          await apiRef.current.unfollowUser({ target_user_id: userId });
          messageApi.success('已取消关注');
        } else {
          await apiRef.current.followUser({ target_user_id: userId });
          messageApi.success('关注成功');
        }
        onSuccess?.(!wasFollowing);
      } catch (e: any) {
        setIsFollowing(wasFollowing);
        messageApi.error(e?.message || (wasFollowing ? '取消关注失败' : '关注失败'));
        onError?.(e, wasFollowing);
      } finally {
        setLoading(false);
      }
    },
    [isFollowing, loading, messageApi, onSuccess, onError],
  );

  const setFollowing = useCallback((f: boolean) => setIsFollowing(f), []);

  return { isFollowing, loading, toggleFollow, setFollowing };
}

export default useFollowUser;
