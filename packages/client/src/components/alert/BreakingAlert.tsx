import { useEffect } from "react";
import type { BreakingAlert } from "../../types";

interface BreakingAlertProps {
  alert: BreakingAlert | null;
  onDismiss: () => void;
}

export function BreakingAlertBanner({ alert, onDismiss }: BreakingAlertProps) {
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [alert, onDismiss]);

  if (!alert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in max-w-md w-full px-4">
      <div className="relative overflow-hidden rounded-xl border border-red-500/40 bg-gray-950/95 backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.15)]">
        {/* 顶部条纹 */}
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-red-400 text-lg">!</span>
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
                  突发警报
                </span>
                <span className="text-[10px] text-gray-600 font-mono">{alert.source}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-100 mt-0.5 leading-snug">
                {alert.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                {alert.summary}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-mono text-red-400">
                  热度 {alert.heatScore}
                </span>
              </div>
            </div>

            {/* 关闭 */}
            <button
              onClick={onDismiss}
              className="text-gray-600 hover:text-gray-300 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
