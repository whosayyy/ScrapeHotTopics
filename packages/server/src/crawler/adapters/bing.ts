import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

/**
 * Bing News 适配器 — 注意: Bing 新闻搜索结果页现已改为 SPA（客户端渲染），
 * 服务器端 HTML 抓取无法获取新闻内容。从中国大陆网络访问会被重定向至 cn.bing.com
 * 且不返回新闻数据。保留此适配器作为占位，后续可接入 Bing News Search API（需 API Key）。
 */
export class BingNewsAdapter implements CrawlerAdapter {
  readonly sourceId = "bing";
  readonly sourceName = "Bing News";
  readonly defaultInterval = 30_000;

  private http = createHttpClient({
    baseURL: "https://www.bing.com",
    timeout: 15_000,
    retries: 2,
    retryDelay: 2000,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const query = keywords.include.length > 0 ? keywords.include.join(" ") : "trending";
    const geo = keywords.geo ?? "zh-cn";

    const { data: html } = await this.http.get<string>("/news/search", {
      params: {
        q: query,
        setlang: geo === "cn" ? "zh-cn" : "en-us",
        count: 30,
      },
      headers: {
        Accept: "text/html",
      },
    });

    const $ = cheerio.load(html);
    const items: RawNews[] = [];
    const seen = new Set<string>();

    $(".news-card").each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find("a.title");
      const title = titleEl.text().trim();
      if (!title) return;

      const url = titleEl.attr("href") ?? "";
      const fullUrl = url.startsWith("http") ? url : `https://www.bing.com${url}`;
      const id = fullUrl.split("/").pop() ?? title;

      if (seen.has(id)) return;
      seen.add(id);

      if (!matchesKeywords(title, keywords)) return;

      const snippet = $el.find(".snippet").text().trim();
      const source = $el.find(".source").text().trim();
      const pubText = $el.find(".date").text().trim();

      items.push({
        sourceId: this.sourceId,
        externalId: id,
        title,
        url: fullUrl,
        content: snippet || title,
        author: source || undefined,
        publishedAt: pubText ? new Date(pubText) : new Date(),
        heat: 0,
        tags: ["news"],
        raw: { source, snippet, pubText },
      });
    });

    return items;
  }
}
