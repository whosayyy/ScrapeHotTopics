import { useState, useEffect } from "react";
import { fetchTopics, fetchTopicDetail } from "../services/api";
import { onHotTopicNew, onPipelineProgress } from "../services/socket";
import type { HotTopic, PipelineProgress, FilterState } from "../types";

interface UseTopicsReturn {
  topics: HotTopic[];
  loading: boolean;
  error: string | null;
  selectedTopic: HotTopic | null;
  selectTopic: (id: string) => void;
  progress: PipelineProgress | null;
  filter: FilterState;
  setFilter: (filter: FilterState) => void;
}

export function useTopics(): UseTopicsReturn {
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HotTopic | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [filter, setFilter] = useState<FilterState>({ region: "", category: "", source: "", sort: "heatScore" });

  const loadTopics = () => {
    setLoading(true);
    const activeFilter: { region?: string; category?: string; source?: string; sort?: string } = {};
    if (filter.region) activeFilter.region = filter.region;
    if (filter.category) activeFilter.category = filter.category;
    if (filter.source) activeFilter.source = filter.source;
    if (filter.sort && filter.sort !== "heatScore") activeFilter.sort = filter.sort;

    fetchTopics(1, 50, Object.keys(activeFilter).length > 0 ? activeFilter : undefined)
      .then((data) => {
        setTopics(data.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTopics();
  }, [filter.region, filter.category, filter.source, filter.sort]);

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
        // 扩展字段
        platform: data.platform,
        authorName: data.authorName,
        authorHandle: data.authorHandle,
        authorAvatar: data.authorAvatar,
        isVerified: data.isVerified,
        likes: data.likes,
        retweets: data.retweets,
        comments: data.comments,
        views: data.views,
        region: data.region,
        credibilityScore: data.credibilityScore,
        virality: data.virality,
        urgency: data.urgency,
        aiReasoning: data.aiReasoning,
        rawContent: data.rawContent,
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

  return { topics, loading, error, selectedTopic, selectTopic, progress, filter, setFilter };
}
