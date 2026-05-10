import type { AxiosRequestHeaders } from "axios";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
];

const ACCEPTS = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
];

export function createRandomHeaders(): AxiosRequestHeaders {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const accept = ACCEPTS[Math.floor(Math.random() * ACCEPTS.length)];

  return {
    "User-Agent": ua,
    Accept: accept,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    Referer: "https://www.google.com/",
  } as unknown as AxiosRequestHeaders;
}
