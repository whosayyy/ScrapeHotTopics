import { useState, useEffect, useCallback } from "react";
import { fetchRanking } from "../services/api";
import { onRankingUpdate } from "../services/socket";
import type { HotTopic, RankingEntry } from "../types";

interface UseRankingReturn {
  entries: RankingEntry[];
  topics: HotTopic[];
  loading: boolean;
  error: string | null;
}

export function useRanking(): UseRankingReturn {
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRanking(20)
      .then((data) => {
        setTopics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const cleanup = onRankingUpdate((data) => {
      setEntries(data.list);
    });
    return cleanup;
  }, []);

  const currentEntries = entries.length > 0 ? entries : topics.map((t, i) => ({
    rank: i + 1,
    id: t.id,
    title: t.title,
    heatScore: t.heatScore,
    change: "new" as const,
  }));

  return { entries: currentEntries, topics, loading, error };
}
