import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { aiCoreEvents } from "../ai-core/index.js";
import logger from "../lib/logger.js";
import { setupAlertNamespace } from "./namespaces/alert.js";
import { setupRankingNamespace } from "./namespaces/ranking.js";
import { setupTopicNamespace } from "./namespaces/topic.js";
import { setupHeartbeat } from "./heartbeat.js";

const log = logger.child({ module: "SocketIO" });

let io: SocketIOServer;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e6,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // 注册命名空间，桥接 aiCoreEvents → Socket.IO 客户端
  setupAlertNamespace(io, aiCoreEvents);
  setupRankingNamespace(io, aiCoreEvents);
  setupTopicNamespace(io, aiCoreEvents);

  // 应用层心跳
  const cleanupHeartbeat = setupHeartbeat(io);

  // 默认命名空间日志
  io.on("connection", (socket) => {
    log.debug({ id: socket.id, address: socket.handshake.address }, "client connected");

    socket.on("disconnect", (reason) => {
      log.debug({ id: socket.id, reason }, "client disconnected");
    });
  });

  // 连接错误处理
  io.engine.on("connection_error", (err) => {
    log.warn({ code: err.code, message: err.message }, "socket connection error");
  });

  log.info("Socket.IO server initialized");

  // 扩展 httpServer 的 close 方法以清理 Socket.IO
  const originalClose = httpServer.close.bind(httpServer);
  httpServer.close = ((callback?: (err?: Error) => void) => {
    cleanupHeartbeat();
    io.close();
    return originalClose(callback);
  }) as typeof httpServer.close;

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized — call initSocketIO() first");
  return io;
}
