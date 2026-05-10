import { describe, it, expect, vi, beforeEach } from "vitest";

describe("setupHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("sets up heartbeat interval", async () => {
    const { setupHeartbeat } = await import("../socket/heartbeat.js");
    const mockSocket = { on: vi.fn(), disconnect: vi.fn() };
    const mockIO = {
      on: vi.fn((event: string, cb: (socket: any) => void) => {
        if (event === "connection") cb(mockSocket);
      }),
      sockets: { sockets: new Map() },
    };

    const cleanup = setupHeartbeat(mockIO as any);

    expect(mockIO.on).toHaveBeenCalledWith("connection", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("pong", expect.any(Function));

    cleanup();
  });

  it("cleanup clears the interval", async () => {
    const { setupHeartbeat } = await import("../socket/heartbeat.js");
    const mockIO = { on: vi.fn(), sockets: { sockets: new Map() } };

    const timerSpy = vi.spyOn(globalThis, "clearInterval");
    const cleanup = setupHeartbeat(mockIO as any);
    cleanup();

    expect(timerSpy).toHaveBeenCalled();
  });
});
