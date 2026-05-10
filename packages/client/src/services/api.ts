import type { HotTopic, HotTopicPage, TimelineEvent } from "../types";

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
export function fetchTopics(page = 1, pageSize = 20) {
  return request<HotTopicPage>(`/hot-topics?page=${page}&pageSize=${pageSize}`);
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
