export const AI_CONFIG = {
  /** Deepseek 模型 */
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  /** 请求超时（ms） */
  timeout: parseInt(process.env.DEEPSEEK_TIMEOUT ?? "30000", 10),
  /** 最大重试次数 */
  maxRetries: 2,
  /** 去重批处理大小 */
  dedupBatchSize: 20,
  /** 突发警报热度阈值 */
  breakingAlertThreshold: 80,
  /** 排行榜 TOP N */
  rankingTopN: 20,
} as const;
