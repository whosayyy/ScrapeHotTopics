import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createCrawlerEngine } from "./crawler/index.js";
import { initSocketIO } from "./socket/index.js";
import { apiRouter, errorHandler } from "./routes/index.js";
import logger from "./lib/logger.js";

const log = logger.child({ module: "Server" });

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── 中间件 ──
app.use(express.json({ limit: "1mb" }));

// ── 健康检查 ──
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    ai: { configured: Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "sk-your-key-here") },
  });
});

// ── REST API 路由 ──
app.use("/api", apiRouter);
app.use(errorHandler);

// ── Socket.IO 实时通信 ──
initSocketIO(httpServer);

// ── 爬虫引擎（数据流经 AI Core 处理后持久化） ──
const crawlerEngine = createCrawlerEngine();

// ── 启动 ──
httpServer.listen(PORT, () => {
  log.info({ ai: Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "sk-your-key-here") }, `listening on http://localhost:${PORT}`);
  crawlerEngine.start();
});

// ── 优雅关闭 ──
const shutdown = () => {
  log.info("shutting down...");
  crawlerEngine.stop();
  httpServer.close(() => {
    log.info("closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
