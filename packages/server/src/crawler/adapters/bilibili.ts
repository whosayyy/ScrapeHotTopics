import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

export class BilibiliAdapter implements CrawlerAdapter {
  readonly sourceId = "bilibili";
  readonly sourceName = "B站热门";
  readonly defaultInterval = 30_000;

  private http = createHttpClient({
    baseURL: "https://api.bilibili.com",
    timeout: 10_000,
    retries: 2,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const { data } = await this.http.get("/x/web-interface/popular", {
      params: { pn: 1, ps: 50 },
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
