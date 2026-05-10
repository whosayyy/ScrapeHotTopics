import { Router } from "express";
import { newsItemService } from "../services/index.js";

export const newsItemRoutes = Router();

// ── 静态路由（必须在 /:id 之前注册）──

newsItemRoutes.get("/source/:sourceId", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const items = await newsItemService.findBySource(req.params.sourceId, limit);
  res.json(items);
});

newsItemRoutes.get("/unlinked", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const items = await newsItemService.findUnlinked(limit);
  res.json(items);
});

// ── 单条查询 ──

newsItemRoutes.get("/:id", async (req, res) => {
  const item = await newsItemService.findById(req.params.id);
  res.json(item);
});
