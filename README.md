# touchfish-lofter

在 VSCode 侧边栏刷 LOFTER 的摸鱼面板 —— 基于 touchFish/xhs 架构的网易 LOFTER 仪表盘克隆。

## 功能

- 📰 **发现 / 关注** 双 Tab 瀑布流
- 🔍 **文章详情** + 评论 + 子评论
- 👤 **用户主页**（文章 / 喜欢 双 Tab，支持任意深度嵌套）
- ❤️ **点赞 / 收藏 / 关注**
- 🖼️ 图片显示开关（隐藏图片时显示纯文字）
- 🔤 字体大小调节
- 📤 发布文章
- 🎨 适配 VSCode 深色 / 浅色主题

## 安装（开发者本地构建）

> 本扩展暂未上架 Marketplace，需从源码构建。

### 1. 克隆仓库

```bash
git clone https://github.com/Cxyuer/touchfish-lofter.git
cd touchfish-lofter
```

### 2. 安装依赖 + 构建前端

```bash
npm install
npm run build
```

构建产物会生成在 `dist/` 目录（`index.html` / `index.js` / `vendor.js` / `index.css`）。

### 3. 安装到 VSCode

#### 方式 A：用同步脚本（推荐）

```bash
bash scripts/sync-extension.sh
```

脚本会自动把 `extension/extension.js`、`extension/package.json`、`extension/assets/` 和前端 `dist/` 全部同步到本地 VSCode 扩展目录 `~/.vscode/extensions/Cxyuer.touchfish-lofter-0.0.1/`。

#### 方式 B：手动拷贝

把扩展装到 `~/.vscode/extensions/Cxyuer.touchfish-lofter-0.0.1/`，目录结构如下：

```
Cxyuer.touchfish-lofter-0.0.1/
├── package.json              # 从 extension/package.json 拷贝
├── dist/
│   └── extension.js           # 从 extension/extension.js 拷贝
├── assets/
│   └── lofter.svg             # 从 extension/assets/lofter.svg 拷贝
└── touchfish-lofter/
    └── dist/                   # 从 dist/* 拷贝
        ├── index.html
        ├── index.js
        ├── vendor.js
        └── index.css
```

### 4. 配置 Cookie

扩展需要 LOFTER 登录 Cookie 才能调通接口。有两种方式：

**方式 A：文件**（推荐）

把 Cookie 写到 `~/.lofter_cookie` 文件里：

```bash
# 从浏览器开发者工具 → Network → 任一 lofter.com 请求 → Request Headers → Cookie 复制
echo "你的Cookie" > ~/.lofter_cookie
```

**方式 B：VSCode 设置**

Cmd+, 打开设置，搜 `lofter.cookie`，把 Cookie 粘贴进去。

### 5. 重新加载 VSCode

Cmd+Shift+P → 输入 `Reload Window` → 回车。

侧边栏会出现一个白色的 **L** 图标，点开就能刷 LOFTER 了。

## 开发

```bash
npm run dev    # 启动 Vite 开发服务器（含 API 代理）
npm run build  # 构建前端
npm run lint   # eslint
npm run typecheck  # tsc
bash scripts/sync-extension.sh  # 同步到本地已安装扩展（改完代码执行）
```

### 项目结构

```
touchfish-lofter/
├── extension/              # VSCode 扩展宿主（纯 JS）
│   ├── extension.js         # 扩展入口，注册 webview
│   ├── package.json         # 扩展元信息（publisher/name/contributes）
│   └── assets/
│       └── lofter.svg       # 侧边栏图标
├── src/                     # 前端 React 应用
│   ├── api/
│   │   ├── dwrClient.ts     # DWR 协议封装
│   │   ├── lofterRealApi.ts # LOFTER 真实 API 对接
│   │   └── index.ts         # API 工厂
│   ├── components/          # UI 组件
│   ├── hooks/               # React hooks
│   ├── store/               # zustand 状态
│   ├── types/               # TypeScript 类型
│   └── style/               # 样式
├── scripts/
│   └── sync-extension.sh    # 本地扩展同步脚本
├── vite.config.ts           # Vite 配置（含 LOFTER API 代理）
└── package.json             # 前端依赖
```

### 技术栈

- **前端**: React 19 + TypeScript + Ant Design 5 + zustand
- **构建**: Vite 7
- **VSCode 扩展**: 原生 Node.js（`extension.js` 直接跑在扩展宿主里）
- **API**: LOFTER DWR (Direct Web Remoting) + REST

## License

MIT
