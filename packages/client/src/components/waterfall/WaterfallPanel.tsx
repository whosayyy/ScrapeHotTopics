import type { HotTopic } from "../../types";

interface WaterfallPanelProps {
  topics: HotTopic[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
}

const CREDIBILITY_COLORS: Record<string, string> = {
  "高可信": "bg-green-500/10 text-green-400 border-green-500/30",
  "待验证": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "谣言": "bg-red-500/10 text-red-400 border-red-500/30",
};

function heatBar(score: number) {
  const pct = Math.min((score / 100) * 100, 100);
  const color =
    score >= 70 ? "from-cyan-500 to-violet-500" :
    score >= 40 ? "from-cyan-500 to-blue-500" :
    "from-gray-600 to-gray-500";
  return (
    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1.5">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WaterfallPanel({ topics, loading, error, onSelect }: WaterfallPanelProps) {
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
    <div className="space-y-2.5">
      {topics.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onSelect(topic.id)}
          className="w-full text-left glass-card p-3.5 hover:border-cyan-500/40 transition-all duration-200 animate-slide-in cursor-pointer"
        >
          {/* 标题 */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-200 leading-snug line-clamp-2">
              {topic.title}
            </h3>
            <span className="text-xs font-mono text-cyan-400 shrink-0">
              {topic.heatScore}
            </span>
          </div>

          {/* 摘要 */}
          {topic.summary && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
              {topic.summary}
            </p>
          )}

          {/* 底部信息 */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CREDIBILITY_COLORS[topic.credibility] ?? "border-gray-700 text-gray-500"}`}>
              {topic.credibility}
            </span>
            {topic.topSource && (
              <span className="text-[10px] text-gray-600 font-mono truncate">
                {topic.topSource}
              </span>
            )}
          </div>

          {heatBar(topic.heatScore)}
        </button>
      ))}
    </div>
  );
}
