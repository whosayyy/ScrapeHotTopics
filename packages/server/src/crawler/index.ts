import { CrawlerEngine } from "./engine.js";
import { BilibiliAdapter } from "./adapters/bilibili.js";
import { HackerNewsAdapter } from "./adapters/hackernews.js";
import { GitHubTrendingAdapter } from "./adapters/github-trending.js";
import { BingNewsAdapter } from "./adapters/bing.js";
import { SogouWechatAdapter } from "./adapters/sogou-wechat.js";
import { RedditAdapter } from "./adapters/reddit.js";
import { GoogleTrendsAdapter } from "./adapters/google-trends.js";
import { TwitterAdapter } from "./adapters/twitter.js";
import { processIncomingData } from "../ai-core/index.js";
import logger from "../lib/logger.js";

const log = logger.child({ module: "CrawlerBootstrap" });

const DEFAULT_KEYWORDS = {
  include: [] as string[],
  exclude: [] as string[],
  geo: "global",
};

export function createCrawlerEngine(): CrawlerEngine {
  const engine = new CrawlerEngine(async (items) => {
    try {
      await processIncomingData(items, {
        onProgress: (stage, percent) => {
          log.debug({ stage, percent }, "ai-core progress");
        },
      });
      log.info({ count: items.length }, "crawler data processed via AI Core");
    } catch (err) {
      log.error({ err, count: items.length }, "failed to process crawler data");
    }
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
