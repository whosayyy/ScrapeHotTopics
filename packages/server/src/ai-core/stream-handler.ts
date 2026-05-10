import { deepseek, DeepseekError } from "./deepseek.js";
import logger from "../lib/logger.js";

const log = logger.child({ module: "AiStreamHandler" });

interface StreamMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  /** 前端用于关联会话 */
  sessionId: string;
  /** 逐块回调 */
  onChunk?: (chunk: string, accumulated: string) => void;
  /** 完成回调 */
  onComplete?: (content: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 流式调用 AI 并通过回调逐块输出结果
 * 适用于：时间线逐步生成、摘要实时展示
 * 注：Socket.IO 集成在 Task 05 中通过 onChunk/onComplete 回调接入
 */
export async function streamAIResponse(
  messages: StreamMessage[],
  options: StreamOptions,
): Promise<string> {
  let fullContent = "";

  try {
    for await (const chunk of deepseek.chatCompleteStream(messages)) {
      fullContent += chunk;
      options.onChunk?.(chunk, fullContent);
    }

    options.onComplete?.(fullContent);
    log.info({ sessionId: options.sessionId }, "AI stream completed");
  } catch (err) {
    const error = err instanceof DeepseekError
      ? err
      : new Error(err instanceof Error ? err.message : "AI stream error");

    log.error({ err: error, sessionId: options.sessionId }, "AI stream error");
    options.onError?.(error);
    throw error;
  }

  return fullContent;
}
