/*
 * LOFTER API 封装
 * 镜像 touchFish/xhs/src/api/index.ts 的结构
 */
import type { LofterCommandList } from '../types/lofter';

type RequestFunc = <T = any>(
  command: LofterCommandList,
  payload: any,
  content?: string
) => Promise<T>;

export class LofterApi {
  constructor(private request: RequestFunc) {}

  /** 首页推荐 Feed（发现流） */
  getHomeFeed(params: { cursor?: string }) {
    return this.request<import('../types/lofter').LofterFeedResponse>(
      'LOFTER_GET_HOME_FEED',
      params,
      '加载推荐中...',
    );
  }

  /** 首页关注流 */
  getFollowingFeed(params: { cursor?: string }) {
    return this.request<import('../types/lofter').LofterFeedResponse>(
      'LOFTER_GET_FOLLOWING_FEED',
      params,
      '加载关注流中...',
    );
  }

  /** 搜索文章 */
  searchPosts(params: import('../types/lofter').LofterSearchParams) {
    return this.request<import('../types/lofter').LofterSearchResponse>(
      'LOFTER_SEARCH',
      params,
      '搜索文章中...',
    );
  }

  /** 搜索博客（用户） */
  searchBlogs(params: import('../types/lofter').LofterSearchParams) {
    return this.request<import('../types/lofter').LofterSearchResponse>(
      'LOFTER_SEARCH_BLOGS',
      params,
      '搜索用户中...',
    );
  }

  /** 文章详情 */
  getPostDetail(params: import('../types/lofter').LofterPostDetailParams) {
    return this.request<import('../types/lofter').LofterPostDetailResponse>(
      'LOFTER_POST_DETAIL',
      params,
      '加载文章中...',
    );
  }

  /** 评论列表 */
  getComments(params: { post_id: string; cursor?: string }) {
    const label = params.cursor ? '加载更多评论...' : '加载评论中...';
    return this.request<import('../types/lofter').LofterCommentsResponse>(
      'LOFTER_GET_COMMENTS',
      params,
      label,
    );
  }

  /** 子评论 */
  getSubComments(params: { post_id: string; root_comment_id: string; cursor?: string }) {
    return this.request<import('../types/lofter').LofterSubCommentsResponse>(
      'LOFTER_GET_SUB_COMMENTS',
      params,
      '加载子评论中...',
    );
  }

  /** 用户主页文章 */
  getUserPosts(params: import('../types/lofter').LofterUserPostsParams) {
    const label = params.cursor ? '加载更多文章...' : '加载文章中...';
    return this.request<import('../types/lofter').LofterUserPostsResponse>(
      'LOFTER_GET_USER_POSTS',
      params,
      label,
    );
  }

  /** 用户信息（hover card） */
  getUserInfo(params: { target_user_id: string }) {
    return this.request<import('../types/lofter').LofterUserInfoResponse>(
      'LOFTER_USER_INFO',
      params,
      '加载用户信息中...',
    );
  }

  getMyInfo() {
    return this.request<any>('LOFTER_GET_MY_INFO', null, '获取我的信息...');
  }

  followUser(params: import('../types/lofter').LofterFollowParams) {
    return this.request<any>('LOFTER_USER_FOLLOW', params, '关注中...');
  }
  unfollowUser(params: import('../types/lofter').LofterFollowParams) {
    return this.request<any>('LOFTER_USER_UNFOLLOW', params, '取消关注中...');
  }

  likePost(params: import('../types/lofter').LofterLikeParams) {
    return this.request<any>('LOFTER_POST_LIKE', params, '点赞中...');
  }
  dislikePost(params: import('../types/lofter').LofterLikeParams) {
    return this.request<any>('LOFTER_POST_DISLIKE', params, '取消点赞中...');
  }
  collectPost(params: import('../types/lofter').LofterCollectParams) {
    return this.request<any>('LOFTER_POST_COLLECT', params, '收藏中...');
  }
  uncollectPost(params: import('../types/lofter').LofterCollectParams) {
    return this.request<any>('LOFTER_POST_UNCOLLECT', params, '取消收藏中...');
  }

  postComment(params: { post_id: string; content: string }) {
    return this.request<any>('LOFTER_POST_COMMENT', params, '发送中...');
  }

  getLikedPosts(params: { user_id: string; cursor?: string }) {
    return this.request<import('../types/lofter').LofterFeedResponse>(
      'LOFTER_GET_LIKED_POSTS',
      params,
      params.cursor ? '加载更多点赞...' : '加载点赞记录中...',
    );
  }

  /** 任意博主的喜欢列表（ArchiveBean.getFavoritePosts） */
  getUserLikedPosts(params: { user_id: string; cursor?: string }) {
    return this.request<import('../types/lofter').LofterFeedResponse>(
      'LOFTER_GET_USER_LIKED_POSTS',
      params,
      params.cursor ? '加载更多喜欢...' : '加载喜欢列表中...',
    );
  }

  uploadImage(params: { file: string; name: string; type: string }) {
    return this.request<import('../types/lofter').LofterUploadImageResponse>(
      'LOFTER_UPLOAD_IMAGE',
      params,
      '上传图片中...',
    );
  }
  publishPost(params: import('../types/lofter').LofterPublishPostParams) {
    return this.request<import('../types/lofter').LofterPublishPostResponse>(
      'LOFTER_PUBLISH_POST',
      params,
      '发布中...',
    );
  }
}

export const createLofterApi = (request: RequestFunc) => new LofterApi(request);
