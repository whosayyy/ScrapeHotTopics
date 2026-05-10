import { z } from "zod";

// ── 统一应用层错误 ──

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = "ConflictError";
  }
}

// ── Zod Schemas ──

export const CredibilityEnum = z.enum(["高可信", "待验证", "谣言"]);
export type Credibility = z.infer<typeof CredibilityEnum>;

/** 创建 HotTopic */
export const CreateHotTopicSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(500),
  summary: z.string().max(2000).optional(),
  credibility: CredibilityEnum.default("待验证"),
  heatScore: z.number().int().min(0).max(9999).default(0),
  category: z.string().max(100).optional(),
  topSource: z.string().max(100).optional(),
  tags: z.string().max(1000).optional(),
  isAlert: z.boolean().default(false),
});
export type CreateHotTopicInput = z.infer<typeof CreateHotTopicSchema>;

/** 更新 HotTopic（所有字段可选） */
export const UpdateHotTopicSchema = CreateHotTopicSchema.partial();
export type UpdateHotTopicInput = z.infer<typeof UpdateHotTopicSchema>;

/** 查询过滤 */
export const HotTopicFilterSchema = z.object({
  category: z.string().optional(),
  credibility: CredibilityEnum.optional(),
  isAlert: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type HotTopicFilter = z.infer<typeof HotTopicFilterSchema>;

/** 创建 Event */
export const CreateEventSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(500),
  description: z.string().max(5000).optional(),
  timestamp: z.string().datetime({ offset: true }).or(z.string().pipe(z.coerce.date())),
  sourceUrl: z.string().url().max(2000).optional(),
  hotTopicId: z.string().min(1),
});
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

/** 创建 NewsItem */
export const CreateNewsItemSchema = z.object({
  sourceId: z.string().min(1).max(50),
  externalId: z.string().min(1).max(200),
  title: z.string().min(1).max(1000),
  url: z.string().url().max(2000),
  content: z.string().max(50_000).optional(),
  author: z.string().max(200).optional(),
  publishedAt: z.string().datetime({ offset: true }).or(z.string().pipe(z.coerce.date())),
  heat: z.number().int().min(0).default(0),
  credibility: CredibilityEnum.optional(),
  hotTopicId: z.string().optional(),
});
export type CreateNewsItemInput = z.infer<typeof CreateNewsItemSchema>;

export const UpdateNewsItemSchema = CreateNewsItemSchema.partial();
export type UpdateNewsItemInput = z.infer<typeof UpdateNewsItemSchema>;

/** 创建 KeywordConfig */
export const CreateKeywordConfigSchema = z.object({
  keyword: z.string().min(1).max(200),
  isActive: z.boolean().default(true),
  isRegex: z.boolean().default(false),
  exclude: z.string().max(1000).optional(),
  geo: z.string().max(100).optional(),
});
export type CreateKeywordConfigInput = z.infer<typeof CreateKeywordConfigSchema>;

export const UpdateKeywordConfigSchema = CreateKeywordConfigSchema.partial();
export type UpdateKeywordConfigInput = z.infer<typeof UpdateKeywordConfigSchema>;

/** 更新 UserSettings */
export const UpdateUserSettingsSchema = z.object({
  email: z.string().email().max(320).optional(),
  alertSound: z.boolean().optional(),
});
export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;
