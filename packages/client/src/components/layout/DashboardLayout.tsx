import type { ReactNode } from "react";

interface DashboardLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function DashboardLayout({ left, center, right }: DashboardLayoutProps) {
  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">
      {/* 左栏 — 热点瀑布流 */}
      <div className="xl:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1">
          {left}
        </div>
      </div>

      {/* 中栏 — 事件时间轴 */}
      <div className="xl:col-span-5 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1">
          {center}
        </div>
      </div>

      {/* 右栏 — 实时排行榜 */}
      <div className="xl:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {right}
        </div>
      </div>
    </div>
  );
}
