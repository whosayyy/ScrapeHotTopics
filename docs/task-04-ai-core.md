# Task 04: AI 智能编排中心 (AI Core) — 完成报告

## 完成时间

2026-05-10

## 完成内容

| 子任务 | 状态 |
|--------|------|
| 4.1 类型定义与配置 (types.ts / config.ts) | ✅ |
| 4.2 Deepseek API 客户端封装 (deepseek.ts) | ✅ |
| 4.3 Prompt 模板 (prompts/*.ts) | ✅ |
| 4.4 真假识别模块 (credibility.ts) | ✅ |
| 4.5 事件时间线模块 (timeline.ts) | ✅ |
| 4.6 摘要生成模块 (summary.ts) | ✅ |
| 4.7 去重聚合模块 (dedup.ts) | ✅ |
| 4.8 AI 编排流水线 (pipeline.ts) | ✅ |
| 4.9 流式输出处理 (stream-handler.ts) | ✅ |
| 4.10 异常降级方案 (fallback.ts) | ✅ |
| 4.11 AI Core 入口 + 数据持久化 (index.ts) | ✅ |
| 4.12 爬虫引擎集成 | ✅ |
| 4.13 服务端集成 | ✅ |

## 新增/修改文件

```
packages/server/src/
├── index.ts                                    # MOD — 健康检查增加 AI 状态
├── crawler/
│   └── index.ts                                # MOD — onData 改走 AI Core
└── ai-core/                                    # NEW — AI 智能编排中心
    ├── index.ts                                # 入口：接收爬虫数据 → 清洗 → 持久化 → 推送事件
    ├── types.ts                                # ProcessedEvent, TimelineItem, CredibilityResult
    ├── config.ts                               # AI_CONFIG (模型/超时/批大小/阈值)
    ├── deepseek.ts                             # DeepseekClient (chatComplete + chatCompleteStream)
    ├── deepseek.ts                             # DeepseekError 自定义异常
    ├── prompts/
    │   ├── credibility.ts                      # 真假识别 system prompt
    │   ├── timeline.ts                         # 时间线生成 system prompt
    │   ├── summary.ts                          # 摘要生成 system prompt
    │   └── dedup.ts                            # 去重聚合 system prompt
    ├── credibility.ts                          # analyzeCredibility()
    ├── timeline.ts                             # generateTimeline()
    ├── summary.ts                              # generateSummary()
    ├── dedup.ts                                # dedupNews()
    ├── pipeline.ts                             # runPipeline() — 完整流水线编排
    ├── stream-handler.ts                       # streamAIResponse() — 流式输出
    └── fallback.ts                             # fallbackToRaw() — 终极降级
```

## 设计概览

### 架构

```
[CrawlerEngine] ── RawNews ──→ [AI Core Entry]
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                     [去重聚合]  [可信度分析]  [时间线/摘要]
                          │          │          │
                          └──────────┼──────────┘
                                     ▼
                              [ProcessedEvent[]]
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                     [HotTopic]  [Event]   [NewsItem]
                       Service   Service    Service
                          │          │          │
                          └──────────┼──────────┘
                                     ▼
                              [Prisma DB]
                                     │
                                     ▼
                            [EventEmitter]
                           (供 Socket.IO 消费)
```

### 核心设计决策

| 决策 | 说明 |
|------|------|
| **模块化流水线** | 4 个独立步骤（dedup → credibility → timeline → summary），可独立调优和降级 |
| **Promise.allSettled** | 所有并发 AI 调用使用 allSettled 而非 all，单条失败不影响其他 |
| **异常降级** | 每个步骤都有 try-catch + 降级逻辑，AI 完全不可用时走 `fallbackToRaw` |
| **先持久化再 AI** | 原始数据先入库再跑 AI，确保数据不丢失 |
| **事件总线** | `aiCoreEvents` EventEmitter 供 Socket.IO (Task 05) 订阅 |
| **标题去重** | 创建 HotTopic 前按标题相似度（词重叠率）匹配已有话题，避免重复创建 |

### AI 处理流

1. **去重聚合** — 调用 Deepseek 将多条新闻按事件分组，输出 groups + unmatched
2. **可信度分析** — 每条新闻并发调用 Deepseek 分析可信度（高可信/待验证/谣言）
3. **时间线生成** — 每组聚合新闻调用 Deepseek 生成事件时间轴
4. **摘要生成** — 每个事件生成 50 字以内快讯摘要

### 异常降级矩阵

| 异常场景 | 降级策略 |
|----------|----------|
| Deepseek API 超时 | 抛出 DeepseekError，对应模块返回降级默认值 |
| API 返回 429（限流） | 指数退避（由 http.ts 处理） |
| JSON 解析失败 | 使用兜底默认值（可信度→待验证，热度→0） |
| 全部 API 不可用 | pipeline 抛出异常 → processIncomingData 调用 fallbackToRaw |
| 单批次去重失败 | 该批次全部标记为 unmatched，继续处理其他批次 |

### EventEmitter 事件列表（供 Task 05 Socket.IO 对接）

| 事件名 | 载荷 | 触发条件 |
|--------|------|----------|
| `hot:new` | HotTopicPayload | 每个处理完成的事件 |
| `breaking:alert` | BreakingAlertPayload | heatScore >= 80 且 credibility === "高可信" |
| `ranking:update` | RankingUpdatePayload | 每次 pipeline 完成 |
| `pipeline:progress` | { stage, percent } | 流水线各步骤 |

## 验证结果

- **TypeScript 编译**: 服务端零错误通过
- **模块导入链**: deepseek → dedup/credibility/timeline/summary → pipeline → index → crawler/index → server/index

## 项目整体进度

| # | 任务 | 状态 | 依赖 |
|---|------|------|------|
| 1 | 项目脚手架与基础配置 | ✅ 完成 | — |
| 2 | 数据库层 (Prisma Service) | ✅ 完成 | Task 1 |
| 3 | 爬虫引擎 (Crawler Engine) | ✅ 完成 | Task 1 |
| **4** | **AI 智能编排中心 (AI Core)** | **✅ 完成** | **Task 2, 3** |
| 5 | Socket.IO 实时通信层 | ⬜ 待开始 | Task 1 |
| 6 | REST API 层 | ⬜ 待开始 | Task 2, 5 |
| 7 | 前端可视化仪表盘 | ⬜ 待开始 | Task 5, 6 |
| 8 | 集成、测试与部署 | ⬜ 待开始 | Task 3, 4, 7 |
