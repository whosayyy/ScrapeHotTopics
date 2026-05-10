import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

export class SogouWechatAdapter implements CrawlerAdapter {
  readonly sourceId = "sogou-wechat";
  readonly sourceName = "搜狗微信";
  readonly defaultInterval = 5 * 60_000;

  private http = createHttpClient({
    baseURL: "https://weixin.sogou.com",
    timeout: 15_000,
    retries: 2,
    retryDelay: 2000,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const query = keywords.include.length > 0 ? keywords.include.join(" ") : "热点";

    const { data: html } = await this.http.get<string>("/weixin", {
      params: {
        query,
        type: 2,
        page: 1,
      },
      headers: {
        Referer: "https://weixin.sogou.com/",
      },
    });

    const $ = cheerio.load(html);
    const items: RawNews[] = [];
    const seen = new Set<string>();

    $(".news-box .news-list li").each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find("h3 a");
      const title = titleEl.text().trim();
      if (!title) return;

      const url = titleEl.attr("href") ?? "";
      if (!url || seen.has(url)) return;
      seen.add(url);

      if (!matchesKeywords(title, keywords)) return;

      const snippet = $el.find(".txt-info").text().trim();
      const account = $el.find(".account").text().trim();
      const dateText = $el.find(".s-p").text().trim();

      items.push({
        sourceId: this.sourceId,
        externalId: url.split("/").pop() ?? title,
        title,
        url: url.startsWith("http") ? url : `https://weixin.sogou.com${url}`,
        content: snippet || title,
        author: account || undefined,
        publishedAt: dateText ? new Date(dateText) : new Date(),
        heat: 0,
        tags: ["wechat"],
        raw: { account, snippet, dateText },
      });
    });

    return items;
  }
}
