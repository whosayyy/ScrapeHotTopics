/** 可信度标签 — 与服务端 Credibility 一致 */
export type Credibility = "高可信" | "待验证" | "谣言";

/** 筛选状态 */
export interface FilterState {
  region: string;
  category: string;
  source: string;
  sort: "heatScore" | "createdAt" | "viralityScore" | "credibilityScore";
}

/** 热点话题（来自 REST API） */
export interface HotTopic {
  id: string;
  title: string;
  summary: string | null;
  credibility: Credibility;
  heatScore: number;
  category: string | null;
  topSource: string | null;
  tags: string | null;
  isAlert: boolean;
  events: TimelineEvent[];
  newsItems: NewsItem[];
  createdAt: string;
  updatedAt: string;

  // 扩展字段
  platform?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  isVerified?: boolean;
  likes?: number;
  retweets?: number;
  comments?: number;
  views?: number;
  publishTime?: string;
  aiReasoning?: string;
  rawContent?: string;
  region?: string;
  credibilityScore?: number;
  virality?: number;
  viralityScore?: number;
  relevanceScore?: number;
  urgency?: boolean;
  fetchedTime?: string;
}

/** 热点分页列表 */
export interface HotTopicPage {
  items: HotTopic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** AI 事件时间轴条目 */
export interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  timestamp: string;
  sourceUrl: string | null;
}

/** 新闻条目 */
export interface NewsItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  content: string | null;
  publishedAt: string;
  heat: number;
}

/** 排行榜条目（Socket.IO payload） */
export interface RankingEntry {
  rank: number;
  id: string;
  title: string;
  heatScore: number;
  change: "up" | "down" | "new";
}

/** 排行榜更新 */
export interface RankingUpdate {
  list: RankingEntry[];
  updatedAt: string;
}

/** 突发警报（Socket.IO payload） */
export interface BreakingAlert {
  id: string;
  title: string;
  summary: string;
  source: string;
  heatScore: number;
  timestamp: string;
}

/** 新热点通知（Socket.IO payload） */
export interface HotTopicNotification {
  id: string;
  title: string;
  summary: string;
  sourceId: string;
  credibility: Credibility;
  heatScore: number;
  publishedAt: string;

  // 扩展字段
  platform?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  isVerified?: boolean;
  likes?: number;
  retweets?: number;
  comments?: number;
  views?: number;
  region?: string;
  credibilityScore?: number;
  virality?: number;
  urgency?: boolean;
  aiReasoning?: string;
  rawContent?: string;
}

/** AI 流水线进度 */
export interface PipelineProgress {
  stage: string;
  percent: number;
  message?: string;
}

/** 关键词配置 */
export interface KeywordConfig {
  id: string;
  keyword: string;
  isActive: boolean;
  isRegex: boolean;
  exclude: string | null;
  geo: string | null;
  createdAt: string;
  updatedAt: string;
}
