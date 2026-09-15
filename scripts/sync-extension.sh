#!/bin/bash
# 同步扩展到本地 VSCode 安装目录（开发期手动执行）
# 使用：npm run build && bash scripts/sync-extension.sh
set -e
EXT_DIR="$HOME/.vscode/extensions/Cxyuer.touchfish-lofter-0.0.1"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[sync] src:    $SRC_DIR"
echo "[sync] target: $EXT_DIR"

# 1. 同步 extension.js（扩展宿主入口）
mkdir -p "$EXT_DIR/dist"
cp "$SRC_DIR/extension/extension.js" "$EXT_DIR/dist/extension.js"
echo "[sync] extension.js → $EXT_DIR/dist/extension.js"

# 2. 同步 package.json（publisher/name/icon 等元信息）
cp "$SRC_DIR/extension/package.json" "$EXT_DIR/package.json"
echo "[sync] package.json → $EXT_DIR/package.json"

# 3. 同步 assets（侧边栏图标等）
mkdir -p "$EXT_DIR/assets"
cp -r "$SRC_DIR/extension/assets/." "$EXT_DIR/assets/"
echo "[sync] assets → $EXT_DIR/assets/"

# 4. 同步前端构建产物
mkdir -p "$EXT_DIR/touchfish-lofter/dist"
cp -r "$SRC_DIR/dist/." "$EXT_DIR/touchfish-lofter/dist/"
echo "[sync] dist → $EXT_DIR/touchfish-lofter/dist/"

# 5. 清理旧的 lofter/ 子目录（如果残留）
rm -rf "$EXT_DIR/lofter"
echo "[sync] cleaned legacy $EXT_DIR/lofter (if any)"

echo "[sync] done. Reload VSCode window to take effect."
