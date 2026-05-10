import { useState, useEffect } from "react";
import { fetchTopics, fetchTopicDetail } from "../services/api";
import { onHotTopicNew, onPipelineProgress } from "../services/socket";
import type { HotTopic, PipelineProgress } from "../types";

interface UseTopicsReturn {
  topics: HotTopic[];
  loading: boolean;
  error: string | null;
  selectedTopic: HotTopic | null;
  selectTopic: (id: string) => void;
  progress: PipelineProgress | null;
}

export function useTopics(): UseTopicsReturn {
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HotTopic | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);

  useEffect(() => {
    fetchTopics(1, 50)
      .then((data) => {
        setTopics(data.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const cleanup1 = onHotTopicNew((data) => {
      const newTopic: HotTopic = {
        id: data.id,
        title: data.title,
        summary: data.summary,
        credibility: data.credibility,
        heatScore: data.heatScore,
        category: null,
        topSource: data.sourceId,
        tags: null,
        isAlert: false,
        events: [],
        newsItems: [],
        createdAt: data.publishedAt,
        updatedAt: data.publishedAt,
      };
      setTopics((prev) => [newTopic, ...prev]);
    });

    const cleanup2 = onPipelineProgress((data) => {
      setProgress(data);
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);

  const selectTopic = async (id: string) => {
    try {
      const topic = await fetchTopicDetail(id);
      setSelectedTopic(topic);
    } catch (err) {
      // silently fail
    }
  };

  return { topics, loading, error, selectedTopic, selectTopic, progress };
}
