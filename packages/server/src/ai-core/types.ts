/** 可信度标签 */
export type Credibility = "高可信" | "待验证" | "谣言";

/** AI 清洗后的单条事件 */
export interface ProcessedEvent {
  eventId: string;
  title: string;
  summary: string;
  credibility: Credibility;
  credibilityReason: string;
  timeline: TimelineItem[];
  relatedUrls: string[];
  topSource: string;
  tags: string[];
  heatScore: number;

  // 来源元数据
  platform?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  isVerified?: boolean;

  // 统计数据
  likes?: number;
  retweets?: number;
  comments?: number;
  views?: number;
  publishTime?: string;   // ISO string from RawNews.publishedAt

  // AI 分析详情
  category?: string;
  aiReasoning?: string;
  rawContent?: string;
  region?: string;
  credibilityScore?: number; // 0-100
  virality?: number;         // 0-100
  relevanceScore?: number;   // 0-100 与核心热点相关性
  urgency?: boolean;
}

/** 时间轴条目 */
export interface TimelineItem {
  timestamp: string;
  title: string;
  description: string;
  sourceUrl: string;
}

/** 可信度分析结果 */
export interface CredibilityResult {
  credibility: Credibility;
  reason: string;
  confidenceScore: number;
  redFlags: string[];

  isNoise?: boolean;          // AI 判断为噪音则跳过
  credibilityScore?: number;  // 0-100 数值评分
  category?: string;          // 事件分类
  region?: string;            // 涉及地区
  virality?: number;          // 传播力/爆发力 0-100
  urgency?: boolean;          // 是否紧急
  aiReasoning?: string;       // 详细推理过程
  relevanceScore?: number;    // 与核心热点相关性 0-100
  summary?: string;           // 50字以内核心摘要
}

/** 处理进度回调 */
export interface PipelineProgress {
  stage: string;
  percent: number;
  message?: string;
}
