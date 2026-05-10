import { useState } from "react";
import type { PipelineProgress } from "../../types";
import { KeywordSettings } from "../keywords/KeywordSettings";

interface HeaderProps {
  progress: PipelineProgress | null;
}

export function Header({ progress }: HeaderProps) {
  const [kwOpen, setKwOpen] = useState(false);

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
        {progress && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress.percent, 100)}%` }}
              />
            </div>
            <span className="font-mono">{progress.stage}</span>
          </div>
        )}
        <button
          onClick={() => setKwOpen(true)}
          className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors border border-gray-800 hover:border-cyan-800 px-2 py-1 rounded font-mono"
          title="关键词配置 (正则/排除词/地理围栏)"
        >
          KW
        </button>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="系统在线" />
      </div>

      {kwOpen && <KeywordSettings />}
    </header>
  );
}
