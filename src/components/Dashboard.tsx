/*
 * 仪表盘主组件 — 对应 touchFish/xhs/src/components/Feed.tsx
 * 单栏瀑布流 + FloatButton 浮动按钮组，适配 VSCode 侧边栏窄宽度
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { FloatButton, Empty, Tabs } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import Masonry from 'react-masonry-css';
import {
  RedoOutlined,
  VerticalAlignTopOutlined,
  SearchOutlined,
  UserOutlined,
  PlusOutlined,
  MinusOutlined,
  FormOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import PostCard from './PostCard';
import PostDetailDrawer from './PostDetailDrawer';
import LofterSearchDrawer from './LofterSearchDrawer';
import UserBlogDrawer from './UserBlogDrawer';
import LofterSendDrawer from './LofterSendDrawer';
import { useLofterFeed, type FeedMode } from '../hooks/useLofterFeed';
import { useRequest } from '../hooks/useRequest';
import { createLofterApi } from '../api';
import { useConfigStore } from '../store/config';
import { useFontSizeStore } from '../store/fontSize';
import { vscode } from '../utils/vscode';
import { loaderFunc } from '../utils/loader';
import {
  MASONRY_BREAKPOINTS,
  INFINITE_SCROLL_CONFIG,
  DEBOUNCE_DELAY,
} from '../constants';
import { debounce } from '../utils/utils';
import type { LofterFeedItem, LofterUser } from '../types/lofter';
import '../style/dashboard.less';
import '../style/index.less';

const SCROLL_ID = 'lofterScrollableDiv';

const Dashboard: React.FC = () => {
  const [groupOpen, setGroupOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const { items, loadMore, hasMore, refresh, mode, switchMode, loading } = useLofterFeed();

  // 详情 / 搜索 / 用户 / 发布 / 点赞抽屉状态
  const [detail, setDetail] = useState<{ post_id: string; blog_id?: string; raw?: any } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [userParams, setUserParams] = useState<{ cursor: string; user_id: string; user?: any }>({
    cursor: '',
    user_id: '',
  });
  // 是否是"我的主页"（决定喜欢 Tab 用哪个 API）
  const [isSelf, setIsSelf] = useState(false);
  // 默认打开哪个 Tab
  const [initialTab, setInitialTab] = useState<'posts' | 'likes'>('posts');

  const { showImg, toggleShowImg, setShowImg } = useConfigStore();
  const { increase, decrease } = useFontSizeStore();
  const { request, messageApi } = useRequest();
  const apiRef = useRef(createLofterApi(request));

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 我的主页
  const handleMyInfo = useCallback(async () => {
    try {
      const data: any = await apiRef.current.getMyInfo();
      if (data) {
        setUserParams({ cursor: '', user_id: data.user_id, user: data });
        setIsSelf(true);
        setInitialTab('posts');
        setUserOpen(true);
      }
    } catch (e: any) {
      messageApi.error(e?.message || '获取用户信息失败');
    }
  }, [messageApi]);

  const openDetail = useCallback((raw: any) => {
    const postId = raw?.post_id || raw?.post?.post_id || raw?.id;
    const blogId = raw?.post?.blog_id || raw?.post?.user?.user_id || raw?.blog_id || '';
    const postRaw = raw?.post?._raw || raw?._raw || raw?.post || raw;
    if (!postId) return;
    setDetail({ post_id: postId, blog_id: blogId, raw: postRaw });
    setDetailOpen(true);
  }, []);

  const handleUserClick = useCallback((raw: LofterFeedItem, user: LofterUser) => {
    if (!user?.user_id) return;
    setUserParams({ cursor: '', user_id: user.user_id, user });
    setIsSelf(false);
    setInitialTab('posts');
    setUserOpen(true);
  }, []);

  const handleLikeToggle = useCallback(
    async (raw: LofterFeedItem, targetStatus: boolean): Promise<boolean> => {
      try {
        const postId = raw?.post_id || raw?.post?.post_id || raw?.id;
        const blogId = raw?.post?.blog_id || raw?.post?.user?.user_id || '';
        if (!postId) return false;
        if (targetStatus) {
          await apiRef.current.likePost({ post_id: postId, blog_id: blogId });
        } else {
          await apiRef.current.dislikePost({ post_id: postId, blog_id: blogId });
        }
        return true;
      } catch (e: any) {
        messageApi.error(e?.message || '点赞操作失败');
        return false;
      }
    },
    [messageApi],
  );

  // VS Code 扩展宿主消息监听
  useEffect(() => {
    if (items.length === 0 && !loading) loadMore(true);
    const scrollableNode = scrollRef.current;
    if (!scrollableNode) return;

    const handleScroll = debounce(() => {
      vscode.postMessage({
        command: 'LOFTER_SAVE_SCROLL_POSITION',
        payload: scrollableNode.scrollTop,
      });
    }, DEBOUNCE_DELAY.SCROLL);

    const messageHandler = (ev: MessageEvent<any>) => {
      if (ev.type !== 'message' || !ev.data?.command) return;
      if (ev.data.command === 'LOFTER_RESTORE_SCROLL_POSITION') {
        if (scrollRef.current) scrollRef.current.scrollTop = ev.data.payload;
      }
      if (ev.data.command === 'LOFTER_IMG_TOGGLED') {
        setShowImg(!!ev.data.payload);
      }
      if (ev.data.command === 'LOFTER_FORCE_REFRESH') {
        refresh();
      }
    };

    scrollableNode.addEventListener('scroll', handleScroll);
    window.addEventListener('message', messageHandler);

    return () => {
      scrollableNode.removeEventListener('scroll', handleScroll);
      window.removeEventListener('message', messageHandler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublishSuccess = useCallback(() => {
    refresh();
    messageApi.success('文章已发布，已刷新推荐流');
  }, [refresh, messageApi]);

  return (
    <div id={SCROLL_ID} ref={scrollRef} style={{ height: '100vh', overflow: 'auto' }}>
      <PostDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        detail={detail || { post_id: '' }}
      />
      <LofterSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <LofterSendDrawer open={sendOpen} onClose={() => setSendOpen(false)} onSuccess={handlePublishSuccess} />
      <UserBlogDrawer
        open={userOpen}
        isSelf={isSelf}
        initialTab={initialTab}
        onClose={() => {
          setUserOpen(false);
        }}
        initParams={userParams}
      />

      {/* 顶部发现/关注 Tab 分栏 */}
      <div className="lofter-feed-tabs">
        <Tabs
          activeKey={mode}
          centered
          size="small"
          onChange={(key) => switchMode(key as FeedMode)}
          items={[
            { key: 'home', label: '发现' },
            { key: 'following', label: '关注' },
          ]}
        />
      </div>

      {/* 浮动按钮 */}
      <FloatButton.BackTop
        className="touchfish-float-backtop"
        style={{ insetInlineEnd: 16, bottom: 16 }}
        visibilityHeight={INFINITE_SCROLL_CONFIG.BACK_TOP_VISIBILITY_HEIGHT}
        duration={INFINITE_SCROLL_CONFIG.BACK_TOP_DURATION}
        icon={<VerticalAlignTopOutlined />}
        tooltip={{ title: '回到顶部', placement: 'left' }}
        target={() => scrollRef.current || window}
      />
      <div ref={groupRef}>
        <FloatButton
          className="touchfish-float-refresh"
          style={{ insetInlineEnd: 16, bottom: 72 }}
          onClick={refresh}
          icon={<RedoOutlined style={{ color: '#b37feb' }} />}
          tooltip={{ title: '刷新', placement: 'left' }}
        />
        <FloatButton.Group
          trigger="click"
          open={groupOpen}
          onOpenChange={(open) => {
            const event = window.event as MouseEvent;
            if (event && groupRef.current?.contains(event.target as Node)) {
              setGroupOpen(open);
            }
          }}
          shape="circle"
          style={{ insetInlineEnd: 16, bottom: 128 }}
          icon={<AppstoreOutlined />}
        >
          <FloatButton
            onClick={() => setSearchOpen(true)}
            icon={<SearchOutlined style={{ color: '#faad14' }} />}
            tooltip={{ title: '搜索', placement: 'left' }}
          />
          <FloatButton
            onClick={handleMyInfo}
            icon={<UserOutlined style={{ color: '#faad14' }} />}
            tooltip={{ title: '我的主页', placement: 'left' }}
          />
          <FloatButton
            onClick={() => setSendOpen(true)}
            icon={<FormOutlined style={{ color: '#52c41a' }} />}
            tooltip={{ title: '发布文章', placement: 'left' }}
          />
          <FloatButton
            onClick={toggleShowImg}
            icon={
              showImg ? (
                <EyeOutlined style={{ color: '#13c2c2' }} />
              ) : (
                <EyeInvisibleOutlined style={{ color: '#13c2c2' }} />
              )
            }
            tooltip={{ title: showImg ? '隐藏图片' : '显示图片', placement: 'left' }}
          />
          <FloatButton
            onClick={increase}
            icon={<PlusOutlined style={{ color: '#ff4d4f' }} />}
            tooltip={{ title: '加大字体', placement: 'left' }}
          />
          <FloatButton
            onClick={decrease}
            icon={<MinusOutlined style={{ color: '#52c41a' }} />}
            tooltip={{ title: '减小字体', placement: 'left' }}
          />
        </FloatButton.Group>
      </div>

      {/* 瀑布流 */}
      {items.length === 0 ? (
        <div className="lofter-feed-empty">
          <Empty description="加载中…" />
        </div>
      ) : (
        <InfiniteScroll
          dataLength={items.length}
          next={() => loadMore()}
          hasMore={hasMore}
          loader={loaderFunc(2)}
          endMessage={
            <div className="lofter-feed-end">· 没有更多了 ·</div>
          }
          scrollableTarget={SCROLL_ID}
          scrollThreshold={INFINITE_SCROLL_CONFIG.THRESHOLD}
        >
          <Masonry
            breakpointCols={MASONRY_BREAKPOINTS}
            className="lofter-masonry"
            columnClassName="lofter-masonry-column"
          >
            {items.map((raw: any, index: number) => (
              <div
                key={raw.id || raw.post_id || index}
                className="lofter-waterfall-item"
                style={{ animationDelay: `${(index % 10) * 50}ms` }}
              >
                <PostCard
                  data={raw}
                  onClick={openDetail}
                  onUserClick={handleUserClick}
                  onLikeToggle={handleLikeToggle}
                />
              </div>
            ))}
          </Masonry>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default Dashboard;
