# AGENTS.md — 热点雷达 (HotRadar)

## 项目概览

构建一个全自动的「热点雷达」系统，利用 AI 对多源信息进行清洗、串联和分析，通过 **Socket.IO** 实时推送到科技感仪表盘。

---

## 技术栈约束（严格遵守）

| 层级 | 技术 | 版本要求 |
|------|------|----------|
| 运行时 | Node.js | 18+ |
| 后端框架 | Express 5 | 最新稳定版，利用新中间件特性 |
| 语言 | TypeScript | 严格模式，全项目覆盖 |
| 数据库 ORM | Prisma | 最新版，开发阶段用 SQLite，生产无缝迁移至 PostgreSQL |
| 实时通信 | **Socket.IO** | **禁止使用原生 WebSocket**，必须用 Socket.IO 处理断连重连 |
| 爬虫 | Axios + Cheerio | Axios 做并发请求，Cheerio 解析 DOM |
| AI | Deepseek API | 需配置 `DEEPSEEK_API_KEY` 环境变量 |
| 前端框架 | React 19 | 利用 Actions 等新特性 |
| 样式 | Tailwind CSS | 最新版 |
| UI 组件库 | Aceternity UI | 科技感风格 |
| 构建工具 | Vite | 配合 React 19 |

---

## 项目结构

```
hot-radar/
├── packages/
│   ├── server/                 # 后端
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts        # Express 5 入口，挂载 Socket.IO
│   │   │   ├── crawler/        # 爬虫引擎
│   │   │   │   ├── engine.ts
│   │   │   │   └── adapters/   # 8+ 数据源适配器
│   │   │   │       ├── twitter.ts
│   │   │   │       ├── bing.ts
│   │   │   │       ├── hackernews.ts
│   │   │   │       ├── sogou-wechat.ts
│   │   │   │       ├── bilibili.ts
│   │   │   │       ├── google-trends.ts
│   │   │   │       ├── reddit.ts
│   │   │   │       └── github-trending.ts
│   │   │   ├── ai-core/        # AI 清洗编排中心
│   │   │   │   ├── dedup.ts
│   │   │   │   ├── credibility.ts
│   │   │   │   ├── timeline.ts
│   │   │   │   └── summary.ts
│   │   │   ├── socket/         # Socket.IO 层
│   │   │   │   ├── index.ts
│   │   │   │   └── events.ts
│   │   │   ├── routes/         # REST API
│   │   │   └── config/         # 配置
│   │   └── package.json
│   └── client/                 # 前端
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/     # UI 组件
│       │   │   ├── layout/     # 三栏布局
│       │   │   ├── waterfall/  # 热点瀑布流
│       │   │   ├── timeline/   # AI 事件时间轴
│       │   │   ├── rankings/   # 实时排行榜
│       │   │   ├── alert/      # 突发警报弹窗
│       │   │   └── map/        # 事件地图
│       │   ├── hooks/          # 自定义 Hooks
│       │   ├── services/       # Socket.IO 客户端 + API 调用
│       │   └── types/          # 共享类型
│       └── package.json
└── package.json                # 根 workspaces
```

---

## 开发规范

### 通用

- **TypeScript 严格模式**：`strict: true`，禁止使用 `any`，必要时用 `unknown`
- **ES Modules**：`"type": "module"`，统一使用 ESM
- **命名规范**：
  - 文件/目录：`kebab-case`（如 `ai-core/credibility.ts`）
  - 函数/变量：`camelCase`
  - 类/类型/接口：`PascalCase`
  - 常量：`UPPER_SNAKE_CASE`
- **错误处理**：所有异步操作必须有 try-catch，禁止吞掉错误
- **日志**：统一使用 `pino` 或 `consola`，禁止裸 `console.log`

### 后端

- **Express 5 路由**：使用 `async` 路由处理，Express 5 原生支持异步错误
- **Prisma**：
  - 所有数据库操作通过 Prisma Client Singleton
  - Schema 变更用迁移文件记录，禁止手动改库
  - 开发用 SQLite，生产切 PostgreSQL —— Prisma schema 保持兼容
- **爬虫模块**：
  - 每个适配器实现统一接口 `CrawlerAdapter { fetch(keywords): Promise<RawNews[]>, interval: number }`
  - 轮询间隔在 1-5 分钟，通过配置控制
  - 并发请求用 `Promise.allSettled`，单个源失败不影响其他源
  - 需要频率控制和指数退避，防止被目标平台封禁
  - 支持关键词/正则/排除词/地理围栏配置
- **AI Core**：
  - 调用 Deepseek API 通过 `fetch` 或 `axios`
  - API Key 通过环境变量注入，**禁止硬编码**
  - 所有 AI 请求设超时（默认 30s）
  - AI 清洗输出为结构化 JSON，有明确的 TypeScript 类型定义
  - `credibility.ts` 输出：`"高可信" | "待验证" | "谣言"`

### 前端

- **React 19**：优先使用 Server Components（如果有 SSR），Actions，`use()` 等新特性
- **Vite**：配置 `@` 路径别名指向 `src/`
- **TypeScript**：组件 Props 用 `interface` 定义并导出
- **状态管理**：尽量用 React 内置能力（`useState`/`useReducer` + Context），避免引入 Redux
- **性能**：
  - 首屏加载 < 1s
  - 热点推送延迟 < 3s（Socket.IO 端到端）
  - 虚拟列表处理大量热点数据

---

## Socket.IO 规范（⚠️ 强制）

### 规则

1. **禁止使用原生 WebSocket API**（`ws`、`new WebSocket()`、浏览器原生 `WebSocket`）。所有实时通信必须走 Socket.IO。
2. **必要性**：Socket.IO 提供自动断连重连、回退轮询、房间/命名空间等机制，原生 WebSocket 无法满足生产环境的稳定性要求。

### 服务端 (Server)

```typescript
// packages/server/src/socket/index.ts
import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

let io: SocketIOServer;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN ?? "*" },
    // 禁止降级到长轮询（可选，按需配置）
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    socket.on("disconnect", (reason) => {
      console.log(`[socket] client disconnected: ${socket.id} reason: ${reason}`);
    });
  });

  return io;
}

// 导出 io 实例供其他模块使用
export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
```

### 事件定义

所有事件名集中在 `events.ts` 中定义，避免魔术字符串：

```typescript
// packages/server/src/socket/events.ts
export const SocketEvents = {
  // 服务端 → 客户端
  BREAKING_ALERT: "breaking:alert",       // 突发警报（弹窗+声音）
  RANKING_UPDATE: "ranking:update",       // 排行榜实时更新
  HOT_TOPIC_NEW: "hot:new",               // 新热点出现
  HOT_TOPIC_UPDATE: "hot:update",         // 热点数据更新

  // 客户端 → 服务端
  SUBSCRIBE_KEYWORD: "subscribe:keyword", // 订阅关键词
  UNSUBSCRIBE_KEYWORD: "unsubscribe:keyword",
} as const;
```

### 客户端 (Client)

```typescript
// packages/client/src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001", {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => console.log("[socket] connected"));
  socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
  socket.on("connect_error", (err) => console.error("[socket] connection error:", err.message));

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

---

## 数据流

```
[外部 API / RSS]                  [用户浏览器]
      │                                ▲
      ▼                                │
┌─────────────┐   ┌──────────┐   ┌──────────┐
│ Crawler     │──▶│ AI Core  │──▶│ Socket   │
│ Engine      │   │ (清洗/    │   │ .IO      │
│ (8+ 源)     │   │  去重/    │   │ Server   │
│             │   │  可信度/  │   │          │
│ 每 1-5 min  │   │  时间线)  │   │ 推送     │
└─────────────┘   └────┬─────┘   └──────────┘
                       │               │
                       ▼               ▼
                  ┌──────────────────────┐
                  │    Prisma Database   │
                  │   (SQLite / PG)      │
                  └──────────────────────┘
                       ▲
                       │
                  ┌──────────┐
                  │ REST API │
                  │ (Express │
                  │   5)     │
                  └──────────┘
                       │
                       ▼
                  ┌──────────┐
                  │  React   │
                  │  仪表盘  │
                  └──────────┘
```

---

## 关键设计决策

1. **实时通信 → Socket.IO（非原生 WebSocket）**：项目文档明确要求，利用 Socket.IO 的自动重连、退避策略、事件确认等能力
2. **数据库 → Prisma + SQLite 开发 / PostgreSQL 生产**：schema 需保持兼容，Prisma 的 `provider` 切换即可
3. **爬虫隔离 → 每个源独立适配器 + Promise.allSettled**：单个源超时或报错不影响整体流程
4. **AI 编排 → 异步流水线**：去重 → 可信度 → 时间线 → 摘要，可独立调优和降级
5. **前端三栏布局 → 瀑布流 + 事件时间轴 + 排行榜**：Aceternity UI 提供科技感基础组件

---

## 环境变量

```bash
# .env.example

# Server
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Database
DATABASE_URL="file:./dev.db"          # SQLite 开发
# DATABASE_URL="postgresql://..."     # PostgreSQL 生产

# AI
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_MODEL=deepseek-chat          # 或其他模型
DEEPSEEK_TIMEOUT=30000

# Crawler
CRAWLER_INTERVAL_MIN=1
CRAWLER_INTERVAL_MAX=5

# Email (离线补发)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## 开发命令

```bash
# 根目录
npm install                     # 安装所有 workspace 依赖
npm run dev -w packages/server  # 启动后端开发
npm run dev -w packages/client  # 启动前端开发
npm run build -w packages/*     # 构建

# 数据库
npm run db:migrate -w packages/server   # 运行迁移
npm run db:push -w packages/server      # 直接推送 schema（开发）
npm run db:studio -w packages/server    # Prisma Studio
```

---

## 参考

- [Express 5 迁移指南](https://expressjs.com/en/guide/migrating-5.html)
- [Socket.IO 文档](https://socket.io/docs/v4/)
- [React 19 新特性](https://react.dev/blog/2024/12/05/react-19)
- [Prisma 文档](https://www.prisma.io/docs)
- [Aceternity UI](https://ui.aceternity.com/)
