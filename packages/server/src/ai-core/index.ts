import { EventEmitter } from "events";
import { runPipeline } from "./pipeline.js";
import { fallbackToRaw } from "./fallback.js";
import { hotTopicService, eventService, newsItemService } from "../services/index.js";
import logger from "../lib/logger.js";
import type { RawNews } from "../crawler/types.js";
import type { ProcessedEvent, Credibility } from "./types.js";

const log = logger.child({ module: "AiCore" });

/** AI Core 事件总线（供 Socket.IO 在 Task 05 中消费） */
export const aiCoreEvents = new EventEmitter();
aiCoreEvents.setMaxListeners(50);

// ── 事件名称常量 ──
export const AiEvent = {
  HOT_TOPIC_NEW: "hot:new",
  BREAKING_ALERT: "breaking:alert",
  RANKING_UPDATE: "ranking:update",
  PIPELINE_PROGRESS: "pipeline:progress",
} as const;

/** 热度阈值 */
const BREAKING_THRESHOLD = parseInt(
  process.env.AI_BREAKING_THRESHOLD ?? "80",
  10,
);

// ── 工具函数 ──

function rawNewsToCreateInput(item: RawNews) {
  return {
    sourceId: item.sourceId,
    externalId: item.externalId,
    title: item.title,
    url: item.url,
    content: item.content,
    author: item.author,
    publishedAt: item.publishedAt.toISOString(),
    heat: item.heat ?? 0,
  };
}

/** 简单的标题相似度判断（词重叠率） */
function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/[\s,，。、]+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/[\s,，。、]+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  return intersection.size / Math.min(wordsA.size, wordsB.size);
}

async function findOrCreateTopic(event: ProcessedEvent): Promise<{ id: string; isNew: boolean }> {
  // 尝试按标题搜索已有话题
  const candidates = await hotTopicService.search(event.title, 5);
  const match = candidates.find((t) => titleSimilarity(t.title, event.title) > 0.4);

  if (match) {
    // 更新已有话题（合并热度、摘要、可信度及新字段）
    const existingCred = match.credibility as Credibility | null;
    const mergedCred: Credibility =
      event.credibility === "高可信" || existingCred === "高可信"
        ? "高可信"
        : event.credibility === "谣言" || existingCred === "谣言"
          ? "谣言"
          : "待验证";

    await hotTopicService.update(match.id, {
      heatScore: Math.max(match.heatScore, event.heatScore),
      summary: event.summary ?? match.summary ?? undefined,
      credibility: mergedCred,
      topSource: (match.topSource ?? event.topSource) || undefined,
      tags: match.tags
        ? JSON.stringify([...new Set([...JSON.parse(match.tags), ...event.tags])])
        : JSON.stringify(event.tags),
      // 新字段传播（更新时只覆盖非空值）
      platform: event.platform,
      authorName: event.authorName,
      authorHandle: event.authorHandle,
      authorAvatar: event.authorAvatar,
      isVerified: event.isVerified,
      likes: event.likes,
      retweets: event.retweets,
      comments: event.comments,
      views: event.views,
      publishTime: event.publishTime,
      aiReasoning: event.aiReasoning,
      rawContent: event.rawContent,
      region: event.region,
      credibilityScore: event.credibilityScore,
      virality: event.virality,
      viralityScore: event.virality,
      relevanceScore: event.relevanceScore,
      urgency: event.urgency,
    });

    log.debug({ id: match.id, title: event.title }, "updated existing topic");
    return { id: match.id, isNew: false };
  }

  // 创建新话题
  const topic = await hotTopicService.create({
    title: event.title,
    summary: event.summary,
    credibility: event.credibility,
    heatScore: event.heatScore,
    category: event.category,
    topSource: event.topSource,
    tags: JSON.stringify(event.tags),
    isAlert: event.heatScore >= BREAKING_THRESHOLD && event.credibility === "高可信",

    // 新字段
    platform: event.platform ?? "unknown",
    authorName: event.authorName,
    authorHandle: event.authorHandle,
    authorAvatar: event.authorAvatar,
    isVerified: event.isVerified ?? false,
    likes: event.likes ?? 0,
    retweets: event.retweets ?? 0,
    comments: event.comments ?? 0,
    views: event.views ?? 0,
    publishTime: event.publishTime,
    aiReasoning: event.aiReasoning,
    rawContent: event.rawContent,
    region: event.region,
    credibilityScore: event.credibilityScore,
    virality: event.virality,
    viralityScore: event.virality,
    relevanceScore: event.relevanceScore,
    urgency: event.urgency ?? false,
  });

  log.info({ id: topic.id, title: event.title }, "created new topic");
  return { id: topic.id, isNew: true };
}

function emitEvents(events: ProcessedEvent[]): void {
  aiCoreEvents.emit(AiEvent.RANKING_UPDATE, {
    list: events.slice(0, 20).map((e, i) => ({
      rank: i + 1,
      id: e.eventId,
      title: e.title,
      heatScore: e.heatScore,
      change: "new" as const,
    })),
    updatedAt: new Date().toISOString(),
  });

  for (const event of events) {
    aiCoreEvents.emit(AiEvent.HOT_TOPIC_NEW, {
      id: event.eventId,
      title: event.title,
      summary: event.summary,
      sourceId: event.topSource,
      credibility: event.credibility,
      heatScore: event.heatScore,
      publishedAt: new Date().toISOString(),
      // 扩展推送字段
      platform: event.platform,
      authorName: event.authorName,
      authorHandle: event.authorHandle,
      authorAvatar: event.authorAvatar,
      isVerified: event.isVerified,
      likes: event.likes,
      retweets: event.retweets,
      comments: event.comments,
      views: event.views,
      region: event.region,
      credibilityScore: event.credibilityScore,
      virality: event.virality,
      viralityScore: event.virality,
      relevanceScore: event.relevanceScore,
      urgency: event.urgency,
      aiReasoning: event.aiReasoning,
      rawContent: event.rawContent,
    });

    if (event.heatScore >= BREAKING_THRESHOLD && event.credibility === "高可信") {
      aiCoreEvents.emit(AiEvent.BREAKING_ALERT, {
        id: event.eventId,
        title: event.title,
        summary: event.summary,
        source: event.topSource,
        heatScore: event.heatScore,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// ── 公开 API ──

/**
 * AI Core 入口：接收爬虫数据 → 清洗编排 → 持久化 → 推送事件
 *
 * @param rawItems - 爬虫原始数据
 * @param options.onProgress - 处理进度回调
 */
export async function processIncomingData(
  rawItems: RawNews[],
  options?: { onProgress?: (stage: string, percent: number, message?: string) => void },
): Promise<void> {
  if (rawItems.length === 0) return;

  const progress = (stage: string, percent: number, message?: string) => {
    options?.onProgress?.(stage, percent, message);
    aiCoreEvents.emit(AiEvent.PIPELINE_PROGRESS, { stage, percent, message });
  };

  log.info({ count: rawItems.length }, "processing incoming data");

  // ── Step 1: 持久化原始数据 ──
  progress("数据入库", 5, `保存 ${rawItems.length} 条原始数据`);

  const newsInputs = rawItems.map(rawNewsToCreateInput);
  const savedResult = await newsItemService.upsertMany(newsInputs);

  // 构建 (sourceId, externalId) → DB id 的映射
  const newsItemMap = new Map<string, string>();
  for (const item of savedResult.items) {
    newsItemMap.set(`${item.sourceId}:${item.externalId}`, item.id);
  }

  // ── Step 2: AI 清洗流水线 ──
  progress("AI 分析", 15, "运行 AI 清洗流水线");

  let events: ProcessedEvent[];

  try {
    events = await runPipeline(rawItems, {
      onProgress: (p) => progress(p.stage, 15 + p.percent * 0.7, p.message),
    });
  } catch (err) {
    log.error({ err }, "pipeline failed, using fallback");
    events = fallbackToRaw(rawItems);
  }

  // ── Step 3: 持久化 AI 结果 ──
  progress("结果入库", 85, `持久化 ${events.length} 条处理结果`);

  for (const event of events) {
    // 创建或更新热点话题
    const { id: topicId } = await findOrCreateTopic(event);
    // 用真实数据库 ID 覆盖 eventId，确保前端点击跳转时能找到正确记录
    event.eventId = topicId;

    // 创建事件时间轴条目
    for (const tl of event.timeline) {
      try {
        await eventService.create({
          title: tl.title,
          description: tl.description,
          timestamp: tl.timestamp,
          sourceUrl: tl.sourceUrl,
          hotTopicId: topicId,
        });
      } catch (err) {
        log.warn({ err, topicId }, "failed to create event timeline entry");
      }
    }

    // 关联 NewsItem 到 HotTopic（通过 sourceId + externalId 反向查找）
    for (const url of event.relatedUrls) {
      const matched = savedResult.items.find((item) => item.url === url);
      if (matched && !matched.hotTopicId) {
        try {
          await newsItemService.linkToTopic(matched.id, topicId);
        } catch (err) {
          log.warn({ err, id: matched.id }, "failed to link news item to topic");
        }
      }
    }
  }

  // ── Step 4: 推送事件（供 Socket.IO 消费） ──
  progress("推送", 98, "推送事件通知");
  emitEvents(events);

  progress("完成", 100, `处理完成，共 ${events.length} 个事件`);
  log.info({ saved: savedResult.items.length, events: events.length }, "incoming data processed");
}

/** 获取系统统计 */
export async function getSystemStats() {
  const ranking = await hotTopicService.findRanking(20);
  const alerts = await hotTopicService.findAlerts();

  return {
    topicCount: ranking.length,
    alertCount: alerts.length,
    events: ranking,
    alerts,
  };
}
