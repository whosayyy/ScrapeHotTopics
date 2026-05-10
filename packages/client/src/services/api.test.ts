import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const api = await import("../services/api.js");

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockResponse(data: unknown, status = 200) {
    mockFetch.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      headers: new Headers(),
    });
  }

  it("fetchTopics returns paginated data", async () => {
    const pageData = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    mockResponse(pageData);

    const result = await api.fetchTopics(1, 20);
    expect(result).toEqual(pageData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/hot-topics?page=1&pageSize=20"),
      expect.any(Object),
    );
  });

  it("fetchRanking returns ranking list", async () => {
    mockResponse([]);

    const result = await api.fetchRanking(10);
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/hot-topics/ranking?limit=10"),
      expect.any(Object),
    );
  });

  it("fetchAlerts returns alerts", async () => {
    mockResponse([{ id: "1", title: "Alert", heatScore: 90 }]);

    const result = await api.fetchAlerts();
    expect(result).toHaveLength(1);
  });

  it("fetchTopicDetail returns topic with events", async () => {
    const topic = {
      id: "1", title: "Topic", credibility: "高可信", heatScore: 50,
      events: [{ id: "e1", title: "Event", timestamp: "2026-01-01T00:00:00Z" }],
      newsItems: [],
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    };
    mockResponse(topic);

    const result = await api.fetchTopicDetail("1");
    expect(result.events).toHaveLength(1);
  });

  it("fetchTimeline returns timeline events", async () => {
    mockResponse([{ id: "e1", title: "Event", timestamp: "2026-01-01T00:00:00Z" }]);

    const result = await api.fetchTimeline("topic-1");
    expect(result).toHaveLength(1);
  });

  it("fetchStats returns stats", async () => {
    mockResponse({ topicCount: 10, alertCount: 2 });

    const result = await api.fetchStats();
    expect(result.topicCount).toBe(10);
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal error" }),
    });

    await expect(api.fetchTopics()).rejects.toThrow("Internal error");
  });
});
