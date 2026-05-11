import type { HotTopic, HotTopicPage, TimelineEvent, KeywordConfig } from "../types";

const BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** 获取热点分页列表 */
export function fetchTopics(page = 1, pageSize = 20, filters?: { region?: string; category?: string; source?: string; sort?: string }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters?.region) params.set("region", filters.region);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.sort) params.set("sort", filters.sort);
  return request<HotTopicPage>(`/hot-topics?${params}`);
}

/** 获取排行榜 */
export function fetchRanking(limit = 20) {
  return request<HotTopic[]>(`/hot-topics/ranking?limit=${limit}`);
}

/** 获取警报列表 */
export function fetchAlerts() {
  return request<HotTopic[]>("/hot-topics/alerts");
}

/** 获取热点详情（含 events + newsItems） */
export function fetchTopicDetail(id: string) {
  return request<HotTopic>(`/hot-topics/${id}`);
}

/** 获取话题时间线 */
export function fetchTimeline(hotTopicId: string) {
  return request<TimelineEvent[]>(`/hot-topics/${hotTopicId}/events`);
}

/** 获取系统统计 */
export function fetchStats() {
  return request<{ topicCount: number; alertCount: number }>("/stats");
}

// ── 关键词管理 ──

export function fetchKeywords(activeOnly = false) {
  return request<KeywordConfig[]>(`/keywords${activeOnly ? "?activeOnly=true" : ""}`);
}

export function createKeyword(data: { keyword: string; isRegex?: boolean; exclude?: string; geo?: string }) {
  return request<KeywordConfig>("/keywords", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateKeyword(id: string, data: Partial<{ keyword: string; isRegex: boolean; exclude: string; geo: string; isActive: boolean }>) {
  return request<KeywordConfig>(`/keywords/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleKeyword(id: string) {
  return request<KeywordConfig>(`/keywords/${id}/toggle`, { method: "PATCH" });
}

export function deleteKeyword(id: string) {
  return request<void>(`/keywords/${id}`, { method: "DELETE" });
}
