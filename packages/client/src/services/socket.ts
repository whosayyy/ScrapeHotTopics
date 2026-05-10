import { io, type Socket } from "socket.io-client";
import type { RankingUpdate, BreakingAlert, HotTopicNotification, PipelineProgress } from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";

const sockets = new Map<string, Socket>();

function connect(ns: string): Socket {
  if (!sockets.has(ns)) {
    const socket = io(`${SOCKET_URL}${ns}`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 20_000,
    });
    sockets.set(ns, socket);
  }
  return sockets.get(ns)!;
}

// ── 排行榜 ──

export function onRankingUpdate(cb: (data: RankingUpdate) => void): () => void {
  const socket = connect("/ranking");
  socket.on("ranking:update", cb);
  return () => socket.off("ranking:update", cb);
}

// ── 突发警报 ──

export function onBreakingAlert(cb: (data: BreakingAlert) => void): () => void {
  const socket = connect("/alert");
  socket.on("breaking:alert", cb);
  return () => socket.off("breaking:alert", cb);
}

// ── 热点推送 ──

export function onHotTopicNew(cb: (data: HotTopicNotification) => void): () => void {
  const socket = connect("/topic");
  socket.on("hot:new", cb);
  return () => socket.off("hot:new", cb);
}

export function onPipelineProgress(cb: (data: PipelineProgress) => void): () => void {
  const socket = connect("/topic");
  socket.on("pipeline:progress", cb);
  return () => socket.off("pipeline:progress", cb);
}

// ── 断开所有连接 ──

export function disconnectAll(): void {
  for (const [ns, socket] of sockets) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  sockets.clear();
}
