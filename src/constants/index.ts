/*
 * LOFTER 项目常量配置
 */

/**
 * 瀑布流布局断点配置
 * 适配 VSCode 侧边栏宽度（通常 300~500px）：
 *   <360px  → 1 列
 *   <600px  → 2 列
 *   <900px  → 3 列
 *   <1200px → 4 列
 *   ≥1200px → 5 列
 */
export const MASONRY_BREAKPOINTS = {
  default: 5,
  1200: 4,
  900: 3,
  600: 2,
  360: 1,
} as const;

/** 无限滚动配置 */
export const INFINITE_SCROLL_CONFIG = {
  THRESHOLD: 0.9,
  BACK_TOP_VISIBILITY_HEIGHT: 500,
  BACK_TOP_DURATION: 600,
} as const;

/** 防抖 / 节流默认延迟 */
export const DEBOUNCE_DELAY = {
  SCROLL: 500,
  SEARCH: 300,
  INPUT: 300,
} as const;

/** LOFTER 品牌色（青绿 #14C4BC） */
export const LOFTER_BRAND = {
  primary: '#14C4BC',
  primaryHover: '#12B0A8',
  primarySoft: 'rgba(20, 196, 188, 0.12)',
  danger: '#FF5C5C',
  warning: '#FFB020',
  like: '#FF4D6D',
  text: '#1f1f1f',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#ececec',
  bg: '#f5f5f5',
} as const;

/** 仪表盘单列文章流最大宽度 */
export const FEED_MAX_WIDTH = 680;
/** 右侧推荐栏宽度 */
export const RIGHT_SIDEBAR_WIDTH = 280;
/** 左侧图标导航栏宽度 */
export const LEFT_NAV_WIDTH = 72;
