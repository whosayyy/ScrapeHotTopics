import { CrawlerEngine } from "./engine.js";
import { BilibiliAdapter } from "./adapters/bilibili.js";
import { HackerNewsAdapter } from "./adapters/hackernews.js";
import { GitHubTrendingAdapter } from "./adapters/github-trending.js";
import { BingNewsAdapter } from "./adapters/bing.js";
import { BaiduNewsAdapter } from "./adapters/baidu.js";
import { SogouWechatAdapter } from "./adapters/sogou-wechat.js";
import { RedditAdapter } from "./adapters/reddit.js";
import { GoogleTrendsAdapter } from "./adapters/google-trends.js";
import { TwitterAdapter } from "./adapters/twitter.js";
import { processIncomingData } from "../ai-core/index.js";
import { keywordConfigService } from "../services/index.js";
import type { CrawlerKeywords } from "./types.js";
import logger from "../lib/logger.js";

const log = logger.child({ module: "CrawlerBootstrap" });

const DEFAULT_KEYWORDS: CrawlerKeywords = {
  include: [],
  exclude: [],
  geo: undefined,
};

let engineInstance: CrawlerEngine | null = null;

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

  engineInstance = engine;

  engine.register(new BilibiliAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new HackerNewsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new GitHubTrendingAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new BingNewsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new BaiduNewsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new SogouWechatAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new RedditAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new GoogleTrendsAdapter(), { ...DEFAULT_KEYWORDS });
  engine.register(new TwitterAdapter(), { ...DEFAULT_KEYWORDS });

  // 异步从数据库加载关键词并同步到引擎
  syncKeywordsFromDb(engine).catch((err) =>
    log.error({ err }, "initial keyword sync failed"),
  );

  return engine;
}

/** 从数据库加载活跃关键词，同步到爬虫引擎全部适配器 */
export async function syncKeywordsFromDb(engine?: CrawlerEngine): Promise<void> {
  const eng = engine ?? engineInstance;
  if (!eng) return;

  try {
    const activeKeywords = await keywordConfigService.getActiveKeywords();

    if (activeKeywords.length === 0) {
      log.debug("no active keywords in DB, resetting to defaults");
      eng.updateAllKeywords({ ...DEFAULT_KEYWORDS });
      return;
    }

    const include: string[] = [];
    const regexParts: string[] = [];
    const excludeSet = new Set<string>();
    let geo: string | undefined;

    for (const kw of activeKeywords) {
      if (kw.isRegex) {
        regexParts.push(kw.keyword);
      } else {
        include.push(kw.keyword);
      }
      for (const ex of kw.exclude) {
        excludeSet.add(ex);
      }
      if (kw.geo && !geo) geo = kw.geo;
    }

    const crawlerKw: CrawlerKeywords = {
      include,
      exclude: [...excludeSet],
      regex: regexParts.length > 0 ? regexParts.join("|") : undefined,
      geo,
    };

    eng.updateAllKeywords(crawlerKw);
    log.info(
      { include: include.length, exclude: excludeSet.size, regex: regexParts.length, geo },
      "keywords synced from DB to crawler engine",
    );
  } catch (err) {
    log.error({ err }, "failed to sync keywords from DB");
  }
}
