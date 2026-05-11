# Task 11: Bug 修复 — 分类筛选/下拉样式/排行榜跳转/爬虫限制

## 完成时间

2026-05-11

## 修复清单

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| 1 | 分类筛选失效 | `ProcessedEvent` 缺 `category` 字段；管道未传播 AI 分类；`findOrCreateTopic` 中 `?:` 运算符优先级错误 | `types.ts` 新增 → `pipeline.ts` 传播 → `index.ts` 直接引用 |
| 2 | 下拉框样式丑陋 | 原生 `<select>` Windows 渲染系统默认样式 | 自定义 `CustomSelect` 组件（按钮 + 浮层菜单），统一 Aceternity UI 玻璃态 |
| 3 | 排行榜无法点击 | `RankingPanel` 使用 `<div>` 无点击事件 | 改为 `<button>` + 新增 `onSelect` 回调，`App.tsx` 传入 `selectTopic` |
| 4 | 爬虫只返回百度数据 | 数据库 `Deepseek` 正则关键词激活，全局应用到所有适配器 | 已禁用该关键词 |
| 5 | 可信度/热度不显示 | `ProcessedEvent` 缺 `relevanceScore` 字段定义 | 补全类型定义 |
| 6 | 测试类型不匹配 | `sampleHotTopic` 未同步扩展后的 Prisma 字段 | 补全 20+ 字段对齐 schema |

## 修改文件

```
packages/server/src/
├── ai-core/
│   ├── types.ts                         # MOD — ProcessedEvent 新增 category, relevanceScore
│   ├── pipeline.ts                      # MOD — 传播 category 到事件（组+单条）
│   └── index.ts                         # MOD — 修复 category 表达式运算符优先级
├── services/
│   └── hot-topic.service.test.ts        # MOD — 测试补齐必填字段
├── routes/
│   └── routes.test.ts                   # MOD — 测试补齐 include 关联字段
└── test-utils.ts                        # MOD — sampleHotTopic 对齐 Prisma schema

packages/client/src/
├── types/index.ts                       # MOD — FilterState.sort 增加 "heatScore"
├── App.tsx                              # MOD — RankingPanel 传入 onSelect
└── components/
    ├── ranking/RankingPanel.tsx          # MOD — 新增 onSelect 属性 + click 事件
    └── waterfall/WaterfallPanel.tsx     # MOD — 自定义 CustomSelect 替代原生 select
```

## 修改详情

### 1. 分类筛选修复

**根因**：三个环节断裂

- `ProcessedEvent` 类型无 `category` 字段 → AI 分析出分类但无处存放
- `pipeline.ts` 未从 `CredibilityResult.category` 复制到 `ProcessedEvent`
- `findOrCreateTopic` 中 `event.tags[0] ?? event.credibility ? (event as any).category : undefined` 因 `??` 优先级高于 `?:`，始终取 `undefined`

**修复**：
```
ProcessedEvent.category? = CredibilityResult.category
                                   ↓
findOrCreateTopic: category: event.category
```

### 2. 自定义下拉框

原生 `<select>` 在 Windows 上无法统一样式，使用 `CustomSelect` 组件：

```
[全部地区 ▾]          ← glass 按钮
  ├── 全部地区         ← 浮层菜单（bg-gray-900/95 backdrop-blur-md）
  ├── 中国
  ├── 美国
  └── ...
```

### 3. 关键词限制

`syncKeywordsFromDb()` 将数据库活跃关键词应用到全部适配器。`Deepseek` 正则关键词使所有适配器只匹配含 "Deepseek" 的内容，导致其他适配器返回 0 条。

已禁用该关键词，所有适配器恢复正常全量爬取。

## 验证结果

- 服务端测试: 90/90 通过（16 文件）
- 前端测试: 45/45 通过（11 文件）
- TypeScript 编译: 源码零错误（仅预存测试 mock 类型问题）
