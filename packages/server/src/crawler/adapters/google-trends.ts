import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

export class GoogleTrendsAdapter implements CrawlerAdapter {
  readonly sourceId = "google-trends";
  readonly sourceName = "Google Trends";
  readonly defaultInterval = 30_000;

  private http = createHttpClient({
    baseURL: "https://trends.google.com",
    timeout: 15_000,
    retries: 2,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const geo = keywords.geo?.toUpperCase() ?? "US";

    const { data: xml } = await this.http.get<string>("/trending/rss", {
      params: { geo },
      headers: {
        Accept: "application/xml, text/xml",
      },
    });

    const titleRegex = /<title>(?:<!\[CDATA\[)?([^\]]+)(?:\]\]>)?<\/title>/g;
    const linkRegex = /<link>(?:<!\[CDATA\[)?([^\]]+)(?:\]\]>)?<\/link>/g;
    const approxRegex = /<ht:approx_traffic>(?:<!\[CDATA\[)?([^\]]+)(?:\]\]>)?<\/ht:approx_traffic>/g;
    const pubDateRegex = /<pubDate>(?:<!\[CDATA\[)?([^\]]+)(?:\]\]>)?<\/pubDate>/g;

    const titles = [...xml.matchAll(titleRegex)]
      .map((m) => m[1]?.trim())
      .filter((t): t is string => !!t);
    const links = [...xml.matchAll(linkRegex)]
      .map((m) => m[1]?.trim())
      .filter((l): l is string => !!l);
    const traffics = [...xml.matchAll(approxRegex)]
      .map((m) => m[1]?.trim())
      .filter((t): t is string => !!t);
    const pubDates = [...xml.matchAll(pubDateRegex)]
      .map((m) => m[1]?.trim())
      .filter((d): d is string => !!d);

    const items: RawNews[] = [];

    // First title is the RSS channel title, skip it
    for (let i = 1; i < titles.length; i++) {
      const title = titles[i];
      if (!title) continue;

      if (keywords.include.length > 0 && !matchesKeywords(title, keywords)) continue;

      const idx = i - 1;
      const traffic = idx < traffics.length ? (traffics[idx] ?? "") : "";
      const heatMatch = traffic.match(/(\d+)/);
      const link = idx < links.length ? (links[idx] ?? "") : "";
      const pubDate = idx < pubDates.length ? pubDates[idx] : undefined;

      items.push({
        sourceId: this.sourceId,
        externalId: title,
        title,
        url: link || `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}`,
        content: `${title} — Google Trends trending topic`,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        heat: heatMatch ? parseInt(heatMatch[1] ?? "0", 10) : 0,
        tags: ["trending"],
        raw: { traffic, geo },
      });
    }

    return items;
  }
}
