# SKILL_AI_CORE — AI 智能清洗与编排中心技能文档

## 概述

AI Core 负责对爬虫采集的原始新闻进行清洗、聚合、可信度分析和时间线编排，最终产出结构化热点事件数据。

---

## 1. Deepseek API 标准调用函数

### 1.1 基础调用封装

```typescript
// packages/server/src/ai-core/deepseek.ts

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

interface DeepseekConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  timeout?: number;
}

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

interface DeepseekResponse {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: "stop" | "length" | "error";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class DeepseekClient {
  private config: DeepseekConfig;

  constructor(config?: Partial<DeepseekConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "",
      model: config?.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      baseURL: config?.baseURL ?? process.env.DEEPSEEK_BASE_URL ?? DEEPSEEK_BASE,
      timeout: config?.timeout ?? parseInt(process.env.DEEPSEEK_TIMEOUT ?? "30000", 10),
    };

    if (!this.config.apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
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
    const body: DeepseekRequest = {
      model: this.config.model,
      messages,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 2048,
      stream: false,
    };

    if (opts?.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
      // JSON 模式要求 system prompt 包含 "json" 字样
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const res = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new DeepseekError(res.status, `API error: ${res.statusText}`, errBody);
      }

      return await res.json() as DeepseekResponse;
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
    const body: DeepseekRequest = {
      model: this.config.model,
      messages,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 4096,
      stream: true,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const res = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
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
        buffer = lines.pop() ?? ""; // 保留未完成的行

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // 跳过解析失败的行
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
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

export const deepseek = new DeepseekClient();
```

### 1.2 JSON 模式输出类型

```typescript
// packages/server/src/ai-core/types.ts

/** 可信度标签 */
export type Credibility = "高可信" | "待验证" | "谣言";

/** AI 清洗后的单条事件 */
export interface ProcessedEvent {
  eventId: string;
  title: string;
  summary: string;            // 50 字内快讯
  credibility: Credibility;
  credibilityReason: string;  // 可信度判断依据
  timeline: TimelineItem[];   // 事件时间轴
  relatedUrls: string[];
  topSource: string;
  tags: string[];
  heatScore: number;
}

/** 时间轴条目 */
export interface TimelineItem {
  timestamp: string;          // ISO 8601
  title: string;
  description: string;
  sourceUrl: string;
}
```

---

## 2. Prompt 模板

### 2.1 真假识别 Prompt

```typescript
// packages/server/src/ai-core/prompts/credibility.ts

export const CREDIBILITY_SYSTEM_PROMPT = `你是一个专业的互联网信息真伪鉴别专家。你的任务是对给定的新闻消息进行可信度评估。

请基于以下维度分析并返回 JSON：
1. 消息来源权威性
2. 内容逻辑一致性（是否存在自相矛盾）
3. 与已知事实的匹配程度
4. 是否有多个独立信源交叉验证

输出格式（必须是 JSON，不要包含任何其他内容）：
{
  "credibility": "高可信" | "待验证" | "谣言",
  "reason": "详细的分析依据，说明判断理由",
  "confidenceScore": 0-100,
  "redFlags": ["潜在问题列表"]
}`;
```

```typescript
// packages/server/src/ai-core/credibility.ts

import { deepseek } from "../deepseek";
import { CREDIBILITY_SYSTEM_PROMPT } from "../prompts/credibility";
import type { Credibility } from "../types";

interface CredibilityResult {
  credibility: Credibility;
  reason: string;
  confidenceScore: number;
  redFlags: string[];
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
      {
        temperature: 0.2,
        responseFormat: "json_object",
      },
    );

    const result = JSON.parse(res.choices[0].message.content) as CredibilityResult;

    // 兜底校验
    if (!["高可信", "待验证", "谣言"].includes(result.credibility)) {
      result.credibility = "待验证";
    }

    return result;
  } catch (err) {
    console.error("[ai:credibility] analysis failed:", err);
    // 异常降级：标记为待验证
    return {
      credibility: "待验证",
      reason: "AI 分析异常，自动降级为待验证",
      confidenceScore: 0,
      redFlags: ["AI 服务异常"],
    };
  }
}
```

### 2.2 事件时间线生成 Prompt

```typescript
// packages/server/src/ai-core/prompts/timeline.ts

export const TIMELINE_SYSTEM_PROMPT = `你是一个专业的新闻事件分析专家。你的任务是将多条相关的新闻消息整理成一个"事件时间轴"。

要求：
1. 识别所有提到同一事件的消息，按时间先后排列
2. 每一条时间轴条目包含：时间、标题、简述、来源链接
3. 对事件进行分类（体育、科技、政治、财经等）
4. 生成 50 字以内的概述快讯
5. 为事件的热度打分（0-100）

输出格式（必须是 JSON，不要包含任何其他内容）：
{
  "eventTitle": "事件主标题",
  "summary": "50字内的快讯概述",
  "category": "事件分类",
  "heatScore": 0-100,
  "timeline": [
    {
      "timestamp": "ISO 8601 时间戳",
      "title": "本条标题",
      "description": "本条简述",
      "sourceUrl": "来源链接"
    }
  ]
}`;
```

```typescript
// packages/server/src/ai-core/timeline.ts

import { deepseek } from "./deepseek";
import { TIMELINE_SYSTEM_PROMPT } from "./prompts/timeline";
import type { TimelineItem } from "./types";

interface TimelineResult {
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
      {
        temperature: 0.3,
        responseFormat: "json_object",
        maxTokens: 4096,
      },
    );

    return JSON.parse(res.choices[0].message.content) as TimelineResult;
  } catch (err) {
    console.error("[ai:timeline] generation failed:", err);
    // 异常降级：返回基础结构
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
```

### 2.3 摘要生成 Prompt

```typescript
// packages/server/src/ai-core/prompts/summary.ts

export const SUMMARY_SYSTEM_PROMPT = `你是一个专业的新闻摘要专家。你的任务是将长篇新闻压缩为 50 字以内的快讯。

要求：
1. 保留核心事实（何人、何事、何时、何地）
2. 语言简洁有力，去掉修饰词
3. 严格控制在 50 字以内（中文）
4. 输出纯文本，不要 JSON

原则：宁可牺牲细节，也要确保准确。`;
```

```typescript
// packages/server/src/ai-core/summary.ts

import { deepseek } from "./deepseek";

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

    return res.choices[0].message.content.trim().slice(0, 50);
  } catch (err) {
    console.error("[ai:summary] generation failed:", err);
    // 降级：返回原标题截断
    return title.slice(0, 50);
  }
}
```

### 2.4 去重聚合 Prompt

```typescript
// packages/server/src/ai-core/prompts/dedup.ts

export const DEDUP_SYSTEM_PROMPT = `你是一个新闻事件聚合专家。你的任务是将多条来自不同源的新闻按"是否为同一事件"进行分组。

判断标准：
1. 相同的主体（人物、组织、产品、地点）
2. 相同的时间范围（24 小时内）
3. 相同的事件性质（发布会 / 事故 / 政策发布 / 股价异动等）

输出格式（必须是 JSON，不要包含任何其他内容）：
{
  "groups": [
    {
      "groupId": "group-1",
      "eventTitle": "该组事件的标题",
      "indices": [0, 3, 5],
      "reason": "为什么这些条目属于同一事件"
    }
  ],
  "unmatched": [1, 2]
}`;
```

```typescript
// packages/server/src/ai-core/dedup.ts

import { deepseek } from "./deepseek";
import { DEDUP_SYSTEM_PROMPT } from "./prompts/dedup";
import type { RawNews } from "../../crawler/types";

interface DedupGroup {
  groupId: string;
  eventTitle: string;
  indices: number[];
  reason: string;
}

interface DedupResult {
  groups: DedupGroup[];
  unmatched: number[];
}

const DEDUP_BATCH_SIZE = 20; // 每批次最多处理 20 条

export async function dedupNews(items: RawNews[]): Promise<DedupResult> {
  if (items.length <= 1) {
    return {
      groups: [],
      unmatched: items.length === 1 ? [0] : [],
    };
  }

  // 分批次处理（API 有 token 限制）
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

      const result = JSON.parse(res.choices[0].message.content) as DedupResult;
      allGroups.push(...result.groups);
      allUnmatched.push(...result.unmatched);
    } catch (err) {
      console.error("[ai:dedup] batch failed:", err);
      // 降级：该批次全部标记为未匹配
      for (let i = 0; i < batch.length; i++) {
        allUnmatched.push(i + offset);
      }
    }

    offset += batch.length;
  }

  return { groups: allGroups, unmatched: allUnmatched };
}
```

---

## 3. 流式输出处理

用于前端实时显示 AI 分析进度（如时间线逐步生成）：

```typescript
// packages/server/src/ai-core/stream-handler.ts

import { deepseek } from "./deepseek";
import { getIO } from "../socket";
import { SocketEvent } from "../socket/events";

interface StreamOptions {
  namespace: string;   // 推送到的命名空间
  room?: string;       // 指定房间
  sessionId: string;   // 前端用于关联会话
}

/**
 * 流式调用 AI 并将结果逐块推送到 Socket.IO
 * 适用于：时间线逐步生成、摘要实时展示
 */
export async function streamAIResponse(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions,
): Promise<string> {
  const io = getIO();
  const emitTarget = options.room
    ? (event: string, data: unknown) => io.of(options.namespace).to(options.room!).emit(event, data)
    : (event: string, data: unknown) => io.of(options.namespace).emit(event, data);

  let fullContent = "";

  try {
    for await (const chunk of deepseek.chatCompleteStream(messages)) {
      fullContent += chunk;

      // 每收到一个块就推送到前端
      emitTarget("ai:stream:chunk", {
        sessionId: options.sessionId,
        chunk,
        accumulated: fullContent,
      });
    }

    // 流结束信号
    emitTarget("ai:stream:complete", {
      sessionId: options.sessionId,
      content: fullContent,
    });
  } catch (err) {
    console.error("[ai:stream] error:", err);
    emitTarget("ai:stream:error", {
      sessionId: options.sessionId,
      message: err instanceof Error ? err.message : "AI stream error",
    });
    throw err;
  }

  return fullContent;
}
```

---

## 4. AI 编排流水线

将所有 AI 处理步骤串联为完整的清洗流水线：

```typescript
// packages/server/src/ai-core/pipeline.ts

import { dedupNews } from "./dedup";
import { analyzeCredibility } from "./credibility";
import { generateTimeline } from "./timeline";
import { generateSummary } from "./summary";
import type { RawNews } from "../crawler/types";
import type { ProcessedEvent } from "./types";

export interface PipelineOptions {
  /** 推送进度事件 */
  onProgress?: (stage: string, percent: number) => void;
}

/**
 * 完整 AI 清洗流水线
 * 输入：爬虫原始数据
 * 输出：清洗后的事件列表（推送到前端 + 存入数据库）
 */
export async function runPipeline(
  rawItems: RawNews[],
  options?: PipelineOptions,
): Promise<ProcessedEvent[]> {
  options?.onProgress?.("去重聚合", 10);

  // Step 1: 去重聚合
  const { groups, unmatched } = await dedupNews(rawItems);
  const allIndices = [
    ...groups.flatMap((g) => g.indices),
    ...unmatched,
  ];

  options?.onProgress?.("可信度分析", 30);

  // Step 2: 分批并发做可信度分析
  const credibilityResults = await Promise.allSettled(
    allIndices.map(async (idx) => {
      const item = rawItems[idx];
      return analyzeCredibility(item.title, item.content, item.url);
    }),
  );

  options?.onProgress?.("时间线生成", 60);

  // Step 3: 每组生成时间线
  const timelineResults = await Promise.allSettled(
    groups.map(async (group) => {
      const items = group.indices.map((idx) => ({
        title: rawItems[idx].title,
        content: rawItems[idx].content,
        url: rawItems[idx].url,
        publishedAt: rawItems[idx].publishedAt,
        sourceId: rawItems[idx].sourceId,
      }));
      return generateTimeline(items);
    }),
  );

  options?.onProgress?.("摘要生成", 80);

  // Step 4: 生成统一摘要
  const events: ProcessedEvent[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const timeline = timelineResults[i];
    const groupItems = group.indices.map((idx) => rawItems[idx]);

    // 取该组最高的可信度作为事件可信度
    const groupCredibility = groupItems
      .map((_, j) => credibilityResults[allIndices.indexOf(group.indices[j])])
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value.credibility);
    const highestCred = groupCredibility.includes("高可信")
      ? "高可信"
      : groupCredibility.includes("待验证")
        ? "待验证"
        : "谣言";

    const summary = await generateSummary(
      groupItems.map((i) => i.content).join("\n"),
      group.eventTitle,
    );

    events.push({
      eventId: group.groupId,
      title: group.eventTitle,
      summary,
      credibility: highestCred,
      credibilityReason: `聚合 ${groupItems.length} 条来源`,
      timeline: timeline.status === "fulfilled" ? timeline.value.timeline : [],
      relatedUrls: groupItems.map((i) => i.url),
      topSource: groupItems[0]?.sourceId ?? "unknown",
      tags: [],
      heatScore: timeline.status === "fulfilled" ? timeline.value.heatScore : 50,
    });
  }

  // 未匹配的单条作为独立事件
  for (const idx of unmatched) {
    const item = rawItems[idx];
    const cred = credibilityResults[allIndices.indexOf(idx)];

    const summary = await generateSummary(item.content, item.title);

    events.push({
      eventId: `single-${item.sourceId}-${item.externalId}`,
      title: item.title,
      summary,
      credibility: cred.status === "fulfilled" ? cred.value.credibility : "待验证",
      credibilityReason: cred.status === "fulfilled" ? cred.value.reason : "AI 分析异常",
      timeline: [
        {
          timestamp: item.publishedAt.toISOString(),
          title: item.title,
          description: item.content.slice(0, 200),
          sourceUrl: item.url,
        },
      ],
      relatedUrls: [item.url],
      topSource: item.sourceId,
      tags: item.tags ?? [],
      heatScore: item.heat ?? 0,
    });
  }

  options?.onProgress?.("完成", 100);

  // 按热度降序
  events.sort((a, b) => b.heatScore - a.heatScore);

  return events;
}
```

---

## 5. 推送到 Socket.IO

```typescript
// packages/server/src/ai-core/index.ts

import { runPipeline } from "./pipeline";
import { pushBreakingAlert, pushNewTopic, pushRankingUpdate } from "../socket/push";
import type { RawNews } from "../crawler/types";

/**
 * AI Core 入口：接收爬虫数据 → 清洗编排 → 推送
 */
export async function processIncomingData(rawItems: RawNews[]): Promise<void> {
  console.log(`[ai-core] processing ${rawItems.length} raw items...`);

  const events = await runPipeline(rawItems, {
    onProgress: (stage, percent) => {
      console.log(`[ai-core] ${stage}: ${percent}%`);
    },
  });

  console.log(`[ai-core] generated ${events.length} processed events`);

  for (const event of events) {
    // 推送新热点
    pushNewTopic({
      id: event.eventId,
      title: event.title,
      summary: event.summary,
      sourceId: event.topSource,
      credibility: event.credibility,
      heatScore: event.heatScore,
      publishedAt: new Date().toISOString(),
    });

    // 高热度 + 高可信 → 突发警报
    if (event.heatScore >= 80 && event.credibility === "高可信") {
      pushBreakingAlert({
        id: event.eventId,
        title: event.title,
        summary: event.summary,
        source: event.topSource,
        heatScore: event.heatScore,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 更新排行榜
  pushRankingUpdate({
    list: events.slice(0, 20).map((e, i) => ({
      rank: i + 1,
      id: e.eventId,
      title: e.title,
      heatScore: e.heatScore,
      change: "new",
    })),
    updatedAt: new Date().toISOString(),
  });
}
```

---

## 6. 异常降级方案

| 异常场景 | 降级策略 | 用户侧表现 |
|----------|----------|------------|
| Deepseek API 超时 | 重试 1 次后跳过 AI 处理，直接使用原始数据 | 数据无 AI 标签，显示"AI 分析暂不可用" |
| API 返回 429（限流） | 自动退避等待 5s 后重试 | 延迟更新，数据仍在 |
| JSON 解析失败 | 使用兜底默认值（可信度→待验证，热度→0） | 事件显示，标签为默认值 |
| 全部 API 不可用 | 爬虫数据直接入库+推送，跳过所有 AI 步骤 | 实时数据仍在，AI 功能降级 |
| 单批次去重失败 | 该批次标记为不匹配，继续处理其他批次 | 部分事件未聚合 |

```typescript
// packages/server/src/ai-core/fallback.ts

import type { RawNews } from "../crawler/types";
import type { ProcessedEvent } from "./types";

/**
 * 终极降级：AI 完全不可用时，直接按单条转换
 */
export function fallbackToRaw(items: RawNews[]): ProcessedEvent[] {
  return items.map((item, i) => ({
    eventId: `fallback-${item.sourceId}-${item.externalId}-${i}`,
    title: item.title,
    summary: item.title.slice(0, 50),
    credibility: "待验证" as const,
    credibilityReason: "AI 服务不可用，自动降级",
    timeline: [
      {
        timestamp: item.publishedAt.toISOString(),
        title: item.title,
        description: item.content.slice(0, 200),
        sourceUrl: item.url,
      },
    ],
    relatedUrls: [item.url],
    topSource: item.sourceId,
    tags: item.tags ?? [],
    heatScore: item.heat ?? 0,
  }));
}
```

---

## 7. 配置

```typescript
// packages/server/src/ai-core/config.ts

export const AI_CONFIG = {
  /** Deepseek 模型 */
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  /** 请求超时（ms） */
  timeout: parseInt(process.env.DEEPSEEK_TIMEOUT ?? "30000", 10),
  /** 最大重试次数 */
  maxRetries: 2,
  /** 去重批处理大小 */
  dedupBatchSize: 20,
  /** 突发警报热度阈值 */
  breakingAlertThreshold: 80,
  /** 排行榜 TOP N */
  rankingTopN: 20,
} as const;
```

---

## 8. 注意事项

| 关注点 | 建议 |
|--------|------|
| API Key 安全 | 使用环境变量，禁止提交到 git |
| Token 用量 | 控制在 4096 tokens 以内，超出会截断 |
| 并发控制 | 使用 `Promise.allSettled` 而非 `Promise.all`，防止单点失败拖垮全部 |
| 幂等性 | AI 处理结果不可幂等，但可通过 `eventId` 去重避免重复推送 |
| 调试 | 保留 `raw` 原始数据，方便回溯 |
| 限频 | Deepseek API 有 RPM 限制，建议加 Token Bucket |\
