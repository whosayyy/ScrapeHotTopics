/** Socket.IO 事件名称常量 — 服务端 ↔ 客户端共用 */
export const SocketEvent = {
  // ── 服务端推送 → 客户端 ──
  BREAKING_ALERT: "breaking:alert",
  RANKING_UPDATE: "ranking:update",
  HOT_TOPIC_NEW: "hot:new",
  PIPELINE_PROGRESS: "pipeline:progress",

  // ── 客户端请求 → 服务端 ──
  SUBSCRIBE_KEYWORD: "subscribe:keyword",
  UNSUBSCRIBE_KEYWORD: "unsubscribe:keyword",
  PONG: "pong",
} as const;

// ── Payload 类型 ──

export interface BreakingAlertPayload {
  id: string;
  title: string;
  summary: string;
  source: string;
  heatScore: number;
  timestamp: string;
}

export interface RankingUpdatePayload {
  list: Array<{
    rank: number;
    id: string;
    title: string;
    heatScore: number;
    change: "up" | "down" | "new";
  }>;
  updatedAt: string;
}

export interface HotTopicPayload {
  id: string;
  title: string;
  summary: string;
  sourceId: string;
  credibility: "高可信" | "待验证" | "谣言";
  heatScore: number;
  publishedAt: string;
}

export interface PipelineProgressPayload {
  stage: string;
  percent: number;
  message?: string;
}
