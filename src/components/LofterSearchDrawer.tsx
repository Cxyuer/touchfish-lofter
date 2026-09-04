/*
 * 搜索 Drawer — 文章/用户分栏
 * 文章 Tab：调 /newsearch/web/all.json 搜文章，点击打开 PostDetailDrawer
 * 用户 Tab：调 UserBean.searchBlog 搜博客，点击打开 UserBlogDrawer
 */
import React, { useState, useRef } from 'react';
import { Form, Input, Empty, Tabs } from 'antd';
import Masonry from 'react-masonry-css';
import InfiniteScroll from 'react-infinite-scroll-component';
import { loaderFunc } from '../utils/loader';
import { useLofterSearch, type SearchMode } from '../hooks/useLofterSearch';
import { useRequest } from '../hooks/useRequest';
import PostCard from './PostCard';
import PostDetailDrawer from './PostDetailDrawer';
import UserBlogDrawer from './UserBlogDrawer';
import BaseDrawer from './BaseDrawer';
import { MASONRY_BREAKPOINTS, INFINITE_SCROLL_CONFIG, DEBOUNCE_DELAY } from '../constants';
import { debounce } from '../utils/utils';
import '../style/masonry.less';

interface LofterSearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SCROLL_ID = 'lofterSearchScrollableDiv';

const LofterSearchDrawer: React.FC<LofterSearchDrawerProps> = ({ open, onClose }) => {
  const { request } = useRequest();
  const [form] = Form.useForm<{ keyword: string }>();
  const { loading, results, hasMore, search, loadMore, reset, mode, switchMode } = useLofterSearch({ request });
  // 用户搜索结果点击 → 打开 UserBlogDrawer
  const [userParams, setUserParams] = useState<{ cursor: string; user_id: string; user?: any }>({ cursor: '', user_id: '' });
  const [userOpen, setUserOpen] = useState(false);
  // 文章搜索结果点击 → 打开 PostDetailDrawer
  const [detail, setDetail] = useState<{ post_id: string; blog_id?: string; raw?: any } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const debouncedSearch = useRef(debounce(async (kw: string) => {
    try {
      await search(kw);
    } catch (e) {
      console.error('[lofter search] error', e);
    }
  }, DEBOUNCE_DELAY.SEARCH));

  const handleSearch = (value: string) => {
    if (!value.trim()) {
      reset();
      return;
    }
    debouncedSearch.current(value);
  };

  const handleCardClick = (data: any) => {
    if (mode === 'blogs') {
      // 用户 Tab：打开博主主页
      const user = data?.post?.user || data?.user;
      const userId = user?.user_id || data?.post_id || data?.post?.post_id || data?.id;
      if (!userId) return;
      setUserParams({ cursor: '', user_id: String(userId), user });
      setUserOpen(true);
    } else {
      // 文章 Tab：打开文章详情
      const postId = data?.post_id || data?.post?.post_id || data?.id;
      const blogId = data?.post?.blog_id || data?.blog_id || '';
      const postRaw = data?.post?._raw || data?._raw || data?.post || data;
      if (!postId) return;
      setDetail({ post_id: String(postId), blog_id: String(blogId), raw: postRaw });
      setDetailOpen(true);
    }
  };

  return (
    <BaseDrawer open={open} onClose={onClose} title="搜索" scrollableId={SCROLL_ID}>
      <Form form={form} style={{ padding: '8px 8px 4px' }}>
        <Form.Item name="keyword">
          <Input.Search
            placeholder={mode === 'blogs' ? '搜索博客（用户名/昵称）' : '搜索文章（标题/标签/摘要）'}
            enterButton
            size="large"
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
          />
        </Form.Item>
      </Form>

      <div style={{ padding: '0 8px 4px' }}>
        <Tabs
          activeKey={mode}
          size="small"
          centered
          onChange={(k) => {
            const newMode = k as SearchMode;
            switchMode(newMode);
            // 切 Tab 时如果有关键词，自动重新搜索（不强制用户再点搜索按钮）
            const kw = form.getFieldValue('keyword') as string | undefined;
            if (kw && kw.trim()) {
              search(kw);
            }
          }}
          items={[
            { key: 'posts', label: '文章' },
            { key: 'blogs', label: '用户' },
          ]}
        />
      </div>

      <div id={SCROLL_ID} style={{ height: 'calc(90vh - 160px)', overflow: 'auto' }}>
        {!loading && results.length === 0 && (
          <Empty
            description={mode === 'blogs' ? '输入关键词，搜索你感兴趣的博客' : '输入关键词，搜索你感兴趣的文章'}
            style={{ marginTop: 60 }}
          />
        )}
        {loading && results.length === 0 && loaderFunc(4)}
        {!!results.length && (
          <InfiniteScroll
            dataLength={results.length}
            next={loadMore}
            hasMore={hasMore}
            loader={loading ? loaderFunc() : null}
            endMessage={<div style={{ padding: 16, textAlign: 'center', color: '#999' }}>没有更多结果了</div>}
            scrollableTarget={SCROLL_ID}
            scrollThreshold={INFINITE_SCROLL_CONFIG.THRESHOLD}
          >
            <Masonry
              breakpointCols={MASONRY_BREAKPOINTS}
              className="lofter-masonry"
              columnClassName="lofter-masonry-column"
            >
              {results.map((item, index) => (
                <div
                  key={(item.id || item.post_id) + '_' + index}
                  className="lofter-masonry-item"
                >
                  <PostCard data={item} onClick={handleCardClick} />
                </div>
              ))}
            </Masonry>
          </InfiniteScroll>
        )}
      </div>

      <PostDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        detail={detail || { post_id: '' }}
      />
      <UserBlogDrawer
        open={userOpen}
        isSelf={false}
        initialTab="posts"
        onClose={() => setUserOpen(false)}
        initParams={userParams}
      />
    </BaseDrawer>
  );
};

export default LofterSearchDrawer;
