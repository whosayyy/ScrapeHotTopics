import { createHttpClient } from "../utils/http.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";
import logger from "../../lib/logger.js";

const log = logger.child({ module: "TwitterAdapter" });

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

interface TwitterIncludes {
  users?: TwitterUser[];
}

export class TwitterAdapter implements CrawlerAdapter {
  readonly sourceId = "twitter";
  readonly sourceName = "Twitter / X";
  readonly defaultInterval = 30_000;

  private http = createHttpClient({
    baseURL: "https://api.twitter.com/2",
    timeout: 15_000,
    retries: 3,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token) {
      log.warn("TWITTER_BEARER_TOKEN not set, skipping fetch");
      return [];
    }

    const query = keywords.include.map((k) => `"${k}"`).join(" OR ");
    const excludeQuery = keywords.exclude.map((k) => ` -"${k}"`).join("");
    const fullQuery = `${query}${excludeQuery} lang:en -is:retweet`;

    const { data } = await this.http.get<{
      data?: Array<{ id: string; text: string; author_id: string; created_at: string; public_metrics?: { like_count?: number; retweet_count?: number } }>;
      includes?: TwitterIncludes;
    }>("/tweets/search/recent", {
      params: {
        query: fullQuery,
        "tweet.fields": "created_at,public_metrics,author_id",
        "user.fields": "name,username",
        expansions: "author_id",
        max_results: 30,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const users = new Map<string, TwitterUser>();
    for (const u of data.includes?.users ?? []) {
      users.set(u.id, u);
    }

    return (data.data ?? []).map((tweet) => {
      const user = users.get(tweet.author_id);
      return {
        sourceId: this.sourceId,
        externalId: tweet.id,
        title: tweet.text.slice(0, 100),
        url: `https://twitter.com/${user?.username ?? "unknown"}/status/${tweet.id}`,
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
