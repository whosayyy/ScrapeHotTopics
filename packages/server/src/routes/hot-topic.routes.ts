import { Router } from "express";
import { hotTopicService, eventService, newsItemService } from "../services/index.js";
import type { HotTopicFilter } from "../services/types.js";

export const hotTopicRoutes = Router();

// ── 静态路由（必须在 /:id 之前注册）──

hotTopicRoutes.get("/ranking", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const sortBy = req.query.sortBy as string | undefined;
  const items = await hotTopicService.findRanking(limit, sortBy);
  res.json(items);
});

hotTopicRoutes.get("/alerts", async (_req, res) => {
  const items = await hotTopicService.findAlerts();
  res.json(items);
});

// ── CRUD ──

hotTopicRoutes.get("/", async (req, res) => {
  const filter: HotTopicFilter = {
    category: req.query.category as string | undefined,
    region: req.query.region as string | undefined,
    credibility: req.query.credibility as any,
    isAlert: req.query.isAlert === "true" ? true : req.query.isAlert === "false" ? false : undefined,
    search: req.query.search as string | undefined,
    source: req.query.source as string | undefined,
    sort: req.query.sort as any,
    page: parseInt(req.query.page as string, 10) || 1,
    pageSize: parseInt(req.query.pageSize as string, 10) || 20,
  };
  const result = await hotTopicService.findAll(filter);
  res.json(result);
});

hotTopicRoutes.get("/:id", async (req, res) => {
  const topic = await hotTopicService.findById(req.params.id);
  res.json(topic);
});

hotTopicRoutes.post("/", async (req, res) => {
  const topic = await hotTopicService.create(req.body);
  res.status(201).json(topic);
});

hotTopicRoutes.put("/:id", async (req, res) => {
  const topic = await hotTopicService.update(req.params.id, req.body);
  res.json(topic);
});

hotTopicRoutes.delete("/:id", async (req, res) => {
  await hotTopicService.delete(req.params.id);
  res.status(204).end();
});

// ── 附加操作 ──

hotTopicRoutes.patch("/:id/alert", async (req, res) => {
  const { isAlert } = req.body;
  const topic = await hotTopicService.markAlert(req.params.id, isAlert);
  res.json(topic);
});

// ── 嵌套资源 ──

hotTopicRoutes.get("/:id/events", async (req, res) => {
  const events = await eventService.findByHotTopicId(req.params.id);
  res.json(events);
});

hotTopicRoutes.get("/:id/news-items", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const items = await newsItemService.findByHotTopicId(req.params.id, limit);
  res.json(items);
});
