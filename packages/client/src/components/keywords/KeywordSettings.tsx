import { useState, useEffect, useCallback } from "react";
import type { KeywordConfig } from "../../types";
import { fetchKeywords, createKeyword, updateKeyword, deleteKeyword, toggleKeyword } from "../../services/api";

interface KeywordSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function KeywordSettings({ open, onClose }: KeywordSettingsProps) {
  const [keywords, setKeywords] = useState<KeywordConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [exclude, setExclude] = useState("");
  const [geo, setGeo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchKeywords();
      setKeywords(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleAdd = async () => {
    if (!keyword.trim()) return;
    try {
      await createKeyword({
        keyword: keyword.trim(),
        isRegex,
        exclude: exclude.trim() || undefined,
        geo: geo.trim() || undefined,
      });
      setKeyword("");
      setExclude("");
      setIsRegex(false);
      setGeo("");
      await load();
    } catch {
      // silently fail
    }
  };

  const handleToggle = async (id: string) => {
    await toggleKeyword(id);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteKeyword(id);
    await load();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-xl shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">关键词配置</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-sm">✕</button>
        </div>

        {/* 新增表单 */}
        <div className="p-4 border-b border-gray-800/50 space-y-2.5">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入关键词..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex gap-2">
            <input
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              placeholder="排除词（分号分隔）"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
            />
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              placeholder="地区 (CN/US)"
              className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isRegex}
                onChange={(e) => setIsRegex(e.target.checked)}
                className="rounded bg-gray-800 border-gray-600"
              />
              正则表达式
            </label>
            <button
              onClick={handleAdd}
              disabled={!keyword.trim()}
              className="text-xs px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium hover:from-cyan-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              添加
            </button>
          </div>
        </div>

        {/* 列表 */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center py-6 text-xs text-gray-600">加载中...</div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-600">暂无关键词，添加一个开始监控</div>
          ) : (
            keywords.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-900/60 transition-colors"
              >
                <button
                  onClick={() => handleToggle(kw.id)}
                  className={`w-5 h-3 rounded-full transition-colors ${kw.isActive ? "bg-green-500" : "bg-gray-700"}`}
                />
                <span className={`flex-1 text-xs font-mono ${kw.isActive ? "text-gray-200" : "text-gray-600"}`}>
                  {kw.keyword}
                </span>
                {kw.isRegex && <span className="text-[10px] text-cyan-600 font-mono">regex</span>}
                {kw.geo && <span className="text-[10px] text-violet-500 font-mono uppercase">{kw.geo}</span>}
                {kw.exclude && <span className="text-[10px] text-gray-600 truncate max-w-[80px]">-{kw.exclude}</span>}
                <button
                  onClick={() => handleDelete(kw.id)}
                  className="text-gray-700 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
