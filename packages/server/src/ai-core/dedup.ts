import { deepseek } from "./deepseek.js";
import { DEDUP_SYSTEM_PROMPT } from "./prompts/dedup.js";
import logger from "../lib/logger.js";
import type { RawNews } from "../crawler/types.js";

const log = logger.child({ module: "AiDedup" });

export interface DedupGroup {
  groupId: string;
  eventTitle: string;
  indices: number[];
  reason: string;
}

export interface DedupResult {
  groups: DedupGroup[];
  unmatched: number[];
}

const DEDUP_BATCH_SIZE = 20;

export async function dedupNews(items: RawNews[]): Promise<DedupResult> {
  if (items.length <= 1) {
    return {
      groups: [],
      unmatched: items.length === 1 ? [0] : [],
    };
  }

  // Split into batches
  const batches: RawNews[][] = [];
  for (let i = 0; i < items.length; i += DEDUP_BATCH_SIZE) {
    batches.push(items.slice(i, i + DEDUP_BATCH_SIZE));
  }

  const allGroups: DedupGroup[] = [];
  const allUnmatched: number[] = [];
  let offset = 0;

  for (const batch of batches) {
    const newsText = batch
      .map(
        (n, i) =>
          `[${i + offset}] 来源: ${n.sourceId}\n标题: ${n.title}\n内容: ${n.content.slice(0, 300)}`,
      )
      .join("\n\n---\n\n");

    try {
      const res = await deepseek.chatComplete(
        [
          { role: "system", content: DEDUP_SYSTEM_PROMPT },
          {
            role: "user",
            content: `请对以下新闻条目进行事件聚合分组：\n\n${newsText}\n\n请严格输出 JSON 格式。`,
          },
        ],
        { temperature: 0.2, responseFormat: "json_object", maxTokens: 4096 },
      );

      const rawContent = res.choices[0]?.message?.content;
      if (!rawContent) throw new Error("Empty AI response for dedup");
      const result = JSON.parse(rawContent) as DedupResult;
      allGroups.push(...(result.groups ?? []));
      allUnmatched.push(...(result.unmatched ?? []));
    } catch (err) {
      log.error({ err, offset }, "dedup batch failed");
      // fallback: mark entire batch as unmatched
      for (let i = 0; i < batch.length; i++) {
        allUnmatched.push(i + offset);
      }
    }

    offset += batch.length;
  }

  return { groups: allGroups, unmatched: allUnmatched };
}
