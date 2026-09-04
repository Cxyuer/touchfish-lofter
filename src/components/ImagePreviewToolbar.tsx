/*
 * 图片预览工具栏
 * 对应 touchFish/xhs/src/components/ImagePreviewToolbar.tsx
 */
import React from 'react';
import { Space } from 'antd';
import {
  DownloadOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { vscode } from '../utils/vscode';

interface ImagePreviewToolbarProps {
  imageUrl: string;
  imageIndex: number;
  fileNamePrefix?: string;
  scale: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload?: (url: string, fileName: string) => void;
}

const ImagePreviewToolbar: React.FC<ImagePreviewToolbarProps> = ({
  imageUrl,
  imageIndex,
  fileNamePrefix = 'lofter',
  scale,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onDownload,
}) => {
  const handleDownload = () => {
    const fileName = `${fileNamePrefix}_${imageIndex + 1}.jpg`;
    if (onDownload) {
      onDownload(imageUrl, fileName);
    } else {
      vscode.postMessage({
        command: 'LOFTER_DOWNLOAD_IMAGE',
        payload: { url: imageUrl, fileName },
      });
    }
  };

  return (
    <Space size={12} className="lofter-image-preview-toolbar">
      <DownloadOutlined onClick={handleDownload} />
      <RotateLeftOutlined onClick={onRotateLeft} />
      <RotateRightOutlined onClick={onRotateRight} />
      <ZoomOutOutlined disabled={scale === 1} onClick={onZoomOut} />
      <ZoomInOutlined disabled={scale === 50} onClick={onZoomIn} />
    </Space>
  );
};

export default ImagePreviewToolbar;
