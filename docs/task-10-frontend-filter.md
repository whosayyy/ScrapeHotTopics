# Task 10: 前端筛选功能 + Aceternity UI 升级

## 完成时间

2026-05-11

## 背景

原筛选栏只有地区+分类两个下拉框，无法满足多维度筛选需求。卡片信息密度低，UI 风格不够突出。

## 完成内容

| 子任务 | 状态 |
|--------|------|
| 10.1 FilterState 扩展 — 新增 source/sort 字段 | ✅ |
| 10.2 后端 findAll 支持 source 过滤 + sort 排序 | ✅ |
| 10.3 API 客户端传递新筛选参数 | ✅ |
| 10.4 Aceternity UI 风格筛选栏 | ✅ |
| 10.5 分类标签组（胶囊按钮，渐变高亮） | ✅ |
| 10.6 来源下拉（百度/Bilibili/HackerNews/GitHub/微信） | ✅ |
| 10.7 排序分段控制器（最新/最热/最可信） | ✅ |
| 10.8 所有测试通过（前后端） | ✅ |

## 修改文件

```
packages/server/src/
├── services/types.ts           # MOD — HotTopicFilterSchema 新增 source/sort
├── services/hot-topic.service.ts  # MOD — findAll 支持 source/sort
└── routes/hot-topic.routes.ts  # MOD — 读取 source/sort 查询参数

packages/client/src/
├── types/index.ts              # MOD — FilterState 新增 source/sort
├── services/api.ts             # MOD — fetchTopics 传递 source/sort
├── hooks/useTopics.ts          # MOD — 筛选变化时自动重新拉取
└── components/waterfall/
    ├── WaterfallPanel.tsx      # REWRITE — Aceternity UI 筛选栏 + 高密度卡片
    └── WaterfallPanel.test.tsx # MOD — 适配新 props
```

## 筛选维度

| 维度 | 组件 | 后端参数 | 选项 |
|------|------|----------|------|
| 分类 | 胶囊标签组 | `?category=` | 科技/财经/政治/社会/娱乐/体育/健康/教育/国际/军事/能源/环境/农业 |
| 地区 | 下拉菜单 | `?region=` | 中国/美国/欧洲/全球/日本/韩国/俄罗斯 |
| 来源 | 下拉菜单 | `?source=` | 百度/Bilibili/HackerNews/GitHub/微信/Twitter/Reddit/Bing |
| 排序 | 分段控制器 | `?sort=` | 最新(createdAt) / 最热(viralityScore) / 最可信(credibilityScore) |

## Aceternity UI 设计语言

- **玻璃态背景**: `bg-black/20 backdrop-blur-sm`
- **极简边框**: `border border-white/5`
- **发光效果**: `shadow-[0_0_20px_rgba(6,182,212,0.08)]`
- **激活态**: 渐变 `from-cyan-500/20 to-blue-500/20` + `text-cyan-300`
- **悬停过渡**: `transition-all duration-300`
- **胶囊按钮**: `rounded-full px-3 py-1.5`
- **下拉框**: `appearance-none bg-black/30 rounded-full`
