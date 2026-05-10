/** 爬虫关键词配置 */
export interface CrawlerKeywords {
  include: string[];
  exclude: string[];
  regex?: string;
  geo?: string;
}

/** 统一爬虫适配器接口 */
export interface CrawlerAdapter {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly defaultInterval: number;
  fetch(keywords: CrawlerKeywords): Promise<RawNews[]>;
}

/** 原始新闻条目（爬虫输出格式） */
export interface RawNews {
  sourceId: string;
  externalId: string;
  title: string;
  url: string;
  content: string;
  author?: string;
  publishedAt: Date;
  heat?: number;
  tags?: string[];
  raw: unknown;
}
