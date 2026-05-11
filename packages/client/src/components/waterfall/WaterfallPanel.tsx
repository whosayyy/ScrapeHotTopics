import { useState } from "react";
import type { HotTopic, FilterState } from "../../types";

interface WaterfallPanelProps {
  topics: HotTopic[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

const CATEGORIES = ["全部", "科技", "财经", "政治", "社会", "娱乐", "体育", "健康", "教育", "国际", "军事", "能源", "环境", "农业"];
const REGIONS = ["全部", "中国", "美国", "欧洲", "全球", "日本", "韩国", "俄罗斯"];
const SOURCES = ["全部", "百度", "Bilibili", "Hacker News", "GitHub", "微信", "Twitter", "Reddit", "Bing"];
const SORT_OPTIONS: { value: FilterState["sort"]; label: string }[] = [
  { value: "createdAt", label: "最新" },
  { value: "viralityScore", label: "最热" },
  { value: "credibilityScore", label: "最可信" },
];

// ── 平台图标映射 ──

const PLATFORM_DEFAULT_ICON = { label: "◎", bg: "#1a1a2e", fg: "#6b7280" } as const;

function PlatformIcon({ sourceId, platform }: { sourceId?: string | null; platform?: string | null }) {
  const id = (platform ?? sourceId ?? "").toLowerCase();
  const icon = PLATFORM_ICONS[id] ?? PLATFORM_DEFAULT_ICON;
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0"
      style={{ background: icon.bg, color: icon.fg }}
    >
      {icon.label}
    </span>
  );
}

const PLATFORM_ICONS: Record<string, { label: string; bg: string; fg: string }> = {
  twitter:         { label: "𝕏", bg: "#1a1a2e", fg: "#e2e8f0" },
  bilibili:        { label: "B", bg: "#1a1a2e", fg: "#60a5fa" },
  "github-trending": { label: "G", bg: "#1a1a2e", fg: "#e2e8f0" },
  hackernews:      { label: "Y", bg: "#1a1a2e", fg: "#fb923c" },
  baidu:           { label: "百", bg: "#1e3a5f", fg: "#60a5fa" },
  bing:            { label: "B", bg: "#1e3a5f", fg: "#34d399" },
  "sogou-wechat":  { label: "微", bg: "#1a3a2a", fg: "#34d399" },
  reddit:          { label: "R", bg: "#3a1a1a", fg: "#f87171" },
  "google-trends": { label: "G", bg: "#1a2a1a", fg: "#fbbf24" },
};

// ── 评分徽章 ──

function ScoreBadge({ label, score, colors }: { label: string; score: number | undefined | null; colors: Record<string, string> }) {
  const s = score ?? 0;
  const range = s >= 70 ? "high" : s >= 40 ? "mid" : "low";
  const c = colors[range]!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c}`}>
      <span className="opacity-70">{label}</span>
      <span>{s >= 70 ? "高" : s >= 40 ? "中" : "低"} {s}</span>
    </span>
  );
}

const RELEVANCE_COLORS = { high: "bg-blue-500/15 text-blue-400", mid: "bg-purple-500/15 text-purple-400", low: "bg-gray-500/15 text-gray-400" };
const CREDIBILITY_COLORS = { high: "bg-green-500/15 text-green-400", mid: "bg-yellow-500/15 text-yellow-400", low: "bg-red-500/15 text-red-400" };
const VIRALITY_COLORS  = { high: "bg-red-500/15 text-red-400",   mid: "bg-orange-500/15 text-orange-400", low: "bg-gray-500/15 text-gray-400" };

// ── 工具函数 ──

function formatTime(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h前`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Aceternity UI 风格的筛选栏 ──

function FilterBar({ filter, onChange }: { filter: FilterState; onChange: (f: FilterState) => void }) {
  return (
    <div className="mb-4 space-y-3">
      {/* 第一行：分类标签组 */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => {
            const active = filter.category === cat || (cat === "全部" && !filter.category);
            return (
              <button
                key={cat}
                onClick={() => onChange({ ...filter, category: cat === "全部" ? "" : cat })}
                className={`
                  relative px-3 py-1.5 text-[11px] font-medium rounded-full transition-all duration-300
                  ${active
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-black/20 text-gray-500 border border-white/5 hover:border-white/20 hover:text-gray-300"
                  }
                `}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-sm" />
                )}
                <span className="relative z-10">{cat === "全部" ? "全部分类" : cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 第二行：地区 + 来源 + 排序 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 地区下拉 */}
        <div className="relative">
          <select
            value={filter.region}
            onChange={(e) => onChange({ ...filter, region: e.target.value })}
            className="appearance-none bg-black/30 text-gray-300 text-[11px] border border-white/10 rounded-full px-3 py-1.5 pr-7 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all cursor-pointer"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r === "全部" ? "" : r}>{r === "全部" ? "🌐 全部地区" : r}</option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-[10px]">▾</span>
        </div>

        {/* 来源下拉 */}
        <div className="relative">
          <select
            value={filter.source}
            onChange={(e) => onChange({ ...filter, source: e.target.value })}
            className="appearance-none bg-black/30 text-gray-300 text-[11px] border border-white/10 rounded-full px-3 py-1.5 pr-7 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all cursor-pointer"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s === "全部" ? "" : s}>{s === "全部" ? "📡 全部来源" : s}</option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-[10px]">▾</span>
        </div>

        {/* 排序分段控制器 */}
        <div className="flex items-center bg-black/20 border border-white/5 rounded-full overflow-hidden">
          {SORT_OPTIONS.map((opt) => {
            const active = filter.sort === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filter, sort: opt.value })}
                className={`
                  relative px-3 py-1.5 text-[11px] font-medium transition-all duration-300
                  ${active
                    ? "text-cyan-300 bg-gradient-to-r from-cyan-500/15 to-blue-500/15"
                    : "text-gray-500 hover:text-gray-300"
                  }
                `}
              >
                {active && (
                  <span className="absolute inset-0 shadow-[0_0_8px_rgba(6,182,212,0.1)]" />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CollapsiblePanel({ title, content, defaultOpen }: { title: string; content: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (!content) return null;

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-gray-500 hover:text-gray-300 bg-white/[0.02] transition-colors"
      >
        <span>{title}</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-3 py-2 text-[11px] text-gray-500 leading-relaxed bg-black/5 max-h-40 overflow-y-auto whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

// ── 主组件 ──

export function WaterfallPanel({ topics, loading, error, onSelect, filter, onFilterChange }: WaterfallPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        <div className="w-4 h-4 border border-cyan-500 border-t-transparent rounded-full animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-sm p-4 text-center">{error}</div>;
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-600">
        <div className="text-3xl mb-2">📡</div>
        <div className="text-sm">等待热点数据...</div>
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mt-3" />
      </div>
    );
  }

  return (
    <div>
      <FilterBar filter={filter} onChange={onFilterChange} />
      <div className="space-y-2.5">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── 热点卡片 ──

function TopicCard({ topic, onSelect }: { topic: HotTopic; onSelect: (id: string) => void }) {
  const relevance = topic.relevanceScore ?? 0;
  const virality = topic.virality ?? topic.viralityScore ?? 0;
  const credibilityScore = topic.credibilityScore ?? 0;

  return (
    <button
      onClick={() => onSelect(topic.id)}
      className="w-full text-left relative group bg-black/20 backdrop-blur-sm border border-white/5 rounded-xl p-0 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.08)] transition-all duration-300 animate-slide-in cursor-pointer overflow-hidden"
    >
      {/* 顶部发光线条 */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* ── Header: 平台图标 + 分类 || 时间 ── */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
        <div className="flex items-center gap-2">
          <PlatformIcon sourceId={topic.topSource} platform={topic.platform} />
          {topic.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 leading-none">
              {topic.category}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-600 shrink-0">
          {formatTime(topic.publishTime ?? topic.createdAt)}
        </span>
      </div>

      {/* ── Body: 标题 + 摘要 ── */}
      <div className="px-3.5 pb-1.5">
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
          {topic.title}
        </h3>
        {topic.summary && (
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
            {topic.summary}
          </p>
        )}
      </div>

      {/* ── Metrics Bar: 相关性 / 可信度 / 热度 ── */}
      <div className="flex items-center gap-2 px-3.5 pb-2.5">
        <ScoreBadge label="相关" score={relevance} colors={RELEVANCE_COLORS} />
        <ScoreBadge label="可信" score={credibilityScore} colors={CREDIBILITY_COLORS} />
        <ScoreBadge label="热度" score={virality} colors={VIRALITY_COLORS} />
      </div>

      {/* ── Author ── */}
      {(topic.authorName || topic.authorHandle) && (
        <div className="flex items-center gap-2 px-3.5 pb-2.5">
          {topic.authorAvatar ? (
            <img src={topic.authorAvatar} alt="" className="w-5 h-5 rounded-full border border-gray-700 shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
              {(topic.authorName ?? topic.authorHandle)?.[0] ?? "?"}
            </div>
          )}
          <span className="text-[11px] text-gray-300 truncate max-w-[140px]">
            {topic.authorName ?? topic.authorHandle}
          </span>
          {topic.isVerified && (
            <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          )}
        </div>
      )}

      {/* ── Accordion ── */}
      <div className="px-3.5 pb-3 flex flex-col gap-1.5">
        {topic.aiReasoning && (
          <CollapsiblePanel title="AI 分析理由" content={topic.aiReasoning} />
        )}
        {topic.rawContent && (
          <CollapsiblePanel title="原始内容" content={topic.rawContent} />
        )}
      </div>
    </button>
  );
}
