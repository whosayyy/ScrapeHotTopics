# SKILL_CRAWLER — 多源聚合爬虫引擎技能文档

## 概述

爬虫引擎负责从 8+ 数据源抓取热点信息。每个源实现统一的 `CrawlerAdapter` 接口，由引擎统一调度。

---

## 1. 统一适配器接口

```typescript
// packages/server/src/crawler/types.ts

export interface CrawlerAdapter {
  /** 数据源唯一标识 */
  readonly sourceId: string;
  /** 显示名称 */
  readonly sourceName: string;
  /** 默认轮询间隔（毫秒） */
  readonly defaultInterval: number;
  /** 执行抓取 */
  fetch(keywords: CrawlerKeywords): Promise<RawNews[]>;
}

export interface CrawlerKeywords {
  include: string[];        // 包含关键词
  exclude: string[];        // 排除词
  regex?: string;           // 正则过滤
  geo?: string;             // 地理围栏: "us", "cn", "global"
}

export interface RawNews {
  sourceId: string;
  externalId: string;       // 源站唯一 ID
  title: string;
  url: string;
  content: string;          // 正文摘要
  author?: string;
  publishedAt: Date;
  heat?: number;            // 热度分（各平台归一化）
  tags?: string[];
  raw: unknown;             // 原始响应（调试用）
}
```

---

## 2. 请求配置规范

### 2.1 请求头伪装

所有爬虫请求必须使用伪装请求头，降低被拦截的概率：

```typescript
// packages/server/src/crawler/utils/headers.ts

import type { AxiosRequestHeaders } from "axios";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
];

const ACCEPTS = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
];

/** 生成随机请求头 */
export function createRandomHeaders(): AxiosRequestHeaders {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const accept = ACCEPTS[Math.floor(Math.random() * ACCEPTS.length)];

  return {
    "User-Agent": ua,
    Accept: accept,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    Referer: "https://www.google.com/",
  } as unknown as AxiosRequestHeaders;
}
```

### 2.2 Axios 实例工厂

每个适配器通过工厂函数创建独立实例，避免全局配置污染：

```typescript
// packages/server/src/crawler/utils/http.ts

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { createRandomHeaders } from "./headers";

export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;   // 基础退避延迟（ms）
}

export function createHttpClient(opts: HttpClientOptions): AxiosInstance {
  const config: AxiosRequestConfig = {
    baseURL: opts.baseURL,
    timeout: opts.timeout ?? 15_000,
    headers: createRandomHeaders(),
    // 重要：启用 gzip 压缩，减少带宽
    decompress: true,
    // 跟随重定向
    maxRedirects: 5,
    // 验证响应状态码范围
    validateStatus: (status) => status >= 200 && status < 400,
  };

  const client = axios.create(config);

  // 请求拦截器：每次请求随机化 UA
  client.interceptors.request.use((cfg) => {
    cfg.headers = createRandomHeaders();
    return cfg;
  });

  // 响应拦截器：统一错误处理
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const config = err.config as (AxiosRequestConfig & { _retryCount?: number });
      if (!config) return Promise.reject(err);

      config._retryCount ??= 0;
      const maxRetries = opts.retries ?? 2;

      if (config._retryCount >= maxRetries) {
        console.error(`[crawler] request failed after ${maxRetries} retries: ${err.message}`);
        return Promise.reject(err);
      }

      // 是否值得重试：仅对可重试状态码重试
      const status = err.response?.status;
      const shouldRetry = !status || status >= 500 || status === 429 || status === 0;
      if (!shouldRetry) return Promise.reject(err);

      config._retryCount++;

      // 指数退避：1s, 2s, 4s, ...
      const delay = (opts.retryDelay ?? 1000) * Math.pow(2, config._retryCount - 1);
      const jitter = Math.random() * 500; // 随机抖动，避免雷暴
      console.warn(`[crawler] retry #${config._retryCount} after ${delay + jitter}ms (status=${status})`);

      await new Promise((r) => setTimeout(r, delay + jitter));
      return client(config);
    },
  );

  return client;
}
```

---

## 3. 轮询调度引擎

```typescript
// packages/server/src/crawler/engine.ts

import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "./types";

interface CrawlerTask {
  adapter: CrawlerAdapter;
  interval: number;
  keywords: CrawlerKeywords;
  timer?: ReturnType<typeof setInterval>;
  isRunning: boolean;
}

export class CrawlerEngine {
  private tasks: Map<string, CrawlerTask> = new Map();
  private onData: (items: RawNews[]) => void;

  constructor(onData: (items: RawNews[]) => void) {
    this.onData = onData;
  }

  /** 注册一个爬虫源并启动轮询 */
  register(adapter: CrawlerAdapter, keywords: CrawlerKeywords): void {
    if (this.tasks.has(adapter.sourceId)) {
      console.warn(`[crawler] adapter ${adapter.sourceId} already registered, skipping`);
      return;
    }

    const task: CrawlerTask = {
      adapter,
      interval: adapter.defaultInterval,
      keywords,
      isRunning: false,
    };

    this.tasks.set(adapter.sourceId, task);
    console.log(`[crawler] registered: ${adapter.sourceId} (interval=${task.interval}ms)`);
  }

  /** 启动所有已注册的爬虫 */
  start(): void {
    for (const [id, task] of this.tasks) {
      // 立即执行一次
      this.executeTask(task);
      // 按间隔轮询
      task.timer = setInterval(() => this.executeTask(task), task.interval);
      console.log(`[crawler] started: ${id}`);
    }
  }

  /** 停止所有爬虫 */
  stop(): void {
    for (const [id, task] of this.tasks) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = undefined;
      }
      console.log(`[crawler] stopped: ${id}`);
    }
  }

  /** 动态更新关键词 */
  updateKeywords(sourceId: string, keywords: CrawlerKeywords): void {
    const task = this.tasks.get(sourceId);
    if (task) {
      task.keywords = keywords;
      console.log(`[crawler] keywords updated for ${sourceId}`);
    }
  }

  private async executeTask(task: CrawlerTask): Promise<void> {
    if (task.isRunning) {
      console.warn(`[crawler] ${task.adapter.sourceId} previous fetch still in progress, skip`);
      return;
    }

    task.isRunning = true;
    const start = performance.now();

    try {
      const items = await task.adapter.fetch(task.keywords);
      const elapsed = (performance.now() - start).toFixed(0);

      if (items.length > 0) {
        console.log(`[crawler] ${task.adapter.sourceId} fetched ${items.length} items (${elapsed}ms)`);
        this.onData(items);
      } else {
        console.log(`[crawler] ${task.adapter.sourceId} returned 0 items (${elapsed}ms)`);
      }
    } catch (err) {
      console.error(`[crawler] ${task.adapter.sourceId} fetch failed:`, err);
    } finally {
      task.isRunning = false;
    }
  }
}
```

---

## 4. 数据源解析模板

### 4.1 Bilibili 热门

```typescript
// packages/server/src/crawler/adapters/bilibili.ts
// Bilibili 有公开的热门 API：https://api.bilibili.com/x/web-interface/popular

import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types";

export class BilibiliAdapter implements CrawlerAdapter {
  readonly sourceId = "bilibili";
  readonly sourceName = "B站热门";
  readonly defaultInterval = 3 * 60_000; // 3 分钟

  private http = createHttpClient({
    baseURL: "https://api.bilibili.com",
    timeout: 10_000,
    retries: 2,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const { data } = await this.http.get("/x/web-interface/popular", {
      params: {
        pn: 1,
        ps: 50,
      },
      headers: {
        Referer: "https://www.bilibili.com/",
        Origin: "https://www.bilibili.com",
      },
    });

    if (data.code !== 0) {
      throw new Error(`Bilibili API error: code=${data.code}`);
    }

    const items: RawNews[] = [];

    for (const video of data.data?.list ?? []) {
      // 关键词过滤
      if (!matchesKeywords(video.title, keywords)) continue;

      items.push({
        sourceId: this.sourceId,
        externalId: String(video.aid),
        title: video.title,
        url: `https://www.bilibili.com/video/av${video.aid}`,
        content: video.desc ?? "",
        author: video.owner?.name,
        publishedAt: new Date(video.pubdate * 1000),
        heat: video.stat?.view ?? 0,
        tags: video.tid ? [String(video.tid)] : undefined,
        raw: video,
      });
    }

    return items;
  }
}
```

### 4.2 Twitter / X

```typescript
// packages/server/src/crawler/adapters/twitter.ts
// 注意：Twitter API v2 需要 Bearer Token，目前免费版受限。
// 此模板支持两种模式：API v2（推荐）和 web scraping（备选，不稳定）。
// 实现时如 API 受限可切换到第三方聚合 API。

import { createHttpClient } from "../utils/http";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types";

export class TwitterAdapter implements CrawlerAdapter {
  readonly sourceId = "twitter";
  readonly sourceName = "Twitter / X";
  readonly defaultInterval = 5 * 60_000; // 5 分钟

  private http = createHttpClient({
    baseURL: "https://api.twitter.com/2",
    timeout: 15_000,
    retries: 3,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    // API v2: 最近推文搜索
    const query = keywords.include.map((k) => `"${k}"`).join(" OR ");
    const excludeQuery = keywords.exclude.map((k) => ` -"${k}"`).join("");
    const fullQuery = `${query}${excludeQuery} lang:en -is:retweet`;

    const { data } = await this.http.get("/tweets/search/recent", {
      params: {
        query: fullQuery,
        "tweet.fields": "created_at,public_metrics,author_id",
        "user.fields": "name,username",
        expansions: "author_id",
        max_results: 30,
      },
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
    });

    const users = new Map(
      (data.includes?.users ?? []).map((u: any) => [u.id, u]),
    );

    return (data.data ?? []).map((tweet: any): RawNews => {
      const user = users.get(tweet.author_id);
      return {
        sourceId: this.sourceId,
        externalId: tweet.id,
        title: tweet.text.slice(0, 100),
        url: `https://twitter.com/${user?.username}/status/${tweet.id}`,
        content: tweet.text,
        author: user?.name ?? "unknown",
        publishedAt: new Date(tweet.created_at),
        heat: (tweet.public_metrics?.like_count ?? 0) +
              (tweet.public_metrics?.retweet_count ?? 0) * 2,
        raw: tweet,
      };
    });
  }
}
```

### 4.3 HackerNews

```typescript
// packages/server/src/crawler/adapters/hackernews.ts
// HackerNews 提供官方 Firebase API（无认证，无需请求头伪装）

import { createHttpClient } from "../utils/http";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types";

export class HackerNewsAdapter implements CrawlerAdapter {
  readonly sourceId = "hackernews";
  readonly sourceName = "HackerNews";
  readonly defaultInterval = 5 * 60_000; // 5 分钟

  private http = createHttpClient({
    baseURL: "https://hacker-news.firebaseio.com/v0",
    timeout: 10_000,
    retries: 2,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    // 1. 获取最新文章 ID 列表
    const { data: ids } = await this.http.get<number[]>("/newstories.json");
    const topIds = ids.slice(0, 30);

    // 2. 并发获取详情（控制并发数为 10）
    const items: RawNews[] = [];
    const concurrency = 10;

    for (let i = 0; i < topIds.length; i += concurrency) {
      const batch = topIds.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((id) =>
          this.http.get(`/item/${id}.json`).then((r) => r.data),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value && !result.value.deleted) {
          const item = result.value;
          if (!matchesKeywords(item.title, keywords)) continue;

          items.push({
            sourceId: this.sourceId,
            externalId: String(item.id),
            title: item.title ?? "(no title)",
            url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
            content: item.text ?? "",
            author: item.by ?? "anonymous",
            publishedAt: new Date((item.time ?? 0) * 1000),
            heat: item.score ?? 0,
            tags: [],
            raw: item,
          });
        }
      }
    }

    return items;
  }
}
```

### 4.4 GitHub Trending

```typescript
// packages/server/src/crawler/adapters/github-trending.ts
// GitHub Trending 无官方 API，需抓取 HTML 页面后使用 Cheerio 解析

import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types";

export class GitHubTrendingAdapter implements CrawlerAdapter {
  readonly sourceId = "github-trending";
  readonly sourceName = "GitHub Trending";
  readonly defaultInterval = 5 * 60_000; // 5 分钟

  private http = createHttpClient({
    baseURL: "https://github.com",
    timeout: 15_000,
    retries: 2,
    retryDelay: 2000,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const { data: html } = await this.http.get<string>("/trending", {
      params: { since: "daily" },
      // GitHub 对爬虫敏感，强化伪装
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      },
    });

    const $ = cheerio.load(html);
    const items: RawNews[] = [];

    $("article.Box-row").each((_, el) => {
      const $el = $(el);

      const repoName = $el.find("h2 a").text().trim().replace(/\s+/g, "");
      const description = $el.find("p").text().trim();
      const stars = $el.find(".octicon-star").parent().text().trim();

      if (!matchesKeywords(repoName + description, keywords)) return;

      items.push({
        sourceId: this.sourceId,
        externalId: repoName,
        title: repoName,
        url: `https://github.com/${repoName}`,
        content: description,
        publishedAt: new Date(),
        heat: parseInt(stars.replace(/,/g, "")) || 0,
        tags: ["github", "trending"],
        raw: { repo: repoName, description, stars },
      });
    });

    return items;
  }
}
```

---

## 5. 关键词过滤工具

```typescript
// packages/server/src/crawler/utils/filter.ts

import type { CrawlerKeywords } from "../types";

/**
 * 检查标题/内容是否匹配关键词配置
 * - include: 至少匹配一个关键词
 * - exclude: 匹配任意排除词则丢弃
 * - regex: 可选正则进一步过滤
 */
export function matchesKeywords(text: string, kw: CrawlerKeywords): boolean {
  const lower = text.toLowerCase();

  // include 至少匹配一个
  if (kw.include.length > 0) {
    const hasInclude = kw.include.some((k) => lower.includes(k.toLowerCase()));
    if (!hasInclude) return false;
  }

  // exclude 含任意一个则丢弃
  if (kw.exclude.length > 0) {
    const hasExclude = kw.exclude.some((k) => lower.includes(k.toLowerCase()));
    if (hasExclude) return false;
  }

  // 正则过滤
  if (kw.regex) {
    try {
      return new RegExp(kw.regex, "i").test(text);
    } catch {
      console.warn(`[crawler] invalid regex: ${kw.regex}`);
      return true; // 正则无效时放行
    }
  }

  return true;
}
```

---

## 6. 引擎调度入口

```typescript
// packages/server/src/crawler/index.ts

import { CrawlerEngine } from "./engine";
import { BilibiliAdapter } from "./adapters/bilibili";
import { TwitterAdapter } from "./adapters/twitter";
import { HackerNewsAdapter } from "./adapters/hackernews";
import { GitHubTrendingAdapter } from "./adapters/github-trending";
import type { CrawlerKeywords } from "./types";

const DEFAULT_KEYWORDS: CrawlerKeywords = {
  include: [],
  exclude: [],
  geo: "global",
};

export function createCrawlerEngine(onData: CrawlerEngine["onData"]): CrawlerEngine {
  const engine = new CrawlerEngine(onData);

  engine.register(new BilibiliAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new TwitterAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new HackerNewsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new GitHubTrendingAdapter(), { ...DEFAULT_KEYWORDS });

  // 后续可继续注册：
  // engine.register(new BingNewsAdapter(), { ...DEFAULT_KEYWORDS });
  // engine.register(new SogouWechatAdapter(), { ...DEFAULT_KEYWORDS });
  // engine.register(new GoogleTrendsAdapter(), { ...DEFAULT_KEYWORDS });
  // engine.register(new RedditAdapter(), { ...DEFAULT_KEYWORDS });

  return engine;
}
```

---

## 7. 注意事项

| 关注点 | 做法 |
|--------|------|
| IP 封锁 | 必要时使用代理池（`https_proxy` 环境变量或 `axios` 的 `proxy` 配置） |
| 频率限制 | 每源独立间隔，默认 3-5 分钟；Bilibili 可适当缩短，Twitter 严格限频 |
| 数据量控制 | 每轮每源最多返回 30-50 条，避免 AI Core 过载 |
| 幂等性 | 通过 `externalId + sourceId` 去重，引擎层不做去重，交给 AI Core |
| 调试 | 每个适配器保留 `raw` 字段，方便 AI Core 调试 |
