import "dotenv/config";
import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── 中间件 ──
app.use(express.json({ limit: "1mb" }));

// ── 健康检查 ──
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ── 启动 ──
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

// ── 优雅关闭 ──
const shutdown = () => {
  console.log("[server] shutting down...");
  httpServer.close(() => {
    console.log("[server] closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
