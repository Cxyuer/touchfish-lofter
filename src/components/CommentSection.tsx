/*
 * 评论区域组件
 * 对应 touchFish/xhs/src/components/CommentSection.tsx
 */
import React from 'react';
import { Card, List } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import { loaderFunc } from '../utils/loader';
import CommentItem from './CommentItem';
import { INFINITE_SCROLL_CONFIG } from '../constants';

interface CommentSectionProps {
  comments: any[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  scrollableTarget: string;
  onLoadMore: () => void;
  onUserClick: (comment: any) => void;
  onExpandSubComments?: (rootCommentId: string) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  loading,
  hasMore,
  error,
  scrollableTarget,
  onLoadMore,
  onUserClick,
  onExpandSubComments,
}) => {
  return (
    <Card
      size="small"
      title="评论"
      style={{ marginTop: 12, marginBottom: 16 }}
      styles={{ body: { padding: 0 } }}
    >
      {loading && !comments.length && loaderFunc(2)}
      {error && <div style={{ color: '#ff4d4f', padding: '8px 0' }}>{error}</div>}
      {!loading && !comments.length && !error && (
        <div style={{ color: '#999', padding: '8px' }}>暂无评论，来抢个沙发吧</div>
      )}
      {!!comments.length && (
        <InfiniteScroll
          dataLength={comments.length}
          next={onLoadMore}
          hasMore={hasMore}
          loader={loading ? loaderFunc() : null}
          endMessage={
            <div style={{ padding: 8, textAlign: 'center', color: '#999' }}>没有更多评论了</div>
          }
          scrollableTarget={scrollableTarget}
          scrollThreshold={INFINITE_SCROLL_CONFIG.THRESHOLD}
        >
          <List
            size="small"
            dataSource={comments}
            renderItem={(comment) => (
              <CommentItem
                c={comment}
                onUserClick={(userInfo) => onUserClick({ user_info: userInfo })}
                onExpandSubComments={() => onExpandSubComments?.(comment.id)}
              />
            )}
          />
        </InfiniteScroll>
      )}
    </Card>
  );
};

export default CommentSection;
