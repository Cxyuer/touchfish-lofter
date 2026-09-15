/*
 * 文章详情 Hook
 * 对应 touchFish/xhs/src/hooks/useNoteDetail.ts
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLofterApi } from '../api';
import { useRequest } from './useRequest';

interface UsePostDetailOptions {
  postId: string;
  blogId?: string;
  raw?: any;
  open: boolean;
}

export function usePostDetail(options: UsePostDetailOptions) {
  const { postId, blogId, raw, open } = options;
  const { request, messageApi } = useRequest();
  const apiRef = useRef(createLofterApi(request));

  const [post, setPost] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentCursor, setCommentCursor] = useState<string>('');
  const [commentHasMore, setCommentHasMore] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);
  const [commentsInitialized, setCommentsInitialized] = useState(false);

  const [likeLoading, setLikeLoading] = useState(false);
  const [likedState, setLikedState] = useState(false);
  const [likedCountState, setLikedCountState] = useState(0);

  const [collectLoading, setCollectLoading] = useState(false);
  const [collectedState, setCollectedState] = useState(false);
  const [collectedCountState, setCollectedCountState] = useState(0);

  const postData = useMemo(() => {
    const p = post?.post || post;
    const info = p?.interact_info || {};
    return {
      postId: p?.post_id || '',
      blogId: p?.blog_id || p?.user?.user_id || '',
      type: p?.type || '',
      title: p?.title || '',
      desc: p?.content || '',
      quoteText: p?.quote_text || '',
      quoteSource: p?.quote_source || '',
      linkUrl: p?.link_url || '',
      images: p?.images || [],
      videoUrl: p?.video_url,
      videoPoster: p?.video_poster,
      audioUrl: p?.audio_url,
      audioTitle: p?.audio_title,
      user: p?.user || {},
      tags: p?.tag_list || [],
      liked: likedState,
      likedCount: likedCountState,
      collected: collectedState,
      collectedCount: collectedCountState,
      commentCount: info.comment_count || 0,
      reblogCount: info.reblog_count || 0,
      shareCount: info.share_count || 0,
      publishTime: p?.publish_time || 0,
      ipLocation: p?.ip_location || '',
      followed: !!(info.followed),
    };
  }, [post, likedState, likedCountState, collectedState, collectedCountState]);

  const fetchComments = useCallback(
    async (cursor: string = '') => {
      if (!postId) return;
      setCommentLoading(true);
      if (!cursor) {
        setComments([]);
        setCommentCursor('');
        setCommentHasMore(false);
        setCommentError(null);
      }
      try {
        const data: any = await apiRef.current.getComments({ post_id: postId, cursor });
        setComments((prev) => (cursor ? [...prev, ...(data.comments || [])] : data.comments || []));
        setCommentCursor(data.cursor);
        setCommentHasMore(!!data.has_more);
      } catch (e: any) {
        setCommentError(e?.message || '评论加载失败');
      } finally {
        setCommentLoading(false);
      }
    },
    [postId],
  );

  const loadMoreComments = useCallback(() => {
    fetchComments(commentCursor);
  }, [fetchComments, commentCursor]);

  const fetchSubComments = useCallback(
    async (rootCommentId: string) => {
      if (!postId || !rootCommentId) return;
      setComments((prev) => prev.map((c) => (c.id === rootCommentId ? { ...c, sub_loading: true, sub_error: null } : c)));
      try {
        const data: any = await apiRef.current.getSubComments({ post_id: postId, root_comment_id: rootCommentId });
        setComments((prev) =>
          prev.map((c) => {
            if (c.id !== rootCommentId) return c;
            const existing = c.sub_comments || [];
            const incoming = (data.sub_comments || []).filter((sc: any) => !existing.some((e: any) => e.id === sc.id));
            return {
              ...c,
              sub_comments: [...existing, ...incoming],
              sub_comment_cursor: data.cursor,
              sub_comment_has_more: !!data.has_more,
              sub_loading: false,
            };
          }),
        );
      } catch (e: any) {
        setComments((prev) => prev.map((c) => (c.id === rootCommentId ? { ...c, sub_loading: false, sub_error: e?.message || '子评论加载失败' } : c)));
      }
    },
    [postId],
  );

  const toggleLike = useCallback(async () => {
    if (!postData.postId || likeLoading) return;
    const cur = likedState;
    const prevCount = likedCountState;
    setLikeLoading(true);
    try {
      if (!cur) {
        await apiRef.current.likePost({ post_id: postData.postId, blog_id: postData.blogId });
        setLikedState(true);
        setLikedCountState(prevCount + 1);
        messageApi.success('已点赞');
      } else {
        const data: any = await apiRef.current.dislikePost({ post_id: postData.postId, blog_id: postData.blogId });
        setLikedState(false);
        if (typeof data?.like_count === 'number') setLikedCountState(Number(data.like_count));
        else setLikedCountState(Math.max(0, prevCount - 1));
        messageApi.success('已取消点赞');
      }
    } catch (e: any) {
      messageApi.error(e?.message || (cur ? '取消点赞失败' : '点赞失败'));
    } finally {
      setLikeLoading(false);
    }
  }, [postData.postId, postData.blogId, likeLoading, likedState, likedCountState, messageApi]);

  const toggleCollect = useCallback(async () => {
    if (!postData.postId || collectLoading) return;
    const cur = collectedState;
    const prevCount = collectedCountState;
    setCollectLoading(true);
    try {
      if (!cur) {
        await apiRef.current.collectPost({ post_id: postData.postId, blog_id: postData.blogId });
        setCollectedState(true);
        setCollectedCountState(prevCount + 1);
        messageApi.success('已收藏');
      } else {
        await apiRef.current.uncollectPost({ post_id: postData.postId, blog_id: postData.blogId });
        setCollectedState(false);
        setCollectedCountState(Math.max(0, prevCount - 1));
        messageApi.success('已取消收藏');
      }
    } catch (e: any) {
      messageApi.error(e?.message || (cur ? '取消收藏失败' : '收藏失败'));
    } finally {
      setCollectLoading(false);
    }
  }, [postData.postId, postData.blogId, collectLoading, collectedState, collectedCountState, messageApi]);

  const postComment = useCallback(async (content: string) => {
    if (!postData.postId || postingComment) return;
    if (!content || !content.trim()) {
      messageApi.error('评论内容不能为空');
      return;
    }
    setPostingComment(true);
    try {
      const data: any = await apiRef.current.postComment({ post_id: postData.postId, blog_id: postData.blogId, content: content.trim() });
      if (data?.comment) {
        setComments((prev) => [data.comment, ...prev]);
        messageApi.success(data.toast || '评论已发布');
        return true;
      }
      messageApi.success('评论已发布');
      return true;
    } catch (e: any) {
      messageApi.error(e?.message || '发布评论失败');
      return false;
    } finally {
      setPostingComment(false);
    }
  }, [postData.postId, postData.blogId, postingComment, messageApi]);

  const sharePost = useCallback(() => {
    if (!postData.postId) return;
    const url = `https://www.lofter.com/post/${postData.postId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => messageApi.success('链接已复制到剪贴板'))
      .catch(() => messageApi.error('复制失败'));
  }, [postData.postId, messageApi]);

  const reset = useCallback(() => {
    setPost(null);
    setComments([]);
    setCommentCursor('');
    setCommentHasMore(false);
    setCommentError(null);
    setCommentsInitialized(false);
  }, []);

  // 用 ref 存最新 raw，避免 raw 进依赖导致无限 refetch
  const rawRef = useRef(raw);
  rawRef.current = raw;

  // 用 ref + token 防竞态：快速切文章时旧请求结果丢弃
  const fetchTokenRef = useRef(0);

  useEffect(() => {
    if (open && postId) {
      const token = ++fetchTokenRef.current;
      (async () => {
        setLoadingDetail(true);
        setPost(null);
        try {
          const data: any = await apiRef.current.getPostDetail({
            post_id: postId,
            blog_id: blogId,
            raw: rawRef.current,
          });
          if (fetchTokenRef.current !== token) return; // 旧请求，丢弃
          setPost(data);
          const p = data?.post || data;
          const info = p?.interact_info || {};
          setLikedState(!!info.liked);
          setLikedCountState(Number(info.liked_count || 0));
          setCollectedState(!!info.collected);
          setCollectedCountState(Number(info.collected_count || 0));
        } catch (e: any) {
          if (fetchTokenRef.current !== token) return;
          console.error('[lofter] post detail error', e);
        } finally {
          if (fetchTokenRef.current === token) setLoadingDetail(false);
        }
      })();
    } else if (!open) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId, blogId]);

  useEffect(() => {
    if (post && open && !commentsInitialized) {
      fetchComments('');
      setCommentsInitialized(true);
    }
  }, [post, open, fetchComments, commentsInitialized]);

  return {
    postData,
    loadingDetail,
    comments,
    commentLoading,
    commentHasMore,
    commentError,
    loadMoreComments,
    fetchSubComments,
    likeLoading,
    toggleLike,
    collectLoading,
    toggleCollect,
    postingComment,
    postComment,
    sharePost,
    reset,
  };
}

export default usePostDetail;
