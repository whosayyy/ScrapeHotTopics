import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

export class HackerNewsAdapter implements CrawlerAdapter {
  readonly sourceId = "hackernews";
  readonly sourceName = "HackerNews";
  readonly defaultInterval = 30_000;

  private http = createHttpClient({
    baseURL: "https://hacker-news.firebaseio.com/v0",
    timeout: 10_000,
    retries: 2,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const { data: ids } = await this.http.get<number[]>("/newstories.json");
    const topIds = ids.slice(0, 30);

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
          if (!matchesKeywords(item.title ?? "", keywords)) continue;

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
