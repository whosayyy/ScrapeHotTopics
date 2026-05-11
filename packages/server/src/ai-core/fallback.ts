import type { RawNews } from "../crawler/types.js";
import type { ProcessedEvent } from "./types.js";

/** 平台名映射 */
function platformDisplay(sourceId: string): string {
  const map: Record<string, string> = {
    twitter: "Twitter",
    bilibili: "Bilibili",
    hackernews: "Hacker News",
    "github-trending": "GitHub",
    bing: "Bing News",
    baidu: "Baidu",
    "sogou-wechat": "微信",
    reddit: "Reddit",
    "google-trends": "Google Trends",
  };
  return map[sourceId] ?? sourceId;
}

/**
 * 终极降级：AI 完全不可用时，直接按单条转换
 * 确保爬虫数据仍能流入系统
 */
export function fallbackToRaw(items: RawNews[]): ProcessedEvent[] {
  return items.map((item, i) => ({
    eventId: `fallback-${item.sourceId}-${item.externalId}-${i}`,
    title: item.title,
    summary: item.title.slice(0, 50),
    credibility: "待验证" as const,
    credibilityReason: "AI 服务不可用，自动降级",
    timeline: [{
      timestamp: item.publishedAt.toISOString(),
      title: item.title,
      description: item.content.slice(0, 200),
      sourceUrl: item.url,
    }],
    relatedUrls: [item.url],
    topSource: item.sourceId,
    tags: item.tags ?? [],
    heatScore: item.heat ?? 0,

    // 新字段（降级时从 RawNews 直接传播）
    platform: item.platform ?? platformDisplay(item.sourceId),
    authorName: item.author,
    authorHandle: item.authorHandle,
    authorAvatar: item.authorAvatar,
    isVerified: item.isVerified,
    likes: item.likes,
    retweets: item.retweets,
    comments: item.comments,
    views: item.views,
    publishTime: item.publishedAt.toISOString(),
    aiReasoning: undefined,
    rawContent: item.content,
    region: undefined,
    credibilityScore: 0,
    virality: 0,
    urgency: false,
    relevanceScore: 0,
  }));
}
