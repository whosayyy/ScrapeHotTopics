import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockFetchTopics = vi.fn();
const mockFetchTopicDetail = vi.fn();
const mockOnHotTopicNew = vi.fn();
const mockOnPipelineProgress = vi.fn();

vi.mock("../services/api.js", () => ({
  fetchTopics: (...args: unknown[]) => mockFetchTopics(...args),
  fetchTopicDetail: (...args: unknown[]) => mockFetchTopicDetail(...args),
}));

vi.mock("../services/socket.js", () => ({
  onHotTopicNew: (...args: unknown[]) => mockOnHotTopicNew(...args),
  onPipelineProgress: (...args: unknown[]) => mockOnPipelineProgress(...args),
}));

const { useTopics } = await import("../hooks/useTopics.js");

describe("useTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads topics on mount", async () => {
    mockFetchTopics.mockResolvedValue({
      items: [{ id: "1", title: "Topic 1", heatScore: 80, credibility: "高可信" }],
      total: 1, page: 1, pageSize: 50, totalPages: 1,
    });
    mockOnHotTopicNew.mockReturnValue(vi.fn());
    mockOnPipelineProgress.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useTopics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.topics).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error", async () => {
    mockFetchTopics.mockRejectedValue(new Error("API error"));
    mockOnHotTopicNew.mockReturnValue(vi.fn());
    mockOnPipelineProgress.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useTopics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("API error");
  });

  it("prepends new hot topic from socket", async () => {
    mockFetchTopics.mockResolvedValue({
      items: [{ id: "1", title: "Topic 1", heatScore: 80, credibility: "待验证" }],
      total: 1, page: 1, pageSize: 50, totalPages: 1,
    });
    mockOnHotTopicNew.mockImplementation((cb: (data: unknown) => void) => {
      (globalThis as any).__hotTopicCb = cb;
      return vi.fn();
    });
    mockOnPipelineProgress.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useTopics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      (globalThis as any).__hotTopicCb({
        id: "new-id",
        title: "New Hot Topic",
        summary: "Just in",
        sourceId: "twitter",
        credibility: "高可信",
        heatScore: 95,
        publishedAt: new Date().toISOString(),
      });
    });

    expect(result.current.topics).toHaveLength(2);
    expect(result.current.topics[0]?.title).toBe("New Hot Topic");
  });

  it("updates pipeline progress from socket", async () => {
    mockFetchTopics.mockResolvedValue({
      items: [], total: 0, page: 1, pageSize: 50, totalPages: 0,
    });
    mockOnHotTopicNew.mockReturnValue(vi.fn());
    mockOnPipelineProgress.mockImplementation((cb: (data: unknown) => void) => {
      (globalThis as any).__progressCb = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useTopics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      (globalThis as any).__progressCb({
        stage: "AI 分析",
        percent: 50,
        message: "Processing",
      });
    });

    expect(result.current.progress).toEqual({
      stage: "AI 分析",
      percent: 50,
      message: "Processing",
    });
  });

  it("selectTopic fetches topic detail", async () => {
    const topicDetail = { id: "1", title: "Detail", credibility: "高可信", heatScore: 50, events: [], newsItems: [] };
    mockFetchTopics.mockResolvedValue({
      items: [{ id: "1", title: "Topic 1", heatScore: 80, credibility: "待验证" }],
      total: 1, page: 1, pageSize: 50, totalPages: 1,
    });
    mockFetchTopicDetail.mockResolvedValue(topicDetail);
    mockOnHotTopicNew.mockReturnValue(vi.fn());
    mockOnPipelineProgress.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useTopics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.selectTopic("1");
    });

    expect(result.current.selectedTopic).toEqual(topicDetail);
  });
});
