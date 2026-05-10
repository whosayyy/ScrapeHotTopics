import type { HotTopic, TimelineEvent } from "../../types";

interface TimelinePanelProps {
  topic: HotTopic | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimelinePanel({ topic }: TimelinePanelProps) {
  // 无选中话题 — 占位
  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600">
        <div className="text-4xl mb-3 opacity-30">◈</div>
        <div className="text-sm">点击左侧热点</div>
        <div className="text-xs text-gray-700 mt-1">查看 AI 事件时间轴</div>
      </div>
    );
  }

  const timeline = topic.events ?? [];

  return (
    <div className="space-y-4">
      {/* 话题头部 */}
      <div className="glass-card p-4 cyber-glow">
        <h2 className="text-base font-semibold text-gray-100">{topic.title}</h2>
        {topic.summary && (
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">{topic.summary}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>热度 <span className="text-cyan-400 font-mono">{topic.heatScore}</span></span>
          <span>来源 <span className="text-gray-400">{topic.topSource ?? "—"}</span></span>
          <span>可信度 <span className={topic.credibility === "高可信" ? "text-green-400" : topic.credibility === "谣言" ? "text-red-400" : "text-yellow-400"}>{topic.credibility}</span></span>
        </div>
      </div>

      {/* 时间轴 */}
      <div className="relative">
        {timeline.length > 0 ? (
          <div className="space-y-0">
            {timeline.map((event, idx) => (
              <div key={event.id} className="relative pl-6 pb-4 animate-slide-in" style={{ animationDelay: `${idx * 50}ms` }}>
                {/* 连接线 */}
                <div className="absolute left-[7px] top-2 bottom-0 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />

                {/* 时间点 */}
                <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-cyan-500 bg-gray-950 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>

                {/* 内容 */}
                <div className="glass-card p-3">
                  <time className="text-[10px] text-gray-600 font-mono">{formatTime(event.timestamp)}</time>
                  <h4 className="text-sm font-medium text-gray-200 mt-1">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{event.description}</p>
                  )}
                  {event.sourceUrl && (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-500 hover:text-cyan-400 mt-1.5 inline-block truncate max-w-full"
                    >
                      {event.sourceUrl}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 text-sm">
            该话题暂无时间线数据
          </div>
        )}
      </div>

      {/* 相关新闻 */}
      {topic.newsItems && topic.newsItems.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-800/50">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            相关新闻 ({topic.newsItems.length})
          </h3>
          <div className="space-y-2">
            {topic.newsItems.map((item) => (
              <div key={item.id} className="glass-card p-3 hover:border-cyan-500/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-200 leading-snug">{item.title}</h4>
                  <span className="text-[10px] font-mono text-cyan-500 shrink-0">{item.heat}</span>
                </div>
                {item.content && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">
                    {item.content}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-gray-600 font-mono">{item.sourceId}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-500 hover:text-cyan-400 underline underline-offset-2 truncate"
                  >
                    {item.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
