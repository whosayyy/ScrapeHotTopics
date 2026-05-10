import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockOnBreakingAlert = vi.fn();

vi.mock("../services/socket.js", () => ({
  onBreakingAlert: (...args: unknown[]) => mockOnBreakingAlert(...args),
}));

const { useAlerts } = await import("../hooks/useAlerts.js");

describe("useAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no alert", () => {
    mockOnBreakingAlert.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useAlerts());

    expect(result.current.alert).toBeNull();
  });

  it("sets alert when breaking alert received", () => {
    mockOnBreakingAlert.mockImplementation((cb: (data: unknown) => void) => {
      // Store callback for later invocation
      (globalThis as any).__alertCb = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useAlerts());

    const alertData = {
      id: "alert-1",
      title: "Breaking News",
      summary: "Important event",
      source: "hackernews",
      heatScore: 95,
      timestamp: new Date().toISOString(),
    };

    act(() => {
      (globalThis as any).__alertCb(alertData);
    });

    expect(result.current.alert).toEqual(alertData);
  });

  it("dismisses alert", () => {
    mockOnBreakingAlert.mockImplementation((cb: (data: unknown) => void) => {
      (globalThis as any).__alertCb = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useAlerts());

    act(() => {
      (globalThis as any).__alertCb({
        id: "alert-1", title: "Test", summary: "S", source: "src",
        heatScore: 90, timestamp: new Date().toISOString(),
      });
    });

    expect(result.current.alert).not.toBeNull();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.alert).toBeNull();
  });
});
