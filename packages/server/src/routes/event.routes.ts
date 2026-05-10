import { Router } from "express";
import { eventService } from "../services/index.js";

export const eventRoutes = Router();

eventRoutes.get("/:id", async (req, res) => {
  const event = await eventService.findById(req.params.id);
  res.json(event);
});

eventRoutes.post("/", async (req, res) => {
  const event = await eventService.create(req.body);
  res.status(201).json(event);
});

eventRoutes.put("/:id", async (req, res) => {
  const event = await eventService.update(req.params.id, req.body);
  res.json(event);
});

eventRoutes.delete("/:id", async (req, res) => {
  await eventService.delete(req.params.id);
  res.status(204).end();
});
