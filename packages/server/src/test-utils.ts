import { vi } from "vitest";

/** 创建模拟 Prisma 客户端 */
export function createMockPrisma() {
  return {
    hotTopic: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    event: {
      create: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    newsItem: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    keywordConfig: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;

/** 模拟 hotTopic 数据（与 Prisma schema 对齐） */
export const sampleHotTopic = {
  id: "topic-1",
  title: "测试热点话题",
  summary: "这是一个测试热点",
  credibility: "高可信",
  heatScore: 85,
  category: "科技",
  topSource: "hackernews",
  tags: '["科技","AI"]',
  isAlert: true,
  platform: "Hacker News",
  authorName: "test-author",
  authorHandle: null,
  authorAvatar: null,
  isVerified: false,
  likes: 0,
  retweets: 0,
  comments: 0,
  views: 0,
  publishTime: new Date("2026-05-10T00:00:00Z"),
  fetchedTime: new Date("2026-05-10T00:00:00Z"),
  aiReasoning: null,
  rawContent: null,
  region: null,
  credibilityScore: null,
  virality: 0,
  viralityScore: 0,
  relevanceScore: 0,
  urgency: false,
  createdAt: new Date("2026-05-10T00:00:00Z"),
  updatedAt: new Date("2026-05-10T00:00:00Z"),
};

export const sampleEvent = {
  id: "event-1",
  title: "事件标题",
  description: "事件描述",
  timestamp: new Date("2026-05-10T00:00:00Z"),
  sourceUrl: "https://example.com/article",
  hotTopicId: "topic-1",
  createdAt: new Date("2026-05-10T00:00:00Z"),
};

export const sampleNewsItem = {
  id: "news-1",
  sourceId: "hackernews",
  externalId: "ext-123",
  title: "新闻标题",
  url: "https://example.com/news",
  content: "新闻内容",
  author: "test-author",
  publishedAt: new Date("2026-05-10T00:00:00Z"),
  heat: 50,
  credibility: "待验证",
  hotTopicId: null,
  createdAt: new Date("2026-05-10T00:00:00Z"),
};

export const sampleRawNews = {
  sourceId: "hackernews",
  externalId: "ext-123",
  title: "原始新闻",
  url: "https://example.com/news",
  content: "原始内容",
  author: "author",
  publishedAt: new Date("2026-05-10T00:00:00Z"),
  heat: 50,
  tags: ["tech"],
  raw: {},
};
