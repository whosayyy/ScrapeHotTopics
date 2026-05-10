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
}

/** 处理进度回调 */
export interface PipelineProgress {
  stage: string;
  percent: number;
  message?: string;
}
