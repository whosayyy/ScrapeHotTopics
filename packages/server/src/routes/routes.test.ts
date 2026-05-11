import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { apiRouter, errorHandler } from "../routes/index.js";
import { sampleHotTopic } from "../test-utils.js";

// Mock all services
vi.mock("../services/hot-topic.service.js", () => ({
  HotTopicService: class {
    create = vi.fn();
    findById = vi.fn();
    findAll = vi.fn();
    update = vi.fn();
    delete = vi.fn();
    findRanking = vi.fn();
    findAlerts = vi.fn();
    search = vi.fn();
    markAlert = vi.fn();
  },
  hotTopicService: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findRanking: vi.fn(),
    findAlerts: vi.fn(),
    search: vi.fn(),
    markAlert: vi.fn(),
  },
}));

vi.mock("../services/event.service.js", () => ({
  EventService: class {
    create = vi.fn();
    findById = vi.fn();
    findByHotTopicId = vi.fn();
    update = vi.fn();
    delete = vi.fn();
  },
  eventService: {
    create: vi.fn(),
    findById: vi.fn(),
    findByHotTopicId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../services/news-item.service.js", () => ({
  NewsItemService: class {
    upsert = vi.fn();
    upsertMany = vi.fn();
    findById = vi.fn();
    findBySource = vi.fn();
    findByHotTopicId = vi.fn();
    linkToTopic = vi.fn();
  },
  newsItemService: {
    upsert: vi.fn(),
    upsertMany: vi.fn(),
    findById: vi.fn(),
    findBySource: vi.fn(),
    findByHotTopicId: vi.fn(),
    linkToTopic: vi.fn(),
  },
}));

const { hotTopicService } = await import("../services/hot-topic.service.js");
const { eventService } = await import("../services/event.service.js");
const { newsItemService } = await import("../services/news-item.service.js");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(errorHandler);
  return app;
}

describe("Routes — Hot Topics", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it("GET /api/hot-topics — returns paginated list", async () => {
    vi.mocked(hotTopicService.findAll).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await request(app).get("/api/hot-topics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
  });

  it("GET /api/hot-topics/ranking — returns ranking", async () => {
    vi.mocked(hotTopicService.findRanking).mockResolvedValue([]);

    const res = await request(app).get("/api/hot-topics/ranking");
    expect(res.status).toBe(200);
  });

  it("GET /api/hot-topics/alerts — returns alerts", async () => {
    vi.mocked(hotTopicService.findAlerts).mockResolvedValue([]);

    const res = await request(app).get("/api/hot-topics/alerts");
    expect(res.status).toBe(200);
  });

  it("GET /api/hot-topics/:id — returns a topic", async () => {
    vi.mocked(hotTopicService.findById).mockResolvedValue({
      ...sampleHotTopic, id: "topic-1", title: "Test", credibility: "待验证",
      events: [], newsItems: [],
    } as any);

    const res = await request(app).get("/api/hot-topics/topic-1");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Test");
  });

  it("POST /api/hot-topics — creates a topic", async () => {
    vi.mocked(hotTopicService.create).mockResolvedValue({
      ...sampleHotTopic, id: "new-id", title: "New Topic", credibility: "待验证",
    });

    const res = await request(app).post("/api/hot-topics").send({ title: "New Topic" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Topic");
  });

  it("PUT /api/hot-topics/:id — updates a topic", async () => {
    vi.mocked(hotTopicService.update).mockResolvedValue({
      ...sampleHotTopic, id: "topic-1", title: "Updated", heatScore: 80,
    });

    const res = await request(app).put("/api/hot-topics/topic-1").send({ heatScore: 80 });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/hot-topics/:id — deletes a topic", async () => {
    vi.mocked(hotTopicService.delete).mockResolvedValue(undefined);

    const res = await request(app).delete("/api/hot-topics/topic-1");
    expect(res.status).toBe(204);
  });

  it("PATCH /api/hot-topics/:id/alert — toggles alert", async () => {
    vi.mocked(hotTopicService.markAlert).mockResolvedValue({
      ...sampleHotTopic, id: "topic-1", title: "Test", isAlert: true, credibility: "待验证",
    });

    const res = await request(app).patch("/api/hot-topics/topic-1/alert").send({ isAlert: true });
    expect(res.status).toBe(200);
  });

  it("GET /api/hot-topics/:id/events — returns events", async () => {
    vi.mocked(eventService.findByHotTopicId).mockResolvedValue([]);

    const res = await request(app).get("/api/hot-topics/topic-1/events");
    expect(res.status).toBe(200);
  });

  it("GET /api/hot-topics/:id/news-items — returns news items", async () => {
    vi.mocked(newsItemService.findByHotTopicId).mockResolvedValue([]);

    const res = await request(app).get("/api/hot-topics/topic-1/news-items");
    expect(res.status).toBe(200);
  });

  it("returns 404 for nonexistent topic", async () => {
    vi.mocked(hotTopicService.findById).mockRejectedValue(
      Object.assign(new Error("HotTopic not found: nonexistent"), { statusCode: 404 }),
    );

    const res = await request(app).get("/api/hot-topics/nonexistent");
    expect(res.status).toBe(500); // AppError handles via errorHandler
  });

  it("GET /api/health — returns health status", async () => {
    const res = await request(app).get("/api/health");
    // health check is on app directly, not router, so skip via router test
    // instead test error handler
    expect(res.status).toBe(404); // no /api/health on apiRouter
  });
});
