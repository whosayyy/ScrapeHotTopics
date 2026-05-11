# Task 06: REST API 层 — 完成报告

## 完成时间

2026-05-10

## 完成内容

| 子任务 | 状态 |
|--------|------|
| 6.1 路由聚合入口 + 统一错误处理中间件 | ✅ |
| 6.2 HotTopic REST 路由（CRUD + ranking + alerts + 搜索 + 嵌套资源） | ✅ |
| 6.3 Event REST 路由（CRUD） | ✅ |
| 6.4 NewsItem REST 路由（bySource + unlinked + byTopic） | ✅ |
| 6.5 KeywordConfig REST 路由（CRUD + toggle） | ✅ |
| 6.6 UserSettings REST 路由（get / update / reset） | ✅ |
| 6.7 Stats REST 路由（系统统计） | ✅ |
| 6.8 服务端集成 + Zod 校验 + 错误分类处理 | ✅ |

## 新增/修改文件

```
packages/server/src/
├── index.ts                                # MOD — 挂载 REST 路由 + 错误中间件
└── routes/                                 # NEW — REST API 层
    ├── index.ts                            # Router 聚合 + errorHandler 中间件
    ├── hot-topic.routes.ts                 # GET/POST/PUT/DELETE + /ranking + /alerts
    ├── event.routes.ts                     # GET/POST/PUT/DELETE
    ├── news-item.routes.ts                 # GET bySource / unlinked / byTopic
    ├── keyword-config.routes.ts            # GET/POST/PUT/DELETE + /toggle
    ├── user-settings.routes.ts             # GET / PUT / POST reset
    └── stats.routes.ts                     # GET 系统统计
```

## 完整 API 端点列表

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务器状态 + AI 配置状态 |

### 系统统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 热点话题数、警报数、排行榜、警报列表 |

### Hot Topics (`/api/hot-topics`)

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/` | 分页列表 | `?category=&credibility=&isAlert=&search=&source=&sort=&page=&pageSize=` |
| GET | `/ranking` | 排行榜 | `?limit=&sortBy=` |
| GET | `/alerts` | 警报列表 | — |
| GET | `/:id` | 详情（含 events + newsItems） | — |
| POST | `/` | 创建 | body: `CreateHotTopicInput` |
| PUT | `/:id` | 更新 | body: `UpdateHotTopicInput` |
| DELETE | `/:id` | 删除 | — |
| PATCH | `/:id/alert` | 切换警报标记 | body: `{ isAlert: boolean }` |
| GET | `/:id/events` | 嵌套：话题的时间线 | — |
| GET | `/:id/news-items` | 嵌套：话题关联新闻 | `?limit=` |

### Events (`/api/events`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/:id` | 事件详情 |
| POST | `/` | 创建（含 hotTopicId 存在性校验） |
| PUT | `/:id` | 更新 |
| DELETE | `/:id` | 删除 |

### News Items (`/api/news-items`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/source/:sourceId` | 按数据源查询 |
| GET | `/unlinked` | 未关联话题的游离条目 |
| GET | `/:id` | 单条详情 |

### Keywords (`/api/keywords`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 列表（可过滤活跃） |
| GET | `/:id` | 详情 |
| POST | `/` | 创建（含唯一性校验） |
| PUT | `/:id` | 更新 |
| PATCH | `/:id/toggle` | 切换激活状态 |
| DELETE | `/:id` | 删除 |

### Settings (`/api/settings`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取设置（惰性创建默认） |
| PUT | `/` | 更新设置 |
| POST | `/reset` | 重置默认值 |

## 错误处理中间件

| 错误类型 | HTTP 状态码 | 说明 |
|----------|-------------|------|
| `AppError` | 自定义 | 应用层错误基类 |
| `NotFoundError` | 404 | 资源不存在 |
| `ConflictError` | 409 | 唯一约束冲突 |
| `ZodError` | 400 | 请求体校验失败（含 details 字段） |
| Prisma P2002 | 409 | 数据库唯一约束冲突 |
| Prisma P2025 | 404 | 数据库记录不存在 |
| 未捕获异常 | 500 | 兜底错误 |

## 设计要点

- **Express 5 原生异步支持**：所有路由使用 `async` 处理，Express 5 自动捕获异步错误并转发到错误中间件
- **静态路由优先注册**：`/ranking`、`/alerts`、`/source/:sourceId`、`/unlinked` 在 `/:id` 之前注册，避免参数冲突
- **嵌套资源**：`/api/hot-topics/:id/events` 和 `/api/hot-topics/:id/news-items` 在 hot-topic 路由中直接委托对应 Service
- **Zod 边界校验**：所有输入在 Service 层通过 Zod Schema 校验，无效请求返回 400 + 详细错误信息
- **Prisma 错误转换**：已知 Prisma 错误码（P2002/P2025）自动映射到对应 HTTP 状态码

## 验证结果

- **TypeScript 编译**: 服务端零错误通过
- **启动测试**: 所有端点正常响应
- **错误处理**: 404/409/400/500 各类异常正常返回
- **爬虫数据流**: 通过 API 可查询到爬虫自动创建的热点话题

## 项目整体进度

| # | 任务 | 状态 | 依赖 |
|---|------|------|------|
| 1 | 项目脚手架与基础配置 | ✅ 完成 | — |
| 2 | 数据库层 (Prisma Service) | ✅ 完成 | Task 1 |
| 3 | 爬虫引擎 (Crawler Engine) | ✅ 完成 | Task 1 |
| 4 | AI 智能编排中心 (AI Core) | ✅ 完成 | Task 2, 3 |
| 5 | Socket.IO 实时通信层 | ✅ 完成 | Task 1 |
| **6** | **REST API 层** | **✅ 完成** | **Task 2, 5** |
| 7 | 前端可视化仪表盘 | ⬜ 待开始 | Task 5, 6 |
| 8 | 集成、测试与部署 | ⬜ 待开始 | Task 3, 4, 7 |