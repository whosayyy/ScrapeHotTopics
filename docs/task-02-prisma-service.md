# Task 02: 数据库层 (Prisma Service) — 完成报告

## 完成时间

2026-05-10

## 完成内容

| 子任务 | 状态 |
|--------|------|
| 2.1 Logger 工具（Pino） | ✅ |
| 2.2 共享类型与 Zod 校验 Schema | ✅ |
| 2.3 HotTopicService（CRUD + 搜索 + 排行榜 + 警报） | ✅ |
| 2.4 EventService（CRUD + 时间线查询 + 批量创建） | ✅ |
| 2.5 NewsItemService（Upsert + 批量写入 + 关联管理 + 数据清理） | ✅ |
| 2.6 KeywordConfigService（CRUD + 去重保护 + 活跃关键词导出） | ✅ |
| 2.7 UserSettingsService（惰性创建 + 更新 + 重置） | ✅ |
| 2.8 模块统一导出 | ✅ |

## 新增/修改文件

```
packages/server/src/
├── lib/
│   └── logger.ts                         # NEW — Pino 日志实例
└── services/
    ├── index.ts                          # NEW — Barrel 导出
    ├── types.ts                          # NEW — Zod schema + AppError
    ├── hot-topic.service.ts              # NEW — 热点话题服务
    ├── event.service.ts                  # NEW — 事件时间轴服务
    ├── news-item.service.ts              # NEW — 新闻条目服务
    ├── keyword-config.service.ts         # NEW — 关键词配置服务
    └── user-settings.service.ts          # NEW — 用户设置服务
```

## Service 设计概览

### 错误体系

| 错误类 | HTTP 状态码 | 场景 |
|--------|-------------|------|
| `AppError` | 自定义 | 基类 |
| `NotFoundError` | 404 | 资源不存在 |
| `ConflictError` | 409 | 唯一约束冲突 |

### Zod 校验

每个 Service 对外接收 typed input，内部通过 Zod Schema 在边界做校验：

- `CreateXxxSchema` — 创建时全字段校验 + 默认值
- `UpdateXxxSchema` — 更新时所有字段 `partial()`
- 专有 Filter Schema — `HotTopicFilterSchema` 含分页参数校验 + 类型转换

### HotTopicService

| 方法 | 说明 |
|------|------|
| `create(input)` | 创建热点 |
| `findById(id)` | 详情（含 events + newsItems 关联） |
| `findAll(filter)` | 分页列表（category/credibility/isAlert/search 过滤） |
| `update(id, input)` | 更新 |
| `delete(id)` | 删除 |
| `findRanking(limit, sortBy)` | 排行榜（防 SQL 注入：sortBy 白名单校验） |
| `findAlerts()` | 警报列表 |
| `search(query, limit)` | 标题/摘要搜索 |
| `markAlert(id, isAlert)` | 批量设置警报标记 |

### EventService

| 方法 | 说明 |
|------|------|
| `create(input)` | 创建（校验 hotTopicId 存在性） |
| `createMany(inputs)` | 批量创建（批量校验 hotTopicId） |
| `findById(id)` | 单条查询 |
| `findByHotTopicId(hotTopicId)` | 按话题查询时间线 |
| `update(id, input)` | 更新 |
| `delete(id)` | 删除 |
| `deleteByHotTopicId(hotTopicId)` | 级联删除话题下所有事件 |

### NewsItemService

| 方法 | 说明 |
|------|------|
| `upsert(input)` | 按 `sourceId + externalId` 去重写入 |
| `upsertMany(inputs)` | 批量 upsert，失败隔离不影响其他 |
| `findById(id)` | 单条查询 |
| `findBySource(sourceId, limit)` | 按数据源查询 |
| `findUnlinked(limit)` | 未关联话题的游离条目 |
| `linkToTopic(id, hotTopicId)` | 关联到话题 |
| `unlinkByTopicId(hotTopicId)` | 话题删除时取消关联 |
| `findByHotTopicId(hotTopicId, limit)` | 话题下的新闻列表 |
| `deleteOld(before)` | 清理历史数据 |
| `update(id, input)` | 更新 |
| `delete(id)` | 删除 |

### KeywordConfigService

| 方法 | 说明 |
|------|------|
| `create(input)` | 创建（含唯一性冲突检测） |
| `findById(id)` | 按 ID 查询 |
| `findByKeyword(keyword)` | 按关键词精确查询 |
| `findAll(activeOnly)` | 列表（可过滤活跃状态） |
| `update(id, input)` | 更新（含 keyword 唯一性校验） |
| `toggleActive(id)` | 切换激活状态 |
| `delete(id)` | 删除 |
| `getActiveKeywords()` | 供爬虫引擎使用：返回结构化关键词列表 |

### UserSettingsService

| 方法 | 说明 |
|------|------|
| `get()` | 获取设置（惰性创建默认记录） |
| `update(input)` | 更新设置 |
| `reset()` | 恢复默认值 |

## 约束遵守情况

| 约束 | 做法 |
|------|------|
| TypeScript 严格模式 | `strict: true`，零 `any` |
| ES Modules | `"type": "module"`，所有 import 带 `.js` 后缀 |
| Prisma Client 单例 | 复用 `lib/prisma.ts` |
| 错误不吞没 | 所有操作有 try-catch，Zod 错误向上传播 |
| 日志统一 | 使用 `pino`，每个 Service 独立 child logger |
| 命名规范 | `kebab-case` 文件名，`PascalCase` 类名，`camelCase` 方法 |

## 验证结果

- **TypeScript 编译**: 零错误通过
- **Zod Schema 校验**: 所有 Create Schema 默认值、类型转换正常
- **导入链路**: 所有 Service 可正常导入，无循环依赖

## 项目整体进度

| # | 任务 | 状态 | 依赖 |
|---|------|------|------|
| 1 | 项目脚手架与基础配置 | ✅ 完成 | — |
| **2** | **数据库层 (Prisma Service)** | **✅ 完成** | **Task 1** |
| 3 | 爬虫引擎 (Crawler Engine) | ⬜ 待开始 | Task 1 |
| 4 | AI 智能编排中心 (AI Core) | ⬜ 待开始 | Task 2, 3 |
| 5 | Socket.IO 实时通信层 | ⬜ 待开始 | Task 1 |
| 6 | REST API 层 | ⬜ 待开始 | Task 2, 5 |
| 7 | 前端可视化仪表盘 | ⬜ 待开始 | Task 5, 6 |
| 8 | 集成、测试与部署 | ⬜ 待开始 | Task 3, 4, 7 |
