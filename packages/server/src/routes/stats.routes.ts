import { Router } from "express";
import { getSystemStats } from "../ai-core/index.js";

export const statsRoutes = Router();

statsRoutes.get("/", async (_req, res) => {
  const stats = await getSystemStats();
  res.json(stats);
});
