import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { NotFoundError, CreateEventSchema, UpdateEventSchema } from "./types.js";
import type { CreateEventInput, UpdateEventInput } from "./types.js";

const log = logger.child({ service: "EventService" });

export class EventService {
  /** 创建事件时间轴条目 */
  async create(input: CreateEventInput) {
    const data = CreateEventSchema.parse(input);

    // 校验关联的 HotTopic 是否存在
    const topic = await prisma.hotTopic.findUnique({ where: { id: data.hotTopicId } });
    if (!topic) throw new NotFoundError("HotTopic", data.hotTopicId);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        timestamp: new Date(data.timestamp),
        sourceUrl: data.sourceUrl,
        hotTopicId: data.hotTopicId,
      },
    });
    log.info({ id: event.id, hotTopicId: data.hotTopicId }, "event created");
    return event;
  }

  /** 批量创建事件 */
  async createMany(inputs: CreateEventInput[]) {
    const parsed = inputs.map((i) => CreateEventSchema.parse(i));

    // 校验所有 hotTopicId
    const topicIds = [...new Set(parsed.map((i) => i.hotTopicId))];
    const existing = await prisma.hotTopic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((t) => t.id));
    for (const id of topicIds) {
      if (!existingSet.has(id)) throw new NotFoundError("HotTopic", id);
    }

    const events = await prisma.event.createMany({
      data: parsed.map((d) => ({
        title: d.title,
        description: d.description,
        timestamp: new Date(d.timestamp),
        sourceUrl: d.sourceUrl,
        hotTopicId: d.hotTopicId,
      })),
    });
    log.info({ count: events.count }, "events created in batch");
    return events;
  }

  /** 根据事件 ID 查询 */
  async findById(id: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundError("Event", id);
    return event;
  }

  /** 查询某个热点话题的所有事件（时间线） */
  async findByHotTopicId(hotTopicId: string) {
    const topic = await prisma.hotTopic.findUnique({ where: { id: hotTopicId } });
    if (!topic) throw new NotFoundError("HotTopic", hotTopicId);

    return prisma.event.findMany({
      where: { hotTopicId },
      orderBy: { timestamp: "desc" },
    });
  }

  /** 更新事件 */
  async update(id: string, input: UpdateEventInput) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Event", id);

    const data = UpdateEventSchema.parse(input);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.timestamp !== undefined) updateData.timestamp = new Date(data.timestamp);
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
    if (data.hotTopicId !== undefined) {
      const topic = await prisma.hotTopic.findUnique({ where: { id: data.hotTopicId } });
      if (!topic) throw new NotFoundError("HotTopic", data.hotTopicId);
      updateData.hotTopicId = data.hotTopicId;
    }

    const event = await prisma.event.update({ where: { id }, data: updateData });
    log.info({ id }, "event updated");
    return event;
  }

  /** 删除事件 */
  async delete(id: string) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Event", id);

    await prisma.event.delete({ where: { id } });
    log.info({ id }, "event deleted");
  }

  /** 删除某个话题的所有事件 */
  async deleteByHotTopicId(hotTopicId: string) {
    const result = await prisma.event.deleteMany({ where: { hotTopicId } });
    log.info({ hotTopicId, count: result.count }, "events deleted by hotTopicId");
    return result;
  }
}

export const eventService = new EventService();
