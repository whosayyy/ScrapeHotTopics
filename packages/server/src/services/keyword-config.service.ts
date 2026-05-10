import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { NotFoundError, ConflictError, CreateKeywordConfigSchema, UpdateKeywordConfigSchema } from "./types.js";
import type { CreateKeywordConfigInput, UpdateKeywordConfigInput } from "./types.js";

const log = logger.child({ service: "KeywordConfigService" });

export class KeywordConfigService {
  /** 创建关键词配置 */
  async create(input: CreateKeywordConfigInput) {
    const data = CreateKeywordConfigSchema.parse(input);

    // 检查唯一性
    const existing = await prisma.keywordConfig.findUnique({ where: { keyword: data.keyword } });
    if (existing) throw new ConflictError(`关键词 "${data.keyword}" 已存在`);

    const config = await prisma.keywordConfig.create({ data });
    log.info({ id: config.id, keyword: data.keyword }, "keyword config created");
    return config;
  }

  /** 根据 ID 查询 */
  async findById(id: string) {
    const config = await prisma.keywordConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundError("KeywordConfig", id);
    return config;
  }

  /** 根据关键词精确查找 */
  async findByKeyword(keyword: string) {
    const config = await prisma.keywordConfig.findUnique({ where: { keyword } });
    if (!config) throw new NotFoundError("KeywordConfig", keyword);
    return config;
  }

  /** 获取所有配置（可过滤活跃状态） */
  async findAll(activeOnly = false) {
    return prisma.keywordConfig.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /** 更新配置 */
  async update(id: string, input: UpdateKeywordConfigInput) {
    const existing = await prisma.keywordConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("KeywordConfig", id);

    const data = UpdateKeywordConfigSchema.parse(input);

    // 如果更新 keyword，检查唯一性冲突
    if (data.keyword && data.keyword !== existing.keyword) {
      const dup = await prisma.keywordConfig.findUnique({ where: { keyword: data.keyword } });
      if (dup) throw new ConflictError(`关键词 "${data.keyword}" 已被使用`);
    }

    const config = await prisma.keywordConfig.update({ where: { id }, data });
    log.info({ id, keyword: config.keyword }, "keyword config updated");
    return config;
  }

  /** 切换激活状态 */
  async toggleActive(id: string) {
    const existing = await prisma.keywordConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("KeywordConfig", id);

    const config = await prisma.keywordConfig.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    log.info({ id, isActive: config.isActive }, "keyword config toggled");
    return config;
  }

  /** 删除配置 */
  async delete(id: string) {
    const existing = await prisma.keywordConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("KeywordConfig", id);

    await prisma.keywordConfig.delete({ where: { id } });
    log.info({ id, keyword: existing.keyword }, "keyword config deleted");
  }

  /** 获取所有活跃关键词列表（供爬虫引擎使用） */
  async getActiveKeywords() {
    const configs = await prisma.keywordConfig.findMany({ where: { isActive: true } });
    return configs.map((c) => ({
      keyword: c.keyword,
      isRegex: c.isRegex,
      exclude: c.exclude ? c.exclude.split(";").filter(Boolean) : [],
      geo: c.geo ?? undefined,
    }));
  }
}

export const keywordConfigService = new KeywordConfigService();
