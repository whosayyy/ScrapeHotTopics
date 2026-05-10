import { deepseek } from "./deepseek.js";
import { TIMELINE_SYSTEM_PROMPT } from "./prompts/timeline.js";
import logger from "../lib/logger.js";
import type { TimelineItem } from "./types.js";

const log = logger.child({ module: "AiTimeline" });

export interface TimelineResult {
  eventTitle: string;
  summary: string;
  category: string;
  heatScore: number;
  timeline: TimelineItem[];
}

export async function generateTimeline(
  relatedNews: Array<{
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    sourceId: string;
  }>,
): Promise<TimelineResult> {
  const newsText = relatedNews
    .map(
      (n, i) =>
        `[${i + 1}] 时间: ${n.publishedAt.toISOString()}\n标题: ${n.title}\n内容: ${n.content.slice(0, 500)}\n来源: ${n.url}`,
    )
    .join("\n\n---\n\n");

  try {
    const res = await deepseek.chatComplete(
      [
        { role: "system", content: TIMELINE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下是关于同一事件的多条报道，请分析并生成事件时间轴：\n\n${newsText}\n\n请严格输出 JSON 格式。`,
        },
      ],
      { temperature: 0.3, responseFormat: "json_object", maxTokens: 4096 },
    );

    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response for timeline");
    return JSON.parse(content) as TimelineResult;
  } catch (err) {
    log.error({ err }, "timeline generation failed");
    return {
      eventTitle: relatedNews[0]?.title ?? "未知事件",
      summary: "AI 时间线生成异常",
      category: "未分类",
      heatScore: 0,
      timeline: relatedNews.map((n) => ({
        timestamp: n.publishedAt.toISOString(),
        title: n.title,
        description: n.content.slice(0, 200),
        sourceUrl: n.url,
      })),
    };
  }
}
