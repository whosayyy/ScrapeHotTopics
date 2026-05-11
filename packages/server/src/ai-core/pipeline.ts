import { dedupNews } from "./dedup.js";
import { analyzeCredibility } from "./credibility.js";
import { generateTimeline } from "./timeline.js";
import { generateSummary } from "./summary.js";
import logger from "../lib/logger.js";
import type { RawNews } from "../crawler/types.js";
import type { ProcessedEvent, Credibility, PipelineProgress, CredibilityResult } from "./types.js";
import type { TimelineResult } from "./timeline.js";

const log = logger.child({ module: "AiPipeline" });

export interface PipelineOptions {
  onProgress?: (progress: PipelineProgress) => void;
}

/** 从 Promise.allSettled 结果中提取 fulfilled 的值 */
function fulfilledValue<T>(result: PromiseSettledResult<T>): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}

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
 * 完整 AI 清洗流水线
 * 输入：爬虫原始数据
 * 输出：清洗后的事件列表
 *
 * 流程：去重聚合 → 可信度分析 → 噪音过滤 → 时间线生成 → 摘要生成 → 排序
 */
export async function runPipeline(
  rawItems: RawNews[],
  options?: PipelineOptions,
): Promise<ProcessedEvent[]> {
  if (rawItems.length === 0) return [];

  options?.onProgress?.({ stage: "去重聚合", percent: 10, message: `处理 ${rawItems.length} 条原始数据` });

  // Step 1: 去重聚合
  const { groups, unmatched } = await dedupNews(rawItems);
  const allIndices = [...groups.flatMap((g) => g.indices), ...unmatched];

  log.info({ total: rawItems.length, groups: groups.length, unmatched: unmatched.length }, "dedup complete");

  if (allIndices.length === 0) return [];

  options?.onProgress?.({ stage: "可信度分析", percent: 30, message: `分析 ${allIndices.length} 条` });

  // Step 2: 分批并发做可信度分析
  const credibilityResults = await Promise.allSettled(
    allIndices.map(async (idx) => {
      const item = rawItems[idx]!;
      return analyzeCredibility(item.title, item.content, item.url);
    }),
  );

  // Step 2.5: 过滤噪音条目
  const resultMap = new Map<number, CredibilityResult>();
  for (let i = 0; i < allIndices.length; i++) {
    const r = fulfilledValue(credibilityResults[i]!);
    if (r) resultMap.set(allIndices[i]!, r);
  }

  const noiseIndices = new Set(
    [...resultMap.entries()]
      .filter(([, r]) => r.isNoise)
      .map(([idx]) => idx),
  );

  for (const idx of noiseIndices) {
    log.warn({ title: rawItems[idx]?.title?.slice(0, 50) }, "noise item skipped");
  }

  const nonNoiseIndices = allIndices.filter((idx) => !noiseIndices.has(idx));

  if (nonNoiseIndices.length === 0) {
    log.info("all items classified as noise, returning empty");
    return [];
  }

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      indices: g.indices.filter((idx) => !noiseIndices.has(idx)),
    }))
    .filter((g) => g.indices.length > 0);

  const filteredUnmatched = unmatched.filter((idx) => !noiseIndices.has(idx));

  options?.onProgress?.({ stage: "时间线生成", percent: 60, message: `生成 ${filteredGroups.length} 组时间线` });

  // Step 3: 每组生成时间线
  const timelineResults = await Promise.allSettled(
    filteredGroups.map(async (group) => {
      const items = group.indices.map((idx) => ({
        title: rawItems[idx]!.title,
        content: rawItems[idx]!.content,
        url: rawItems[idx]!.url,
        publishedAt: rawItems[idx]!.publishedAt,
        sourceId: rawItems[idx]!.sourceId,
      }));
      return generateTimeline(items);
    }),
  );

  options?.onProgress?.({ stage: "摘要生成", percent: 80, message: "生成摘要" });

  // Step 4: 组装事件
  const events: ProcessedEvent[] = [];

  function getCredibility(rawIdx: number): CredibilityResult | undefined {
    return resultMap.get(rawIdx);
  }

  // 处理聚合组
  for (let i = 0; i < filteredGroups.length; i++) {
    const group = filteredGroups[i]!;
    const timeline = fulfilledValue(timelineResults[i]!);
    const groupItems = group.indices.map((idx) => rawItems[idx]!);
    const firstItem = groupItems[0]!;

    // 取该组最高的可信度作为事件可信度
    const creds = group.indices
      .map((idx) => getCredibility(idx)?.credibility)
      .filter((c): c is Credibility => c !== undefined);
    const highestCred: Credibility = creds.includes("高可信")
      ? "高可信"
      : creds.includes("待验证")
        ? "待验证"
        : "谣言";

    // 取第一个非噪音可信度分析结果中的新字段
    const firstCredResult = group.indices
      .map((idx) => getCredibility(idx))
      .find((c) => c && !c.isNoise);

    const summaryText = await generateSummary(
      groupItems.map((i) => i.content).join("\n"),
      group.eventTitle,
    );

    events.push({
      eventId: group.groupId,
      title: group.eventTitle,
      summary: summaryText,
      credibility: highestCred,
      credibilityReason: `聚合 ${groupItems.length} 条来源`,
      timeline: timeline?.timeline ?? [],
      relatedUrls: groupItems.map((i) => i.url),
      topSource: groupItems[0]?.sourceId ?? "unknown",
      tags: [],
      heatScore: timeline?.heatScore ?? 50,

      // 新字段传播
      category: firstCredResult?.category,
      platform: firstItem.platform ?? platformDisplay(firstItem.sourceId),
      authorName: firstItem.author,
      authorHandle: firstItem.authorHandle,
      authorAvatar: firstItem.authorAvatar,
      isVerified: firstItem.isVerified,
      likes: firstItem.likes,
      retweets: firstItem.retweets,
      comments: firstItem.comments,
      views: firstItem.views,
      publishTime: firstItem.publishedAt.toISOString(),
      aiReasoning: firstCredResult?.aiReasoning,
      rawContent: groupItems.map((i) => i.content).join("\n---\n"),
      region: firstCredResult?.region,
      credibilityScore: firstCredResult?.credibilityScore,
      virality: firstCredResult?.virality,
      urgency: firstCredResult?.urgency,
      relevanceScore: firstCredResult?.relevanceScore,
    });
  }

  // 处理未匹配的单条
  for (const idx of filteredUnmatched) {
    const item = rawItems[idx]!;
    const credResult = getCredibility(idx);

    const summaryText = await generateSummary(item.content, item.title);

    events.push({
      eventId: `single-${item.sourceId}-${item.externalId}`,
      title: item.title,
      summary: summaryText,
      credibility: credResult?.credibility ?? "待验证",
      credibilityReason: credResult?.reason ?? "AI 分析异常",
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

      // 新字段传播
      category: credResult?.category,
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
      aiReasoning: credResult?.aiReasoning,
      rawContent: item.content,
      region: credResult?.region,
      credibilityScore: credResult?.credibilityScore,
      virality: credResult?.virality,
      urgency: credResult?.urgency,
      relevanceScore: credResult?.relevanceScore,
    });
  }

  options?.onProgress?.({ stage: "完成", percent: 100, message: `生成 ${events.length} 条处理结果` });

  // 按热度降序排列
  events.sort((a, b) => b.heatScore - a.heatScore);

  log.info({ total: rawItems.length, events: events.length }, "pipeline complete");

  return events;
}
