# Task 03: 爬虫引擎 (Crawler Engine) — 完成报告

## 完成时间

2026-05-10

## 完成内容

| 子任务 | 状态 |
|--------|------|
| 3.1 核心类型定义（types.ts） | ✅ |
| 3.2 工具模块（headers / http / filter） | ✅ |
| 3.3 CrawlerEngine 调度器 | ✅ |
| 3.4 Bilibili 适配器 | ✅ |
| 3.5 HackerNews 适配器 | ✅ |
| 3.6 GitHub Trending 适配器 | ✅ |
| 3.7 Bing News 适配器 | ✅ |
| 3.8 搜狗微信适配器 | ✅ |
| 3.9 Reddit 适配器 | ✅ |
| 3.10 Google Trends 适配器 | ✅ |
| 3.11 Twitter/X 适配器 | ✅ |
| 3.12 引擎入口 + 服务端集成 | ✅ |

## 新增/修改文件

```
packages/server/src/
├── index.ts                                # MOD — 集成爬虫引擎启动/停止
└── crawler/
    ├── types.ts                            # NEW — CrawlerAdapter, CrawlerKeywords, RawNews
    ├── engine.ts                           # NEW — CrawlerEngine 调度类
    ├── index.ts                            # NEW — 引擎创建入口 (8 源注册 + onData 持久化)
    ├── utils/
    │   ├── headers.ts                      # NEW — 随机请求头生成
    │   ├── http.ts                         # NEW — Axios 工厂 (重试 + 指数退避)
    │   └── filter.ts                       # NEW — 关键词匹配工具
    └── adapters/
        ├── bilibili.ts                     # NEW — B站热门 API
        ├── hackernews.ts                   # NEW — HackerNews Firebase API
        ├── github-trending.ts              # NEW — GitHub Trending (cheerio)
        ├── bing.ts                         # NEW — Bing News 搜索 (cheerio)
        ├── sogou-wechat.ts                 # NEW — 搜狗微信搜索 (cheerio)
        ├── reddit.ts                       # NEW — Reddit JSON API
        ├── google-trends.ts                # NEW — Google Trends RSS
        └── twitter.ts                      # NEW — Twitter API v2
```

## 设计概览

### 架构

```
[CrawlerEngine] ── 轮询调度 ──→ [Adapter.fetch()]
       │                                      │
       │  onData(items)                       ▼
       │                              [外部 API / HTML]
       ▼
[newsItemService.upsertMany()]
       │
       ▼
[Prisma Database]
```

### 适配器矩阵

| 适配器 | 数据源 | 方式 | 默认间隔 | 需要 Token |
|--------|--------|------|----------|-----------|
| Bilibili | `api.bilibili.com` | REST API | 3min | 否 |
| HackerNews | `hacker-news.firebaseio.com` | Firebase API | 5min | 否 |
| GitHub Trending | `github.com/trending` | Cheerio 爬取 | 5min | 否 |
| Bing News | `bing.com/news/search` | Cheerio 爬取 | 5min | 否 |
| 搜狗微信 | `weixin.sogou.com` | Cheerio 爬取 | 5min | 否 |
| Reddit | `reddit.com/r/all/hot.json` | JSON API | 5min | 否 |
| Google Trends | `trends.google.com/trending/rss` | RSS 解析 | 5min | 否 |
| Twitter/X | `api.twitter.com/2` | REST API | 5min | `TWITTER_BEARER_TOKEN` |

### 关键设计

- **统一接口**：每个适配器实现 `CrawlerAdapter` 接口，引擎统一调度
- **指数退避**：HTTP 客户端自动重试（可配置次数），失败请求以 `1s, 2s, 4s...` 退避 + 随机抖动
- **请求头伪装**：每次请求随机选择 User-Agent，降低封禁概率
- **失败隔离**：`Promise.allSettled` 适配器内部使用，引擎级 try-catch 确保单源失败不影响其他
- **幂等写入**：`onData` 回调调用 `newsItemService.upsertMany()`，按 `sourceId + externalId` 去重
- **优雅关闭**：`SIGINT/SIGTERM` 时先 `engine.stop()` 清除所有定时器

## 验证结果

- **TypeScript 编译**: 服务端 + 客户端均零错误通过
- **服务器启动**: 8 个适配器全部注册成功，pino 日志正常输出

## 项目整体进度

| # | 任务 | 状态 | 依赖 |
|---|------|------|------|
| 1 | 项目脚手架与基础配置 | ✅ 完成 | — |
| 2 | 数据库层 (Prisma Service) | ✅ 完成 | Task 1 |
| **3** | **爬虫引擎 (Crawler Engine)** | **✅ 完成** | **Task 1** |
| 4 | AI 智能编排中心 (AI Core) | ⬜ 待开始 | Task 2, 3 |
| 5 | Socket.IO 实时通信层 | ⬜ 待开始 | Task 1 |
| 6 | REST API 层 | ⬜ 待开始 | Task 2, 5 |
| 7 | 前端可视化仪表盘 | ⬜ 待开始 | Task 5, 6 |
| 8 | 集成、测试与部署 | ⬜ 待开始 | Task 3, 4, 7 |
