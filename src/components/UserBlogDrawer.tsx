/*
 * 用户博客主页 Drawer — 文章/喜欢分栏（Tab 切换重新拉数据）
 * isSelf=true：查自己的主页（喜欢 Tab 用 getFavTrackItem 查自己的喜欢）
 * isSelf=false：查别人的主页（喜欢 Tab 用 ArchiveBean.getFavoritePosts 查别人的喜欢）
 * initialTab='likes'：默认打开"喜欢"Tab（"我喜欢的"按钮用）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tabs } from 'antd';
import Masonry from 'react-masonry-css';
import InfiniteScroll from 'react-infinite-scroll-component';
import { loaderFunc } from '../utils/loader';
import { useFollowUser } from '../hooks/useFollowUser';
import { useRequest } from '../hooks/useRequest';
import { createLofterApi } from '../api';
import UserInfoCard from './UserInfoCard';
import PostCard from './PostCard';
import PostDetailDrawer from './PostDetailDrawer';
import BaseDrawer from './BaseDrawer';
import { MASONRY_BREAKPOINTS, INFINITE_SCROLL_CONFIG } from '../constants';
import type { LofterFeedItem, LofterUser } from '../types/lofter';
import '../style/masonry.less';

interface UserBlogDrawerProps {
  open: boolean;
  onClose: () => void;
  initParams: { cursor: string; user_id: string; user?: any };
  /** 是否是自己的主页（决定喜欢 Tab 用哪个 API） */
  isSelf?: boolean;
  /** 默认打开哪个 Tab */
  initialTab?: 'posts' | 'likes';
}

const SCROLL_ID = 'lofterUserBlogScrollableDiv';

const UserBlogDrawer: React.FC<UserBlogDrawerProps> = ({ open, onClose, initParams, isSelf = false, initialTab = 'posts' }) => {
  const { request, messageApi } = useRequest();
  const apiRef = useRef(createLofterApi(request));

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string>('');
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [user, setUser] = useState<any>(initParams.user || {});
  const [hoverData, setHoverData] = useState<any>(null);
  const [hoverLoading, setHoverLoading] = useState(false);
  const [hoverError, setHoverError] = useState<string | null>(null);
  // 内部 Tab：posts=文章，likes=喜欢
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>(initialTab);
  // 作者是否隐藏了喜欢列表（ArchiveBean 返回 null 时为 true）
  const [likesHidden, setLikesHidden] = useState<boolean>(false);
  // 防竞态 token：快速切 Tab/用户时旧请求结果丢弃
  const fetchTokenRef = useRef(0);
  // 最新 cursor ref，供 loadMore 读取避免闭包陈旧
  const cursorRef = useRef<string>('');
  cursorRef.current = cursor;
  const loadingRef = useRef(false);
  loadingRef.current = loading;

  const { isFollowing, loading: followLoading, toggleFollow, setFollowing } = useFollowUser({});

  const [detail, setDetail] = useState<{ post_id: string; blog_id?: string; raw?: any } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // 点用户头像 → 嵌套打开另一个 UserBlogDrawer
  const [nestedUserParams, setNestedUserParams] = useState<{ cursor: string; user_id: string; user?: any }>({ cursor: '', user_id: '' });
  const [nestedUserOpen, setNestedUserOpen] = useState(false);

  // 关闭时清理所有嵌套状态，防止再次打开时残留嵌套 Drawer（支持任意深度嵌套干净退出）
  useEffect(() => {
    if (open) return;
    setDetailOpen(false);
    setDetail(null);
    setNestedUserOpen(false);
    setNestedUserParams({ cursor: '', user_id: '' });
  }, [open]);

  // 公共 fetch 逻辑（reset=true 重置拉首屏，reset=false 追加加载）
  const fetchData = useCallback(async (reset: boolean) => {
    if (loadingRef.current && !reset) return;
    const token = ++fetchTokenRef.current;
    setLoading(true);
    try {
      const nextCursor = reset ? '' : cursorRef.current;
      let res: any;
      if (activeTab === 'likes') {
        res = isSelf
          ? await apiRef.current.getLikedPosts({ cursor: nextCursor })
          : await apiRef.current.getUserLikedPosts({ user_id: initParams.user_id, cursor: nextCursor });
        if (fetchTokenRef.current !== token) return; // 旧请求，丢弃
        setLikesHidden(!isSelf && res?.hidden === true);
      } else {
        res = await apiRef.current.getUserPosts({ user_id: initParams.user_id, cursor: nextCursor });
        if (fetchTokenRef.current !== token) return;
        setLikesHidden(false);
      }
      const incoming = res?.items || [];
      setItems((prev) => (reset ? incoming : [...prev, ...incoming]));
      setCursor(res?.cursor || '');
      setHasMore(!!res?.has_more);
    } catch (e: any) {
      if (fetchTokenRef.current !== token) return;
      console.error('[lofter user-blog] error', e);
      messageApi?.error?.(e?.message || '加载失败');
    } finally {
      if (fetchTokenRef.current === token) setLoading(false);
    }
  }, [activeTab, initParams.user_id, isSelf, messageApi]);

  // 用 ref 记录上一个 user_id，用于区分"切换用户"和"切换 Tab"
  const prevUserIdRef = useRef<string>('');
  // 打开/切换 user_id/activeTab 时重新拉
  useEffect(() => {
    if (!open || !initParams.user_id) return;
    const userIdChanged = prevUserIdRef.current !== initParams.user_id;
    prevUserIdRef.current = initParams.user_id;
    // 切换用户时重置 Tab 到初始值
    if (userIdChanged) {
      setActiveTab(initialTab);
    }
    setUser(initParams.user || {});
    setItems([]);
    setCursor('');
    setHasMore(true);
    setHoverData(null);
    setHoverLoading(false);
    setHoverError(null);
    // 用户信息：先用 initParams.user 占位，再异步拉完整信息补头像
    if (initParams.user) {
      setHoverData(initParams.user);
      setHoverLoading(false);
    }
    // 主动拉完整用户信息（确保头像/昵称存在，即使 initParams.user 不完整）
    const userToken = ++fetchTokenRef.current;
    (async () => {
      try {
        const u: any = await apiRef.current.getUserInfo({
          user_id: initParams.user_id,
          user: initParams.user,
        });
        if (fetchTokenRef.current !== userToken) return;
        if (u) {
          setUser(u);
          setHoverData(u);
          // 用拉到的用户信息里的 followed 字段同步关注状态
          const followed = !!(u as any)?.followed || !!(u as any)?.is_following || !!(u as any)?.interact_info?.followed;
          if (followed !== undefined) setFollowing(followed);
        }
      } catch {
        // 忽略，用 initParams.user 兜底
      }
    })();
    // 拉首屏数据
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initParams.user_id, initialTab, activeTab]);

  const loadMore = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  const handleFollowToggle = useCallback(async () => {
    if (!initParams.user_id) return;
    await toggleFollow(initParams.user_id);
  }, [initParams.user_id, toggleFollow]);

  const handleCardClick = (data: any) => {
    const blogId = data?.post?.blog_id || data?.post?.user?.user_id || data?.blog_id || '';
    const postRaw = data?.post?._raw || data?._raw || data?.post || data;
    const postId = data?.post_id || data?.post?.post_id || data?.id;
    if (!postId) return;
    setDetail({ post_id: String(postId), blog_id: String(blogId), raw: postRaw });
    setDetailOpen(true);
  };

  // 点用户头像 → 嵌套打开该用户的博客主页
  const handleUserClick = useCallback((raw: LofterFeedItem, u: LofterUser) => {
    if (!u?.user_id) return;
    setNestedUserParams({ cursor: '', user_id: u.user_id, user: u });
    setNestedUserOpen(true);
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'posts' | 'likes');
    // 切换 Tab 时清空数据，effect 会重新拉
    setItems([]);
    setCursor('');
    setHasMore(true);
  };

  return (
    <BaseDrawer open={open} onClose={onClose} title={isSelf ? '我的主页' : '博客主页'} scrollableId={SCROLL_ID}>
      <UserInfoCard
        user={user}
        hoverData={hoverData}
        loading={hoverLoading}
        error={hoverError}
        mode="detailed"
        showFollowButton={!!initParams.user_id && !isSelf}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollowToggle={handleFollowToggle}
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        centered
        items={[
          { key: 'posts', label: '文章' },
          { key: 'likes', label: '喜欢' },
        ]}
        tabBarStyle={{ marginBottom: 8 }}
      />

      <div id={SCROLL_ID} style={{ height: 'calc(90vh - 320px)', overflow: 'auto' }}>
        {items.length === 0 && loading && loaderFunc(4)}
        {items.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
            {activeTab === 'likes'
              ? (likesHidden ? '作者已隐藏喜欢列表' : '暂无喜欢的内容')
              : '暂无文章'}
          </div>
        )}
        {!!items.length && (
          <InfiniteScroll
            dataLength={items.length}
            next={loadMore}
            hasMore={hasMore}
            loader={loading ? loaderFunc() : null}
            endMessage={<div style={{ padding: 16, textAlign: 'center', color: '#999' }}>没有更多了</div>}
            scrollableTarget={SCROLL_ID}
            scrollThreshold={INFINITE_SCROLL_CONFIG.THRESHOLD}
          >
            <Masonry
              breakpointCols={MASONRY_BREAKPOINTS}
              className="lofter-masonry"
              columnClassName="lofter-masonry-column"
            >
              {items.map((item, index) => (
                <div key={(item.id || item.post_id) + '_' + index} className="lofter-masonry-item">
                  <PostCard
                    data={item}
                    onClick={handleCardClick}
                    onUserClick={handleUserClick}
                  />
                </div>
              ))}
            </Masonry>
          </InfiniteScroll>
        )}
      </div>

      <PostDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        detail={detail || { post_id: '' }}
        onUserClick={(payload) => {
          // 文章详情里点作者/评论者 → 嵌套打开该用户的博客主页（复用唯一 nested UserBlogDrawer）
          setNestedUserParams(payload);
          setNestedUserOpen(true);
        }}
      />
      {/* 嵌套：点用户头像（PostCard 里）或文章详情里点作者 → 唯一 nested UserBlogDrawer */}
      <UserBlogDrawer
        open={nestedUserOpen}
        onClose={() => setNestedUserOpen(false)}
        initParams={nestedUserParams}
      />
    </BaseDrawer>
  );
};

export default UserBlogDrawer;
