import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import {
  NotFoundError,
  ConflictError,
  CreateNewsItemSchema,
  UpdateNewsItemSchema,
} from "./types.js";
import type { CreateNewsItemInput, UpdateNewsItemInput } from "./types.js";

const log = logger.child({ service: "NewsItemService" });

export class NewsItemService {
  /** 创建或更新（按 sourceId + externalId 唯一约束） */
  async upsert(input: CreateNewsItemInput) {
    const data = CreateNewsItemSchema.parse(input);

    const item = await prisma.newsItem.upsert({
      where: {
        sourceId_externalId: {
          sourceId: data.sourceId,
          externalId: data.externalId,
        },
      },
      update: {
        title: data.title,
        url: data.url,
        content: data.content,
        author: data.author,
        publishedAt: new Date(data.publishedAt),
        heat: data.heat,
        credibility: data.credibility,
      },
      create: {
        sourceId: data.sourceId,
        externalId: data.externalId,
        title: data.title,
        url: data.url,
        content: data.content,
        author: data.author,
        publishedAt: new Date(data.publishedAt),
        heat: data.heat,
        credibility: data.credibility,
        hotTopicId: data.hotTopicId,
      },
    });

    log.debug({ id: item.id, sourceId: data.sourceId }, "news item upserted");
    return item;
  }

  /** 批量 upsert（去重写入） */
  async upsertMany(inputs: CreateNewsItemInput[]) {
    const results: Awaited<ReturnType<typeof this.upsert>>[] = [];
    const errors: { input: CreateNewsItemInput; error: unknown }[] = [];

    for (const input of inputs) {
      try {
        const item = await this.upsert(input);
        results.push(item);
      } catch (err) {
        errors.push({ input, error: err });
      }
    }

    log.info({ total: inputs.length, success: results.length, failed: errors.length }, "batch upsert done");

    if (errors.length > 0) {
      log.warn({ errors }, "batch upsert had failures");
    }

    return { items: results, errors };
  }

  /** 根据 ID 查询 */
  async findById(id: string) {
    const item = await prisma.newsItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError("NewsItem", id);
    return item;
  }

  /** 按数据源查询 */
  async findBySource(sourceId: string, limit = 50) {
    return prisma.newsItem.findMany({
      where: { sourceId },
      orderBy: { publishedAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  /** 查询未关联 HotTopic 的条目 */
  async findUnlinked(limit = 100) {
    return prisma.newsItem.findMany({
      where: { hotTopicId: null },
      orderBy: { publishedAt: "desc" },
      take: Math.min(limit, 500),
    });
  }

  /** 将 NewsItem 关联到 HotTopic */
  async linkToTopic(id: string, hotTopicId: string) {
    const item = await prisma.newsItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError("NewsItem", id);

    const topic = await prisma.hotTopic.findUnique({ where: { id: hotTopicId } });
    if (!topic) throw new NotFoundError("HotTopic", hotTopicId);

    const updated = await prisma.newsItem.update({
      where: { id },
      data: { hotTopicId },
    });
    log.info({ id, hotTopicId }, "news item linked to topic");
    return updated;
  }

  /** 批量取消关联（当话题被删除时） */
  async unlinkByTopicId(hotTopicId: string) {
    const result = await prisma.newsItem.updateMany({
      where: { hotTopicId },
      data: { hotTopicId: null },
    });
    log.info({ hotTopicId, count: result.count }, "news items unlinked from topic");
    return result;
  }

  /** 查询某个 HotTopic 关联的新闻 */
  async findByHotTopicId(hotTopicId: string, limit = 50) {
    return prisma.newsItem.findMany({
      where: { hotTopicId },
      orderBy: { publishedAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  /** 清理指定时间之前的老数据 */
  async deleteOld(before: Date) {
    const result = await prisma.newsItem.deleteMany({
      where: { publishedAt: { lt: before } },
    });
    log.info({ before: before.toISOString(), count: result.count }, "old news items cleaned");
    return result;
  }

  /** 更新单条 NewsItem */
  async update(id: string, input: UpdateNewsItemInput) {
    const existing = await prisma.newsItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("NewsItem", id);

    const data = UpdateNewsItemSchema.parse(input);
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.author !== undefined) updateData.author = data.author;
    if (data.publishedAt !== undefined) updateData.publishedAt = new Date(data.publishedAt);
    if (data.heat !== undefined) updateData.heat = data.heat;
    if (data.credibility !== undefined) updateData.credibility = data.credibility;
    if (data.hotTopicId !== undefined) updateData.hotTopicId = data.hotTopicId;

    const item = await prisma.newsItem.update({ where: { id }, data: updateData });
    log.info({ id }, "news item updated");
    return item;
  }

  /** 删除单条 */
  async delete(id: string) {
    const existing = await prisma.newsItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("NewsItem", id);

    await prisma.newsItem.delete({ where: { id } });
    log.info({ id }, "news item deleted");
  }
}

export const newsItemService = new NewsItemService();
