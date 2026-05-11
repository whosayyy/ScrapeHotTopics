import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

export class BaiduNewsAdapter implements CrawlerAdapter {
  readonly sourceId = "baidu";
  readonly sourceName = "百度热点";
  readonly defaultInterval = 30_000;

  private http = createHttpClient({
    baseURL: "https://news.baidu.com",
    timeout: 10_000,
    retries: 2,
    retryDelay: 2000,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const { data: html } = await this.http.get<string>("/", {
      headers: {
        Accept: "text/html",
        Referer: "https://news.baidu.com/",
      },
    });

    const $ = cheerio.load(html);
    const items: RawNews[] = [];
    const seen = new Set<string>();

    // 百度首页热点新闻区域
    $(".hotnews a, .hotwords a, .focuslistnews a, a").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      const title = $el.text().trim();

      if (!title || title.length < 8) return;
      if (!href || href.startsWith("javascript") || href === "#") return;
      if (seen.has(title)) return;
      seen.add(title);

      if (keywords.include.length > 0 && !matchesKeywords(title, keywords)) return;

      const fullUrl = href.startsWith("http") ? href : `https://news.baidu.com${href}`;

      items.push({
        sourceId: this.sourceId,
        externalId: title,
        title: title,
        url: fullUrl,
        content: title,
        author: "百度热点",
        publishedAt: new Date(),
        heat: 0,
        tags: ["news", "baidu"],
        raw: { href },
      });
    });

    return items;
  }
}
