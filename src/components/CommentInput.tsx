/*
 * 评论输入组件
 * 对应 touchFish/xhs/src/components/CommentInput.tsx
 */
import React, { useState } from 'react';
import { Card, Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface CommentInputProps {
  onSubmit: (content: string) => Promise<boolean | undefined>;
  loading?: boolean;
  placeholder?: string;
}

const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  loading = false,
  placeholder = '写下你的评论...',
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    const ok = await onSubmit(content);
    if (ok) setContent('');
  };

  return (
    <Card size="small" title="发表评论" style={{ marginTop: 16, marginBottom: 16 }}>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        autoSize={{ minRows: 1, maxRows: 4 }}
        disabled={loading}
        style={{ resize: 'none' }}
      />
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={!content.trim() || loading}
        >
          发送
        </Button>
      </div>
    </Card>
  );
};

export default CommentInput;
