import type { CrawlerKeywords } from "../types.js";

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
      return new RegExp(kw.regex, "i").test(text);
    } catch {
      return true;
    }
  }

  return true;
}
