/*
 * 文章内容展示组件
 * 对应 touchFish/xhs/src/components/NoteContentCard.tsx
 * 适配 LOFTER 的多种文章类型：photo / text / quote / audio / video / link
 */
import React, { useRef, useEffect, useState } from 'react';
import { Image, Typography, Card, Carousel, Space, Tag } from 'antd';
import type { CarouselRef } from 'antd/es/carousel';
import {
  LeftCircleOutlined,
  RightCircleOutlined,
  HeartOutlined,
  HeartFilled,
  StarOutlined,
  StarFilled,
  CommentOutlined,
  ShareAltOutlined,
  RetweetOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  PictureOutlined,
  LinkOutlined,
  CustomerServiceOutlined,
  PlayCircleFilled,
  ReadOutlined,
} from '@ant-design/icons';
import { formatTimestamp, formatCount, parseTopicTags } from '../utils/utils';
import ImagePreviewToolbar from './ImagePreviewToolbar';
import { useConfigStore } from '../store/config';
import { LOFTER_BRAND } from '../constants';

const { Title, Paragraph } = Typography;

interface PostData {
  postId: string;
  type: string;
  title: string;
  desc: string;
  quoteText: string;
  quoteSource: string;
  linkUrl: string;
  images: Array<{ url: string; width?: number; height?: number }>;
  videoUrl?: string;
  videoPoster?: string;
  audioUrl?: string;
  audioTitle?: string;
  user: any;
  tags: Array<{ name: string }>;
  liked: boolean;
  likedCount: number;
  collected: boolean;
  collectedCount: number;
  commentCount: number;
  reblogCount: number;
  shareCount: number;
  publishTime: number;
  ipLocation: string;
}

interface PostContentCardProps {
  postData: PostData;
  onShare?: () => void;
  loading?: boolean;
  onToggleLike?: () => void;
  likeLoading?: boolean;
  onToggleCollect?: () => void;
  collectLoading?: boolean;
  onReblog?: () => void;
}

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  active?: boolean;
  activeColor?: string;
}> = ({ icon, label, onClick, loading, active, activeColor }) => (
  <Space
    style={{
      fontSize: 'calc(var(--app-font-size) + 2px)',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.6 : 1,
      color: active ? activeColor : undefined,
    }}
    onClick={() => {
      if (loading) return;
      onClick?.();
    }}
  >
    {icon}
    <span>{label}</span>
  </Space>
);

const PostContentCard: React.FC<PostContentCardProps> = ({
  postData,
  onShare,
  loading = false,
  onToggleLike,
  likeLoading = false,
  onToggleCollect,
  collectLoading = false,
  onReblog,
}) => {
  const { showImg } = useConfigStore();
  const [forceShow, setForceShow] = useState(false);
  const carouselRef = useRef<CarouselRef>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState(0);

  const {
    type, title, desc, quoteText, quoteSource, linkUrl,
    images, videoUrl, videoPoster, audioUrl, audioTitle,
    tags, liked, likedCount, collected, collectedCount,
    commentCount, reblogCount, shareCount, publishTime, ipLocation,
  } = postData;

  useEffect(() => {
    // 不劫持滚轮：滚轮应该用于页面上下滚动，切图用箭头/拖拽/点击预览
    // 之前用 wheel deltaY → carousel.next/prev 会劫持页面滚动，导致文章详情里鼠标在图片上
    // 想上下滚内容却变成左右切图，体验很差
  }, [images.length]);

  if (loading) return null;

  const mediaShown = showImg || forceShow;

  return (
    <>
      {/* 视频 */}
      {mediaShown && videoUrl && (
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <video controls src={videoUrl} style={{ display: 'block', width: '100%' }} poster={videoPoster} />
        </div>
      )}

      {/* 音频 */}
      {mediaShown && audioUrl && !videoUrl && (
        <Card size="small" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CustomerServiceOutlined style={{ fontSize: 28, color: LOFTER_BRAND.primary }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{audioTitle || '音频文章'}</div>
              <audio controls src={audioUrl} style={{ width: '100%', marginTop: 8 }} />
            </div>
          </div>
        </Card>
      )}

      {/* 图片 */}
      {mediaShown && !videoUrl && !audioUrl && images.length > 0 && (
        <div ref={imageContainerRef} style={{ borderRadius: 12, overflow: 'hidden', margin: '12px 0' }}>
          {images.length === 1 ? (
            <Image
              src={images[0].url}
              alt={title}
              style={{ objectFit: 'contain', width: '100%' }}
              preview={{
                toolbarRender: (_, { transform: { scale }, actions }) => (
                  <ImagePreviewToolbar
                    imageUrl={images[0].url}
                    imageIndex={0}
                    fileNamePrefix={title || 'lofter'}
                    scale={scale}
                    onRotateLeft={actions.onRotateLeft}
                    onRotateRight={actions.onRotateRight}
                    onZoomIn={actions.onZoomIn}
                    onZoomOut={actions.onZoomOut}
                  />
                ),
              }}
            />
          ) : (
            <>
              <Carousel
                ref={carouselRef}
                adaptiveHeight
                draggable
                dots={{ className: 'lofter-carousel-dots' }}
                arrows
                prevArrow={<div><LeftCircleOutlined className="lofter-carousel-arrow" /></div>}
                nextArrow={<div><RightCircleOutlined className="lofter-carousel-arrow" /></div>}
              >
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{ position: 'relative' }}
                    onClick={() => { setPreviewCurrent(idx); setPreviewVisible(true); }}
                  >
                    <img src={img.url} alt={title} style={{ display: 'block', width: '100%', cursor: 'zoom-in' }} />
                  </div>
                ))}
              </Carousel>
              <div style={{ display: 'none' }}>
                <Image.PreviewGroup
                  preview={{
                    visible: previewVisible,
                    current: previewCurrent,
                    onVisibleChange: setPreviewVisible,
                    onChange: setPreviewCurrent,
                    toolbarRender: (_, { transform: { scale }, actions, current }) => (
                      <ImagePreviewToolbar
                        imageUrl={images[current].url}
                        imageIndex={current}
                        fileNamePrefix={title || 'lofter'}
                        scale={scale}
                        onRotateLeft={actions.onRotateLeft}
                        onRotateRight={actions.onRotateRight}
                        onZoomIn={actions.onZoomIn}
                        onZoomOut={actions.onZoomOut}
                      />
                    ),
                  }}
                  items={images.map((img) => ({ src: img.url }))}
                />
              </div>
            </>
          )}
        </div>
      )}

      {!showImg && !forceShow && (images.length > 0 || videoUrl || audioUrl) && (
        <div className="lofter-media-placeholder" style={{ margin: '12px 0' }} onClick={() => setForceShow(true)}>
          {videoUrl ? <PlayCircleFilled /> : audioUrl ? <CustomerServiceOutlined /> : <PictureOutlined />}
          <span>点击加载媒体内容</span>
        </div>
      )}

      <Card
        actions={[
          <ActionBtn
            key="like"
            icon={liked ? <HeartFilled /> : <HeartOutlined />}
            label={formatCount(likedCount)}
            onClick={onToggleLike}
            loading={likeLoading}
            active={liked}
            activeColor={LOFTER_BRAND.like}
          />,
          <ActionBtn
            key="collect"
            icon={collected ? <StarFilled /> : <StarOutlined />}
            label={formatCount(collectedCount)}
            onClick={onToggleCollect}
            loading={collectLoading}
            active={collected}
            activeColor={LOFTER_BRAND.warning}
          />,
          <ActionBtn
            key="reblog"
            icon={<RetweetOutlined />}
            label={formatCount(reblogCount)}
            onClick={onReblog}
          />,
          <ActionBtn
            key="comment"
            icon={<CommentOutlined />}
            label={formatCount(commentCount)}
          />,
          <ActionBtn
            key="share"
            icon={<ShareAltOutlined />}
            label={shareCount > 0 ? formatCount(shareCount) : '分享'}
            onClick={onShare}
          />,
        ]}
      >
        {title && (
          <Title level={4} style={{ marginTop: 0 }}>
            {type === 'link' && <LinkOutlined style={{ marginRight: 6, color: LOFTER_BRAND.primary }} />}
            {type === 'quote' && <ReadOutlined style={{ marginRight: 6, color: LOFTER_BRAND.primary }} />}
            {title}
          </Title>
        )}

        {type === 'quote' && quoteText && (
          <Card
            size="small"
            style={{ marginBottom: 12, borderLeft: `4px solid ${LOFTER_BRAND.primary}`, background: 'transparent' }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Paragraph style={{ fontSize: 'calc(var(--app-font-size) + 3px)', fontWeight: 500, marginBottom: 4, whiteSpace: 'pre-wrap' }}>
              {quoteText}
            </Paragraph>
            {quoteSource && (
              <div style={{ textAlign: 'right', color: LOFTER_BRAND.textTertiary, fontSize: 'calc(var(--app-font-size) - 1px)' }}>
                —— {quoteSource}
              </div>
            )}
          </Card>
        )}

        {type === 'link' && linkUrl && (
          <a href={linkUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 12, wordBreak: 'break-all' }}>
            <Tag color="cyan" icon={<LinkOutlined />}>{linkUrl}</Tag>
          </a>
        )}

        {desc ? (
          <>
            <Paragraph
              style={{
                whiteSpace: 'pre-wrap',
                marginTop: 8,
                fontSize: 'calc(var(--app-font-size) + 2px)',
                marginBottom: 8,
              }}
            >
              {parseTopicTags(desc).map((item, idx) => {
                if (item.type === 'tag') {
                  return (
                    <Tag key={idx} color="cyan" style={{ margin: 0 }}>
                      #{item.content}#
                    </Tag>
                  );
                }
                return <span key={idx}>{item.content}</span>;
              })}
            </Paragraph>

            {tags.length > 0 && (
              <Space size={4} wrap style={{ marginBottom: 8 }}>
                {tags.map((t, idx) => (
                  <Tag key={idx} color="cyan">#{t.name}</Tag>
                ))}
              </Space>
            )}

            {(publishTime > 0 || ipLocation) && (
              <Space>
                {publishTime > 0 && (
                  <span className="descriptionForeground">
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatTimestamp(publishTime)}
                  </span>
                )}
                {ipLocation && (
                  <span className="descriptionForeground">
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {ipLocation}
                  </span>
                )}
              </Space>
            )}
          </>
        ) : (
          !images.length && !videoUrl && !audioUrl && type !== 'quote' && (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无更多内容</div>
          )
        )}
      </Card>
    </>
  );
};

export default PostContentCard;
