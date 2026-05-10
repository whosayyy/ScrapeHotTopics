import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BreakingAlertBanner } from "./BreakingAlert.js";

describe("BreakingAlertBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders nothing when alert is null", () => {
    const { container } = render(<BreakingAlertBanner alert={null} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders alert data", () => {
    const alert = {
      id: "alert-1",
      title: "Breaking Event",
      summary: "Something important happened",
      source: "hackernews",
      heatScore: 95,
      timestamp: "2026-05-10T00:00:00Z",
    };
    render(<BreakingAlertBanner alert={alert} onDismiss={vi.fn()} />);
    expect(screen.getByText("突发警报")).toBeDefined();
    expect(screen.getByText("Breaking Event")).toBeDefined();
    expect(screen.getByText("Something important happened")).toBeDefined();
  });

  it("auto-dismisses after 8 seconds", () => {
    const onDismiss = vi.fn();
    const alert = {
      id: "alert-1",
      title: "Auto Dismiss",
      summary: "Will disappear",
      source: "src",
      heatScore: 90,
      timestamp: "2026-05-10T00:00:00Z",
    };

    render(<BreakingAlertBanner alert={alert} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
