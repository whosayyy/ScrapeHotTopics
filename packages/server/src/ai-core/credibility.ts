import { deepseek } from "./deepseek.js";
import { CREDIBILITY_SYSTEM_PROMPT } from "./prompts/credibility.js";
import logger from "../lib/logger.js";
import type { CredibilityResult } from "./types.js";

const log = logger.child({ module: "AiCredibility" });

/** 从数值评分推导可信度标签 */
function scoreToCredibility(score: number | undefined): CredibilityResult["credibility"] {
  if (score == null) return "待验证";
  if (score >= 70) return "高可信";
  if (score >= 40) return "待验证";
  return "谣言";
}

/** 确保字符串标签是有效可信度标签 */
function normalizeCredibility(value: string): CredibilityResult["credibility"] {
  if (value === "高可信" || value === "谣言") return value;
  return "待验证";
}

interface DeepseekAnalysis {
  is_noise?: boolean;

  // 新 prompt 的 snake_case 字段
  credibility_score?: number;
  virality_score?: number;
  relevance_score?: number;
  reasoning?: string;
  summary?: string;

  // 传统字段（兼容旧 prompt）
  credibility?: string;
  credibilityScore?: number;
  reason?: string;
  confidenceScore?: number;
  redFlags?: string[];
  category?: string;
  region?: string;
  virality?: number;
  urgency?: boolean;
  aiReasoning?: string;
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
          content: `请分析以下消息：\n\n标题：${title}\n内容：${content.slice(0, 3000)}\n来源：${sourceUrl}\n\n请严格输出 JSON 格式。`,
        },
      ],
      { temperature: 0.2, responseFormat: "json_object" },
    );

    const rawContent = res.choices[0]?.message?.content;
    if (!rawContent) throw new Error("Empty AI response");

    const parsed = JSON.parse(rawContent) as DeepseekAnalysis;

    // 噪音内容直接返回 isNoise=true
    if (parsed.is_noise) {
      return {
        credibility: "待验证",
        reason: "AI 判断为噪音内容",
        confidenceScore: 0,
        redFlags: [],
        isNoise: true,
      };
    }

    // 统一读取评分：新 snake_case 字段优先，兼容旧 camelCase 字段
    const cs = parsed.credibility_score ?? parsed.credibilityScore;
    const vs = parsed.virality_score ?? parsed.virality;
    const rs = parsed.relevance_score;
    const reas = parsed.reasoning ?? parsed.aiReasoning;
    const sum = parsed.summary;

    // 旧 prompt 直接输出 credibility 字符串，新 prompt 用数值推导
    const credibility = parsed.credibility
      ? normalizeCredibility(parsed.credibility)
      : scoreToCredibility(cs);
    // 旧 prompt 的 confidenceScore 可能是 0-1 小数，统一转为 0-100
    const confidenceScore = parsed.confidenceScore != null
      ? (parsed.confidenceScore <= 1 ? Math.round(parsed.confidenceScore * 100) : parsed.confidenceScore)
      : (cs ?? 0);

    return {
      credibility,
      reason: reas?.slice(0, 200) ?? "AI 分析无详细理由",
      confidenceScore,
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      isNoise: false,
      credibilityScore: cs,
      category: parsed.category,
      region: parsed.region,
      virality: vs,
      urgency: parsed.urgency,
      aiReasoning: reas,
      relevanceScore: rs,
      summary: sum,
    };
  } catch (err) {
    log.error({ err }, "credibility analysis failed");
    return {
      credibility: "待验证",
      reason: "AI 分析异常，自动降级为待验证",
      confidenceScore: 0,
      redFlags: ["AI 服务异常"],
      isNoise: false,
    };
  }
}
