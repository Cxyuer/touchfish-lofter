/*
 * 瀑布流卡片组件 — 对应 xhsFeedCard.tsx
 * 单列窄侧边栏也能看，封面 + 标题 + 用户 + 点赞
 */
import React, { useState, useEffect } from 'react';
import { Avatar } from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  PlayCircleFilled,
  CustomerServiceOutlined,
  LinkOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import '../style/postCard.less';
import type { LofterFeedItem, LofterUser } from '../types/lofter';
import { useConfigStore } from '../store/config';
import { rewriteImageUrl } from '../api/lofterRealApi';
import { formatCount } from '../utils/utils';

interface PostCardProps {
  data: LofterFeedItem;
  onClick?: (data: LofterFeedItem) => void;
  onUserClick?: (data: LofterFeedItem, user: LofterUser) => void;
  onLikeToggle?: (data: LofterFeedItem, targetStatus: boolean) => Promise<boolean>;
}

const PostCard: React.FC<PostCardProps> = ({ data, onClick, onUserClick, onLikeToggle }) => {
  const post: any = data.post || (data as any);
  const user: LofterUser = post.user || {};
  const info = post.interact_info || {};

  const [isLiked, setIsLiked] = useState<boolean>(!!info.liked);
  const [likeCount, setLikeCount] = useState<number>(Number(info.liked_count || 0));
  const [likeLoading, setLikeLoading] = useState(false);
  const { showImg } = useConfigStore();

  // data 变化时（feed 刷新、切 Tab 等）同步本地 like 状态
  useEffect(() => {
    setIsLiked(!!info.liked);
    setLikeCount(Number(info.liked_count || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const nickname = user.nickname || user.blog_name || '未知博客';
  const type: string = post.type || 'photo';
  const images: Array<{ url: string }> = post.images || [];
  const cover = images[0]?.url || post.video_poster || '';
  const title = post.title || '';
  const textContent = post.content || '';

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUserClick?.(data, user);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likeLoading || !onLikeToggle) return;
    const target = !isLiked;
    setLikeLoading(true);
    setIsLiked(target);
    setLikeCount((c) => (target ? c + 1 : Math.max(0, c - 1)));
    try {
      const ok = await onLikeToggle(data, target);
      if (!ok) throw new Error('点赞失败');
    } catch {
      setIsLiked(!target);
      setLikeCount((c) => (target ? Math.max(0, c - 1) : c + 1));
    } finally {
      setLikeLoading(false);
    }
  };

  const openDetail = () => onClick?.(data);

  // 封面区域
  const renderCover = () => {
    // 有封面图且开启显示图片：photo / video / 图文文章 都显示
    if (cover && showImg) {
      return (
        <div className="lofter-feed-card-cover" onClick={openDetail}>
          <img src={rewriteImageUrl(cover)} alt={title || nickname} />
          {type === 'video' && <PlayCircleFilled className="lofter-feed-card-play" />}
          {images.length > 1 && (
            <div className="lofter-feed-card-img-count">
              <FileImageOutlined /> {images.length}
            </div>
          )}
        </div>
      );
    }

    // 无封面图或隐藏图片：所有类型统一走纯文字/标题占位
    if (type === 'quote') {
      return (
        <div className="lofter-feed-card-quote-cover" onClick={openDetail}>
          <div className="lofter-feed-card-quote-text">{post.quote_text || textContent}</div>
          {post.quote_source && (
            <cite className="lofter-feed-card-quote-source">—— {post.quote_source}</cite>
          )}
        </div>
      );
    }

    if (type === 'link') {
      return (
        <div className="lofter-feed-card-link-cover" onClick={openDetail}>
          <LinkOutlined style={{ color: 'var(--vscode-textLink-foreground)' }} />
          <div className="lofter-feed-card-link-title">{title || post.link_url}</div>
          <div className="lofter-feed-card-link-url">{post.link_url}</div>
        </div>
      );
    }

    if (type === 'audio') {
      return (
        <div className="lofter-feed-card-audio-cover" onClick={openDetail}>
          <CustomerServiceOutlined className="lofter-feed-card-audio-icon" />
          <div className="lofter-feed-card-audio-title">{post.audio_title || title || '音频文章'}</div>
        </div>
      );
    }

    // photo/text/video 无封面图（或隐藏图片）：显示纯文字摘要
    return textContent ? (
      <div className="lofter-feed-card-text-cover" onClick={openDetail}>
        {textContent}
      </div>
    ) : null;
  };

  const coverNode = renderCover();
  if (!coverNode && !title && !textContent) return null;

  return (
    <div className="lofter-feed-card">
      {coverNode}
      <div className="lofter-feed-card-info">
        {title && (
          <div className="lofter-feed-card-title" onClick={openDetail}>{title}</div>
        )}
        {!title && textContent && type !== 'quote' && type !== 'link' && (
          <div className="lofter-feed-card-text" onClick={openDetail}>{textContent}</div>
        )}
        <div className="lofter-feed-card-meta">
          <div className="lofter-feed-card-user" onClick={handleUserClick}>
            <Avatar src={rewriteImageUrl(user.avatar)} size={18}>
              {nickname?.[0]}
            </Avatar>
            <span className="lofter-feed-card-username">{nickname}</span>
          </div>
          {onLikeToggle && (
            <div
              className={`lofter-feed-card-like ${isLiked ? 'is-liked' : ''}`}
              onClick={handleLikeClick}
            >
              {isLiked ? <HeartFilled /> : <HeartOutlined />} {formatCount(likeCount)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
