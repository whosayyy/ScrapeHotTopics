import { useState, useEffect, useRef } from "react";
import type { PipelineProgress, BreakingAlert } from "../../types";

interface HeaderProps {
  progress: PipelineProgress | null;
  alert: BreakingAlert | null;
  onKwClick: () => void;
}

export function Header({ progress, alert, onKwClick }: HeaderProps) {
  const [displayProgress, setDisplayProgress] = useState<PipelineProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 保持进度可见：更新时立即显示，完成后延迟隐藏
  useEffect(() => {
    if (progress) {
      setDisplayProgress(progress);
      if (progress.percent >= 100) {
        timerRef.current = setTimeout(() => setDisplayProgress(null), 3000);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [progress]);

  const isProcessing = displayProgress && displayProgress.percent < 100;
  const hasAlert = alert !== null;

  return (
    <header className="h-14 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-10">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
          R
        </div>
        <h1 className="text-lg font-bold">
          <span className="text-gradient">热点雷达</span>
        </h1>
        <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest border border-gray-800 px-1.5 py-0.5 rounded">
          Live
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* AI 处理进度 — 始终占位 */}
        <div className="min-w-[160px]">
          {displayProgress ? (
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-500 ${
              displayProgress.percent >= 100
                ? "border-green-500/20 bg-green-500/5"
                : "border-cyan-500/20 bg-cyan-500/5"
            }`}>
              {/* 动态图标 */}
              <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                {isProcessing ? (
                  <div className="w-4 h-4 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* 进度条 */}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[10px] font-medium ${
                    displayProgress.percent >= 100 ? "text-green-400" : "text-cyan-400"
                  }`}>
                    {displayProgress.stage}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {Math.round(displayProgress.percent)}%
                  </span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      displayProgress.percent >= 100
                        ? "bg-green-500"
                        : "bg-gradient-to-r from-cyan-500 to-violet-500"
                    }`}
                    style={{ width: `${Math.min(displayProgress.percent, 100)}%` }}
                  />
                </div>
                {displayProgress.message && (
                  <span className="text-[9px] text-gray-600 mt-0.5 truncate">
                    {displayProgress.message}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-gray-700">
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
              </div>
              <span>等待数据...</span>
            </div>
          )}
        </div>

        {/* 突发警报铃铛 */}
        <button
          onClick={() => {}}
          className={`relative text-xs transition-colors border px-2 py-1 rounded font-mono ${
            hasAlert
              ? "text-red-400 border-red-800/50 bg-red-500/10 hover:bg-red-500/20"
              : "text-gray-600 border-gray-800 hover:text-gray-400"
          }`}
          title="突发警报"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {hasAlert && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        {/* 关键词按钮 */}
        <button
          onClick={onKwClick}
          className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors border border-gray-800 hover:border-cyan-800 px-2 py-1 rounded font-mono"
          title="关键词配置 (正则/排除词/地理围栏)"
        >
          KW
        </button>

        {/* 状态指示灯 */}
        <span className={`w-2 h-2 rounded-full ${isProcessing ? "bg-cyan-500 animate-pulse" : "bg-green-500 animate-pulse"}`} title={isProcessing ? "AI 处理中..." : "系统在线"} />
      </div>
    </header>
  );
}
