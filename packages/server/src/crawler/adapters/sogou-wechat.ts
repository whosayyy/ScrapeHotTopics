import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

function parseSogouDate(scriptText: string): Date {
  const match = scriptText.match(/timeConvert\('(\d+)'\)/);
  if (match) {
    const unixSeconds = parseInt(match[1]!, 10);
    if (!isNaN(unixSeconds)) {
      return new Date(unixSeconds * 1000);
    }
  }
  return new Date();
}

export class SogouWechatAdapter implements CrawlerAdapter {
  readonly sourceId = "sogou-wechat";
  readonly sourceName = "搜狗微信";
  readonly defaultInterval = 30_000;

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

    $(".news-list li").each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find(".txt-box h3 a");
      const title = titleEl.text().trim();
      if (!title) return;

      const url = titleEl.attr("href") ?? "";
      if (!url || seen.has(url)) return;
      seen.add(url);

      if (!matchesKeywords(title, keywords)) return;

      const snippet = $el.find(".txt-info").text().trim();
      const account = $el.find(".s-p .all-time-y2").first().text().trim();
      const scriptText = $el.find(".s-p .s2 script").html() ?? "";
      const publishedAt = parseSogouDate(scriptText);

      items.push({
        sourceId: this.sourceId,
        externalId: url.split("/").pop() ?? title,
        title,
        url: url.startsWith("http") ? url : `https://weixin.sogou.com${url}`,
        content: snippet || title,
        author: account || undefined,
        publishedAt,
        heat: 0,
        tags: ["wechat"],
        raw: { account, snippet, scriptText },
      });
    });

    return items;
  }
}
