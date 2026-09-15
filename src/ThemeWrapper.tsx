/*
 * 主题 Provider
 * 对应 touchFish/xhs/src/ThemeWrapper.tsx
 * 完全跟随 VSCode 宿主主题，所有颜色走 --vscode-xxx CSS 变量
 */
import { ConfigProvider, theme, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';

import { useFontSizeStore } from './store/fontSize';

const getTheme = () => {
  return document.body.getAttribute('data-vscode-theme-kind') === 'vscode-light';
};

const ThemeWrapper = () => {
  const [isLightTheme, setIsLightTheme] = useState(getTheme());
  const fontSize = useFontSizeStore((state) => state.fontSize);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightTheme(getTheme());
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-vscode-theme-kind'],
    });
    return () => observer.disconnect();
  }, []);

  const antdTheme = useMemo(
    () => ({
      algorithm: isLightTheme ? theme.defaultAlgorithm : theme.darkAlgorithm,
      token: {
        // 所有字号 token 都跟随全局 fontSize，保证增减字号全局生效
        fontSize: fontSize,
        fontSizeSM: Math.max(12, fontSize - 1),
        fontSizeLG: fontSize + 2,
        fontSizeXL: fontSize + 4,
        fontSizeHeading1: fontSize + 12,
        fontSizeHeading2: fontSize + 10,
        fontSizeHeading3: fontSize + 8,
        fontSizeHeading4: fontSize + 6,
        fontSizeHeading5: fontSize + 4,
        fontSizeHeading6: fontSize + 2,
        colorBorderSecondary: 'var(--vscode-chat-requestBorder)',
        colorText: 'var(--vscode-foreground)',
        colorTextDescription: 'var(--vscode-descriptionForeground)',
        colorTextSecondary: 'var(--vscode-descriptionForeground)',
        colorBorder: 'var(--vscode-chat-requestBorder)',
        colorSplit: 'var(--vscode-chat-requestBorder)',
        colorLink: 'var(--vscode-textLink-foreground)',
        colorLinkHover: 'var(--vscode-textLink-activeForeground)',
        colorIcon: 'var(--vscode-icon-foreground)',
        colorIconHover: 'var(--vscode-foreground)',
        borderRadius: 10,
      },
      components: {
        Card: {
          colorBgContainer: 'transparent',
          padding: 10,
          paddingLG: 10,
        },
        Drawer: {
          colorBgElevated: 'transparent',
        },
        Carousel: {
          arrowSize: 30,
        },
      },
    }),
    [isLightTheme, fontSize],
  );

  return (
    <ConfigProvider theme={antdTheme as any} locale={zhCN}>
      <App>
        <main className={isLightTheme ? '' : 'dark'}>
          <Dashboard />
        </main>
      </App>
    </ConfigProvider>
  );
};

export default ThemeWrapper;
