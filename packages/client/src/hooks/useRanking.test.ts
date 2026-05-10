import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockFetchRanking = vi.fn();
const mockOnRankingUpdate = vi.fn();

vi.mock("../services/api.js", () => ({
  fetchRanking: (...args: unknown[]) => mockFetchRanking(...args),
}));

vi.mock("../services/socket.js", () => ({
  onRankingUpdate: (...args: unknown[]) => mockOnRankingUpdate(...args),
}));

const { useRanking } = await import("../hooks/useRanking.js");

describe("useRanking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads ranking data on mount", async () => {
    mockFetchRanking.mockResolvedValue([
      { id: "1", title: "Topic 1", heatScore: 90, credibility: "高可信" },
    ]);
    mockOnRankingUpdate.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useRanking());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.topics).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error", async () => {
    mockFetchRanking.mockRejectedValue(new Error("Network error"));
    mockOnRankingUpdate.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useRanking());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Network error");
  });

  it("creates entries from topics when no socket update received", async () => {
    mockFetchRanking.mockResolvedValue([
      { id: "1", title: "Topic 1", heatScore: 90, credibility: "高可信" },
    ]);
    mockOnRankingUpdate.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useRanking());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.change).toBe("new");
    expect(result.current.entries[0]?.rank).toBe(1);
  });
});
