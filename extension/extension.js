/*
 * LOFTER VSCode 扩展宿主
 * ---------------------------------------------------------------------------
 * 1. 激活时启动一个本地 HTTP 代理服务（127.0.0.1:<随机端口>）
 *    - /lofter-api/*   → https://www.lofter.com/*（注入 Cookie / Origin / Referer）
 *    - /lofter-img/<host>/<path> → https://<host>/<path>（仅 *.lf127.net，注入 Referer）
 * 2. 注册 webview view "lofter"，加载 touchfish-lofter/dist/index.html
 * 3. 把代理 base 注入 window.__LOFTER_PROXY_BASE__，前端 fetch / img 走本地代理
 * 4. 收到前端 postMessage（SAVE_FONT_SIZE / TOGGLE_SHOW_IMG 等）后持久化到 VSCode 配置
 */
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');

/** @type {http.Server | null} */
let proxyServer = null;
let proxyPort = 0;

/** 读取 cookie：优先 VSCode 配置 lofter.cookie，其次 ~/.lofter_cookie 文件 */
function readCookie() {
  const config = vscode.workspace.getConfiguration('lofter');
  let cookie = config.get('cookie', '') || '';
  if (!cookie) {
    try {
      const cookieFile = path.join(os.homedir(), '.lofter_cookie');
      cookie = fs.readFileSync(cookieFile, 'utf-8').trim();
    } catch {
      /* ignore */
    }
  }
  return cookie;
}

/** 启动本地代理服务 */
function startProxyServer() {
  const cookie = readCookie();
  const server = http.createServer((req, res) => {
    const url = req.url || '';
    // CORS：只允许 VSCode webview 来源，避免本机其他进程/网页 CSRF
    const origin = req.headers.origin || '';
    const isAllowed = !origin || origin.startsWith('vscode-webview://') || origin.startsWith('vscode-resource://');
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || 'null');
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 拒绝非本地来源的请求（双重保险）
    const referer = req.headers.referer || '';
    const host = req.headers.host || '';
    if (referer && !referer.startsWith('http://127.0.0.1:') && !referer.startsWith('vscode-')) {
      res.writeHead(403);
      res.end('forbidden referer');
      return;
    }
    if (!host.startsWith('127.0.0.1:') && !host.startsWith('localhost:')) {
      res.writeHead(403);
      res.end('forbidden host');
      return;
    }

    console.log(`[lofter-proxy] ${req.method} ${url.substring(0, 100)}`);

    // 图片 CDN 代理：/lofter-img/<host>/<path>
    const imgMatch = url.match(/^\/lofter-img\/([^/]+)(\/.*)?/);
    if (imgMatch) {
      const host = imgMatch[1];
      const imgPath = imgMatch[2] || '/';
      // 严格白名单：只允许已知的 LOFTER CDN 域名，避免 SSRF
      const allowedImgHosts = [
        'imglf.lf127.net', 'imglf1.lf127.net', 'imglf2.lf127.net', 'imglf3.lf127.net',
        'imglf4.lf127.net', 'imglf5.lf127.net', 'imglf6.lf127.net', 'imglf7.lf127.net',
        'imglf8.lf127.net', 'imglf9.lf127.net', 'imglf10.lf127.net',
        '210.lf127.net', 'easec.lf127.net',
      ];
      if (!allowedImgHosts.includes(host) && !/^imglf\d*\.lf127\.net$/.test(host)) {
        res.writeHead(403);
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
            Referer: 'https://www.lofter.com/dashboard',
            Accept: 'image/*,*/*;q=0.8',
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on('error', (e) => {
        res.writeHead(502);
        res.end(`proxy error: ${e.message}`);
      });
      req.pipe(proxyReq);
      return;
    }

    // DWR / REST API 代理：/lofter-api/*
    if (url.startsWith('/lofter-api/')) {
      const targetPath = url.replace(/^\/lofter-api/, '');
      // 手机端推荐 API 走 api.lofter.com
      const isRecommend = targetPath.startsWith('/recommend/');
      const headers = {
        'Content-Type': req.headers['content-type'] || 'text/plain;charset=UTF-8',
        'User-Agent': isRecommend ? 'okhttp/4.9.3' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ...(isRecommend ? {} : { Origin: 'https://www.lofter.com', Referer: 'https://www.lofter.com/dashboard' }),
      };
      if (cookie) headers.Cookie = cookie;
      const proxyReq = https.request(
        {
          host: isRecommend ? 'api.lofter.com' : 'www.lofter.com',
          path: targetPath,
          method: req.method,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on('error', (e) => {
        res.writeHead(502);
        res.end(`proxy error: ${e.message}`);
      });
      req.pipe(proxyReq);
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      proxyPort = server.address().port;
      console.log(`[lofter] proxy server on http://127.0.0.1:${proxyPort}`);
      resolve(server);
    });
  });
}

/** 生成 webview HTML */
function getWebviewHtml(webviewView, context) {
  const distUri = vscode.Uri.joinPath(context.extensionUri, 'touchfish-lofter', 'dist');
  const indexUri = vscode.Uri.joinPath(distUri, 'index.html');

  let html;
  try {
    html = fs.readFileSync(indexUri.fsPath, 'utf-8');
  } catch (e) {
    return `<html><body><h3>未找到构建资源 touchfish-lofter/dist/index.html</h3><pre>${e.message}</pre></body></html>`;
  }

  // 把 /index.js、/vendor.js、/index.css 改写成 webview URI
  html = html.replace(
    /(href|src)="\/([^"]*)"/g,
    (_, attr, p) =>
      `${attr}="${webviewView.webview.asWebviewUri(vscode.Uri.joinPath(distUri, p))}"`
  );

  // 注入代理 base + CSP
  const proxyBase = `http://127.0.0.1:${proxyPort}`;
  const cspSource = webviewView.webview.cspSource;
  const csp = [
    `default-src 'none'`,
    `img-src ${cspSource} https: http://127.0.0.1:${proxyPort} data: blob:`,
    `script-src 'unsafe-inline' 'unsafe-eval' ${cspSource}`,
    `style-src 'unsafe-inline' ${cspSource}`,
    `connect-src ${cspSource} http://127.0.0.1:${proxyPort}`,
    `font-src ${cspSource} data:`,
    `media-src ${cspSource} https: data: blob:`,
  ].join('; ');

  const injectScript = `<script>window.__LOFTER_PROXY_BASE__ = ${JSON.stringify(proxyBase)};</script>`;
  html = html.replace(
    '</head>',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">${injectScript}</head>`
  );

  return html;
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  // 启动代理服务（异步，不阻塞激活）
  startProxyServer().then((server) => {
    proxyServer = server;
  });

  // 注册 webview
  const provider = {
    resolveWebviewView(webviewView) {
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [context.extensionUri],
      };

      // 接收前端 postMessage（配置类命令）
      webviewView.webview.onDidReceiveMessage((msg) => {
        if (!msg || !msg.command) return;
        const config = vscode.workspace.getConfiguration('lofter');
        switch (msg.command) {
          case 'SAVE_FONT_SIZE':
            if (msg.payload != null) config.update('fontSize', msg.payload, true);
            break;
          case 'TOGGLE_SHOW_IMG':
            if (msg.payload != null) config.update('showImg', msg.payload, true);
            break;
          default:
            break;
        }
      });

      // 等 proxyPort 就绪后再生成 HTML（最多等 5 秒，50 次重试）
      let tryCount = 0;
      const tryGen = () => {
        if (proxyPort > 0) {
          webviewView.webview.html = getWebviewHtml(webviewView, context);
        } else if (tryCount < 50) {
          tryCount++;
          setTimeout(tryGen, 100);
        } else {
          webviewView.webview.html = `<html><body><h3>代理服务启动失败</h3><p>请重新加载窗口</p></body></html>`;
        }
      };
      tryGen();
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('lofter', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // 注册命令：打开 Lofter 面板
  context.subscriptions.push(
    vscode.commands.registerCommand('lofter.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.lofter');
    })
  );

  // 注册命令：设置 Cookie
  context.subscriptions.push(
    vscode.commands.registerCommand('lofter.setCookie', async () => {
      const cookie = await vscode.window.showInputBox({
        prompt: '请输入 LOFTER Cookie（从浏览器开发者工具复制）',
        password: true,
        ignoreFocusOut: true,
      });
      if (cookie) {
        await vscode.workspace.getConfiguration('lofter').update('cookie', cookie, true);
        vscode.window.showInformationMessage('LOFTER Cookie 已保存');
      }
    })
  );
}

function deactivate() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
  }
}

module.exports = { activate, deactivate };
