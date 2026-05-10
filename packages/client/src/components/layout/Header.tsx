import { useState, useEffect, useRef } from "react";
import type { PipelineProgress } from "../../types";
import { KeywordSettings } from "../keywords/KeywordSettings";

interface HeaderProps {
  progress: PipelineProgress | null;
}

export function Header({ progress }: HeaderProps) {
  const [kwOpen, setKwOpen] = useState(false);
  const [displayProgress, setDisplayProgress] = useState<PipelineProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 保持进度可见：更新时立即显示，完成后延迟隐藏
  useEffect(() => {
    if (progress) {
      setDisplayProgress(progress);
      if (progress.percent >= 100) {
        // 完成后再展示 3 秒后隐藏
        timerRef.current = setTimeout(() => setDisplayProgress(null), 3000);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [progress]);

  const isProcessing = displayProgress && displayProgress.percent < 100;

  return (
    <header className="h-14 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
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
        {/* AI 处理进度 — 增强显示 */}
        {displayProgress && (
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-500 ${
            displayProgress.percent >= 100
              ? "border-green-500/20 bg-green-500/5"
              : "border-cyan-500/20 bg-cyan-500/5"
          }`}>
            {/* 动态图标 */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              {isProcessing ? (
                <div className="w-4 h-4 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* 进度条 */}
            <div className="flex flex-col min-w-[140px]">
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
                <span className="text-[9px] text-gray-600 mt-0.5 truncate max-w-[180px]">
                  {displayProgress.message}
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setKwOpen(true)}
          className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors border border-gray-800 hover:border-cyan-800 px-2 py-1 rounded font-mono"
          title="关键词配置 (正则/排除词/地理围栏)"
        >
          KW
        </button>
        <span className={`w-2 h-2 rounded-full ${isProcessing ? "bg-cyan-500 animate-pulse" : "bg-green-500 animate-pulse"}`} title={isProcessing ? "AI 处理中..." : "系统在线"} />
      </div>

      {kwOpen && <KeywordSettings />}
    </header>
  );
}
