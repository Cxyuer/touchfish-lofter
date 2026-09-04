/*
 * 发布文章 Drawer
 * 对应 touchFish/xhs/src/components/XhsSendDrawer.tsx
 */
import React, { useRef, useState } from 'react';
import { Card, Form, Input, Button, Upload, Space, Tag } from 'antd';
import { UploadOutlined, PictureOutlined, FileTextOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { createLofterApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import BaseDrawer from './BaseDrawer';
import { LOFTER_BRAND } from '../constants';

const { TextArea } = Input;

interface LofterSendDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImageItem extends UploadFile {
  base64?: string;
}

const LofterSendDrawer: React.FC<LofterSendDrawerProps> = ({ open, onClose, onSuccess }) => {
  const { request, messageApi } = useRequest();
  const apiRef = useRef(createLofterApi(request));
  const [form] = Form.useForm();
  const [posting, setPosting] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [postType, setPostType] = useState<'photo' | 'text'>('photo');

  const handleUpload = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res: any = await apiRef.current.uploadImage({ file: base64, name: file.name, type: file.type });
          const item: ImageItem = {
            uid: `${Date.now()}_${Math.random()}`,
            name: file.name,
            status: 'done',
            url: res.url,
            thumbUrl: res.url,
            base64,
          };
          setImages((prev) => [...prev, item]);
          resolve();
        } catch (e: any) {
          messageApi.error(e?.message || '图片上传失败');
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setPosting(true);
      const imageUrls = images.map((img) => img.url).filter(Boolean) as string[];
      const payload = {
        title: values.title || '',
        content: values.content || '',
        images: imageUrls,
        type: postType,
      };
      const res: any = await apiRef.current.publishPost(payload);
      if (res?.success !== false) {
        messageApi.success('发布成功');
        form.resetFields();
        setImages([]);
        onSuccess?.();
        onClose();
      } else {
        messageApi.error(res?.msg || '发布失败');
      }
    } catch (e: any) {
      if (e?.errorFields) return;
      messageApi.error(e?.message || '发布失败');
    } finally {
      setPosting(false);
    }
  };

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="发布文章"
      height="90vh"
      styles={{ body: { padding: '16px' } }}
    >
      <Card style={{ maxWidth: 620, margin: '0 auto' }}>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type={postType === 'photo' ? 'primary' : 'default'}
            icon={<PictureOutlined />}
            onClick={() => setPostType('photo')}
            style={postType === 'photo' ? { background: LOFTER_BRAND.primary, borderColor: LOFTER_BRAND.primary } : undefined}
          >
            图文
          </Button>
          <Button
            type={postType === 'text' ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            onClick={() => setPostType('text')}
            style={postType === 'text' ? { background: LOFTER_BRAND.primary, borderColor: LOFTER_BRAND.primary } : undefined}
          >
            文字
          </Button>
        </Space>

        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ max: 50, message: '标题不超过 50 字' }]}>
            <Input placeholder="给文章起个名字（选填）" maxLength={50} showCount />
          </Form.Item>

          {postType === 'photo' && (
            <Form.Item label="图片">
              <Upload
                listType="picture-card"
                fileList={images}
                multiple
                maxCount={18}
                onRemove={(file) => setImages((prev) => prev.filter((f) => f.uid !== file.uid))}
                beforeUpload={(file) => {
                  handleUpload(file);
                  return false;
                }}
                accept="image/*"
              >
                {images.length < 18 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>添加图片</div>
                  </div>
                )}
              </Upload>
              {images.length === 0 && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="default">提示：最多上传 18 张图片</Tag>
                </div>
              )}
            </Form.Item>
          )}

          <Form.Item name="content" label="正文">
            <TextArea
              placeholder="写下你的文章..."
              autoSize={{ minRows: 6, maxRows: 18 }}
              maxLength={2000}
              showCount
              style={{ resize: 'none' }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              size="large"
              block
              loading={posting}
              onClick={handleSubmit}
              style={{ background: LOFTER_BRAND.primary, borderColor: LOFTER_BRAND.primary }}
            >
              发布
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BaseDrawer>
  );
};

export default LofterSendDrawer;
