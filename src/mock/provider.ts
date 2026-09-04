/*
 * Mock 数据提供者
 * ---------------------------------------------------------------------------
 * 在浏览器 dev 模式下（非 VS Code webview），useRequest 会把 LOFTER_* 命令
 * 直接派发到这里，返回模拟数据，使 lofter 子应用可以独立运行、完整体验
 * 全部交互。当应用被打包进 touchFish 扩展、运行在真实 webview 时，
 * useRequest 会走 vscode.postMessage -> 扩展宿主 -> 真实 LOFTER 接口 的链路，
 * 此 mock 层不会被调用。
 *
 * 图片使用 https://picsum.photos 的占位服务（seed 化，保证同一 seed 出同一张图）。
 */
import type {
  LofterCommandList,
  LofterComment,
  LofterFeedItem,
  LofterFeedResponse,
  LofterPost,
  LofterPostType,
  LofterSubComment,
  LofterUser,
} from '../types/lofter';

/* ===========================================================================
 *  1. 词库
 * ===========================================================================*/

const BLOG_NAMES = [
  '雾港研究所', '山涧茶寮', '胶片日记', '像素病房', '夜航船书屋',
  '橘子海盐', '银河旅人', '老相机铺', '半盏星光', '瓷岛故事',
  '碎玻璃花园', '霓虹标本', '雨天便利店', '猫与旧唱机', '纸上光阴',
  '深海观测站', '北纬四十度', '锈色画廊', '薄荷档案室', '晚风电台',
  '岛屿瞭望员', '林间手帖', '潮汐收藏家', '失物招领处', '云的背面',
  '鲸落书店', '迟到的春天', '厨房与爱', '飞行日记', '慢半拍电影社',
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NICKNAMES = [
  '阿淮', '小满', '鹿野', '桑榆', '沉舟', '南屿', '拾光', '听潮',
  '一枕', '半夏', '青栀', '苏苏', '木下', '老木', '春衫', '旧伞',
  '海盐', '玻璃', '夜读', '远舟', '北窗', '浅眠', '微醺', '迟暮',
  '白茶', '余声', '不系舟', '三两', '木瓜', '南风',
];

const DESC_POOL = [
  '记录一些无用而美好的事物。偶尔写字，常常发呆。',
  '摄影 / 旧物 / 旅途碎片。请慢用。',
  '在北方的小城里养猫、看书、煮咖啡。',
  '把日子过成胶片。#胶片日记 #日常',
  '写一些没人看的诗。深夜更新。',
  '收集云、收集雨、收集每一次心动。',
  '一个试图把生活过成电影的人。',
  '画画的，偶尔写字。请勿转载。',
  '在小岛上开一家书店，等你来翻书。',
  '听黑胶、煮手冲、看落日。',
];

const TITLE_POOL = [
  '今天的云像一块融化的糖', '深夜厨房：一碗清汤面', '胶片里的秋天',
  '在旧书店发现的便签', '雨天的便利店里', '把心绪收进抽屉',
  '去看了一次海', '猫在窗台上睡着了', '一本读了一半的书',
  '关于"等待"的一些片段', '凌晨三点的便利店', '城市的边缘有光',
  '路过的花店', '一封写给未来的信', '在博物馆里消磨的下午',
  '秋天的第一杯咖啡', '一个人的电影夜', '收音机里的老歌',
  '巷子尽头的旧灯', '把日子过成诗', '盛夏的标本', '路过一场雨',
  '深夜电台：给失眠的人', '把春天装进口袋', '在火车上看完了一本书',
];

const CONTENT_POOL = [
  '今天的天气很好，光线从窗帘的缝隙里漏进来，在地板上画出一道斜线。猫蹲在光里，眯着眼睛。我想，所谓幸福，大概就是这样吧。',
  '下班后绕去了那家老书店。老板还是坐在柜台后面看书，看见我抬头点了点头。淘到一本八十年代的诗集，扉页上有人用钢笔写了一句"愿你被世界温柔以待"。',
  '把冲洗好的胶卷从暗房里拿出来，对着窗外的光一张张看。有一张拍糊了，是猫跳上桌子的瞬间，反而成了整卷里最喜欢的一张。',
  '夜里下了雨。撑伞去便利店买了一罐热咖啡，回来的路上踩了很多水坑。这条街的灯在雨里散开，像一滩滩融化的橘子糖。',
  '最近在读一本关于时间的书。作者说，时间不是一条线，而是一间堆满东西的屋子。我们走进去，被那些东西绊倒，再走出来。',
  '周末去看了海。海风很大，把头发吹得乱七八糟。坐在堤岸上发了很久的呆，什么都没想，也什么都想了。',
  '家里的旧唱机修好了。放上一张三十年前的黑胶，电流声先"滋啦"一下，然后音乐就流出来了。那种声音，是新机器永远模仿不来的。',
  '在博物馆里待了一整个下午。最喜欢的是一只宋代的青瓷碗，釉色像雨后的天。隔着玻璃看了很久，想伸手摸一摸，当然不行。',
  '今天做了一个很奇怪的梦。梦见自己在一列没有终点的火车上，窗外是不断后退的麦田。醒来的时候，耳边还留着车轮碾过铁轨的声响。',
  '巷子尽头的那盏旧灯又亮了。每次路过都忍不住多看两眼，它的光很暖，像旧时光里某人留给这个世界的温柔。',
  '盛夏的午后，蝉鸣把整个世界都煮得滚烫。我从冰箱里拿出半块西瓜，坐在电风扇前一口一口吃，吃得满手是汁。',
  '在旧物市场淘到一只铜制的信箱，钥匙还在。把它摆在书桌上，假装有人会给我写信。也许有一天，真的会有人写。',
  '夜里失眠，爬起来煮了一壶茶。窗外是熟睡的城市，远处有几盏灯还亮着，不知道是谁也醒着。',
  '去看了一场一个人的电影。散场的时候，整个影厅只剩我和打扫的阿姨。她说，年轻人，别总一个人，我笑了笑，没说话。',
  '把春天装进口袋。今天路过的每一棵树都在开花，白的、粉的、紫的，一团一团像要溢出来。我折了一枝，偷偷带回家。',
];

const QUOTE_POOL = [
  { text: '我们都是赶路的人，在彼此的生命里借宿一晚，然后各自赶路。', source: '《云的背面》' },
  { text: '所谓远方，不过是另一个人的故乡。', source: '《旅人手记》' },
  { text: '愿你成为自己的太阳，无需凭借谁的光。', source: '佚名' },
  { text: '生活不止眼前的苟且，还有诗和远方的田野。', source: '高晓松' },
  { text: '一个人至少拥有一个梦想，有一个理由去坚强。', source: '三毛' },
  { text: '心若没有栖息的地方，到哪里都是流浪。', source: '三毛' },
  { text: '岁月不饶人，我亦未曾饶过岁月。', source: '木心' },
  { text: '从前的日色变得慢，车，马，邮件都慢。', source: '木心《从前慢》' },
  { text: '我所理解的生活，就是和喜欢的一切在一起。', source: '韩寒' },
  { text: '愿你一生努力，一生被爱，想要的都拥有，得不到的都释怀。', source: '佚名' },
];

const LINK_POOL = [
  { title: '一个让人安静下来的网站 - A Soft Murmur', url: 'https://asoftmurmur.com' },
  { title: '十年前我收藏的歌单，现在听依旧心动', url: 'https://music.163.com' },
  { title: '推荐一本好书：《云的背面》', url: 'https://book.douban.com' },
  { title: '我常去的那家旧书店开了线上店', url: 'https://www.douban.com' },
  { title: '一个教人冲洗胶片的频道', url: 'https://www.youtube.com' },
];

const TAG_POOL = [
  '胶片日记', '日常', '摄影', '读书', '猫', '咖啡', '旅行',
  '深夜电台', '城市漫步', '旧物', '手帐', '诗', '电影', '音乐',
  '黑胶', '博物馆', '海', '雨天', '秋天', '春天',
];

const COMMENT_POOL = [
  '好喜欢这篇，存下来慢慢看。',
  '拍得真好看，请问用的什么胶卷？',
  '读着读着就安静下来了，谢谢博主。',
  '同款旧唱机，握手！',
  '这家书店我也去过，老板人超好。',
  '文字太治愈了，转载已注明出处。',
  '猫好可爱，是什么品种呀？',
  '这道面看起来好好吃，求食谱！',
  '住在北方的小城也好幸福啊。',
  '请问这是哪个城市拍的？好喜欢这种光。',
  '最近也在读这本书，读到这一段的时候愣住了。',
  '云的比喻太美了。',
  '收音机里的老歌，是哪一个电台呀？',
  '转载到我的博客啦，已注明作者，感谢分享~',
  '这种生活节奏真让人羡慕。',
  '祝你被世界温柔以待。',
  '在地铁上看哭了，还好戴着口罩。',
  '博主的文字有种让人慢下来的力量。',
  '我也想养猫了。',
  '请问书名是？想找来看看。',
];

/* ===========================================================================
 *  2. 随机工具
 * ===========================================================================*/

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(rand(copy.length), 1)[0]);
  }
  return out;
};
const chance = (p: number) => Math.random() < p;

const imgUrl = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
const avatarUrl = (seed: string) => imgUrl('av_' + seed, 120, 120);

/* ===========================================================================
 *  3. 用户池 & 文章池
 * ===========================================================================*/

const USERS: LofterUser[] = BLOG_NAMES.map((blogName, i) => {
  const user_id = 'u_' + (1000 + i);
  return {
    user_id,
    nickname: blogName,
    blog_name: blogName,
    avatar: avatarUrl(user_id),
    desc: pick(DESC_POOL),
    domain: `${blogName}.lofter.com`,
  };
});

const POST_TYPES: LofterPostType[] = ['photo', 'photo', 'photo', 'text', 'quote', 'audio', 'video', 'link'];

function buildPost(i: number): LofterPost {
  const user = pick(USERS);
  const type = pick(POST_TYPES);
  const post_id = 'p_' + Date.now() + '_' + i + '_' + rand(100000);
  const publish_time = Math.floor(Date.now() / 1000) - rand(60 * 60 * 24 * 30);
  const tags = pickN(TAG_POOL, chance(0.6) ? 1 : 2).map((name) => ({ name }));
  const title = pick(TITLE_POOL);
  const content = pick(CONTENT_POOL);
  const liked = chance(0.3);
  const collected = chance(0.2);
  const followed = chance(0.25);

  const base = {
    post_id,
    type,
    title,
    content,
    user,
    tag_list: tags,
    publish_time,
    ip_location: chance(0.5) ? pick(['北京', '上海', '杭州', '成都', '广州', '厦门', '大连', '青岛', '昆明', '西安']) : '',
    interact_info: {
      liked,
      liked_count: rand(2000) + (liked ? 1 : 0),
      comment_count: rand(300),
      collected,
      collected_count: rand(500) + (collected ? 1 : 0),
      reblog_count: rand(120),
      share_count: rand(80),
      followed,
    },
  };

  if (type === 'photo') {
    const count = chance(0.4) ? 1 : chance(0.7) ? rand(2) + 2 : rand(3) + 3; // 1 ~ 6
    const images = Array.from({ length: count }, (_, k) => {
      const w = 800;
      const h = chance(0.5) ? 600 : chance(0.75) ? 1000 : 450;
      return { url: imgUrl(post_id + '_' + k, w, h), width: w, height: h };
    });
    return { ...base, images };
  }
  if (type === 'text') {
    return { ...base, images: [] };
  }
  if (type === 'quote') {
    const q = pick(QUOTE_POOL);
    return { ...base, images: [], quote_text: q.text, quote_source: q.source, content: '' };
  }
  if (type === 'audio') {
    return {
      ...base,
      images: [],
      audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-' + (rand(16) + 1) + '.mp3',
      audio_title: pick(['深夜电台 · 第 37 期', '雨天的歌单', '一首写给失眠者的曲子', '黑胶时间']),
    };
  }
  if (type === 'video') {
    const seed = post_id;
    return {
      ...base,
      images: [],
      video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      video_poster: imgUrl('poster_' + seed, 800, 500),
    };
  }
  // link
  const link = pick(LINK_POOL);
  return { ...base, images: [], link_url: link.url, content: link.title, title: link.title };
}

/** 主文章池：生成 240 篇 */
const POST_POOL: LofterPost[] = Array.from({ length: 240 }, (_, i) => buildPost(i));

/** 关注状态表：user_id -> boolean */
const FOLLOW_MAP = new Map<string, boolean>();
USERS.forEach((u) => FOLLOW_MAP.set(u.user_id, !!u.interact_info?.followed));
/** 点赞 / 收藏状态表 */
const LIKE_MAP = new Map<string, boolean>();
const COLLECT_MAP = new Map<string, boolean>();
POST_POOL.forEach((p) => {
  LIKE_MAP.set(p.post_id, !!p.interact_info.liked);
  COLLECT_MAP.set(p.post_id, !!p.interact_info.collected);
});

/* ===========================================================================
 *  4. 评论生成
 * ===========================================================================*/

function buildComment(postId: string, idx: number): LofterComment {
  const user = pick(USERS);
  const id = 'c_' + postId + '_' + idx;
  const subCount = chance(0.4) ? rand(4) : 0;
  const sub_comments: LofterSubComment[] = Array.from({ length: Math.min(subCount, 3) }, (_, k) => {
    const su = pick(USERS);
    return {
      id: id + '_s' + k,
      content: pick(COMMENT_POOL),
      like_count: rand(50),
      liked: chance(0.15),
      create_time: Math.floor(Date.now() / 1000) - rand(86400 * 7),
      user_info: { user_id: su.user_id, nickname: su.nickname, avatar: su.avatar },
      target_user: { user_id: user.user_id, nickname: user.nickname },
    };
  });
  return {
    id,
    content: pick(COMMENT_POOL),
    like_count: rand(200),
    liked: chance(0.2),
    create_time: Math.floor(Date.now() / 1000) - rand(86400 * 30),
    ip_location: chance(0.5) ? pick(['北京', '上海', '杭州', '成都', '广东', '福建']) : '',
    user_info: { user_id: user.user_id, nickname: user.nickname, avatar: user.avatar },
    sub_comments,
    sub_comment_count: subCount,
    sub_comment_cursor: '',
    sub_comment_has_more: subCount > 3,
  };
}

/** 评论缓存：post_id -> comments[] */
const COMMENT_MAP = new Map<string, LofterComment[]>();
function getCommentsFor(postId: string): LofterComment[] {
  if (!COMMENT_MAP.has(postId)) {
    const n = rand(8) + 3;
    COMMENT_MAP.set(postId, Array.from({ length: n }, (_, i) => buildComment(postId, i)));
  }
  return COMMENT_MAP.get(postId)!;
}

/* ===========================================================================
 *  5. 派发器
 * ===========================================================================*/

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms + rand(220)));

const toFeedItem = (p: LofterPost): LofterFeedItem => ({
  id: p.post_id,
  post_id: p.post_id,
  type: p.type,
  post: p,
});

/** 分页：cursor 为数字字符串偏移 */
function paginate(list: LofterPost[], cursor?: string, size = 8): LofterFeedResponse {
  const start = cursor ? parseInt(cursor, 10) || 0 : 0;
  const slice = list.slice(start, start + size);
  const next = start + size;
  return {
    items: slice.map(toFeedItem),
    cursor: String(next),
    has_more: next < list.length,
  };
}

export const mockProvider = {
  async handle(command: LofterCommandList, payload: any): Promise<any> {
    await delay();
    switch (command) {
      case 'LOFTER_GET_HOME_FEED': {
        // 推荐：按发布时间倒序，每次返回 8 条
        const sorted = [...POST_POOL].sort((a, b) => b.publish_time - a.publish_time);
        return paginate(sorted, payload?.cursor, 8);
      }
      case 'LOFTER_GET_FOLLOWING_FEED': {
        // mock：用已关注的博主的文章
        const sorted = POST_POOL.filter((p) => FOLLOW_MAP.get(p.user.user_id))
          .sort((a, b) => b.publish_time - a.publish_time);
        return paginate(sorted, payload?.cursor, 8);
      }
      case 'LOFTER_SEARCH': {
        const kw = (payload?.keyword || '').trim().toLowerCase();
        if (!kw) return { items: [], has_more: false, cursor: '', total: 0 };
        const matched = POST_POOL.filter((p) => {
          const hay = (
            p.title +
            ' ' +
            p.content +
            ' ' +
            (p.quote_text || '') +
            ' ' +
            p.tag_list.map((t) => t.name).join(' ') +
            ' ' +
            p.user.nickname
          ).toLowerCase();
          return hay.includes(kw);
        });
        const res = paginate(matched, payload?.cursor, 8);
        return { ...res, total: matched.length };
      }
      case 'LOFTER_SEARCH_BLOGS': {
        const kw = (payload?.keyword || '').trim().toLowerCase();
        if (!kw) return { items: [], has_more: false, cursor: '', total: 0 };
        const matched = USERS.filter((u) => (u.nickname + ' ' + (u.blog_name || '')).toLowerCase().includes(kw));
        const items = matched.map((u) => ({
          id: u.user_id,
          post_id: u.user_id,
          type: 'text' as const,
          post: {
            post_id: u.user_id,
            type: 'text' as const,
            title: u.nickname,
            content: u.desc || '',
            images: [],
            user: u,
            interact_info: { liked: false, liked_count: 0, comment_count: 0, collected: false, collected_count: 0, reblog_count: 0, share_count: 0, followed: Boolean(FOLLOW_MAP.get(u.user_id)) },
            publish_time: 0,
            tag_list: [],
          },
        }));
        return { items, has_more: false, cursor: '', total: items.length };
      }
      case 'LOFTER_POST_DETAIL': {
        const p = POST_POOL.find((x) => x.post_id === payload?.post_id);
        if (!p) throw new Error('文章不存在');
        return { post: syncInteract(p) };
      }
      case 'LOFTER_GET_COMMENTS': {
        const all = getCommentsFor(payload?.post_id);
        const size = 5;
        const start = payload?.cursor ? parseInt(payload.cursor, 10) || 0 : 0;
        const slice = all.slice(start, start + size);
        return {
          comments: slice,
          cursor: String(start + size),
          has_more: start + size < all.length,
        };
      }
      case 'LOFTER_GET_SUB_COMMENTS': {
        const all = getCommentsFor(payload?.post_id);
        const root = all.find((c) => c.id === payload?.root_comment_id);
        if (!root) return { sub_comments: [], cursor: '', has_more: false };
        // mock：一次性把剩余子评论返回
        const shown = root.sub_comments;
        return {
          sub_comments: shown,
          cursor: '',
          has_more: false,
        };
      }
      case 'LOFTER_GET_USER_POSTS': {
        const list = POST_POOL.filter((p) => p.user.user_id === payload?.user_id);
        return paginate(list, payload?.cursor, 8);
      }
      case 'LOFTER_USER_INFO': {
        const u = USERS.find((x) => x.user_id === payload?.target_user_id);
        if (!u) throw new Error('用户不存在');
        return {
          basic_info: { nickname: u.nickname, avatar: u.avatar, desc: u.desc || '', domain: u.domain, blog_name: u.blog_name },
          interact_info: {
            follows: rand(200) + 50,
            fans: rand(8000) + 100,
            posts: POST_POOL.filter((p) => p.user.user_id === u.user_id).length,
          },
          extra_info: { fstatus: FOLLOW_MAP.get(u.user_id) ? 'follows' : 'none' },
        };
      }
      case 'LOFTER_GET_MY_INFO': {
        const me = USERS[0];
        return {
          user_id: me.user_id,
          nickname: me.nickname,
          avatar: me.avatar,
          desc: me.desc,
          blog_name: me.blog_name,
          domain: me.domain,
        };
      }
      case 'LOFTER_USER_FOLLOW': {
        FOLLOW_MAP.set(payload?.target_user_id, true);
        return { success: true };
      }
      case 'LOFTER_USER_UNFOLLOW': {
        FOLLOW_MAP.set(payload?.target_user_id, false);
        return { success: true };
      }
      case 'LOFTER_POST_LIKE': {
        LIKE_MAP.set(payload?.post_id, true);
        return { success: true, like_count: (POST_POOL.find((p) => p.post_id === payload?.post_id)?.interact_info.liked_count || 0) + 1 };
      }
      case 'LOFTER_POST_DISLIKE': {
        LIKE_MAP.set(payload?.post_id, false);
        return { success: true, like_count: Math.max(0, (POST_POOL.find((p) => p.post_id === payload?.post_id)?.interact_info.liked_count || 1) - 1) };
      }
      case 'LOFTER_POST_COLLECT': {
        COLLECT_MAP.set(payload?.post_id, true);
        return { success: true };
      }
      case 'LOFTER_POST_UNCOLLECT': {
        COLLECT_MAP.set(payload?.post_id, false);
        return { success: true };
      }
      case 'LOFTER_POST_COMMENT': {
        const all = getCommentsFor(payload?.post_id);
        const me = USERS[0];
        const c: LofterComment = {
          id: 'c_new_' + Date.now(),
          content: payload?.content || '',
          like_count: 0,
          liked: false,
          create_time: Math.floor(Date.now() / 1000),
          ip_location: '',
          user_info: { user_id: me.user_id, nickname: me.nickname, avatar: me.avatar },
          sub_comments: [],
          sub_comment_count: 0,
          sub_comment_cursor: '',
          sub_comment_has_more: false,
        };
        all.unshift(c);
        return { success: true, comment: c, toast: '评论已发布' };
      }
      case 'LOFTER_GET_LIKED_POSTS': {
        const list = POST_POOL.filter((p) => LIKE_MAP.get(p.post_id));
        return paginate(list, payload?.cursor, 8);
      }
      case 'LOFTER_GET_USER_LIKED_POSTS': {
        // mock：返回该用户喜欢的文章（用 LIKE_MAP 模拟）
        const list = POST_POOL.filter((p) => LIKE_MAP.get(p.post_id));
        return paginate(list, payload?.cursor, 8);
      }
      case 'LOFTER_UPLOAD_IMAGE': {
        // payload.file 是 base64；mock 直接返回一个 picsum 地址当作已上传
        const seed = 'up_' + Date.now() + '_' + rand(10000);
        return { url: imgUrl(seed, 1200, 800) };
      }
      case 'LOFTER_PUBLISH_POST': {
        const me = USERS[0];
        const newPost: LofterPost = {
          post_id: 'p_new_' + Date.now(),
          type: (payload?.images?.length ? 'photo' : 'text') as LofterPostType,
          title: payload?.title || '',
          content: payload?.content || '',
          images: (payload?.images || []).map((u: string) => ({ url: u, width: 1200, height: 800 })),
          user: me,
          tag_list: [],
          publish_time: Math.floor(Date.now() / 1000),
          ip_location: '',
          interact_info: {
            liked: false, liked_count: 0, comment_count: 0,
            collected: false, collected_count: 0, reblog_count: 0, share_count: 0, followed: false,
          },
        };
        POST_POOL.unshift(newPost);
        return { success: true, post_id: newPost.post_id };
      }
      case 'LOFTER_DOWNLOAD_IMAGE': {
        // 浏览器模式下直接触发下载
        const a = document.createElement('a');
        a.href = payload?.url;
        a.download = payload?.fileName || 'lofter_image.jpg';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return { success: true };
      }
      default:
        // SAVE_FONT_SIZE / TOGGLE_SHOW_IMG / 滚动位置等：无返回值需求
        return { success: true };
    }
  },
};

/** 把 mock 状态同步回 post 的 interact_info，供详情展示 */
function syncInteract(p: LofterPost): LofterPost {
  return {
    ...p,
    interact_info: {
      ...p.interact_info,
      liked: !!LIKE_MAP.get(p.post_id),
      collected: !!COLLECT_MAP.get(p.post_id),
      followed: !!FOLLOW_MAP.get(p.user.user_id),
    },
  };
}
