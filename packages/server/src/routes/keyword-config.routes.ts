import { Router } from "express";
import { keywordConfigService } from "../services/index.js";

export const keywordRoutes = Router();

keywordRoutes.get("/", async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  const items = await keywordConfigService.findAll(activeOnly);
  res.json(items);
});

keywordRoutes.get("/:id", async (req, res) => {
  const config = await keywordConfigService.findById(req.params.id);
  res.json(config);
});

keywordRoutes.post("/", async (req, res) => {
  const config = await keywordConfigService.create(req.body);
  res.status(201).json(config);
});

keywordRoutes.put("/:id", async (req, res) => {
  const config = await keywordConfigService.update(req.params.id, req.body);
  res.json(config);
});

keywordRoutes.patch("/:id/toggle", async (req, res) => {
  const config = await keywordConfigService.toggleActive(req.params.id);
  res.json(config);
});

keywordRoutes.delete("/:id", async (req, res) => {
  await keywordConfigService.delete(req.params.id);
  res.status(204).end();
});
