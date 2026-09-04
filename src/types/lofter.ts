/*
 * LOFTER 相关类型定义
 * 镜像 touchFish/types/xhs.ts 的结构，供 lofter 子应用本地使用
 */

/** 博主 / 用户 */
export interface LofterUser {
  user_id: string;
  /** 博客名（LOFTER 里用户即博客） */
  nickname: string;
  blog_name?: string;
  avatar: string;
  /** 博客简介 */
  desc?: string;
  /** 博客域名 */
  domain?: string;
  [key: string]: any;
}

/** 互动统计 */
export interface LofterInteractInfo {
  liked: boolean;
  liked_count: number;
  comment_count: number;
  collected: boolean;
  collected_count: number;
  reblog_count: number;
  share_count: number;
  followed: boolean;
  [key: string]: any;
}

/** 文章类型：图文 / 文字 / 引用 / 音频 / 视频 / 链接 */
export type LofterPostType =
  | 'photo' // 图文
  | 'text' // 长文
  | 'quote' // 引用
  | 'audio' // 音频
  | 'video' // 视频
  | 'link'; // 链接

/** 图片资源 */
export interface LofterImage {
  url: string;
  width?: number;
  height?: number;
  [key: string]: any;
}

/** 文章（对应小红书的 note） */
export interface LofterPost {
  post_id: string;
  type: LofterPostType;
  title: string;
  content: string;
  /** 图文类型的图片列表 */
  images: LofterImage[];
  /** 视频地址 */
  video_url?: string;
  /** 视频封面 */
  video_poster?: string;
  /** 音频地址 */
  audio_url?: string;
  /** 音频标题 */
  audio_title?: string;
  /** 引用文字 */
  quote_text?: string;
  /** 引用来源 */
  quote_source?: string;
  /** 链接地址 */
  link_url?: string;
  user: LofterUser;
  interact_info: LofterInteractInfo;
  publish_time: number;
  ip_location?: string;
  tag_list: Array<{ id?: string; name: string }>;
  [key: string]: any;
}

/** Feed 流里的一条（带游标用） */
export interface LofterFeedItem {
  id: string;
  post_id: string;
  type: LofterPostType;
  post: LofterPost;
  [key: string]: any;
}

export interface LofterFeedResponse {
  cursor: string;
  has_more: boolean;
  items: LofterFeedItem[];
  /** 作者隐藏了喜欢列表（ArchiveBean 返回 null） */
  hidden?: boolean;
}

export interface LofterSearchParams {
  keyword: string;
  page?: number;
  cursor?: string;
}

export interface LofterSearchResponse {
  items: LofterFeedItem[];
  has_more: boolean;
  cursor: string;
  total: number;
}

export interface LofterPostDetailParams {
  post_id: string;
}

export interface LofterPostDetailResponse {
  post: LofterPost;
}

export interface LofterUserPostsParams {
  user_id: string;
  cursor?: string;
}

export interface LofterUserPostsResponse {
  items: LofterFeedItem[];
  cursor: string;
  has_more: boolean;
}

export interface LofterUserInfoResponse {
  basic_info: {
    nickname: string;
    avatar: string;
    desc: string;
    domain?: string;
    blog_name?: string;
  };
  interact_info: {
    follows: number;
    fans: number;
    posts: number;
  };
  extra_info: {
    fstatus: 'none' | 'follows' | 'each_other' | string;
  };
  [key: string]: any;
}

export interface LofterCommentUser {
  user_id: string;
  nickname: string;
  avatar: string;
  [key: string]: any;
}

export interface LofterSubComment {
  id: string;
  content: string;
  like_count: number;
  liked: boolean;
  create_time: number;
  user_info: LofterCommentUser;
  target_user?: { nickname: string; user_id: string };
  [key: string]: any;
}

export interface LofterComment extends LofterSubComment {
  sub_comments: LofterSubComment[];
  sub_comment_count: number;
  sub_comment_cursor: string;
  sub_comment_has_more: boolean;
  ip_location?: string;
  pictures?: LofterImage[];
  [key: string]: any;
}

export interface LofterCommentsResponse {
  comments: LofterComment[];
  cursor: string;
  has_more: boolean;
}

export interface LofterSubCommentsResponse {
  sub_comments: LofterSubComment[];
  cursor: string;
  has_more: boolean;
}

export interface LofterLikeParams { post_id: string }
export interface LofterCollectParams { post_id: string }
export interface LofterFollowParams { target_user_id: string }

export interface LofterPublishPostParams {
  title: string;
  content: string;
  images: string[];
  type?: LofterPostType;
}

export interface LofterPublishPostResponse {
  success: boolean;
  post_id?: string;
  msg?: string;
}

export interface LofterUploadImageResponse {
  url: string;
  [key: string]: any;
}

/** 命令清单：LOFTER_* 与通用命令。保持与 touchFish/types/commands.ts 风格一致 */
export type LofterCommandList =
  | 'LOFTER_GET_HOME_FEED'
  | 'LOFTER_GET_FOLLOWING_FEED'
  | 'LOFTER_SEARCH'
  | 'LOFTER_SEARCH_BLOGS'
  | 'LOFTER_POST_DETAIL'
  | 'LOFTER_GET_COMMENTS'
  | 'LOFTER_GET_SUB_COMMENTS'
  | 'LOFTER_GET_USER_POSTS'
  | 'LOFTER_USER_INFO'
  | 'LOFTER_USER_FOLLOW'
  | 'LOFTER_USER_UNFOLLOW'
  | 'LOFTER_GET_MY_INFO'
  | 'LOFTER_POST_LIKE'
  | 'LOFTER_POST_DISLIKE'
  | 'LOFTER_POST_COLLECT'
  | 'LOFTER_POST_UNCOLLECT'
  | 'LOFTER_POST_COMMENT'
  | 'LOFTER_GET_LIKED_POSTS'
  | 'LOFTER_GET_USER_LIKED_POSTS'
  | 'LOFTER_UPLOAD_IMAGE'
  | 'LOFTER_PUBLISH_POST'
  | 'LOFTER_DOWNLOAD_IMAGE'
  | 'LOFTER_SAVE_SCROLL_POSITION'
  | 'LOFTER_RESTORE_SCROLL_POSITION'
  | 'LOFTER_IMG_TOGGLED'
  | 'LOFTER_FORCE_REFRESH'
  | 'SAVE_FONT_SIZE'
  | 'TOGGLE_SHOW_IMG';
