/*
 * 基础 Drawer 容器组件
 * 对应 touchFish/xhs/src/components/BaseDrawer.tsx
 */
import React from 'react';
import { Drawer } from 'antd';
import type { DrawerProps } from 'antd';

interface BaseDrawerProps extends DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  scrollableId?: string;
}

export const BaseDrawer: React.FC<BaseDrawerProps> = ({
  open,
  onClose,
  title,
  children,
  scrollableId,
  ...restProps
}) => {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      destroyOnHidden
      height="90vh"
      title={title}
      styles={{
        body: { padding: 0, height: '100%', minHeight: 0, overflow: 'hidden' },
      }}
      {...restProps}
    >
      <div
        id={scrollableId}
        style={{ height: '100%', overflow: 'auto', padding: scrollableId ? 8 : 0 }}
      >
        {children}
      </div>
    </Drawer>
  );
};

export default BaseDrawer;
