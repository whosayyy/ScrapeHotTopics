# Task 09: AI 提示词升级 — 守门员策略 + 结构化分析

## 完成时间

2026-05-11

## 背景

原 `credibility` 提示词只要求简单分析可信度和分类，无法有效过滤大量噪音内容（ICP备案号、应用下载页、网站导航等），且缺失相关性评分和摘要字段。

## 完成内容

| 子任务 | 状态 |
|--------|------|
| 9.1 重写 AI 系统提示词 — 严格守门员策略 | ✅ |
| 9.2 噪音拦截规则细化 — ICP备案/下载页/导航/乱码 | ✅ |
| 9.3 结构化提取新增 relevanceScore + summary | ✅ |
| 9.4 解析逻辑兼容新旧两种输出格式 | ✅ |
| 9.5 schema.prisma 新增 viralityScore + relevanceScore | ✅ |
| 9.6 Zod schema 新增对应字段验证 | ✅ |
| 9.7 Pipeline 传播新字段到 ProcessedEvent | ✅ |
| 9.8 Fallback 降级输出新字段默认值 | ✅ |
| 9.9 Socket 推送扩展新字段 | ✅ |

## 修改文件

```
packages/server/src/ai-core/
├── prompts/credibility.ts     # REWRITE — 守门员策略提示词
├── credibility.ts             # MOD — 解析新字段，兼容旧格式
├── types.ts                   # MOD — CredibilityResult 新增 relevanceScore/summary
├── pipeline.ts                # MOD — 传播 relevanceScore
├── fallback.ts                # MOD — 降级输出新字段
└── index.ts                   # MOD — 创建/更新 HotTopic 时写入新字段

packages/server/prisma/
└── schema.prisma              # MOD — 新增 viralityScore/relevanceScore

packages/server/src/services/
└── types.ts                   # MOD — Zod schema 新增字段

packages/server/src/routes/
└── hot-topic.routes.ts        # MOD — 新增 source/sort 查询参数
```

## 守门员 Prompt 策略

### 噪音拦截规则（最高优先级）

1. **纯系统信息**：ICP备案号、互联网宗教信息服务许可证、京公网安备、版权声明等
2. **应用商店/下载页**：iPhone/Android 版下载、点击下载 APP、扫码下载
3. **网站导航/页脚**：关于我们、联系方式、Copyright、友情链接、帮助中心
4. **无意义内容**：纯乱码、重复字符、无实际语义标签罗列、纯表情符号

### 结构化提取字段

| 字段 | 类型 | 范围 | 说明 |
|------|------|------|------|
| `category` | string | 科技/财经/社会/... | 事件分类 |
| `region` | string | 中国/美国/全球/... | 涉及地区 |
| `credibility_score` | number | 0-100 | 可信度评分 |
| `virality_score` | number | 0-100 | 爆发力/热度 |
| `relevance_score` | number | 0-100 | 与核心热点相关性 |
| `reasoning` | string | — | AI 分析理由 |
| `summary` | string | ≤50 字 | 核心摘要 |

### 可信度标签推导

新 prompt 不再直接输出 `credibility` 字符串标签，改为数值评分，由代码推导：

| 评分范围 | 标签 |
|----------|------|
| ≥ 70 | 高可信 |
| 40-69 | 待验证 |
| < 40 | 谣言 |

## 测试验证

- 服务端测试: 90/90 通过
- 前端测试: 45/45 通过
- 爬虫适配器诊断: 5/5 适配器正常返回数据
