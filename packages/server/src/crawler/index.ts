import { CrawlerEngine } from "./engine.js";
import { BilibiliAdapter } from "./adapters/bilibili.js";
import { HackerNewsAdapter } from "./adapters/hackernews.js";
import { GitHubTrendingAdapter } from "./adapters/github-trending.js";
import { BingNewsAdapter } from "./adapters/bing.js";
import { SogouWechatAdapter } from "./adapters/sogou-wechat.js";
import { RedditAdapter } from "./adapters/reddit.js";
import { GoogleTrendsAdapter } from "./adapters/google-trends.js";
import { TwitterAdapter } from "./adapters/twitter.js";
import { newsItemService } from "../services/index.js";
import logger from "../lib/logger.js";
import type { RawNews } from "./types.js";

const log = logger.child({ module: "CrawlerBootstrap" });

const DEFAULT_KEYWORDS = {
  include: [] as string[],
  exclude: [] as string[],
  geo: "global",
};

function rawNewsToCreateInput(item: RawNews) {
  return {
    sourceId: item.sourceId,
    externalId: item.externalId,
    title: item.title,
    url: item.url,
    content: item.content,
    author: item.author,
    publishedAt: item.publishedAt.toISOString(),
    heat: item.heat ?? 0,
  };
}

export function createCrawlerEngine(): CrawlerEngine {
  const engine = new CrawlerEngine(async (items: RawNews[]) => {
    const inputs = items.map(rawNewsToCreateInput);
    const result = await newsItemService.upsertMany(inputs);
    log.info({ total: items.length, saved: result.items.length, failed: result.errors.length }, "crawler data persisted");
  });

  engine.register(new BilibiliAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new HackerNewsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new GitHubTrendingAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new BingNewsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new SogouWechatAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new RedditAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new GoogleTrendsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new TwitterAdapter(), { ...DEFAULT_KEYWORDS });

  return engine;
}
