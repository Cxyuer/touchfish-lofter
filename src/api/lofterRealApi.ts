/*
 * 真实 LOFTER API 层（基于 DWR + 图片代理）
 * ---------------------------------------------------------------------------
 * 把 LOFTER 的 DWR 回包映射成 lofter/src/types/lofter.ts 里定义的干净类型。
 * 图片 URL 统一改写到 /lofter-img/<host>/<path>，由 Vite 代理转发到真实 CDN，
 * 解决浏览器直接请求 imglf*.lf127.net / avaimg.lf127.net 被跨域/Referer 拦截的问题。
 *
 * 当代理不可用或 cookie 失效时，useRequest 会自动回退到 mockProvider。
 */
import { dwrCall, restGet } from './dwrClient';
import type {
  LofterComment,
  LofterFeedItem,
  LofterFeedResponse,
  LofterImage,
  LofterInteractInfo,
  LofterPost,
  LofterPostType,
  LofterSubComment,
  LofterUser,
} from '../types/lofter';

/* ===========================================================================
 *  1. 工具
 * ===========================================================================*/

const POST_TYPE_MAP: Record<number, LofterPostType> = {
  1: 'text',   // 纯文字文章（photoCount=0）
  2: 'photo',  // 图文（有 firstImage/photoLinks）
  3: 'audio',
  4: 'video',
  5: 'link',
  6: 'quote',
};

/** 安全转 number：非法值返回 0，避免 NaN 传给 DWR */
function toNumber(v: any): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 安全转 int：非法值返回 0 */
function toInt(v: any): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/** 把 LOFTER 图片 CDN URL 改写成走代理 /lofter-img/<host>/<path>，由 Vite 代理或扩展宿主本地代理转发 */
export function rewriteImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (!/^https?:\/\//.test(url)) return url;
  try {
    const u = new URL(url);
    // 只代理 lf127.net 域名（LOFTER 图床），其他域名直通
    if (u.hostname.endsWith('.lf127.net')) {
      const proxyBase = (typeof window !== 'undefined' && (window as any).__LOFTER_PROXY_BASE__) || '';
      return `${proxyBase}/lofter-img/${u.hostname}${u.pathname}${u.search}`;
    }
    return url;
  } catch {
    return url;
  }
}

/** 批量改写 */
function rewriteImages(urls: string[]): LofterImage[] {
  return urls.map((u) => ({ url: rewriteImageUrl(u) })).filter((i) => i.url);
}

/** 去掉 HTML 标签，把 <p>/<br> 转成换行 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&times;/g, '×')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 从 HTML 里提取所有 <img src="..."> */
function extractImagesFromHtml(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

/** 解析 firstImage / firstImageUrl 字段
 *  - 字符串数组 ['url1','url2']
 *  - 对象 { orign, raw, middle, small }（推荐 API 的 firstImage）
 *  - JSON 字符串数组
 */
function parseFirstImageUrl(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'object') {
    // {orign, raw, middle, small}
    const u = raw.orign || raw.raw || raw.middle || raw.small || '';
    return u ? [u] : [];
  }
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter(Boolean);
    if (typeof arr === 'object' && arr !== null) {
      const u = arr.orign || arr.raw || arr.middle || arr.small || '';
      return u ? [u] : [];
    }
  } catch { /* ignore */ }
  return [];
}

/** 解析 photoLinks 字段（JSON 字符串数组，每个元素含 small/orign/middle/raw 等） */
function parsePhotoLinks(raw: any): string[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p: any) => p?.orign || p?.raw || p?.middle || p?.small || '')
      .filter(Boolean);
  } catch { /* ignore */ }
  return [];
}

/** 解析 ipLocation（JSON 字符串）→ 省份名 */
function parseIpLocation(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    try {
      const loc = JSON.parse(raw);
      return loc.province || loc.country || '';
    } catch { return ''; }
  }
  if (typeof raw === 'object') return raw.province || raw.country || '';
  return '';
}

/* ===========================================================================
 *  2. 映射函数
 * ===========================================================================*/

export function mapBlogInfo(bi: any): LofterUser {
  if (!bi) return { user_id: '', nickname: '', avatar: '', blog_name: '' };
  return {
    user_id: String(bi.blogId ?? ''),
    nickname: bi.blogNickName || bi.blogName || '',
    blog_name: bi.blogName || '',
    avatar: rewriteImageUrl(bi.bigAvaImg || bi.smallAvaImg),
    desc: bi.selfIntro || '',
    domain: bi.homePageUrl || '',
    follow_count: bi.followCount,
    fans_count: bi.fansCount,
    post_count: bi.postCount,
  } as LofterUser;
}

export function mapPostCount(pc: any, liked = false, collected = false, followed = false): LofterInteractInfo {
  return {
    liked,
    liked_count: pc?.favoriteCount ?? 0,
    comment_count: pc?.responseCount ?? 0,
    collected,
    collected_count: pc?.subscribeCount ?? 0,
    reblog_count: pc?.reblogCount ?? 0,
    share_count: pc?.shareCount ?? 0,
    followed,
  };
}

/**
 * 把一条完整 post 对象映射成 LofterPost
 * @param p 完整 post 对象（来自 it.post 或 PostBean.getPosts 的 .post）
 * @param wrapper wrapper 层（含 liked/followed/showLike 等交互态）
 */
export function mapPost(p: any, wrapper?: any): LofterPost {
  const type = POST_TYPE_MAP[p?.type] || 'text';
  const blogInfo = p?.blogInfo || p?.publisherMainBlogInfo;
  const user = mapBlogInfo(blogInfo);

  // 图片优先级：photoLinks > firstImage/firstImageUrl > HTML <img>
  let imageUrls = parsePhotoLinks(p?.photoLinks);
  if (imageUrls.length === 0) imageUrls = parseFirstImageUrl(p?.firstImage ?? p?.firstImageUrl);
  if (imageUrls.length === 0) imageUrls = extractImagesFromHtml(p?.digest || p?.content || '');
  const images = rewriteImages(imageUrls);

  // 正文：优先 content(HTML 有段落) > digest(HTML 摘要) > dirContent(纯文本无段落)
  // 关键：dirContent 是 LOFTER 后端生成的纯文本摘要，换行符被去掉了，一整段没分段
  // content/digest 是 HTML，有 <p>/<br> 段落标签，stripHtml 会转成 \n 保留段落
  const htmlContent = p?.content || p?.digest || '';
  const content = htmlContent ? stripHtml(htmlContent) : (p?.dirContent || '');

  // 标签
  let tagList: Array<{ name: string }> = [];
  if (Array.isArray(p?.tagList) && p.tagList.length) {
    tagList = p.tagList
      .map((t: any) => ({ name: typeof t === 'string' ? t : t?.name || t?.tag || '' }))
      .filter((t: any) => t.name);
  } else if (p?.tag) {
    tagList = String(p.tag).split(',').map((s: string) => ({ name: s.trim() })).filter((t) => t.name);
  }

  const liked = wrapper?.liked ?? p?.liked ?? false;
  const followed = Boolean(wrapper?.followed ?? p?.followed ?? false);

  return {
    post_id: String(p?.id || p?.postId || ''),
    type,
    title: p?.title || '',
    content,
    images,
    user,
    interact_info: mapPostCount(p?.postCount, liked, false, followed),
    publish_time: Math.floor((p?.publishTime || p?.createTime || Date.now()) / 1000),
    ip_location: parseIpLocation(p?.ipLocation),
    tag_list: tagList,
    permalink: p?.permalink || '',
    blog_id: String(p?.blogId || ''),
    _raw: p,
  } as LofterPost;
}

/** 把推荐块里的 post 摘要映射成 LofterPost（信息较少，但够 feed 展示） */
export function mapRecPostSummary(p: any, blogInfo: any): LofterPost {
  const type = POST_TYPE_MAP[p?.type] || 'text';
  const user = mapBlogInfo(blogInfo);

  let imageUrls: string[] = [];
  try {
    const tagIcon = typeof p?.tagIconJsonStr === 'string' ? JSON.parse(p.tagIconJsonStr) : p?.tagIconJsonStr;
    if (tagIcon?.postDesc) imageUrls = extractImagesFromHtml(tagIcon.postDesc);
  } catch { /* ignore */ }
  const images = rewriteImages(imageUrls);

  const content = stripHtml(p?.digest || '');

  let tagList: Array<{ name: string }> = [];
  if (p?.tag) {
    tagList = String(p.tag).split(',').map((s) => ({ name: s.trim() })).filter((t) => t.name);
  }

  return {
    post_id: String(p?.postId || ''),
    type,
    title: p?.title || '',
    content,
    images,
    user,
    interact_info: mapPostCount(null, false, false, false),
    publish_time: Math.floor((p?.publishTime || Date.now()) / 1000),
    tag_list: tagList,
    permalink: p?.permalink || '',
    blog_id: String(p?.blogId || blogInfo?.blogId || ''),
    _summary: true,
  } as LofterPost;
}

/** 把评论对象映射成 LofterComment */
function mapComment(c: any): LofterComment {
  const publisher = mapBlogInfo(c?.publisherMainBlogInfo || c?.blogInfo);
  const replyTo = c?.replyToUserId ? mapBlogInfo(c?.replyBlogInfo) : null;
  return {
    id: String(c?.id || ''),
    comment_id: String(c?.id || ''),
    post_id: String(c?.postId || ''),
    user_info: publisher,
    content: stripHtml(c?.content || ''),
    like_count: c?.commentHot ?? 0,
    liked: c?.liked ?? false,
    create_time: Math.floor((c?.publishTime || Date.now()) / 1000),
    publish_time: Math.floor((c?.publishTime || Date.now()) / 1000),
    sub_comment_count: c?.l2CommentsCount ?? c?.replyL2Count ?? 0,
    target_user: replyTo ? { user_id: String(c?.replyToUserId || ''), nickname: replyTo?.nickname || '' } : undefined,
    reply_to: replyTo ? { user: replyTo, response_id: String(c?.replyToResponseId || '') } : null,
    ip_location: parseIpLocation(c?.ext),
    _raw: c,
  } as unknown as LofterComment;
}

/* ===========================================================================
 *  3. 真实 API 命令
 * ===========================================================================*/

/**
 * 首页发现流：TrackBean.getTrackItemListWithShareNew(false, cursor)
 * param0 = boolean false（发现流，对应 LOFTER web 首页默认）
 * param1 = cursor 字符串（来自上次返回的 eventsIds 最后一项）
 */
export async function realGetHomeFeed(payload: { cursor?: string }): Promise<LofterFeedResponse> {
  return realGetTrackFeed(false, payload?.cursor || '');
}

/**
 * 首页关注流：TrackBean.getTrackItemListWithShareNew(true, cursor)
 * param0 = boolean true（关注流，只看已关注博主的文章）
 */
export async function realGetFollowingFeed(payload: { cursor?: string }): Promise<LofterFeedResponse> {
  return realGetTrackFeed(true, payload?.cursor || '');
}

/** 统一的发现/关注流抓取：
 *  - 发现流（isFollowing=false）：用手机端 REST API recommend/exploreRecom.json，cursor=offset 数字
 *  - 关注流（isFollowing=true）：用 DWR TrackBean.getTrackItemListWithShareNew(true, ...)
 */
async function realGetTrackFeed(isFollowing: boolean, cursor: string): Promise<LofterFeedResponse> {
  if (!isFollowing) {
    return realGetExploreFeed(cursor);
  }
  return realGetFollowingTrackFeed(cursor);
}

/** 发现流：手机端 REST recommend/exploreRecom.json（offset 翻页）
 * 每次 count=20，返回 list 含 postData.postView + blogInfo
 */
async function realGetExploreFeed(cursor: string): Promise<LofterFeedResponse> {
  const offset = cursor ? toInt(cursor) : 0;
  const body = new URLSearchParams({
    offset: String(offset),
    feedTime: '0',
    count: '20',
  }).toString();
  const proxyBase = (typeof window !== 'undefined' && (window as any).__LOFTER_PROXY_BASE__) || '';
  const url = `${proxyBase}/lofter-api/recommend/exploreRecom.json?product=lofter-android-8.3.64`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'okhttp/4.9.3',
    },
    body,
  });
  if (!res.ok) throw new Error(`explore HTTP ${res.status}`);
  const json: any = await res.json();
  if (json?.code != null && json.code !== 0) {
    throw new Error(`explore code=${json.code}: ${json?.msg || 'unknown'}`);
  }
  const list: any[] = json?.data?.list || [];
  const items: LofterFeedItem[] = list.map((it: any) => {
    const pv = it?.postData?.postView || {};
    const bi = it?.blogInfo || {};
    const post = mapPost({ ...pv, blogInfo: bi }, it);
    return { id: post.post_id, post_id: post.post_id, type: post.type, post };
  });
  const nextOffset = json?.data?.offset ? String(json.data.offset) : '';
  return { items, cursor: nextOffset, has_more: items.length > 0 };
}

/** 关注流：DWR TrackBean.getTrackItemListWithShareNew(true, ...)
 *  首页存 eventsIds，后续用 getTrackItemWithShareListByEventIds 翻页
 */
const FEED_PAGE_SIZE = 20;
const feedEventsIdsCache: Record<string, string[]> = { following: [] };

async function realGetFollowingTrackFeed(cursor: string): Promise<LofterFeedResponse> {
  const pageNum = cursor ? toInt(cursor) : 0;

  if (pageNum > 0) {
    const allIds = feedEventsIdsCache.following || [];
    const start = pageNum * FEED_PAGE_SIZE;
    const end = start + FEED_PAGE_SIZE;
    const slice = allIds.slice(start, end);
    if (slice.length === 0) return { items: [], cursor: '', has_more: false };
    const data: any = await dwrCall({
      bean: 'TrackBean',
      method: 'getTrackItemWithShareListByEventIds',
      params: [slice, {}],
    });
    const rawItems: any[] = Array.isArray(data) ? data : (data?.items || []);
    const items = mapTrackItems(rawItems);
    const nextCursor = end < allIds.length ? String(pageNum + 1) : '';
    return { items, cursor: nextCursor, has_more: end < allIds.length };
  }

  const data = await dwrCall({
    bean: 'TrackBean',
    method: 'getTrackItemListWithShareNew',
    params: [true, ''],
  });
  const eventsIds: string[] = (data?.eventsIds || []).map((x: any) => String(x));
  feedEventsIdsCache.following = eventsIds;
  const items = mapTrackItems(data?.items || []);
  const hasMore = eventsIds.length > FEED_PAGE_SIZE;
  return { items, cursor: hasMore ? '1' : '', has_more: hasMore };
}

/** 把 TrackBean 返回的 items 数组映射成 LofterFeedItem[]
 *  注意：LOFTER 会把推荐博客（recomBlogs / recomBlog）混进关注流，这里直接过滤掉，只保留你关注的人的 post。 */
function mapTrackItems(rawItems: any[]): LofterFeedItem[] {
  const items: LofterFeedItem[] = [];
  for (const it of rawItems) {
    if (it?.post) {
      const post = mapPost(it.post, it);
      items.push({ id: post.post_id, post_id: post.post_id, type: post.type, post });
    }
    // 主动跳过 recomBlogs（数组，多条推荐博客）和 recomBlog（单条推荐博客）
    // 这些是 LOFTER 的随机推荐，不是你关注的人的文章
  }
  return items;
}

/** 当前登录用户信息：REST /newweb/home/getBlogInfo.json（DWR 的 BlogBean.getBlogInfo 已失效） */
export async function realGetMyInfo(): Promise<LofterUser> {
  const data: any = await restGet('/newweb/home/getBlogInfo.json');
  // data 结构: { blogCount, userStatistic, blogInfo: { blogId, blogNickName, blogName, bigAvaImg, ... } }
  const bi = data?.blogInfo;
  if (!bi) throw new Error('getBlogInfo.json missing blogInfo');
  const user = mapBlogInfo(bi);
  // 补充 REST 才有的统计字段
  user.follow_count = data?.userStatistic?.followingCount;
  user.fans_count = data?.blogCount?.followerCount;
  user.post_count = data?.blogCount?.publicPostCount;
  user.liked_count = data?.userStatistic?.favoritePostCount;
  return user;
}

/** 任意博主信息
 * LOFTER 没有按 blogId/blogName 直接查任意博主的 DWR 接口（getBlogInfo 已失效）。
 * 这里策略：
 *   - 如果 payload 里已经带了 user 对象（feed 里已有完整 blogInfo），直接返回
 *   - 否则 fallback 让 mock 处理（返回 null）
 */
export async function realGetUserInfo(payload: { blog_name?: string; user_id?: string; user?: any }): Promise<any> {
  // 如果已有现成 user 对象且包含 avatar，直接返回
  if (payload?.user?.avatar) {
    return payload.user;
  }
  // 否则按 blogId 拉一篇 post 提取 blogInfo（含头像/昵称）
  const blogId = toNumber(payload?.user_id || payload?.user?.user_id);
  if (!blogId) return payload?.user || null;
  try {
    // 先查缓存（fetchBlogInfoBatch 维护的 blogInfoCache）
    const cached = blogInfoCache.get(String(blogId));
    if (cached?.avatar) return cached;
    const data = await dwrCall({
      bean: 'PostBean',
      method: 'getPosts',
      params: [blogId, 1, 0],
    });
    const first = Array.isArray(data) && data[0];
    const bi = first?.post?.blogInfo;
    if (bi?.blogId) {
      const user = mapBlogInfo(bi);
      blogInfoCacheSet(String(bi.blogId), user);
      return user;
    }
  } catch { /* ignore */ }
  return payload?.user || null;
}

/** 博主文章列表：PostBean.getPosts(blogId, limit, offset) */
export async function realGetUserPosts(payload: { user_id: string; cursor?: string; page?: number }): Promise<any> {
  const blogId = toNumber(payload?.user_id);
  const limit = 20;
  const offset = payload?.page ? (payload.page - 1) * limit : toInt(payload?.cursor);
  const data = await dwrCall({
    bean: 'PostBean',
    method: 'getPosts',
    params: [blogId, limit, offset],
  });
  // data 是数组，每个元素是 wrapper{post, liked, followed, ...}
  const items: LofterFeedItem[] = (Array.isArray(data) ? data : []).map((w: any) => {
    const post = mapPost(w?.post, w);
    return { id: post.post_id, post_id: post.post_id, type: post.type, post };
  });
  return { items, cursor: String(offset + limit), has_more: items.length >= limit };
}

/** 文章详情：优先用 feed 里已有的 post 数据；精简结构（archive/explore）拉完整详情 */
export async function realGetPostDetail(payload: { post_id: string; blog_id?: string; raw?: any }): Promise<any> {
  // 如果调用方传入了 feed 里已有的原始 post 数据
  if (payload?.raw) {
    const raw = payload.raw;

    // 判断是否是"精简结构"需要拉完整详情：
    // 关键：content(HTML) 是唯一有段落信息的字段，dirContent 是纯文本无换行
    // 只要 content 为空（无论 archive/explore/关注流精简版），就翻 getPosts 找完整 post
    // 1. archive post（ArchiveBean.getFavoritePosts）：有 values，没 content/photoLinks/blogInfo
    // 2. explore postView（推荐流）：有 digest，但 photoLinks 空
    // 3. 关注流精简版（TrackBean）：有 dirContent，但 content/digest 空
    const isArchive = raw?.values && !raw?.digest && !raw?.photoLinks && !raw?.blogInfo;
    // content(HTML) 为空就需要拉完整 post（dirContent 纯文本无段落，不够）
    const needFullPost = !raw?.content && !isArchive;

    if (isArchive || needFullPost) {
      const blogId = toNumber(raw?.blogId || raw?.blog_id || payload?.blog_id);
      const targetPostId = String(raw?.id || raw?.post_id || payload?.post_id || '');
      if (blogId && targetPostId) {
        // 用 getPosts(blogId, limit, offset) 翻页找目标 post
        // 优化：一次拉 200 篇（1 次请求）通常能覆盖博主最近所有文章
        // 找不到再继续翻，最多翻 500 篇（3 次请求）
        const PAGE_SIZE = 200;
        const MAX_OFFSET = 500;
        for (let offset = 0; offset < MAX_OFFSET; offset += PAGE_SIZE) {
          try {
            const data = await dwrCall({
              bean: 'PostBean',
              method: 'getPosts',
              params: [blogId, PAGE_SIZE, offset],
            });
            const list = Array.isArray(data) ? data : [];
            const found = list.find((w: any) => String(w?.post?.id) === targetPostId);
            if (found) return { post: mapPost(found.post, found) };
            if (list.length < PAGE_SIZE) break; // 没更多了
          } catch { break; }
        }
      }
      // 找不到完整 post，用精简数据兜底
      if (isArchive) {
        return { post: mapArchivePost(raw, blogInfoCache) };
      }
      // 精简兜底：用 mapPost 至少能显示 dirContent/digest 摘要 + firstImage 一张图
      return { post: mapPost(raw) };
    }
    // 普通 feed post（有完整字段）：直接映射
    return { post: mapPost(raw) };
  }
  // 没有 raw 时通过 blog_id 拉 getPosts 兜底（一次拉 200 篇）
  if (payload?.blog_id) {
    const data = await dwrCall({
      bean: 'PostBean',
      method: 'getPosts',
      params: [toNumber(payload.blog_id), 200, 0],
    });
    const found = (Array.isArray(data) ? data : []).find((w: any) => String(w?.post?.id) === String(payload.post_id));
    if (found) return { post: mapPost(found.post, found) };
  }
  throw new Error('Post detail not found');
}

/** 我喜欢的文章列表：PostBean.getFavTrackItem(limit, offset) */
export async function realGetMyLikedPosts(payload: { cursor?: string; page?: number }): Promise<any> {
  const limit = 20;
  const offset = payload?.page ? (payload.page - 1) * limit : toInt(payload?.cursor);
  const data = await dwrCall({
    bean: 'PostBean',
    method: 'getFavTrackItem',
    params: [limit, offset],
  });
  // data 是数组，每个元素是 wrapper{post, liked, followed, ...}
  const items: LofterFeedItem[] = (Array.isArray(data) ? data : []).map((w: any) => {
    const post = mapPost(w?.post, w);
    return { id: post.post_id, post_id: post.post_id, type: post.type, post };
  });
  return { items, cursor: String(offset + limit), has_more: items.length >= limit };
}

/**
 * 任意博主的喜欢列表：ArchiveBean.getFavoritePosts(blogId, time, limit)
 * @param user_id 博主 blogId
 * @param cursor 时间戳游标（ms），首次传空=当前时间，下一页用最后一条的 time
 * 返回的是精简 post 摘要数组，每个含 {blogId, id, type, time, values:{permalink,title,...}, noteCount, tagCount}
 * 拉完后会并发补上每个作者的 blogInfo（头像/昵称），缓存到 blogInfoCache
 */
export async function realGetUserLikedPosts(payload: { user_id: string; cursor?: string }): Promise<any> {
  const blogId = toNumber(payload?.user_id);
  if (!blogId) throw new Error('getUserLikedPosts needs user_id');
  const limit = 50;
  // cursor 是 ms 时间戳，首次空=当前时间
  const now = Date.now();
  const timeCursor = payload?.cursor ? toNumber(payload.cursor) : now;
  const data = await dwrCall({
    bean: 'ArchiveBean',
    method: 'getFavoritePosts',
    params: [blogId, timeCursor, limit],
  });
  // ArchiveBean 返回 null 表示作者隐藏了喜欢列表（非常常见），返回 [] 表示公开但确实没喜欢
  if (data === null || data === undefined) {
    return { items: [], cursor: '', has_more: false, hidden: true };
  }
  // data 是精简 post 数组
  const rawList: any[] = Array.isArray(data) ? data : [];
  // 并发补上每个作者的 blogInfo（头像/昵称），已缓存的会跳过
  const blogIds = Array.from(new Set(rawList.map((p: any) => toNumber(p?.blogId)).filter(Boolean)));
  await fetchBlogInfoBatch(blogIds);
  // 映射成 LofterFeedItem，用补好的 blogInfoCache
  const items: LofterFeedItem[] = rawList.map((p: any) => {
    const post = mapArchivePost(p, blogInfoCache);
    return { id: post.post_id, post_id: post.post_id, type: post.type, post };
  });
  // 下一页 cursor = 最后一条的 time
  const nextCursor = rawList.length ? String(rawList[rawList.length - 1]?.time || '') : '';
  return { items, cursor: nextCursor, has_more: items.length >= limit, hidden: false };
}

/** blogInfo 缓存：blogId → LofterUser（用于 ArchiveBean 喜欢列表补作者头像）
 *  限制最大 500 条，避免长期运行内存泄漏 */
const BLOG_INFO_CACHE_MAX = 500;
const blogInfoCache = new Map<string, LofterUser>();

function blogInfoCacheSet(blogId: string, user: LofterUser): void {
  if (blogInfoCache.size >= BLOG_INFO_CACHE_MAX) {
    // 简单 LRU：删最早加入的一个
    const firstKey = blogInfoCache.keys().next().value;
    if (firstKey) blogInfoCache.delete(firstKey);
  }
  blogInfoCache.set(blogId, user);
}

/** 清空所有模块级缓存（退出登录 / 切账号时调用） */
export function clearLofterCaches(): void {
  blogInfoCache.clear();
  feedEventsIdsCache.following = [];
}

/** 并发拉一批 blogId 的 blogInfo（用 PostBean.getPosts(blogId, 1, 0) 提取第一篇 post.blogInfo） */
async function fetchBlogInfoBatch(blogIds: number[]): Promise<void> {
  const todo = blogIds.filter((id) => id && !blogInfoCache.has(String(id)));
  if (!todo.length) return;
  // 并发但限制最多 6 个并发
  const CONCURRENCY = 6;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const chunk = todo.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (blogId) => {
      try {
        const data = await dwrCall({
          bean: 'PostBean',
          method: 'getPosts',
          params: [blogId, 1, 0],
        });
        const first = Array.isArray(data) && data[0];
        const bi = first?.post?.blogInfo;
        if (bi?.blogId) {
          blogInfoCacheSet(String(bi.blogId), mapBlogInfo(bi));
        }
      } catch { /* 忽略单个失败 */ }
    }));
  }
}

/** 把 ArchiveBean.getFavoritePosts 返回的精简 post 映射成 LofterPost */
function mapArchivePost(p: any, userMap?: Map<string, LofterUser>): LofterPost {
  const type = POST_TYPE_MAP[p?.type] || 'text';
  const values = p?.values || {};
  const blogIdStr = String(p?.blogId || '');
  // 优先用批量补上的 blogInfo；没有就用 blogId 占位
  const cached = userMap?.get(blogIdStr);
  const user: LofterUser = cached || {
    user_id: blogIdStr,
    nickname: '',
    avatar: '',
    blog_name: '',
  };
  // 标题/摘要来自 values
  const title = values?.title || values?.noticeLinkTitle || '';
  const content = values?.noticeLinkTitle || title;
  const permalink = values?.permalink || '';
  return {
    post_id: String(p?.id || ''),
    type,
    title,
    content,
    images: [],
    user,
    interact_info: mapPostCount({ favoriteCount: p?.noteCount, responseCount: 0, reblogCount: 0, subscribeCount: 0, shareCount: 0 }, false, false, false),
    publish_time: Math.floor((p?.time || Date.now()) / 1000),
    tag_list: [],
    permalink,
    blog_id: blogIdStr,
    _raw: p,
  } as LofterPost;
}

/** 评论列表：PostBean.getPostResponses(postId, limit, offset) */
export async function realGetComments(payload: { post_id: string; cursor?: string }): Promise<any> {
  const postId = toNumber(payload?.post_id);
  const limit = 20;
  const offset = toInt(payload?.cursor);
  const data = await dwrCall({
    bean: 'PostBean',
    method: 'getPostResponses',
    params: [postId, limit, offset],
  });
  const comments: LofterComment[] = (Array.isArray(data) ? data : []).map(mapComment);
  return {
    comments,
    cursor: String(offset + limit),
    has_more: comments.length >= limit,
  };
}

/** 子评论：LOFTER 的子评论走另一个方法，暂用空列表 */
export async function realGetSubComments(_p: { comment_id: string; cursor?: string }): Promise<any> {
  void _p;
  return { sub_comments: [] as LofterSubComment[], cursor: '0', has_more: false };
}

/** 点赞：PostBean.like(postId, blogId) */
export async function realLikePost(payload: { post_id: string; blog_id?: string; post?: any }): Promise<any> {
  const blogId = payload?.blog_id || payload?.post?.blog_id || payload?.post?.user?.user_id;
  if (!blogId) throw new Error('likePost needs blog_id');
  const data = await dwrCall({
    bean: 'PostBean',
    method: 'like',
    params: [toNumber(payload?.post_id), toNumber(blogId)],
  });
  return { ok: true, op_time: data?.opTime, _raw: data };
}

/** 取消点赞：PostBean.unlike(postId, blogId) */
export async function realDislikePost(payload: { post_id: string; blog_id?: string; post?: any }): Promise<any> {
  const blogId = payload?.blog_id || payload?.post?.blog_id || payload?.post?.user?.user_id;
  if (!blogId) throw new Error('dislikePost needs blog_id');
  const data = await dwrCall({
    bean: 'PostBean',
    method: 'unlike',
    params: [toNumber(payload?.post_id), toNumber(blogId)],
  });
  return { ok: true, op_time: data?.opTime, _raw: data };
}

/** 关注：UserBean.followBlog(blogId) */
export async function realFollowUser(payload: { user_id?: string; target_user_id?: string }): Promise<any> {
  const userId = payload?.user_id || payload?.target_user_id;
  if (!userId) throw new Error('followUser needs user_id');
  const data = await dwrCall({
    bean: 'UserBean',
    method: 'followBlog',
    params: [toNumber(userId)],
  });
  return { ok: true, blog_id: data, _raw: data };
}

/** 取关：UserBean.unFollowBlog(blogId) */
export async function realUnfollowUser(payload: { user_id?: string; target_user_id?: string }): Promise<any> {
  const userId = payload?.user_id || payload?.target_user_id;
  if (!userId) throw new Error('unfollowUser needs user_id');
  const data = await dwrCall({
    bean: 'UserBean',
    method: 'unFollowBlog',
    params: [toNumber(userId)],
  });
  return { ok: true, blog_id: data, _raw: data };
}

/**
 * 搜索博客（用户）：REST /newsearch/blog.json?key=KEYWORD&limit=20&offset=0
 * 返回 {blogs, totalCount, offset, hasResult}。支持 offset 分页，totalCount 是总数。
 */
export async function realSearchBlogs(payload: { keyword: string; cursor?: string; page?: number }): Promise<any> {
  const keyword = payload?.keyword || '';
  if (!keyword) return { items: [], cursor: '', has_more: false, total: 0 };
  const limit = 20;
  const offset = payload?.page ? (payload.page - 1) * limit : toInt(payload?.cursor);
  const url = `/newsearch/blog.json?key=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}&_=${Date.now()}`;
  const data: any = await restGet(url);
  // data 结构：{blogs: [...], totalCount, offset, hasResult}
  const rawBlogs: any[] = Array.isArray(data?.blogs) ? data.blogs : [];
  const blogs: LofterUser[] = rawBlogs.map(mapBlogInfo);
  const items: LofterFeedItem[] = blogs.map((u) => ({
    id: u.user_id,
    post_id: u.user_id,
    type: 'text' as LofterPostType,
    post: {
      post_id: u.user_id,
      type: 'text',
      title: u.nickname,
      content: u.desc || '',
      images: [],
      user: u,
      interact_info: mapPostCount(null, false, false, false),
      publish_time: 0,
      tag_list: [],
    } as LofterPost,
  }));
  const total = typeof data?.totalCount === 'number' ? data.totalCount : items.length;
  return {
    items,
    cursor: String(offset + items.length),
    has_more: offset + items.length < total,
    total,
  };
}

/**
 * 搜索文章：REST /newsearch/post.json?key=KEYWORD&limit=20&offset=0
 * 返回 {posts: [...], totalCount, offset, hasResult}。支持 offset 分页，totalCount 是总数。
 * （旧接口 /newsearch/web/all.json 不支持分页，每次只返回 8 条，已废弃）
 */
export async function realSearchPosts(payload: { keyword: string; cursor?: string; page?: number }): Promise<any> {
  const keyword = payload?.keyword || '';
  if (!keyword) return { items: [], cursor: '', has_more: false, total: 0 };
  const limit = 20;
  const offset = payload?.page ? (payload.page - 1) * limit : toInt(payload?.cursor);
  const url = `/newsearch/post.json?key=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}&_=${Date.now()}`;
  const data: any = await restGet(url);
  // data 结构：{posts: [...], totalCount, offset, hasResult}
  const rawPosts: any[] = Array.isArray(data?.posts) ? data.posts : [];
  const items: LofterFeedItem[] = rawPosts.map((p) => {
    const post = mapSearchPost(p);
    return { id: post.post_id, post_id: post.post_id, type: post.type, post };
  });
  const total = typeof data?.totalCount === 'number' ? data.totalCount : items.length;
  return {
    items,
    cursor: String(offset + items.length),
    has_more: offset + items.length < total,
    total,
  };
}

/** 把搜索结果 post 摘要映射成 LofterPost（字段结构与 feed 的 post 不同） */
function mapSearchPost(p: any): LofterPost {
  const type = POST_TYPE_MAP[p?.type] || 'text';
  const user = mapBlogInfo(p?.blogInfo);
  // firstImage 是 {orign: '...'} 对象；photoPostView.photoLinks 是数组
  let imageUrls: string[] = [];
  if (p?.firstImage?.orign) imageUrls = [p.firstImage.orign];
  else if (Array.isArray(p?.photoPostView?.photoLinks)) {
    imageUrls = p.photoPostView.photoLinks.map((x: any) => x?.orign || x?.raw || '').filter(Boolean);
  }
  const images = rewriteImages(imageUrls);
  const content = stripHtml(p?.digest || '');
  let tagList: Array<{ name: string }> = [];
  if (Array.isArray(p?.tagList)) {
    tagList = p.tagList.map((t: string) => ({ name: t })).filter((t) => t.name);
  }
  return {
    post_id: String(p?.id || ''),
    type,
    title: p?.title || '',
    content,
    images,
    user,
    interact_info: mapPostCount(p?.postCount, false, false, false),
    publish_time: Math.floor((p?.publishTime || Date.now()) / 1000),
    tag_list: tagList,
    permalink: p?.permalink || '',
    blog_id: String(p?.blogId || ''),
    _raw: p,
  } as LofterPost;
}

/** 收藏：LOFTER 没有独立收藏，复用 like 语义 */
export async function realCollectPost(payload: { post_id: string; blog_id: string }): Promise<any> {
  return realLikePost(payload);
}
export async function realUncollectPost(payload: { post_id: string; blog_id: string }): Promise<any> {
  return realDislikePost(payload);
}

/** 发评论：PostBean.addPostResponse({postId,blogId,content,replyToUserId,replyToResponseId}, isReblog)
 *  注意：DWR 对象参数 + X-GuardInfo token，可能失败。失败时抛错由 useRequest 回退 mock。 */
export async function realPostComment(payload: {
  post_id: string;
  blog_id: string;
  content: string;
  reply_to_user_id?: string;
  reply_to_comment_id?: string;
}): Promise<any> {
  // DWR 对象参数需要 Object_ClassName:{field=reference:c0-eN=value} 格式
  // 这里构造对象参数串
  const postId = toNumber(payload?.post_id);
  const blogId = toNumber(payload?.blog_id);
  const content = payload?.content || '';
  const replyToUserId = toNumber(payload?.reply_to_user_id);
  const replyToResponseId = toNumber(payload?.reply_to_comment_id);

  // 构造 DWR body（带对象参数）
  const fields = [
    'callCount=1',
    'windowName=',
    'c0-scriptName=PostBean',
    'c0-methodName=addPostResponse',
    'c0-id=0',
    'c0-eid=0',
    `c0-param0=Object_PostResponse:{postId=reference:c0-e1,blogId=reference:c0-e2,content=reference:c0-e3,replyToUserId=number:${replyToUserId},replyToResponseId=number:${replyToResponseId}}`,
    'c0-param1=boolean:false',
    `c0-e1=number:${postId}`,
    `c0-e2=number:${blogId}`,
    `c0-e3=string:${content}`,
    `batchId=${Math.floor(Math.random() * 100000) + 100}`,
    'instanceId=0',
    'pageId=4',
    `scriptSessionId=${String(Math.floor(Math.random() * 1e18)).padStart(18, '0')}`,
  ];
  const body = fields.join('&');
  const proxyBase = (typeof window !== 'undefined' && (window as any).__LOFTER_PROXY_BASE__) || '';
  const url = `${proxyBase}/lofter-api/dwr/call/plaincall/PostBean.addPostResponse.dwr`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body,
  });
  if (!res.ok) throw new Error(`addPostResponse HTTP ${res.status}`);
  const text = await res.text();
  // 简单判断成功/失败
  if (text.includes('_remoteHandleException') || text.includes('_remoteHandleBatchException')) {
    throw new Error(`addPostResponse failed: ${text.substring(0, 200)}`);
  }
  return { ok: true, _raw: text.substring(0, 500) };
}

/** 上传图片 / 发布文章：暂走 mock（涉及 token / 多步上传，暂不实现） */
export async function realUploadImage(_p: any): Promise<any> {
  void _p;
  throw new Error('uploadImage not implemented in real API');
}
export async function realPublishPost(_p: any): Promise<any> {
  void _p;
  throw new Error('publishPost not implemented in real API');
}

export const realApi = {
  getHomeFeed: realGetHomeFeed,
  getFollowingFeed: realGetFollowingFeed,
  getMyInfo: realGetMyInfo,
  getUserInfo: realGetUserInfo,
  getUserPosts: realGetUserPosts,
  getLikedPosts: realGetMyLikedPosts,
  getUserLikedPosts: realGetUserLikedPosts,
  getPostDetail: realGetPostDetail,
  getComments: realGetComments,
  getSubComments: realGetSubComments,
  likePost: realLikePost,
  dislikePost: realDislikePost,
  collectPost: realCollectPost,
  uncollectPost: realUncollectPost,
  followUser: realFollowUser,
  unfollowUser: realUnfollowUser,
  searchPosts: realSearchPosts,
  searchBlogs: realSearchBlogs,
  postComment: realPostComment,
  uploadImage: realUploadImage,
  publishPost: realPublishPost,
};
