import { useEffect } from "react";
import { Header } from "./components/layout";
import { DashboardLayout } from "./components/layout";
import { WaterfallPanel } from "./components/waterfall";
import { TimelinePanel } from "./components/timeline";
import { RankingPanel } from "./components/ranking";
import { BreakingAlertBanner } from "./components/alert";
import { useTopics } from "./hooks/useTopics";
import { useRanking } from "./hooks/useRanking";
import { useAlerts } from "./hooks/useAlerts";

function App() {
  const { topics, loading: topicsLoading, error: topicsError, selectedTopic, selectTopic, progress } = useTopics();
  const { entries, loading: rankingLoading } = useRanking();
  const { alert, dismiss } = useAlerts();

  return (
    <div className="h-dvh flex flex-col bg-cyber-bg">
      {/* 顶部标题栏 */}
      <Header progress={progress} />

      {/* 三栏仪表盘 */}
      <DashboardLayout
        left={
          <WaterfallPanel
            topics={topics}
            loading={topicsLoading}
            error={topicsError}
            onSelect={selectTopic}
          />
        }
        center={
          <TimelinePanel topic={selectedTopic} />
        }
        right={
          <RankingPanel entries={entries} loading={rankingLoading} />
        }
      />

      {/* 突发警报弹窗 */}
      <BreakingAlertBanner alert={alert} onDismiss={dismiss} />
    </div>
  );
}

export default App;
