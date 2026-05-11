# ScrapeHotTopics — 实时全网热点雷达

AI 驱动的多源热点聚合与实时推送仪表盘。爬虫引擎从 9 个平台抓取热点数据，经由 Deepseek AI 清洗、去重、可信度评分后，通过 Socket.IO 实时推送到前端 Aceternity UI 仪表盘。

## 架构

```
[外部 API / RSS]       ──→  Crawler Engine (9 适配器)  ──→  AI Core (Deepseek)
                                                               │
                                                               ├─ 去重聚合
                                                               ├─ 可信度评分 + 守门员噪音过滤
                                                               ├─ 时间线生成
                                                               └─ 摘要生成
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Prisma (SQLite / PostgreSQL)   ←──  REST API (Express 5)          │
│                                       │                            │
│                                       └──  Socket.IO (3 Namespaces)│
└─────────────────────────────────────────────────────────────────────┘
                                                               │
                                                               ▼
                                          React 19 + Tailwind + Aceternity UI
                                          三栏仪表盘：瀑布流 / 时间轴 / 排行榜
```

## 数据源

| 平台 | 适配器 | 方式 | 需要 API Key |
|------|--------|------|-------------|
| 百度热点 | `baidu.ts` | 页面抓取 | 否 |
| Bilibili | `bilibili.ts` | 页面抓取 | 否 |
| Hacker News | `hackernews.ts` | Firebase API | 否 |
| GitHub Trending | `github-trending.ts` | 页面抓取 | 否 |
| 搜狗微信 | `sogou-wechat.ts` | 页面抓取 | 否 |
| Bing News | `bing.ts` | RSS / 页面 | 否 |
| Reddit | `reddit.ts` | 页面抓取 | 否 |
| Google Trends | `google-trends.ts` | 页面抓取 | 否 |
| **Twitter / X** | `twitter.ts` | **API v2** | **是（需 Bearer Token）** |

> ⚠️ **不足**：Twitter / X 适配器需要 `TWITTER_BEARER_TOKEN` 环境变量，未配置时该源无法抓取。其余平台均为公开页面抓取，开箱即用。

## AI 功能

基于 Deepseek 的 AI 编排流水线：

- **守门员过滤**：自动拦截 ICP 备案、应用下载页、网站导航、乱码等噪音
- **可信度评分**：0-100 数值评分，映射为 高可信 / 待验证 / 谣言
- **热度评分**：0-100，基于争议性、话题性、传播潜力
- **相关性评分**：与核心热点的关联度
- **摘要生成**：50 字以内核心快讯
- **时间线聚合**：同事件多条报道自动聚合

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env packages/server/.env
# 编辑 packages/server/.env，填入 DEEPSEEK_API_KEY

# 3. 初始化数据库
npm run db:push -w packages/server

# 4. 启动后端（端口 3001）
npm run dev -w packages/server

# 5. 新终端，启动前端（端口 5173）
npm run dev -w packages/client
```

打开 `http://localhost:5173` 即可查看仪表盘。

## 环境变量

```env
# AI — Deepseek（必需）
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_MODEL=deepseek-v4-flash

# Twitter（可选，不配置则 Twitter 源不可用）
TWITTER_BEARER_TOKEN=your-token

# Server
PORT=3001
DATABASE_URL="file:./dev.db"
```

## 开发命令

```bash
npm run dev -w packages/server   # 后端开发（tsx watch）
npm run dev -w packages/client   # 前端开发（Vite）
npm run test -w packages/server  # 服务端测试（90 项）
npm run test -w packages/client  # 前端测试（45 项）
npx tsc --noEmit -w packages/server  # 类型检查
npx tsc --noEmit -w packages/client  # 类型检查
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js 18+ |
| 后端 | Express 5, TypeScript 严格模式 |
| 前端 | React 19, Vite, Tailwind CSS, Aceternity UI |
| 数据库 | Prisma (SQLite 开发 / PostgreSQL 生产) |
| 实时通信 | Socket.IO（3 命名空间） |
| AI | Deepseek API（JSON 结构化输出） |
| 爬虫 | Axios + Cheerio |

## API 端点

REST API 通过 `/api` 前缀暴露，支持分页、筛选、排序：

| 路径 | 说明 |
|------|------|
| `GET /api/hot-topics` | 热点列表（分页 + 分类/地区/来源/排序筛选） |
| `GET /api/hot-topics/ranking` | 实时排行榜 |
| `GET /api/hot-topics/alerts` | 突发警报 |
| `GET /api/hot-topics/:id` | 热点详情（含时间线 + 关联新闻） |
| `GET /api/stats` | 系统统计 |
| `GET /api/keywords` | 关键词管理 |

## 项目结构

```
packages/
├── server/
│   ├── prisma/schema.prisma      # 数据模型
│   └── src/
│       ├── crawler/               # 爬虫引擎 + 9 适配器
│       ├── ai-core/               # Deepseek AI 编排流水线
│       ├── socket/                # Socket.IO 实时推送
│       ├── routes/                # REST API 路由
│       └── services/              # 业务逻辑层
├── client/
│   └── src/
│       ├── components/            # UI 组件（三栏布局）
│       ├── hooks/                 # 自定义 Hooks
│       └── services/              # API + Socket.IO 客户端
```

## 已知不足

1. **Twitter 数据源**：需要配置 `TWITTER_BEARER_TOKEN`，未配置时该源不可用
2. **AI 可用性**：依赖 Deepseek API，无有效 key 时降级为无 AI 分析的原始模式
3. **关键词限制**：所有适配器共用同一组关键词，无法为单个平台独立配置
4. **无用户系统**：当前为单用户模式，无多用户认证与权限管理
5. **仅桌面优化**：前端主要针对 1280px+ 大屏设计

## License

MIT
