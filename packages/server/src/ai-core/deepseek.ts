import logger from "../lib/logger.js";
import { AI_CONFIG } from "./config.js";

const log = logger.child({ module: "DeepseekClient" });

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

interface DeepseekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepseekRequest {
  model: string;
  messages: DeepseekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: "json_object" };
}

interface DeepseekChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: "stop" | "length" | "error";
}

interface DeepseekResponse {
  id: string;
  choices: DeepseekChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepseekError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public body: string,
  ) {
    super(message);
    this.name = "DeepseekError";
  }
}

class DeepseekClient {
  private apiKey: string;
  private model: string;
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? "";
    this.model = AI_CONFIG.model;
    this.baseURL = process.env.DEEPSEEK_BASE_URL ?? DEEPSEEK_BASE;
    this.timeout = AI_CONFIG.timeout;
  }

  /** 非流式调用：请求完整 JSON 响应 */
  async chatComplete(
    messages: DeepseekMessage[],
    opts?: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: "json_object";
    },
  ): Promise<DeepseekResponse> {
    if (!this.apiKey) {
      throw new DeepseekError(401, "DEEPSEEK_API_KEY is not configured", "");
    }

    const body: DeepseekRequest = {
      model: this.model,
      messages,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 2048,
      stream: false,
    };

    if (opts?.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new DeepseekError(res.status, `API error: ${res.statusText}`, errBody);
      }

      const data = (await res.json()) as DeepseekResponse;

      log.debug(
        { tokens: data.usage.total_tokens, model: this.model },
        "deepseek API call completed",
      );

      return data;
    } catch (err) {
      if (err instanceof DeepseekError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new DeepseekError(0, "Request timed out", "");
      }
      throw new DeepseekError(0, (err as Error).message, "");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** 流式调用：逐块处理输出 */
  async *chatCompleteStream(
    messages: DeepseekMessage[],
    opts?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new DeepseekError(401, "DEEPSEEK_API_KEY is not configured", "");
    }

    const body: DeepseekRequest = {
      model: this.model,
      messages,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 4096,
      stream: true,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new DeepseekError(res.status, `API error: ${res.statusText}`, errBody);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // skip unparseable lines
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const deepseek = new DeepseekClient();
