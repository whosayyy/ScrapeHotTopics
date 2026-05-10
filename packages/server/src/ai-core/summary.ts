import { deepseek } from "./deepseek.js";
import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary.js";
import logger from "../lib/logger.js";

const log = logger.child({ module: "AiSummary" });

export async function generateSummary(content: string, title: string): Promise<string> {
  try {
    const res = await deepseek.chatComplete(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `标题：${title}\n正文：${content.slice(0, 2000)}\n\n请生成 50 字内的快讯摘要：`,
        },
      ],
      { temperature: 0.2, maxTokens: 150 },
    );

    return (res.choices[0]?.message?.content ?? title).trim().slice(0, 50);
  } catch (err) {
    log.error({ err }, "summary generation failed");
    return title.slice(0, 50);
  }
}
