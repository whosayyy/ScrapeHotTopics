import type { RawNews } from "../crawler/types.js";
import type { ProcessedEvent } from "./types.js";

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
  }));
}
