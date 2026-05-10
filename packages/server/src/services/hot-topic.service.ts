import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import {
  AppError,
  NotFoundError,
  CreateHotTopicSchema,
  UpdateHotTopicSchema,
  HotTopicFilterSchema,
} from "./types.js";
import type { CreateHotTopicInput, UpdateHotTopicInput, HotTopicFilter } from "./types.js";

const log = logger.child({ service: "HotTopicService" });

function mapSortField(field?: string): string {
  const allowed = ["heatScore", "createdAt", "updatedAt", "title"];
  return field && allowed.includes(field) ? field : "heatScore";
}

export class HotTopicService {
  /** 创建热点话题 */
  async create(input: CreateHotTopicInput) {
    const data = CreateHotTopicSchema.parse(input);

    const topic = await prisma.hotTopic.create({ data });
    log.info({ id: topic.id, title: topic.title }, "hot topic created");
    return topic;
  }

  /** 根据 ID 查询（含关联） */
  async findById(id: string) {
    const topic = await prisma.hotTopic.findUnique({
      where: { id },
      include: { events: { orderBy: { timestamp: "desc" } }, newsItems: { take: 10 } },
    });
    if (!topic) throw new NotFoundError("HotTopic", id);
    return topic;
  }

  /** 分页查询列表 */
  async findAll(filter: HotTopicFilter) {
    const { category, credibility, isAlert, search, page, pageSize } =
      HotTopicFilterSchema.parse(filter);

    const where: Prisma.HotTopicWhereInput = {};

    if (category) where.category = category;
    if (credibility) where.credibility = credibility;
    if (isAlert !== undefined) where.isAlert = isAlert;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.hotTopic.findMany({
        where,
        orderBy: { heatScore: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.hotTopic.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** 更新热点话题 */
  async update(id: string, input: UpdateHotTopicInput) {
    const existing = await prisma.hotTopic.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("HotTopic", id);

    const data = UpdateHotTopicSchema.parse(input);
    const topic = await prisma.hotTopic.update({ where: { id }, data });
    log.info({ id }, "hot topic updated");
    return topic;
  }

  /** 删除热点话题 */
  async delete(id: string) {
    const existing = await prisma.hotTopic.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("HotTopic", id);

    await prisma.hotTopic.delete({ where: { id } });
    log.info({ id }, "hot topic deleted");
  }

  /** 获取排行榜 */
  async findRanking(limit = 20, sortBy?: string) {
    const items = await prisma.hotTopic.findMany({
      orderBy: { [mapSortField(sortBy)]: "desc" },
      take: Math.min(limit, 100),
    });
    return items;
  }

  /** 获取警报列表 */
  async findAlerts() {
    return prisma.hotTopic.findMany({
      where: { isAlert: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 搜索话题 */
  async search(query: string, limit = 10) {
    if (!query.trim()) return [];

    return prisma.hotTopic.findMany({
      where: {
        OR: [
          { title: { contains: query.trim() } },
          { summary: { contains: query.trim() } },
        ],
      },
      orderBy: { heatScore: "desc" },
      take: Math.min(limit, 50),
    });
  }

  /** 批量标记警报 */
  async markAlert(id: string, isAlert: boolean) {
    const existing = await prisma.hotTopic.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("HotTopic", id);

    const topic = await prisma.hotTopic.update({
      where: { id },
      data: { isAlert },
    });
    log.info({ id, isAlert }, "hot topic alert status updated");
    return topic;
  }
}

export const hotTopicService = new HotTopicService();
