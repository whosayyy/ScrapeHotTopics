import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../services/types.js";
import logger from "../lib/logger.js";
import { hotTopicRoutes } from "./hot-topic.routes.js";
import { eventRoutes } from "./event.routes.js";
import { newsItemRoutes } from "./news-item.routes.js";
import { keywordRoutes } from "./keyword-config.routes.js";
import { settingsRoutes } from "./user-settings.routes.js";
import { statsRoutes } from "./stats.routes.js";

const log = logger.child({ module: "Routes" });

export const apiRouter = Router();

// ── 子路由挂载 ──
apiRouter.use("/hot-topics", hotTopicRoutes);
apiRouter.use("/events", eventRoutes);
apiRouter.use("/news-items", newsItemRoutes);
apiRouter.use("/keywords", keywordRoutes);
apiRouter.use("/settings", settingsRoutes);
apiRouter.use("/stats", statsRoutes);

// ── 统一错误处理 ──
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Zod 校验错误
  if (err.name === "ZodError") {
    res.status(400).json({ error: "Validation failed", details: (err as any).issues });
    return;
  }

  // Prisma 已知错误
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    if (prismaErr.code === "P2002") {
      res.status(409).json({ error: "Resource already exists" });
      return;
    }
    if (prismaErr.code === "P2025") {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
  }

  log.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
