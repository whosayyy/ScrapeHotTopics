import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

interface RedditChild {
  data: {
    id: string;
    title: string;
    url: string;
    selftext?: string;
    author: string;
    created_utc: number;
    score: number;
    subreddit_name_prefixed: string;
    permalink: string;
  };
}

export class RedditAdapter implements CrawlerAdapter {
  readonly sourceId = "reddit";
  readonly sourceName = "Reddit";
  readonly defaultInterval = 5 * 60_000;

  private http = createHttpClient({
    baseURL: "https://www.reddit.com",
    timeout: 15_000,
    retries: 2,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    let url: string;
    let params: Record<string, number | string> = { limit: 30 };

    if (keywords.include.length > 0) {
      const query = keywords.include.join(" ");
      url = "/search.json";
      params = { ...params, q: query, sort: "hot", t: "day" };
    } else {
      url = "/r/all/hot.json";
    }

    const { data } = await this.http.get<{ data: { children: RedditChild[] } }>(url, {
      params,
      headers: {
        "User-Agent": "HotRadar/1.0 (research project)",
      },
    });

    const items: RawNews[] = [];

    for (const child of data.data?.children ?? []) {
      const post = child.data;
      if (!matchesKeywords(post.title, keywords)) continue;

      items.push({
        sourceId: this.sourceId,
        externalId: post.id,
        title: post.title,
        url: `https://www.reddit.com${post.permalink}`,
        content: post.selftext ?? "",
        author: post.author,
        publishedAt: new Date(post.created_utc * 1000),
        heat: post.score,
        tags: [post.subreddit_name_prefixed],
        raw: post,
      });
    }

    return items;
  }
}
