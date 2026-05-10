import * as cheerio from "cheerio";
import { createHttpClient } from "../utils/http.js";
import { matchesKeywords } from "../utils/filter.js";
import type { CrawlerAdapter, CrawlerKeywords, RawNews } from "../types.js";

export class GitHubTrendingAdapter implements CrawlerAdapter {
  readonly sourceId = "github-trending";
  readonly sourceName = "GitHub Trending";
  readonly defaultInterval = 5 * 60_000;

  private http = createHttpClient({
    baseURL: "https://github.com",
    timeout: 15_000,
    retries: 2,
    retryDelay: 2000,
  });

  async fetch(keywords: CrawlerKeywords): Promise<RawNews[]> {
    const { data: html } = await this.http.get<string>("/trending", {
      params: { since: "daily" },
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      },
    });

    const $ = cheerio.load(html);
    const items: RawNews[] = [];

    $("article.Box-row").each((_, el) => {
      const $el = $(el);

      const repoName = $el.find("h2 a").text().trim().replace(/\s+/g, "");
      const description = $el.find("p").text().trim();
      const stars = $el.find(".octicon-star").parent().text().trim();

      if (!matchesKeywords(repoName + description, keywords)) return;

      items.push({
        sourceId: this.sourceId,
        externalId: repoName,
        title: repoName,
        url: `https://github.com/${repoName}`,
        content: description,
        publishedAt: new Date(),
        heat: parseInt(stars.replace(/,/g, "")) || 0,
        tags: ["github", "trending"],
        raw: { repo: repoName, description, stars },
      });
    });

    return items;
  }
}
