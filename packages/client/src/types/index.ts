/** 可信度标签 — 与服务端 Credibility 一致 */
export type Credibility = "高可信" | "待验证" | "谣言";

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
}

/** AI 流水线进度 */
export interface PipelineProgress {
  stage: string;
  percent: number;
  message?: string;
}
