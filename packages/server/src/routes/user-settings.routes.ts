import { Router } from "express";
import { userSettingsService } from "../services/index.js";

export const settingsRoutes = Router();

settingsRoutes.get("/", async (_req, res) => {
  const settings = await userSettingsService.get();
  res.json(settings);
});

settingsRoutes.put("/", async (req, res) => {
  const settings = await userSettingsService.update(req.body);
  res.json(settings);
});

settingsRoutes.post("/reset", async (_req, res) => {
  const settings = await userSettingsService.reset();
  res.json(settings);
});
