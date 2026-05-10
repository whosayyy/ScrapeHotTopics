import { deepseek } from "./deepseek.js";
import { CREDIBILITY_SYSTEM_PROMPT } from "./prompts/credibility.js";
import logger from "../lib/logger.js";
import type { CredibilityResult } from "./types.js";

const log = logger.child({ module: "AiCredibility" });

/** 确保结果是有效可信度标签 */
function normalizeCredibility(value: string): CredibilityResult["credibility"] {
  if (value === "高可信" || value === "谣言") return value;
  return "待验证";
}

export async function analyzeCredibility(
  title: string,
  content: string,
  sourceUrl: string,
): Promise<CredibilityResult> {
  try {
    const res = await deepseek.chatComplete(
      [
        { role: "system", content: CREDIBILITY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `请分析以下消息的可信度：\n\n标题：${title}\n内容：${content}\n来源：${sourceUrl}\n\n请严格输出 JSON 格式。`,
        },
      ],
      { temperature: 0.2, responseFormat: "json_object" },
    );

    const rawContent = res.choices[0]?.message?.content;
    if (!rawContent) throw new Error("Empty AI response");

    const parsed = JSON.parse(rawContent) as CredibilityResult;

    return {
      credibility: normalizeCredibility(parsed.credibility),
      reason: parsed.reason ?? "AI 分析无详细理由",
      confidenceScore: parsed.confidenceScore ?? 0,
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    };
  } catch (err) {
    log.error({ err }, "credibility analysis failed");
    return {
      credibility: "待验证",
      reason: "AI 分析异常，自动降级为待验证",
      confidenceScore: 0,
      redFlags: ["AI 服务异常"],
    };
  }
}
