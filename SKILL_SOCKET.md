# SKILL_SOCKET — Socket.IO 实时通信技能文档

> **强制约束**：本项目禁止使用原生 WebSocket API。所有实时通信必须通过 Socket.IO 实现。

---

## 1. 服务端初始化

### 1.1 创建 Socket.IO Server

```typescript
// packages/server/src/socket/index.ts

import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { eventBus } from "./events";
import { setupAlertNamespace } from "./namespaces/alert";
import { setupRankingNamespace } from "./namespaces/ranking";
import { setupTopicNamespace } from "./namespaces/topic";

let io: SocketIOServer;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    // CORS — 生产环境限定具体域名
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // 传输方式：优先 WebSocket，降级到 polling
    transports: ["websocket", "polling"],
    // 允许最大 1MB 的消息体
    maxHttpBufferSize: 1e6,
    // ping 配置（详见第 5 节）
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // 注册命名空间
  setupAlertNamespace(io);
  setupRankingNamespace(io);
  setupTopicNamespace(io);

  // 默认命名空间兜底日志
  io.on("connection", (socket) => {
    console.log(`[socket] default connected: ${socket.id} (handshake: ${socket.handshake.address})`);
    socket.on("disconnect", (reason) => {
      console.log(`[socket] default disconnected: ${socket.id} reason: ${reason}`);
    });
  });

  console.log("[socket] Socket.IO server initialized");
  return io;
}

/** 获取全局 io 实例 */
export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized — call initSocketIO() first");
  return io;
}
```

### 1.2 Express 5 集成

```typescript
// packages/server/src/index.ts

import express from "express";
import { createServer } from "http";
import { initSocketIO } from "./socket";

const app = express();
const httpServer = createServer(app);

// Express 5 中间件
app.use(express.json());

// REST 路由
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// 挂载 Socket.IO
const io = initSocketIO(httpServer);

// 启动
const PORT = parseInt(process.env.PORT ?? "3001", 10);
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
```

---

## 2. 事件定义中心

所有事件名集中管理，**禁止在业务代码中使用魔术字符串**：

```typescript
// packages/server/src/socket/events.ts

export const SocketEvent = {
  // ── 服务端推送 → 客户端 ──

  /** 突发警报：弹窗 + 声音提醒 */
  BREAKING_ALERT: "breaking:alert",

  /** 热点排行更新 */
  RANKING_UPDATE: "ranking:update",

  /** 新热点出现 */
  HOT_TOPIC_NEW: "hot:new",

  /** 热点热度数据刷新 */
  HOT_TOPIC_UPDATE: "hot:update",

  /** AI 事件时间线更新 */
  TIMELINE_UPDATE: "timeline:update",

  /** 系统状态通知 */
  SYSTEM_NOTIFY: "system:notify",

  // ── 客户端请求 → 服务端 ──

  /** 订阅关键词 */
  SUBSCRIBE_KEYWORD: "subscribe:keyword",

  /** 取消订阅关键词 */
  UNSUBSCRIBE_KEYWORD: "unsubscribe:keyword",

  /** 请求热点详情 */
  REQUEST_DETAIL: "request:detail",

  /** 心跳 pong（客户端回复） */
  PONG: "pong",
} as const;
```

事件类型定义：

```typescript
// packages/server/src/socket/events.ts (续)

export interface BreakingAlertPayload {
  id: string;
  title: string;
  summary: string;
  source: string;
  heatScore: number;
  timestamp: string;
}

export interface RankingUpdatePayload {
  list: Array<{
    rank: number;
    id: string;
    title: string;
    heatScore: number;
    change: "up" | "down" | "new";  // 趋势
  }>;
  updatedAt: string;
}

export interface HotTopicPayload {
  id: string;
  title: string;
  summary: string;
  sourceId: string;
  credibility: "高可信" | "待验证" | "谣言";
  heatScore: number;
  publishedAt: string;
}
```

---

## 3. 命名空间 (Namespace) 划分

按业务领域划分命名空间，隔离不同推送通道：

```typescript
// packages/server/src/socket/namespaces/alert.ts
// 命名空间：/alert — 突发警报推送（高优先级）

import type { Server as SocketIOServer } from "socket.io";
import { SocketEvent, type BreakingAlertPayload } from "../events";

export function setupAlertNamespace(io: SocketIOServer): void {
  const alertNS = io.of("/alert");

  alertNS.on("connection", (socket) => {
    console.log(`[socket:alert] client joined: ${socket.id}`);

    // 客户端加入特定关键词房间
    socket.on(SocketEvent.SUBSCRIBE_KEYWORD, (keyword: string) => {
      socket.join(`keyword:${keyword}`);
      console.log(`[socket:alert] ${socket.id} subscribed to keyword: ${keyword}`);
    });

    socket.on(SocketEvent.UNSUBSCRIBE_KEYWORD, (keyword: string) => {
      socket.leave(`keyword:${keyword}`);
    });

    socket.on("disconnect", () => {
      console.log(`[socket:alert] client left: ${socket.id}`);
    });
  });

  // 导出推送方法
  const sendBreakingAlert = (payload: BreakingAlertPayload, keyword?: string) => {
    if (keyword) {
      alertNS.to(`keyword:${keyword}`).emit(SocketEvent.BREAKING_ALERT, payload);
    } else {
      alertNS.emit(SocketEvent.BREAKING_ALERT, payload);
    }
  };

  // 挂载到全局事件总线
  const { eventBus } = require("../events");
  eventBus.on("breaking:alert", sendBreakingAlert);
}
```

```typescript
// packages/server/src/socket/namespaces/ranking.ts
// 命名空间：/ranking — 实时排行榜推送

import type { Server as SocketIOServer } from "socket.io";
import { SocketEvent, type RankingUpdatePayload } from "../events";

export function setupRankingNamespace(io: SocketIOServer): void {
  const rankingNS = io.of("/ranking");

  rankingNS.on("connection", (socket) => {
    console.log(`[socket:ranking] client joined: ${socket.id}`);
  });

  const sendRankingUpdate = (payload: RankingUpdatePayload) => {
    rankingNS.emit(SocketEvent.RANKING_UPDATE, payload);
  };

  const { eventBus } = require("../events");
  eventBus.on("ranking:update", sendRankingUpdate);
}
```

```typescript
// packages/server/src/socket/namespaces/topic.ts
// 命名空间：/topic — 热点数据推送

import type { Server as SocketIOServer } from "socket.io";
import { SocketEvent, type HotTopicPayload } from "../events";

export function setupTopicNamespace(io: SocketIOServer): void {
  const topicNS = io.of("/topic");

  topicNS.on("connection", (socket) => {
    console.log(`[socket:topic] client joined: ${socket.id}`);
  });

  const sendNewTopic = (payload: HotTopicPayload) => {
    topicNS.emit(SocketEvent.HOT_TOPIC_NEW, payload);
  };

  const sendTopicUpdate = (payload: Partial<HotTopicPayload> & { id: string }) => {
    topicNS.emit(SocketEvent.HOT_TOPIC_UPDATE, payload);
  };

  const { eventBus } = require("../events");
  eventBus.on("hot:new", sendNewTopic);
  eventBus.on("hot:update", sendTopicUpdate);
}
```

### 命名空间总览

| Namespace | 用途 | 推送频率 | 优先级 |
|-----------|------|----------|--------|
| `/alert` | 突发警报（弹窗+声音） | 低频（突发时） | 最高 |
| `/ranking` | 排行榜实时刷新 | 高频（每 5-30s） | 中 |
| `/topic` | 热点数据更新 | 中频（事件触发） | 高 |

---

## 4. 房间 (Room) 管理

房间用于关键词粒度的订阅过滤：

```typescript
// packages/server/src/socket/room-manager.ts

/**
 * 房间命名规范：
 * - keyword:<关键词> — 按关键词订阅
 * - geo:<地区代码>   — 按地理围栏订阅
 * - user:<userId>   — 按用户订阅（预留）
 */

export const RoomPattern = {
  KEYWORD: (kw: string) => `keyword:${kw.toLowerCase().trim()}`,
  GEO: (geo: string) => `geo:${geo.toLowerCase()}`,
  USER: (uid: string) => `user:${uid}`,
} as const;

/** 将客户端加入关键词房间并自动离开旧房间 */
export function subscribeKeyword(socket: any, keyword: string): void {
  const room = RoomPattern.KEYWORD(keyword);

  // 查询该 socket 已加入的关键词房间
  const existing = Array.from(socket.rooms).filter((r: string) => r.startsWith("keyword:"));
  for (const old of existing) {
    socket.leave(old);
  }

  socket.join(room);
}

/** 向指定关键词房间广播 */
export function emitToKeyword(
  io: SocketIOServer,
  namespace: string,
  event: string,
  keyword: string,
  payload: unknown,
): void {
  const room = RoomPattern.KEYWORD(keyword);
  io.of(namespace).to(room).emit(event, payload);
}
```

---

## 5. 心跳保活与断线重连

### 5.1 服务端配置

Socket.IO 内置心跳机制，通过以下配置控制：

```typescript
// 在 initSocketIO 中配置

const io = new SocketIOServer(httpServer, {
  // ── 心跳检测 ──
  pingInterval: 25_000,   // 每 25s 发送一次 ping
  pingTimeout: 20_000,    // 客户端必须在 20s 内回复 pong，否则断开

  // ── 断连处理 ──
  // Socket.IO 客户端默认自动重连，服务端不需要额外配置
});
```

**推荐的「应用层」双向心跳**（弥补 Socket.IO 默认心跳只到传输层，无法感知业务存活）：

```typescript
// packages/server/src/socket/heartbeat.ts

import type { Server as SocketIOServer } from "socket.io";
import { SocketEvent } from "./events";

const HEARTBEAT_INTERVAL = 15_000; // 每 15s
const HEARTBEAT_TIMEOUT = 10_000;  // 10s 无响应则认为死连接

interface HeartbeatSocket {
  id: string;
  alive: boolean;
  lastPong: number;
}

export function setupHeartbeat(io: SocketIOServer): void {
  const sockets = new Map<string, HeartbeatSocket>();

  io.on("connection", (socket) => {
    const hb: HeartbeatSocket = { id: socket.id, alive: true, lastPong: Date.now() };
    sockets.set(socket.id, hb);

    // 收到 pong 更新存活状态
    socket.on(SocketEvent.PONG, () => {
      hb.alive = true;
      hb.lastPong = Date.now();
    });

    socket.on("disconnect", () => {
      sockets.delete(socket.id);
    });
  });

  // 定时检查
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, hb] of sockets) {
      if (!hb.alive && now - hb.lastPong > HEARTBEAT_TIMEOUT) {
        const socket = io.sockets.sockets.get(id);
        if (socket) {
          console.warn(`[heartbeat] force disconnect stale socket: ${id}`);
          socket.disconnect(true);
        }
        sockets.delete(id);
      }

      if (hb.alive) {
        hb.alive = false; // 等待下一次 pong
      }
    }
  }, HEARTBEAT_INTERVAL);

  // 允许外部清理
  return () => clearInterval(timer);
}
```

### 5.2 客户端配置

```typescript
// packages/client/src/services/socket.ts

import { io, type Socket } from "socket.io-client";
import { SocketEvent } from "./events";

interface SocketManagerOptions {
  url?: string;
  namespaces?: string[];   // 需要连接的命名空间列表
}

export class SocketManager {
  private connections: Map<string, Socket> = new Map();
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(opts: SocketManagerOptions = {}) {
    const baseUrl = opts.url ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
    const namespaces = opts.namespaces ?? ["/alert", "/ranking", "/topic"];

    for (const ns of namespaces) {
      this.connectNamespace(baseUrl, ns);
    }
  }

  private connectNamespace(baseUrl: string, namespace: string): void {
    const socket = io(`${baseUrl}${namespace}`, {
      // ── 自动重连配置 ──
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,    // 永不放弃重连
      reconnectionDelay: 1_000,          // 初始延迟 1s
      reconnectionDelayMax: 10_000,      // 最大延迟 10s
      randomizationFactor: 0.3,          // 随机抖动 ±30%

      // ── 超时 ──
      timeout: 20_000,

      // ── 传输 ──
      transports: ["websocket", "polling"],

      // ── 认证（预留） ──
      auth: {
        token: localStorage.getItem("auth_token") ?? undefined,
      },
    });

    // 连接事件日志
    socket.on("connect", () => {
      console.log(`[socket:${namespace}] connected as ${socket.id}`);
    });

    socket.on("disconnect", (reason) => {
      console.warn(`[socket:${namespace}] disconnected: ${reason}`);
      // 如果是因为服务端关闭，手动重连
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", (err) => {
      console.error(`[socket:${namespace}] connect error:`, err.message);
    });

    // 应用层心跳回复
    socket.on("ping", () => {
      socket.emit(SocketEvent.PONG);
    });

    this.connections.set(namespace, socket);
  }

  /** 获取指定命名空间的 socket 实例 */
  getSocket(namespace: string): Socket | undefined {
    return this.connections.get(namespace);
  }

  /** 订阅事件 */
  on(namespace: string, event: string, listener: (...args: any[]) => void): void {
    const key = `${namespace}:${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
    this.getSocket(namespace)?.on(event, listener);
  }

  /** 取消订阅 */
  off(namespace: string, event: string, listener: (...args: any[]) => void): void {
    const key = `${namespace}:${event}`;
    this.listeners.get(key)?.delete(listener);
    this.getSocket(namespace)?.off(event, listener);
  }

  /** 断开所有连接 */
  disconnect(): void {
    for (const [ns, socket] of this.connections) {
      socket.removeAllListeners();
      socket.disconnect();
      console.log(`[socket:${ns}] disconnected`);
    }
    this.connections.clear();
    this.listeners.clear();
  }
}

// 单例导出
export const socketManager = new SocketManager();
```

---

## 6. 推送规范

### 6.1 推送工具函数

```typescript
// packages/server/src/socket/push.ts

import { getIO } from "./index";
import { SocketEvent } from "./events";
import type { BreakingAlertPayload, RankingUpdatePayload, HotTopicPayload } from "./events";

/** 推送突发警报（所有命名空间 /alert） */
export function pushBreakingAlert(payload: BreakingAlertPayload, keyword?: string): void {
  const io = getIO();
  if (keyword) {
    io.of("/alert").to(`keyword:${keyword}`).emit(SocketEvent.BREAKING_ALERT, payload);
  } else {
    io.of("/alert").emit(SocketEvent.BREAKING_ALERT, payload);
  }
}

/** 推送排行榜更新 */
export function pushRankingUpdate(payload: RankingUpdatePayload): void {
  getIO().of("/ranking").emit(SocketEvent.RANKING_UPDATE, payload);
}

/** 推送新热点 */
export function pushNewTopic(payload: HotTopicPayload, keyword?: string): void {
  const io = getIO();
  if (keyword) {
    io.of("/topic").to(`keyword:${keyword}`).emit(SocketEvent.HOT_TOPIC_NEW, payload);
  } else {
    io.of("/topic").emit(SocketEvent.HOT_TOPIC_NEW, payload);
  }
}

/** 推送热点更新 */
export function pushTopicUpdate(payload: Partial<HotTopicPayload> & { id: string }): void {
  getIO().of("/topic").emit(SocketEvent.HOT_TOPIC_UPDATE, payload);
}
```

### 6.2 推送集成示例（从 AI Core 调用）

```typescript
// packages/server/src/ai-core/pipeline.ts（示意）
import { pushBreakingAlert, pushRankingUpdate } from "../socket/push";

// AI 处理完数据后推送
function onHotTopicProcessed(topic: ProcessedTopic): void {
  // 高热度 → 突发警报
  if (topic.heatScore > 90) {
    pushBreakingAlert({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      source: topic.topSource,
      heatScore: topic.heatScore,
      timestamp: new Date().toISOString(),
    });
  }

  // 更新排行榜
  pushRankingUpdate({
    list: rankingService.getTopN(20),
    updatedAt: new Date().toISOString(),
  });
}
```

---

## 7. 错误处理与监控

```typescript
// packages/server/src/socket/error-handler.ts

import type { Server as SocketIOServer } from "socket.io";

export function setupSocketErrorHandling(io: SocketIOServer): void {
  // 服务端异常
  io.engine.on("connection_error", (err) => {
    console.error(`[socket] engine connection error:`, {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  // 命名空间级别错误
  io.of("/").adapter.on("error", (err) => {
    console.error(`[socket] adapter error:`, err);
  });

  // 服务端异常兜底（不阻止进程退出）
  process.on("uncaughtException", (err) => {
    console.error("[socket] uncaught exception:", err);
  });
}
```

---

## 8. 生产 Checklist

| 检查项 | 要求 |
|--------|------|
| CORS 配置 | 生产环境禁止 `origin: "*"`，限定具体域名 |
| Redis Adapter | 多进程/多服务器部署时配置 `@socket.io/redis-adapter` |
| Namespace 数量 | 按业务隔离，不超过 5 个 |
| 消息体大小 | `maxHttpBufferSize: 1e6`（1MB），过大应分片 |
| 日志 | 连接/断开/错误必须记录，敏感信息脱敏 |
| 认证 | `/alert` 命名空间可配置 `connectionMiddleware` 鉴权 |
| 优雅关闭 | `httpServer.close()` 前先 `io.close()` |

---

## 9. 参考

- [Socket.IO 官方文档](https://socket.io/docs/v4/)
- [Socket.IO 客户端 API](https://socket.io/docs/v4/client-api/)
- [Socket.IO 命名空间与房间](https://socket.io/docs/v4/rooms/)
