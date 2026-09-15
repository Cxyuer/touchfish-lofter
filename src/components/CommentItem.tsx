/*
 * 评论项组件
 * 对应 touchFish/xhs/src/components/CommonItem.tsx
 */
import React from 'react';
import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  EnvironmentOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { List, Avatar, Space, Tag, Button } from 'antd';
import { formatTimestamp, formatCount } from '../utils/utils';

interface CommentUser {
  user_id?: string;
  nickname?: string;
  avatar?: string;
}

interface Comment {
  id: string;
  user_info?: CommentUser;
  content?: string;
  create_time?: number;
  like_count?: number;
  liked?: boolean;
  sub_comment_count?: number;
  ip_location?: string;
  sub_comments?: Comment[];
  sub_comment_has_more?: boolean;
  sub_loading?: boolean;
  sub_error?: string | null;
  target_user?: { nickname: string; user_id: string };
}

interface CommentItemProps {
  c: Comment;
  onUserClick?: (userInfo: CommentUser) => void;
  onExpandSubComments?: () => void;
  onLike?: (comment: Comment) => void;
  [key: string]: any;
}

const CommentItem: React.FC<CommentItemProps> = ({ c, onUserClick, onExpandSubComments, onLike, ...rest }) => {
  return (
    <List.Item key={c.id} {...rest}>
      <div style={{ display: 'flex', width: '100%', gap: 8 }}>
        <Avatar
          src={c.user_info?.avatar}
          size={32}
          style={{ cursor: c.user_info?.user_id ? 'pointer' : 'default' }}
          onClick={() => c.user_info?.user_id && onUserClick?.(c.user_info)}
        >
          {c.user_info?.nickname?.[0]}
        </Avatar>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span
              style={{ fontWeight: 'bolder', cursor: c.user_info?.user_id ? 'pointer' : 'default' }}
              onClick={() => c.user_info?.user_id && onUserClick?.(c.user_info)}
            >
              {c.user_info?.nickname}
            </span>
            <span style={{ color: '#999', fontSize: 'calc(var(--app-font-size) - 2px)' }}>
              {formatTimestamp(c.create_time)}
            </span>
          </div>

          <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
            {c.target_user && (
              <span style={{ color: 'var(--vscode-textLink-foreground)' }}>@{c.target_user.nickname} </span>
            )}
            {c.content}
          </div>

          <Space size={4} style={{ marginTop: 4 }} wrap>
            <span
              style={{ cursor: 'pointer', color: c.liked ? '#ff4d6d' : 'inherit' }}
              onClick={() => onLike?.(c)}
            >
              {c.liked ? <HeartFilled style={{ color: '#ff4d6d' }} /> : <HeartOutlined />} {formatCount(c.like_count || 0)}
            </span>
            {c.ip_location && (
              <Tag color="purple">
                <EnvironmentOutlined /> {c.ip_location}
              </Tag>
            )}
            {Number(c.sub_comment_count) > 0 && (
              <Tag color="blue">
                <MessageOutlined /> {c.sub_comment_count}
              </Tag>
            )}
          </Space>

          {c.sub_comments && c.sub_comments.length > 0 && (
            <List
              dataSource={c.sub_comments}
              renderItem={(sub) => (
                <CommentItem
                  c={sub}
                  onUserClick={onUserClick}
                  style={{ padding: '5px 0' }}
                />
              )}
              style={{ marginTop: 12 }}
            />
          )}

          {c.sub_comments && c.sub_comment_has_more && (
            <Button
              color="default"
              variant="filled"
              size="small"
              icon={<CommentOutlined />}
              loading={c.sub_loading}
              onClick={onExpandSubComments}
            >
              {c.sub_error
                ? c.sub_error
                : c.sub_loading
                  ? '加载中...'
                  : `展开 ${Number(c.sub_comment_count) - (c.sub_comments?.length || 0)} 条评论`}
            </Button>
          )}
        </div>
      </div>
    </List.Item>
  );
};

export default CommentItem;
