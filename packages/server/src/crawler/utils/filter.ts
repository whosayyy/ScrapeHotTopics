import type { CrawlerKeywords } from "../types.js";

const GEO_ALIASES: Record<string, string[]> = {
  cn: ["中国", "china", "北京", "上海", "深圳", "广州", "chinese", "zhongguo"],
  us: ["美国", "usa", "united states", "america", "american", "new york", "washington"],
  jp: ["日本", "japan", "tokyo", "japanese", "osaka"],
  kr: ["韩国", "korea", "south korea", "seoul", "korean"],
  gb: ["英国", "uk", "united kingdom", "britain", "london", "british"],
  de: ["德国", "germany", "berlin", "german", "deutschland"],
  fr: ["法国", "france", "paris", "french"],
  ru: ["俄罗斯", "russia", "moscow", "russian"],
  global: [],
};

export function matchesKeywords(text: string, kw: CrawlerKeywords): boolean {
  const lower = text.toLowerCase();

  if (kw.include.length > 0) {
    const hasInclude = kw.include.some((k) => lower.includes(k.toLowerCase()));
    if (!hasInclude) return false;
  }

  if (kw.exclude.length > 0) {
    const hasExclude = kw.exclude.some((k) => lower.includes(k.toLowerCase()));
    if (hasExclude) return false;
  }

  if (kw.regex) {
    try {
      if (!new RegExp(kw.regex, "i").test(text)) return false;
    } catch {
      // invalid regex, skip
    }
  }

  if (kw.geo) {
    const geoLower = kw.geo.toLowerCase();
    const aliases = GEO_ALIASES[geoLower] ?? [geoLower];
    const matchesGeo = aliases.some((alias) => lower.includes(alias));
    if (!matchesGeo) return false;
  }

  return true;
}
