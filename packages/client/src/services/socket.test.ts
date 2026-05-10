import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock socket.io-client
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockRemoveAllListeners = vi.fn();
const mockDisconnect = vi.fn();
const mockIO = vi.fn();

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => {
    mockIO(...args);
    return {
      on: mockOn,
      off: mockOff,
      removeAllListeners: mockRemoveAllListeners,
      disconnect: mockDisconnect,
    };
  },
}));

describe("Socket Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onRankingUpdate connects to /ranking namespace", async () => {
    const { onRankingUpdate, disconnectAll } = await import("../services/socket.js");

    const cb = vi.fn();
    const cleanup = onRankingUpdate(cb);

    // Verify connection
    expect(mockIO).toHaveBeenCalledWith(
      expect.stringContaining("/ranking"),
      expect.objectContaining({ transports: ["websocket", "polling"] }),
    );

    // Verify event listener
    expect(mockOn).toHaveBeenCalledWith("ranking:update", cb);

    // Cleanup removes listener
    cleanup();
    expect(mockOff).toHaveBeenCalledWith("ranking:update", cb);
  });

  it("onBreakingAlert connects to /alert namespace", async () => {
    const { onBreakingAlert } = await import("../services/socket.js");
    const { disconnectAll } = await import("../services/socket.js");

    const cb = vi.fn();
    const cleanup = onBreakingAlert(cb);

    expect(mockIO).toHaveBeenCalledWith(
      expect.stringContaining("/alert"),
      expect.any(Object),
    );
    expect(mockOn).toHaveBeenCalledWith("breaking:alert", cb);

    cleanup();
    expect(mockOff).toHaveBeenCalledWith("breaking:alert", cb);
  });

  it("onHotTopicNew and onPipelineProgress share /topic namespace via caching", async () => {
    const { onHotTopicNew, onPipelineProgress } = await import("../services/socket.js");

    const cb1 = vi.fn();
    const cb2 = vi.fn();
    onHotTopicNew(cb1);
    onPipelineProgress(cb2);

    // Both use /topic namespace, but socket is cached — io() called only once
    const topicCalls = mockIO.mock.calls.filter((call: string[]) =>
      call[0]?.includes("/topic"),
    );
    expect(topicCalls.length).toBe(1);

    // Both event listeners should be registered on the same socket
    expect(mockOn).toHaveBeenCalledWith("hot:new", cb1);
    expect(mockOn).toHaveBeenCalledWith("pipeline:progress", cb2);
  });

  it("disconnectAll cleans up all sockets", async () => {
    const { disconnectAll } = await import("../services/socket.js");

    disconnectAll();

    expect(mockRemoveAllListeners).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
