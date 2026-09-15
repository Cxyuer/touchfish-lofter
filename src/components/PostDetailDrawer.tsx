/*
 * 文章详情 Drawer
 * 对应 touchFish/xhs/src/components/FeedDetailDrawer.tsx
 */
import React, { useCallback, useState } from 'react';
import { loaderFunc } from '../utils/loader';
import { useFollowUser } from '../hooks/useFollowUser';
import { usePostDetail } from '../hooks/usePostDetail';
import UserBlogDrawer from './UserBlogDrawer';
import BaseDrawer from './BaseDrawer';
import UserInfoCard from './UserInfoCard';
import PostContentCard from './PostContentCard';
import CommentSection from './CommentSection';
import CommentInput from './CommentInput';

interface UserDrawerPayload {
  cursor: string;
  user_id: string;
  user?: any;
}

interface PostDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  detail: { post_id: string; blog_id?: string; raw?: any };
  onUserClick?: (payload: UserDrawerPayload) => void;
}

const PostDetailDrawer: React.FC<PostDetailDrawerProps> = ({ open, onClose, detail, onUserClick }) => {
  const {
    postData, loadingDetail,
    comments, commentLoading, commentHasMore, commentError,
    loadMoreComments, fetchSubComments,
    likeLoading, toggleLike,
    collectLoading, toggleCollect,
    postingComment, postComment,
    sharePost,
  } = usePostDetail({ postId: detail.post_id, blogId: detail.blog_id, raw: detail.raw, open });

  const { isFollowing, loading: followLoading, toggleFollow, setFollowing } = useFollowUser({
    initialFollowing: postData.followed,
  });

  React.useEffect(() => {
    setFollowing(postData.followed);
  }, [postData.followed, setFollowing]);

  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDrawerParams, setUserDrawerParams] = useState<UserDrawerPayload>({ cursor: '', user_id: '' });

  // 关闭时清理嵌套用户 Drawer 状态，防止再次打开时残留（支持任意深度嵌套干净退出）
  React.useEffect(() => {
    if (open) return;
    setUserDrawerOpen(false);
    setUserDrawerParams({ cursor: '', user_id: '' });
  }, [open]);

  const openUserDrawer = useCallback(
    (payload: UserDrawerPayload) => {
      if (onUserClick) {
        onUserClick(payload);
      } else {
        setUserDrawerParams(payload);
        setUserDrawerOpen(true);
      }
    },
    [onUserClick],
  );

  const handleUserClick = useCallback(() => {
    if (!postData.user?.user_id) return;
    openUserDrawer({ cursor: '', user_id: postData.user.user_id, user: postData.user });
  }, [postData.user, openUserDrawer]);

  const handleCommentUserClick = useCallback(
    (comment: any) => {
      const u = comment?.user_info;
      if (!u?.user_id) return;
      openUserDrawer({ cursor: '', user_id: u.user_id, user: u });
    },
    [openUserDrawer],
  );

  const handleFollowToggle = useCallback(async () => {
    if (!postData.user?.user_id) return;
    await toggleFollow(postData.user.user_id);
  }, [postData.user?.user_id, toggleFollow]);

  return (
    <>
      <BaseDrawer
        open={open}
        onClose={onClose}
        title={postData.title || '文章详情'}
        scrollableId="lofterPostDetailScrollableDiv"
      >
        <UserInfoCard
          user={postData.user}
          mode="simple"
          size="small"
          showFollowButton={!!postData.user?.user_id}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowToggle={handleFollowToggle}
          onUserClick={handleUserClick}
          style={{ marginBottom: 12 }}
        />

        {loadingDetail && loaderFunc(3)}

        {!loadingDetail && (
          <PostContentCard
            postData={postData}
            onShare={sharePost}
            onToggleLike={toggleLike}
            likeLoading={likeLoading}
            onToggleCollect={toggleCollect}
            collectLoading={collectLoading}
          />
        )}

        {!loadingDetail && (
          <CommentInput onSubmit={postComment} loading={postingComment} placeholder="写下你的评论..." />
        )}

        <CommentSection
          comments={comments}
          loading={commentLoading}
          hasMore={commentHasMore}
          error={commentError}
          scrollableTarget="lofterPostDetailScrollableDiv"
          onLoadMore={loadMoreComments}
          onUserClick={handleCommentUserClick}
          onExpandSubComments={fetchSubComments}
        />

        {!onUserClick && (
          <UserBlogDrawer
            open={userDrawerOpen}
            onClose={() => setUserDrawerOpen(false)}
            initParams={userDrawerParams}
          />
        )}
      </BaseDrawer>
    </>
  );
};

export default PostDetailDrawer;
