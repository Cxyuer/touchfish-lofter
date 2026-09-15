import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';

/*
 * 代理
 * ---------------------------------------------------------------------------
 * 1. /lofter-api/*        — DWR / REST 接口，注入 Cookie → https://www.lofter.com
 * 2. /lofter-img/<host>/* — 图片 CDN，按 host 动态转发到任意 *.lf127.net
 *                          解裂图：浏览器直接请求 imglf*.lf127.net / avaimg.lf127.net
 *                          会被 CDN 的 Referer/跨域策略拦截，走代理统一注入 Referer。
 *
 * cookie 文件路径可通过环境变量 LOFTER_COOKIE_FILE 覆盖，默认 ~/.lofter_cookie
 */
const cookieFile = process.env.LOFTER_COOKIE_FILE || path.join(os.homedir(), '.lofter_cookie');
let cookieStr = '';
try {
  cookieStr = fs.readFileSync(cookieFile, 'utf-8').trim();
   
  console.log(`[lofter] cookie loaded from ${cookieFile} (${cookieStr.length} bytes)`);
} catch {
   
  console.warn(`[lofter] no cookie at ${cookieFile}, real-API disabled (mock fallback)`);
}

/** 图片 CDN 代理中间件：/lofter-img/<host>/<path> → https://<host>/<path> */
function lofterImgProxyPlugin(): PluginOption {
  return {
    name: 'lofter-img-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // 用 originalUrl 拿到完整路径（mount 后 req.url 可能被重写）
        const url = req.originalUrl || req.url || '';
        const m = url.match(/^\/lofter-img\/([^/]+)(\/.*)?/);
        if (!m) return next();
        const host = m[1];
        const imgPath = m[2] || '/';
        // 只允许 lf127.net 域名，防 SSRF
        if (!host.endsWith('.lf127.net')) {
          res.statusCode = 403;
          res.end('forbidden host');
          return;
        }
        const proxyReq = https.request(
          {
            host,
            path: imgPath,
            method: req.method,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Referer': 'https://www.lofter.com/dashboard',
              'Accept': 'image/*,*/*;q=0.8',
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );
        proxyReq.on('error', (e) => {
          res.statusCode = 502;
          res.end(`proxy error: ${e.message}`);
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), lofterImgProxyPlugin()],
  server: {
    cors: true,
    port: 5180,
    strictPort: false,
    proxy: {
      // 手机端推荐 API（api.lofter.com）
      '/lofter-api/recommend': {
        target: 'https://api.lofter.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/lofter-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (cookieStr) {
              proxyReq.setHeader('Cookie', cookieStr);
            }
            proxyReq.setHeader('User-Agent', 'okhttp/4.9.3');
          });
        },
      },
      // DWR / REST 接口代理（www.lofter.com）
      '/lofter-api': {
        target: 'https://www.lofter.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/lofter-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (cookieStr) {
              proxyReq.setHeader('Cookie', cookieStr);
            }
            proxyReq.setHeader('Origin', 'https://www.lofter.com');
            proxyReq.setHeader('Referer', 'https://www.lofter.com/dashboard');
          });
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
