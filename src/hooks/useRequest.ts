/*
 * 通用请求 Hook
 * ---------------------------------------------------------------------------
 * 策略：每次都先尝试 realApi，失败立刻 fallback mock
 *   - 浏览器 dev 模式：fetch /lofter-api/... → Vite 代理 → LOFTER
 *   - VSCode webview：fetch http://127.0.0.1:port/lofter-api/... → 扩展宿主代理 → LOFTER
 * 不用 ping 缓存，避免一次抽风导致永久 fallback
 */
import { App } from 'antd';
import { useCallback } from 'react';
import type { LofterCommandList } from '../types/lofter';
import { vscode } from '../utils/vscode';
import { mockProvider } from '../mock/provider';
import { realApi } from '../api/lofterRealApi';

const REAL_API_HANDLERS: Partial<Record<LofterCommandList, (payload: any) => Promise<any>>> = {
  LOFTER_GET_HOME_FEED: realApi.getHomeFeed,
  LOFTER_GET_FOLLOWING_FEED: realApi.getFollowingFeed,
  LOFTER_GET_MY_INFO: realApi.getMyInfo,
  LOFTER_USER_INFO: realApi.getUserInfo,
  LOFTER_GET_USER_POSTS: realApi.getUserPosts,
  LOFTER_GET_LIKED_POSTS: realApi.getLikedPosts,
  LOFTER_GET_USER_LIKED_POSTS: realApi.getUserLikedPosts,
  LOFTER_POST_DETAIL: realApi.getPostDetail,
  LOFTER_GET_COMMENTS: realApi.getComments,
  LOFTER_GET_SUB_COMMENTS: realApi.getSubComments,
  LOFTER_SEARCH: realApi.searchPosts,
  LOFTER_SEARCH_BLOGS: realApi.searchBlogs,
  LOFTER_POST_LIKE: realApi.likePost,
  LOFTER_POST_DISLIKE: realApi.dislikePost,
  LOFTER_POST_COLLECT: realApi.collectPost,
  LOFTER_POST_UNCOLLECT: realApi.uncollectPost,
  LOFTER_USER_FOLLOW: realApi.followUser,
  LOFTER_USER_UNFOLLOW: realApi.unfollowUser,
  LOFTER_POST_COMMENT: realApi.postComment,
  LOFTER_UPLOAD_IMAGE: realApi.uploadImage,
  LOFTER_PUBLISH_POST: realApi.publishPost,
};

/** 首次 realApi 成功后置 true，避免每次都走 try/catch；但失败也不缓存，下次还会试 */
let realApiAvailable = false;

export const useRequest = () => {
  const { message: messageApi } = App.useApp();

  const request = useCallback(
    async <T = any>(command: LofterCommandList, payload: any): Promise<T> => {
      const realHandler = REAL_API_HANDLERS[command];
      if (realHandler) {
        // 先试 realApi（除非之前已经确认可用，那就直接走）
        try {
          const result = await realHandler(payload);
          if (!realApiAvailable) {
            realApiAvailable = true;
             
            console.log('[lofter] real API connected ✓');
          }
          return result as T;
        } catch (e: any) {
           
          console.warn(`[lofter] real API for ${command} failed, falling back to mock:`, e?.message || e);
        }
      }

      // 配置类命令在 webview 里通过 postMessage 通知宿主持久化
      if (vscode.isExtensionHost) {
        try {
          vscode.postMessage({ command, payload });
        } catch {
          /* ignore */
        }
      }

      return mockProvider.handle(command, payload) as Promise<T>;
    },
    [],
  );

  return { request, messageApi };
};
