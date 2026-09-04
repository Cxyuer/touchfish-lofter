/*
 * LOFTER DWR (Direct Web Remoting) 客户端
 * ---------------------------------------------------------------------------
 * LOFTER 的 Feed / 详情 / 搜索等核心数据走的是 DWR 协议，而非 REST。
 * 请求：POST /dwr/call/plaincall/{Bean}.{method}.dwr
 *   - Content-Type: text/plain;charset=UTF-8
 *   - body 用 `&` 分隔的 key=value 串（DWR 也支持 \n 分隔，但 & 更稳）
 *   - c0-paramN=string:xxx 或 number:123 标注类型
 * 响应：一段 JS 代码，形如
 *   //#DWR-INSERT
 *   //#DWR-REPLY
 *   var s0=[];var s1={};...
 *   s0[0]=...;s1.foo=...;
 *   dwr.engine._remoteHandleCallback('batchId','callId',{...});
 * 我们用 new Function 在沙箱里 eval，劫持 dwr.engine._remoteHandleCallback
 * 回收 callback 的 data 对象，得到干净的 JS 对象。
 */
export interface DwrCallOptions {
  bean: string;
  method: string;
  /** c0-param0, c0-param1, ... 按顺序传入：
   *  - string 会被包成 string:xxx
   *  - number 包成 number:xxx
   *  - boolean 包成 boolean:true/false
   *  - string[] 包成 Array:[string:a,string:b,...]
   *  - Record<string, any> 包成 Object_Map:{k1=number:1,k2=string:abc,...}
   */
  params: Array<string | number | boolean | string[] | Record<string, any>>;
}

/** 生成一个随机的 scriptSessionId（DWR 规范里它只是标识，LOFTER 不强校验） */
function genScriptSessionId(): string {
  return String(Math.floor(Math.random() * 1e18)).padStart(18, '0');
}

/** 把 DWR 回包文本解析成 JS 对象
 *  注意：DWR 回调可能传 null（例如 ArchiveBean.getFavoritePosts 对隐藏喜欢的用户返回 null），
 *  必须区分"没捕获到回调"（真错误）和"回调返回 null"（合法语义）。
 *
 *  安全：DWR 响应是引用式序列化（`var s5={}; s5.x=1; ... dwr.engine._remoteHandleCallback(0,0,[s5])`），
 *  必须执行 JS 才能重建对象图。安全靠多层沙箱保证：
 *  1. 'use strict' 让函数体内 this 为 undefined，防 this.constructor.constructor 逃逸
 *  2. shadow globalThis/self/window/parent 为 undefined/fakeWindow，阻断全局访问
 *  3. 执行后对 captured 做净化：递归删除 function 类型值，防返回逃逸函数
 *  4. DWR 响应只用 `var sN={}; sN.x=...; dwr.engine._remoteHandleCallback(...)` 模式，
 *     不用 globalThis/self，所以 shadow 不影响正常解析
 *  注意：不能用正则黑名单拒绝标识符 —— DWR 序列化对象的字段名可能任意（如 s76.top=0），
 *  误判会直接挂掉所有 DWR 调用。 */
function parseDwrResponse(dwrText: string): any {
  let captured: any = undefined;
  let hasCaptured = false;
  let batchError: any = null;

  const fakeDwr = {
    engine: {
      _remoteHandleCallback: (_batchId: string, _callId: string, data: any) => {
        captured = data;
        hasCaptured = true;
      },
      _remoteHandleBatchException: (e: any) => {
        batchError = e;
      },
    },
  };

  // 沙箱 window：只暴露 dwr 和自引用 parent，不暴露 fetch/XHR/localStorage 等
  const fakeWindow: any = { dwr: fakeDwr, parent: null as any };
  fakeWindow.parent = fakeWindow;

  // 加固：'use strict' 让 this=undefined；shadow globalThis/self 为 undefined 阻断全局访问
  const sandboxBody = `'use strict';var globalThis=undefined;var self=undefined;${dwrText}`;

  try {
    const fn = new Function('dwr', 'window', 'parent', sandboxBody);
    fn(fakeDwr, fakeWindow, fakeWindow);
  } catch (e: any) {
    throw new Error(`DWR eval failed: ${e?.message || e}`);
  }

  if (batchError) {
    const msg = typeof batchError === 'object' ? batchError.message : String(batchError);
    throw new Error(`DWR batch error: ${msg}`);
  }
  if (!hasCaptured) {
    throw new Error('DWR response did not contain callback data');
  }
  // 净化：递归删除 captured 里的 function 类型值，防返回逃逸函数对象
  return sanitizeDwrData(captured);
}

/** 递归净化 DWR 返回数据：删除 function 类型的值，只保留 plain object/array/primitive
 *  防止 DWR 响应注入可调用对象，让下游代码误调导致逃逸 */
function sanitizeDwrData(data: any, depth = 0): any {
  if (depth > 20) return null; // 防深递归栈溢出
  if (data == null) return data;
  const t = typeof data;
  if (t === 'function') return null; // 删掉函数
  if (t !== 'object') return data; // primitive 直接返回
  if (Array.isArray(data)) {
    return data.map((x) => sanitizeDwrData(x, depth + 1));
  }
  const out: any = {};
  for (const k of Object.keys(data)) {
    out[k] = sanitizeDwrData(data[k], depth + 1);
  }
  return out;
}

/** 发起一次 DWR 调用，返回解析后的 JS 对象 */
export async function dwrCall(opts: DwrCallOptions): Promise<any> {
  const { bean, method, params } = opts;

  const fields: string[] = [
    'callCount=1',
    'windowName=',
    `c0-scriptName=${bean}`,
    `c0-methodName=${method}`,
    'c0-id=0',
    'c0-eid=0',
  ];
  params.forEach((p, i) => {
    let typed: string;
    if (typeof p === 'number') {
      typed = `number:${p}`;
    } else if (typeof p === 'boolean') {
      typed = `boolean:${p}`;
    } else if (Array.isArray(p)) {
      // Array:[string:a,string:b,...] 或 Array:[number:1,number:2,...]
      const items = p.map((x: any) => typeof x === 'number' ? `number:${x}` : `string:${x}`);
      typed = `Array:[${items.join(',')}]`;
    } else if (p && typeof p === 'object') {
      // Object_Map:{k1=number:1,k2=string:abc,...}
      const entries = Object.entries(p).map(([k, v]) => {
        const vTyped = typeof v === 'number' ? `number:${v}` : `string:${v}`;
        return `${k}=${vTyped}`;
      });
      typed = `Object_Map:{${entries.join(',')}}`;
    } else {
      typed = `string:${p}`;
    }
    fields.push(`c0-param${i}=${typed}`);
  });
  fields.push(`batchId=${Math.floor(Math.random() * 100000) + 100}`);
  fields.push('instanceId=0');
  fields.push('pageId=4');
  fields.push(`scriptSessionId=${genScriptSessionId()}`);

  const body = fields.join('&');
  // 支持扩展宿主注入的代理 base（webview 里走本地 HTTP 代理；dev 模式走 Vite 代理用相对路径）
  const proxyBase = (typeof window !== 'undefined' && (window as any).__LOFTER_PROXY_BASE__) || '';
  const url = `${proxyBase}/lofter-api/dwr/call/plaincall/${bean}.${method}.dwr`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body,
  });

  if (!res.ok) {
    throw new Error(`DWR HTTP ${res.status} for ${bean}.${method}`);
  }

  const text = await res.text();
  // 把回包前 200 字符带进错误信息，方便定位 DWR 端的报错
  try {
    return parseDwrResponse(text);
  } catch (e: any) {
    const preview = text.substring(0, 200).replace(/\s+/g, ' ');
    throw new Error(`${e?.message || 'parse failed'} | raw: ${preview}`);
  }
}

/**
 * 发起一次 REST GET 请求（LOFTER 部分接口走 REST 而非 DWR，如 /newweb/home/getBlogInfo.json）
 * 代理路径：${proxyBase}/lofter-api/${path}
 * @param path 以 / 开头，不含 /lofter-api 前缀
 */
export async function restGet(path: string): Promise<any> {
  const proxyBase = (typeof window !== 'undefined' && (window as any).__LOFTER_PROXY_BASE__) || '';
  const url = `${proxyBase}/lofter-api${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  if (!res.ok) {
    throw new Error(`REST HTTP ${res.status} for ${path}`);
  }
  const json = await res.json();
  if (json?.code != null && json.code !== 0) {
    throw new Error(`REST code=${json.code}: ${json?.msg || json?.message || 'unknown'}`);
  }
  return json?.data ?? json;
}

/** 健康检查：用真实 feed 接口探活（和业务一致，更可靠） */
export async function dwrPing(): Promise<boolean> {
  try {
    const data = await dwrCall({
      bean: 'TrackBean',
      method: 'getTrackItemListWithShareNew',
      params: [true, ''],
    });
    return data != null && Array.isArray(data?.items);
  } catch {
    return false;
  }
}
