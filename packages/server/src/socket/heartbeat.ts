import type { Server as SocketIOServer } from "socket.io";
import { SocketEvent } from "./events.js";

const HEARTBEAT_INTERVAL = 15_000;
const HEARTBEAT_TIMEOUT = 10_000;

interface HeartbeatSocket {
  id: string;
  alive: boolean;
  lastPong: number;
}

export function setupHeartbeat(io: SocketIOServer): () => void {
  const sockets = new Map<string, HeartbeatSocket>();

  io.on("connection", (socket) => {
    const hb: HeartbeatSocket = { id: socket.id, alive: true, lastPong: Date.now() };
    sockets.set(socket.id, hb);

    socket.on(SocketEvent.PONG, () => {
      hb.alive = true;
      hb.lastPong = Date.now();
    });

    socket.on("disconnect", () => {
      sockets.delete(socket.id);
    });
  });

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, hb] of sockets) {
      if (!hb.alive && now - hb.lastPong > HEARTBEAT_TIMEOUT) {
        const socket = io.sockets.sockets.get(id);
        if (socket) {
          socket.disconnect(true);
        }
        sockets.delete(id);
      }
      if (hb.alive) {
        hb.alive = false;
      }
    }
  }, HEARTBEAT_INTERVAL);

  return () => clearInterval(timer);
}
