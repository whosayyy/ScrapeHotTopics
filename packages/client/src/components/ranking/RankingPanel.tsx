import type { RankingEntry } from "../../types";

interface RankingPanelProps {
  entries: RankingEntry[];
  loading: boolean;
  onSelect?: (id: string) => void;
}

function changeIcon(change: "up" | "down" | "new") {
  switch (change) {
    case "up":
      return <span className="text-green-500 text-[10px]">▲</span>;
    case "down":
      return <span className="text-red-500 text-[10px]">▼</span>;
    case "new":
      return <span className="text-cyan-500 text-[10px]">✦</span>;
  }
}

const TOP3_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export function RankingPanel({ entries, loading, onSelect }: RankingPanelProps) {
  return (
    <div className="glass-card p-3">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800/50">
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          实时排行
        </h2>
        <span className="text-[10px] text-gray-600 font-mono">{entries.length} 条</span>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-20 text-gray-600 text-xs">
          <div className="w-3 h-3 border border-cyan-500 border-t-transparent rounded-full animate-spin mr-2" />
          加载中...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-6 text-gray-700 text-xs">暂无数据</div>
      ) : (
        <div className="space-y-0.5">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect?.(entry.id)}
              className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/40 transition-colors animate-fade-in text-left"
            >
              {/* 排名 */}
              <span className={`w-5 text-center text-xs font-mono font-bold ${entry.rank <= 3 ? TOP3_COLORS[entry.rank - 1] ?? "text-gray-500" : "text-gray-600"}`}>
                {entry.rank}
              </span>

              {/* 标题 */}
              <span className="flex-1 text-xs text-gray-300 truncate">
                {entry.title}
              </span>

              {/* 变化 */}
              <span className="w-3 flex justify-center">{changeIcon(entry.change)}</span>

              {/* 热度 */}
              <span className="text-xs font-mono text-cyan-400 w-8 text-right">
                {entry.heatScore}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
