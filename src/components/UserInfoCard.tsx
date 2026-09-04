/*
 * 用户信息卡片
 * 对应 touchFish/xhs/src/components/UserInfoCard.tsx
 */
import React from 'react';
import { Avatar, Button, Card, Flex, Tag } from 'antd';
import {
  UserAddOutlined,
  UserDeleteOutlined,
  UsergroupAddOutlined,
  TeamOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { LOFTER_BRAND } from '../constants';

export interface UserInfo {
  user_id?: string;
  nickname?: string;
  blog_name?: string;
  avatar?: string;
  desc?: string;
  domain?: string;
}

export interface UserHoverData {
  basic_info?: { desc?: string; nickname?: string; avatar?: string; blog_name?: string; domain?: string };
  interact_info?: { follows?: number; fans?: number; posts?: number };
  extra_info?: { fstatus?: string };
}

interface UserInfoCardProps {
  user: UserInfo;
  hoverData?: UserHoverData | null;
  loading?: boolean;
  error?: string | null;
  mode?: 'simple' | 'detailed';
  showFollowButton?: boolean;
  isFollowing?: boolean;
  followLoading?: boolean;
  onFollowToggle?: () => void;
  onUserClick?: () => void;
  style?: React.CSSProperties;
  size?: 'small' | 'default';
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({
  user,
  hoverData,
  loading = false,
  error = null,
  mode = 'simple',
  showFollowButton = true,
  isFollowing = false,
  followLoading = false,
  onFollowToggle,
  onUserClick,
  style,
  size = 'small',
}) => {
  const nickname = user.nickname || user.blog_name || '未知博客';
  const avatar = user.avatar;
  const hasUserId = !!user.user_id;

  const follows = hoverData?.interact_info?.follows ?? 0;
  const fans = hoverData?.interact_info?.fans ?? 0;
  const posts = hoverData?.interact_info?.posts ?? 0;
  const desc = hoverData?.basic_info?.desc || user.desc || '';

  if (mode === 'simple') {
    return (
      <Card size={size} style={style}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={12}>
            <Avatar
              src={avatar}
              size={40}
              style={{ cursor: hasUserId ? 'pointer' : 'default' }}
              onClick={() => hasUserId && onUserClick?.()}
            >
              {nickname?.[0]}
            </Avatar>
            <span
              style={{
                fontWeight: 600,
                fontSize: 'calc(var(--app-font-size) + 4px)',
                cursor: hasUserId ? 'pointer' : 'default',
              }}
              onClick={() => hasUserId && onUserClick?.()}
            >
              {nickname}
            </span>
          </Flex>
          {showFollowButton && hasUserId && (
            <Button
              color={isFollowing ? 'default' : 'primary'}
              variant={isFollowing ? 'outlined' : 'solid'}
              icon={isFollowing ? <UserDeleteOutlined /> : <UserAddOutlined />}
              loading={followLoading}
              onClick={onFollowToggle}
              style={
                isFollowing
                  ? undefined
                  : { background: LOFTER_BRAND.primary, borderColor: LOFTER_BRAND.primary }
              }
            >
              {isFollowing ? '已关注' : '关注'}
            </Button>
          )}
        </Flex>
      </Card>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        marginBottom: 12,
        ...style,
      }}
    >
      <Avatar
        src={avatar}
        size={80}
        style={{ cursor: hasUserId ? 'pointer' : 'default' }}
        onClick={() => hasUserId && onUserClick?.()}
      >
        {nickname?.[0]}
      </Avatar>
      <div
        style={{
          fontSize: 'calc(var(--app-font-size) + 6px)',
          fontWeight: 'bolder',
          cursor: hasUserId ? 'pointer' : 'default',
        }}
        onClick={() => hasUserId && onUserClick?.()}
      >
        {nickname}
      </div>
      {user.domain && (
        <div style={{ color: LOFTER_BRAND.textTertiary, fontSize: 'calc(var(--app-font-size) - 2px)', marginTop: -8 }}>
          {user.domain}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {loading && <Tag color="default">加载博客信息...</Tag>}
        {error && <Tag color="red">{error}</Tag>}
        {!loading && !error && hoverData && hoverData.interact_info && (
          <>
            <Tag icon={<UsergroupAddOutlined />} color="green">关注 {follows}</Tag>
            <Tag icon={<TeamOutlined />} color="orange">粉丝 {fans}</Tag>
            <Tag icon={<FileTextOutlined />} color="blue">文章 {posts}</Tag>
          </>
        )}
      </div>
      {!loading && !error && desc && (
        <Card size="small" styles={{ body: { padding: '10px', textAlign: 'center' } }} style={{ margin: '0 8px' }}>
          {desc}
        </Card>
      )}
      {showFollowButton && !loading && !error && hasUserId && (
        <Button
          color={isFollowing ? 'default' : 'primary'}
          variant={isFollowing ? 'outlined' : 'solid'}
          icon={isFollowing ? <UserDeleteOutlined /> : <UserAddOutlined />}
          loading={followLoading}
          onClick={onFollowToggle}
          style={
            isFollowing
              ? undefined
              : { background: LOFTER_BRAND.primary, borderColor: LOFTER_BRAND.primary }
          }
        >
          {followLoading ? '处理中...' : isFollowing ? '已关注' : '关注'}
        </Button>
      )}
    </div>
  );
};

export default UserInfoCard;
